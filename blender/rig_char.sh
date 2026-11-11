#!/bin/zsh
# 캐릭터 한 명의 리깅 단계를 실행한다.  사용법: blender/rig_char.sh <태그> <단계> [추가 인자]
#   단계: import | skeleton | weights | gear | anims | export | all
#   설정: blender/chars/<태그>.json   작업 파일: 설정의 "blend" (기본 blender/work/<태그>.blend)
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; TAG="$1"; STAGE="$2"; shift 2
BLEND=$(python3 -c "import json,os,sys; p=os.path.join('$ROOT','blender','chars','$TAG.json'); c=json.load(open(p)) if os.path.exists(p) else {}; print(c.get('blend') or os.path.join('blender','work','$TAG.blend'))")
[[ "$BLEND" = /* ]] || BLEND="$ROOT/$BLEND"
mkdir -p "$(dirname "$BLEND")"
run() {  # run <단계이름> <스크립트> <blend 열기 여부> [인자...]
  local st="$1" sc="$2" op="$3"; shift 3
  if [[ "$op" == "open" ]]; then "$ROOT/blender/run_stage.sh" "${TAG}_${st}" "$ROOT/blender/scripts/$sc" --open "$BLEND" -- "$TAG" "$@"
  else "$ROOT/blender/run_stage.sh" "${TAG}_${st}" "$ROOT/blender/scripts/$sc" -- "$TAG" "$@"; fi
}
case "$STAGE" in
  import)   run import s01_import.py new "$@" ;;
  skeleton) run skeleton s02_skeleton.py open "$@" ;;
  weights)  run weights s03_weights.py open "$@" ;;
  gear)     run gear s04_gear.py open "$@" ;;
  anims)    run anims s05_anims.py open "$@" ;;
  export)   run export s06_validate_export.py open "$@" ;;
  all)      run import s01_import.py new && run skeleton s02_skeleton.py open && run weights s03_weights.py open && run gear s04_gear.py open && run anims s05_anims.py open --sheets && run export s06_validate_export.py open ;;
  *) echo "unknown stage: $STAGE"; exit 2 ;;
esac
