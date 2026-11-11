#!/bin/zsh
# codex CLI(로그인된 ChatGPT 계정)의 내장 이미지 생성으로 이미지 한 장을 만든다.
# 사용법: tools/codex_image.sh <이름(확장자 없이)> <프롬프트 파일> [참조 이미지]
#   결과: assets/concept_codex/<이름>.png
# - 프롬프트는 파일로 받아 표준입력으로 넘긴다(셸 따옴표 문제 방지).
# - --ephemeral: codex 세션 기록을 남기지 않음. --ignore-user-config: 사용자 설정(MCP/훅) 미적용.
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NAME="$1"; PF="$2"; REF="${3:-}"
OUTDIR="$ROOT/assets/concept_codex"
mkdir -p "$OUTDIR" "$ROOT/_work/codex_logs"
[[ -f "$PF" ]] || { echo "prompt file not found: $PF"; exit 2; }
REFNOTE=""
[[ -n "$REF" ]] && REFNOTE=" Use the attached image as the exact character design reference (same character, same armor design and colors)."
INSTR="Use your built-in image generation tool to generate exactly one image, then save it as ./${NAME}.png in the current working directory (overwrite if it exists).${REFNOTE} Rules: do not read, list or search any file or directory outside the current working directory (the only exception is copying the generated image file from wherever your image tool stored it). Do not run any other commands. When done, reply with only the saved file name and pixel size.

Image prompt: $(cat "$PF")"
rm -f "$OUTDIR/${NAME}.png"
if [[ -n "$REF" ]]; then
  print -r -- "$INSTR" | codex exec --skip-git-repo-check --ephemeral --ignore-user-config -s workspace-write -C "$OUTDIR" -i "$REF" > "$ROOT/_work/codex_logs/${NAME}.log" 2>&1
else
  print -r -- "$INSTR" | codex exec --skip-git-repo-check --ephemeral --ignore-user-config -s workspace-write -C "$OUTDIR" - > "$ROOT/_work/codex_logs/${NAME}.log" 2>&1
fi
CODE=$?
if [[ -f "$OUTDIR/${NAME}.png" ]]; then
  W=$(sips -g pixelWidth "$OUTDIR/${NAME}.png" 2>/dev/null | awk '/pixelWidth/{print $2}')
  H=$(sips -g pixelHeight "$OUTDIR/${NAME}.png" 2>/dev/null | awk '/pixelHeight/{print $2}')
  echo "OK assets/concept_codex/${NAME}.png ${W}x${H} (codex exit ${CODE})"
else
  echo "FAIL ${NAME}: 이미지 파일이 생성되지 않음 (codex exit ${CODE})"; tail -8 "$ROOT/_work/codex_logs/${NAME}.log"
  exit 1
fi
