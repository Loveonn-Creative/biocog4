set -e
cd /tmp/claude-0/-home-user-biocog4/868dd634-dbcb-51f1-9d15-16d286c01855/scratchpad/vid
B=(0 345 690 1035 1380)
for o in landscape portrait; do
  for i in 0 1 2 3; do (for try in 1 2 3; do FILE=twosides.html DUR=46 F0=${B[$i]} F1=${B[$((i+1))]} node render.mjs video $o ts-$o-$i.mp4 2>/dev/null && [ -s ts-$o-$i.mp4 ] && break; done) & done; wait
  printf "file 'ts-$o-0.mp4'\nfile 'ts-$o-1.mp4'\nfile 'ts-$o-2.mp4'\nfile 'ts-$o-3.mp4'\n" > ts-$o.txt
  ffmpeg -loglevel error -y -f concat -safe 0 -i ts-$o.txt -c copy ts-$o-v.mp4
done
ffmpeg -loglevel error -y -i ts-landscape-v.mp4 -i sfx6.wav -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart one-bill-both-sides-16x9.mp4
ffmpeg -loglevel error -y -i ts-portrait-v.mp4 -i sfx6.wav -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart one-bill-both-sides-9x16.mp4
ls -la one-bill-both-sides-*.mp4
