#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""시험용 가짜 LLM 서버(OpenAI 호환). 실제 모델은 없다 — 두뇌 서버의 생각 층을 시험할 때만 쓴다.

  GET  /v1/models
  POST /v1/chat/completions      요청의 "id=숫자" 줄을 읽어 그럴듯한 JSON 배열로 답한다
  GET  /_mock/stats              받은 호출 수와 마지막 요청(시험 확인용)

모드
  정상            (기본)
  --delay 초      답하기 전에 그만큼 기다린다(느린 모델)
  --garbage       잡설 + 깨진 JSON 을 번갈아 낸다
  --fail          /v1/chat/completions 가 500 을 낸다
  --mode evil     형식은 맞지만 금지된 goal·모르는 id·너무 긴 대사·꺾쇠가 섞인 답
  --mode fenced   <think> 구획과 코드 펜스, 앞뒤 잡설로 감싼 올바른 답

  python3 spark/test/mock_llm.py --port 8799 [--delay 3] [--garbage] [--fail]
"""
import argparse
import json
import re
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

GOALS = ('hunt_forest', 'town_idle', 'go_smith', 'hunt_orc', 'go_shop', 'hunt_grave')
SAYS = ('오늘 숲에 늑대 많네요 ㅋㅋ', '강화 한 번만 더 해 볼까', '물약 사러 갑니다~', '오크 야영지 자리 있나요?', '묘지 같이 도실 분', '광장에서 좀 쉴게요')
GARBAGE = (
    '죄송하지만 그 요청은 잘 모르겠어요. 모험가들은 모두 행복하게 살았답니다.',
    '물론이죠! 결과입니다:\n[{"id": 12, "goal": "hunt_for',
    '{"result": "ok", "note": "배열이 아님"}',
    '<html><body><h1>502 Bad Gateway</h1></body></html>',
    '[{"id": "열둘", "goal": 7}, 3, null, {"goal": "town_idle"}]',
)


class State(object):
    """가짜 LLM 의 상태(시험에서 바로 바꿀 수 있다)."""

    def __init__(self, mode='normal', delay=0.0, model='mock-erheim'):
        self.mode = mode            # normal | garbage | fail | evil | fenced | empty
        self.delay = delay
        self.model = model
        self.lock = threading.Lock()
        self.calls = 0              # chat 호출 수
        self.model_calls = 0
        self.active = 0             # 지금 처리 중인 chat 호출 수
        self.max_active = 0
        self.batches = []           # 호출마다 들어 있던 봇 id 목록
        self.last_user = ''
        self.last_system = ''
        self.users = []             # 받은 사용자 메시지 전부(최근 50개)

    def snapshot(self):
        with self.lock:
            return {'mode': self.mode, 'delay': self.delay, 'calls': self.calls, 'modelCalls': self.model_calls,
                    'maxActive': self.max_active, 'batches': list(self.batches[-50:]),
                    'lastUser': self.last_user, 'lastSystem': self.last_system}


def decide(user, n_call):
    """요청 글에서 봇 줄을 읽어 결정을 만든다(결정적)."""
    out = []
    has_chat = '「주인공 채팅 시작」' in user
    raid = '레이드: 진행 중' in user
    lines = [ln for ln in user.split('\n') if re.match(r'^id=\d+ ', ln)]
    for i, ln in enumerate(lines):
        bid = int(re.match(r'^id=(\d+)', ln).group(1))
        hp = re.search(r'체력 (\d+)%', ln)
        hp = int(hp.group(1)) if hp else 100
        say = ''
        if hp < 35:
            goal = 'rest'
            say = '피가 없어서 잠깐 쉴게요' if i == 0 else ''
        elif raid and i % 2 == 0:
            goal = 'join_raid'
            say = '레이드 갑니다 ㄱㄱ' if i == 0 else ''
        elif has_chat and i < 2:
            goal = 'follow_player'
            say = '넵 같이 가요 ㅎㅎ' if i == 0 else ''
        else:
            k = (bid + n_call) % len(GOALS)
            goal = GOALS[k]
            say = SAYS[k] if i == 0 else ''
        out.append({'id': bid, 'goal': goal, 'say': say, 'channel': 'local'})
    return out


def evil(user):
    ids = [int(x) for x in re.findall(r'^id=(\d+) ', user, re.M)]
    out = [{'id': 987654321, 'goal': 'hunt_forest', 'say': '없는 봇'}]
    for i, bid in enumerate(ids):
        k = i % 5
        if k == 0:
            out.append({'id': bid, 'goal': 'delete_all_players', 'say': '금지된 목표'})
        elif k == 1:
            out.append({'id': bid, 'goal': 'go_smith', 'channel': 'shout',
                        'say': '<script>alert(1)</script>강화\n하러\t갑니다 ' + '가' * 200})
        elif k == 2:
            out.append({'id': bid, 'goal': 'town_idle', 'say': '나는 AI 언어 모델입니다. http://example.com'})
        elif k == 3:
            out.append({'id': str(bid), 'goal': ' GO_SHOP ', 'say': '物薬を買います'})
        else:
            out.append({'id': bid, 'goal': 'join_raid', 'say': '<b>레이드</b> 갑니다'})
    return out


class Handler(BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'

    def log_message(self, fmt, *args):
        pass

    def _json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        st = self.server.state
        path = self.path.split('?', 1)[0]
        if path in ('/v1/models', '/engines/v1/models'):
            with st.lock:
                st.model_calls += 1
            return self._json(200, {'object': 'list', 'data': [{'id': st.model, 'object': 'model', 'owned_by': 'mock'}]})
        if path == '/_mock/stats':
            return self._json(200, st.snapshot())
        self._json(404, {'error': {'message': 'not found'}})

    def do_POST(self):
        st = self.server.state
        path = self.path.split('?', 1)[0]
        n = int(self.headers.get('Content-Length') or 0)
        raw = self.rfile.read(n) if n else b''
        if path not in ('/v1/chat/completions', '/engines/v1/chat/completions'):
            return self._json(404, {'error': {'message': 'not found'}})
        try:
            req = json.loads(raw.decode('utf-8'))
            msgs = req.get('messages') or []
        except Exception:
            return self._json(400, {'error': {'message': 'bad json'}})
        user = ''
        system = ''
        for m in msgs:
            if m.get('role') == 'user':
                user = str(m.get('content') or '')
            elif m.get('role') == 'system':
                system = str(m.get('content') or '')
        with st.lock:
            st.calls += 1
            n_call = st.calls
            st.active += 1
            st.max_active = max(st.max_active, st.active)
            st.last_user = user
            st.last_system = system
            st.users.append(user)
            del st.users[:-50]
            st.batches.append([int(x) for x in re.findall(r'^id=(\d+) ', user, re.M)])
            mode = st.mode
            delay = st.delay
        try:
            if delay > 0:
                time.sleep(delay)
            if mode == 'fail':
                return self._json(500, {'error': {'message': 'mock failure', 'type': 'server_error'}})
            if mode == 'garbage':
                content = GARBAGE[(n_call - 1) % len(GARBAGE)]
            elif mode == 'empty':
                content = ''
            elif mode == 'evil':
                content = json.dumps(evil(user), ensure_ascii=False)
            elif mode == 'fenced':
                content = ('<think>\n모험가들을 살펴보자. [참고] {임시}\n</think>\n알겠습니다! 결과는 다음과 같습니다.\n```json\n'
                           + json.dumps(decide(user, n_call), ensure_ascii=False, indent=1) + '\n```\n도움이 되었길 바랍니다 [끝]')
            else:
                content = json.dumps(decide(user, n_call), ensure_ascii=False)
            self._json(200, {'id': 'chatcmpl-mock-%d' % n_call, 'object': 'chat.completion', 'created': int(time.time()),
                             'model': st.model,
                             'choices': [{'index': 0, 'message': {'role': 'assistant', 'content': content}, 'finish_reason': 'stop'}],
                             'usage': {'prompt_tokens': len(user) // 2, 'completion_tokens': len(content) // 2,
                                       'total_tokens': (len(user) + len(content)) // 2}})
        except (BrokenPipeError, ConnectionError):
            pass                    # 두뇌 서버가 타임아웃으로 먼저 끊었다
        finally:
            with st.lock:
                st.active -= 1


class Server(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def handle_error(self, request, client_address):
        pass


def make_server(port=0, mode='normal', delay=0.0, model='mock-erheim', host='127.0.0.1'):
    """가짜 LLM 서버를 만든다. server.state 로 모드·기록을 볼 수 있다."""
    httpd = Server((host, port), Handler)
    httpd.state = State(mode, delay, model)
    return httpd


def main(argv=None):
    ap = argparse.ArgumentParser(description='시험용 가짜 LLM 서버(OpenAI 호환)')
    ap.add_argument('--host', default='127.0.0.1')
    ap.add_argument('--port', type=int, default=8799)
    ap.add_argument('--delay', type=float, default=0.0, help='답하기 전에 기다리는 초')
    ap.add_argument('--garbage', action='store_true', help='잡설·깨진 JSON 으로 답한다')
    ap.add_argument('--fail', action='store_true', help='chat 호출에 500 으로 답한다')
    ap.add_argument('--mode', default=None, choices=('normal', 'garbage', 'fail', 'evil', 'fenced', 'empty'))
    ap.add_argument('--model', default='mock-erheim')
    a = ap.parse_args(argv)
    mode = a.mode or ('fail' if a.fail else 'garbage' if a.garbage else 'normal')
    httpd = make_server(a.port, mode, a.delay, a.model, a.host)
    print('가짜 LLM: http://%s:%d/v1  (모드 %s, 지연 %g초)' % (a.host, httpd.server_address[1], mode, a.delay), flush=True)
    print('MOCK_LLM_READY port=%d' % httpd.server_address[1], flush=True)
    try:
        httpd.serve_forever(poll_interval=0.25)
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()
    return 0


if __name__ == '__main__':
    sys.exit(main())
