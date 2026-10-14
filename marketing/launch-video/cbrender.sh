set -e
for o in portrait landscape; do
  for i in 0 1 2; do FILE=cbam.html DUR=38 F0=$((i*380)) F1=$(((i+1)*380)) node render.mjs video $o cb-$o-$i.mp4 2>/dev/null & done; wait
  printf "file 'cb-$o-0.mp4'\nfile 'cb-$o-1.mp4'\nfile 'cb-$o-2.mp4'\n" > cb-$o.txt
  ffmpeg -loglevel error -y -f concat -safe 0 -i cb-$o.txt -c copy cb-$o-v.mp4
done
ffmpeg -loglevel error -y -i cb-portrait-v.mp4 -i sfx4.wav -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart invisible-line-9x16.mp4
ffmpeg -loglevel error -y -i cb-landscape-v.mp4 -i sfx4.wav -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart invisible-line-16x9.mp4
ls -la invisible-line-*.mp4
