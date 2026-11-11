#!/bin/zsh
# 사용법: tools/anim_sheet.sh <태그> <출력.jpg> <clip_view> [<clip_view> ...]   (예: run_q run_s)
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; TAG="$1"; OUT="$2"; shift 2
D="$ROOT/blender/diag"; T="$ROOT/_work/sheet_tmp_${TAG}_$$"; mkdir -p "$T"
i=0; INPUTS=()
for cv in "$@"; do
  ffmpeg -y -loglevel error -i "$D/${TAG}_anim_${cv}_0.png" -i "$D/${TAG}_anim_${cv}_1.png" -i "$D/${TAG}_anim_${cv}_2.png" -i "$D/${TAG}_anim_${cv}_3.png" -i "$D/${TAG}_anim_${cv}_4.png" -i "$D/${TAG}_anim_${cv}_5.png" -i "$D/${TAG}_anim_${cv}_6.png" -i "$D/${TAG}_anim_${cv}_7.png" -filter_complex "hstack=inputs=8" "$T/row_$i.png"
  INPUTS+=(-i "$T/row_$i.png"); i=$((i+1))
done
if [[ $i -eq 1 ]]; then ffmpeg -y -loglevel error -i "$T/row_0.png" -vf "scale=2000:-1" "$OUT"; else ffmpeg -y -loglevel error "${INPUTS[@]}" -filter_complex "vstack=inputs=$i,scale=2000:-1" "$OUT"; fi
rm -rf "$T"
echo "wrote $OUT"
