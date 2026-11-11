#!/bin/zsh
# 블렌더 단계를 창 없이(-b) 실행하고, 시작/종료 시각과 소요 시간을 logs/blender_stage_log.csv 에 남긴다.
# 사용법: blender/run_stage.sh <단계이름> <스크립트.py> [--open <blend>] [-- 스크립트 인자...]
# 지시서의 경로(C:\Program Files\Blender Foundation\Blender 5.2\blender.exe)는 윈도우용이라
# 이 맥에서는 설치돼 있는 Blender(5.1.2)를 같은 방식(-b, 창 없음)으로 실행한다.
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BLENDER="${BLENDER_BIN:-/Applications/Blender.app/Contents/MacOS/Blender}"
STAGE="$1"; SCRIPT="$2"; shift 2
OPEN=""
if [[ "${1:-}" == "--open" ]]; then OPEN="$2"; shift 2; fi
if [[ "${1:-}" == "--" ]]; then shift; fi
mkdir -p "$ROOT/logs"
LOG="$ROOT/logs/blender_stage_log.csv"
[[ -f "$LOG" ]] || echo "stage,start,end,seconds,exit" > "$LOG"
START_TS=$(date +%s); START_H=$(date '+%Y-%m-%d %H:%M:%S')
cd "$ROOT"
if [[ -n "$OPEN" ]]; then
  "$BLENDER" -b --factory-startup "$OPEN" --python-exit-code 3 --python "$SCRIPT" -- "$@" > "$ROOT/logs/stage_${STAGE}.out" 2>&1
else
  "$BLENDER" -b --factory-startup --python-exit-code 3 --python "$SCRIPT" -- "$@" > "$ROOT/logs/stage_${STAGE}.out" 2>&1
fi
CODE=$?
END_TS=$(date +%s); END_H=$(date '+%Y-%m-%d %H:%M:%S')
echo "${STAGE},${START_H},${END_H},$((END_TS-START_TS)),${CODE}" >> "$LOG"
# 스크립트가 찍은 요약 줄([RIG] 로 시작)과 오류만 화면에 보여 준다.
grep -E "^\[RIG\]|Traceback|Error|error:|Exception" "$ROOT/logs/stage_${STAGE}.out" | head -${MAXLINES:-200}
echo "[stage ${STAGE}] exit=${CODE} seconds=$((END_TS-START_TS))"
exit $CODE
