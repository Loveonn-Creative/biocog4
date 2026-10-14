set -e
O=$1; TAG=$2
B=(0 282 564 846 1125)
for i in 0 1 2 3; do FILE=label.html DUR=37.5 F0=${B[$i]} F1=${B[$((i+1))]} node render.mjs video $O lb-$TAG-part$i.mp4 2>/dev/null & done; wait
printf "file 'lb-$TAG-part0.mp4'\nfile 'lb-$TAG-part1.mp4'\nfile 'lb-$TAG-part2.mp4'\nfile 'lb-$TAG-part3.mp4'\n" > lb-$TAG-list.txt
ffmpeg -loglevel error -y -f concat -safe 0 -i lb-$TAG-list.txt -c copy lb-$TAG-video.mp4
