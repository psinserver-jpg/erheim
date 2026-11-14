#!/usr/bin/env bash
# 에르하임 두뇌 서버 실행(DGX Spark). 인자는 brain_server.py 로 그대로 전달된다.
#
#   spark/run.sh                                   # 0.0.0.0:8787, 게임 폴더 = 이 스크립트의 윗폴더
#   spark/run.sh --port 9000                       # 뒤에 준 인자가 앞의 기본값을 덮는다
#   spark/run.sh --llm http://127.0.0.1:11434/v1 --model gemma3:12b
#   HOST=127.0.0.1 PORT=8787 GAME=/다른/폴더 PYTHON=python3.12 spark/run.sh
#
# 같은 일을 하는 한 줄:  python3 spark/brain_server.py --host 0.0.0.0 --port 8787 --game .
set -e

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-8787}"
GAME="${GAME:-$ROOT}"
PY="${PYTHON:-python3}"

if ! command -v "$PY" >/dev/null 2>&1; then
  echo "[run.sh] $PY 을(를) 찾을 수 없습니다. 파이썬 3 이 필요합니다." >&2
  exit 1
fi
if ! "$PY" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 8) else 1)'; then
  echo "[run.sh] 파이썬 3.8 이상이 필요합니다: $("$PY" --version 2>&1)" >&2
  exit 1
fi

ARGS=(--host "$HOST" --port "$PORT")
if [ -f "$GAME/index.html" ]; then
  ARGS+=(--game "$GAME")
else
  echo "[run.sh] $GAME 에 index.html 이 없어 게임은 내보내지 않습니다(두뇌만 실행)." >&2
fi

exec "$PY" "$HERE/brain_server.py" "${ARGS[@]}" "$@"
