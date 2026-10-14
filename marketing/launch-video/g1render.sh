set -e
for i in 0 1 2 3; do FILE=guide1.html DUR=80 F0=$((i*600)) F1=$(((i+1)*600)) node render.mjs video landscape g1-part$i.mp4 2>/dev/null & done; wait
printf "file 'g1-part0.mp4'\nfile 'g1-part1.mp4'\nfile 'g1-part2.mp4'\nfile 'g1-part3.mp4'\n" > g1list.txt
ffmpeg -loglevel error -y -f concat -safe 0 -i g1list.txt -c copy g1-video.mp4
ffmpeg -loglevel error -y -i g1-video.mp4 -i sfx3.wav -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart senseible-guide-1-setup.mp4
ffprobe -v error -show_entries format=duration -of csv=p=0 senseible-guide-1-setup.mp4
