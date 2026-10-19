set -e
cd /tmp/claude-0/-home-user-biocog4/868dd634-dbcb-51f1-9d15-16d286c01855/scratchpad/vid
B=(0 720 1440 2160 2880)
for i in 0 1 2 3; do
  for try in 1 2 3; do FILE=guide2.html DUR=96 F0=${B[$i]} F1=${B[$((i+1))]} node render.mjs video landscape g2-part$i.mp4 2>/dev/null && [ -s g2-part$i.mp4 ] && break; done &
done; wait
printf "file 'g2-part0.mp4'\nfile 'g2-part1.mp4'\nfile 'g2-part2.mp4'\nfile 'g2-part3.mp4'\n" > g2list.txt
ffmpeg -loglevel error -y -f concat -safe 0 -i g2list.txt -c copy g2-video.mp4
ffmpeg -loglevel error -y -i g2-video.mp4 -i sfx5.wav -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart senseible-guide-2-first-report.mp4
ffprobe -v error -show_entries format=duration -of csv=p=0 senseible-guide-2-first-report.mp4
