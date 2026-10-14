set -e
cd /tmp/claude-0/-home-user-biocog4/868dd634-dbcb-51f1-9d15-16d286c01855/scratchpad/vid
chunk() { # file dur orient f0 f1 out
  for try in 1 2 3; do FILE=$1 DUR=$2 F0=$4 F1=$5 node fg-render.mjs video $3 $6 > fg-$6.log 2>&1 && [ -s $6 ] && return 0; echo "retry $6"; done; return 1; }
for pair in "0 1" "2 3"; do for i in $pair; do chunk fog.html 90 landscape $((i*675)) $(((i+1)*675)) fg-part$i.mp4 & done; wait; done
for i in 0 1 2 3; do [ -s fg-part$i.mp4 ] || { echo "Error missing fg-part$i"; exit 1; }; done
printf "file 'fg-part0.mp4'\nfile 'fg-part1.mp4'\nfile 'fg-part2.mp4'\nfile 'fg-part3.mp4'\n" > fg-list.txt
ffmpeg -loglevel error -y -f concat -safe 0 -i fg-list.txt -c copy fg-video.mp4
ffmpeg -loglevel error -y -i fg-video.mp4 -i fg-sfx.wav -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart fog-16x9.mp4
echo "landscape ok"
for i in 0 1; do chunk fog-teaser.html 30 portrait $((i*450)) $(((i+1)*450)) fg-tpart$i.mp4 & done; wait
for i in 0 1; do [ -s fg-tpart$i.mp4 ] || { echo "Error missing fg-tpart$i"; exit 1; }; done
printf "file 'fg-tpart0.mp4'\nfile 'fg-tpart1.mp4'\n" > fg-tlist.txt
ffmpeg -loglevel error -y -f concat -safe 0 -i fg-tlist.txt -c copy fg-tvideo.mp4
ffmpeg -loglevel error -y -i fg-tvideo.mp4 -i fg-teaser.wav -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart fog-teaser-9x16.mp4
ffprobe -v error -show_entries format=duration -of csv=p=0 fog-16x9.mp4 fog-teaser-9x16.mp4
echo DONE
