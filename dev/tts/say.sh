#!/bin/bash
i=0
declare -A S=(
 [warn]="잠깐, 순서가 다릅니다."
 [short]="네, 안전 수칙을 준수하며 작업하시면서 진행하시면 됩니다."
 [mid]="장갑을 벗으면 장비에 손상을 줄 수 있으니 안전을 위해 장갑을 착용한 상태로 작업해 주세요."
 [long]="3번 밸브가 열려 있으면 챔버 도어를 안전하게 열 수 없습니다. 반드시 밸브를 잠근 후에 도어를 열어주세요."
)
for k in warn short mid long; do
  t=${S[$k]}
  s=$(date +%s.%N)
  espeak-ng -v ko -s 150 -w espeak_$k.wav "$t" 2>/dev/null
  e=$(date +%s.%N)
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 espeak_$k.wav)
  printf "%-6s 글자 %2d  합성 %.2fs  음성 %.2fs  RTF %.3f\n" "$k" "${#t}" "$(echo "$e-$s"|bc)" "$dur" "$(echo "($e-$s)/$dur"|bc -l)"
done
