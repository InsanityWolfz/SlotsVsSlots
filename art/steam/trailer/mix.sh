#!/bin/bash
# The trailer's sound and the two encodes. Mix 2 (user: the music "felt a little harsh", then "the volume seems fine
# now"): music rolled off above 3 kHz (-7 dB shelf, 7.5 kHz lowpass), a touch of warmth at 250 Hz, ~4 dB further under
# the effects; it comes in 2 bars in (148 BPM), on the cut to the first spin; 2 s fade at the end; all to -14 LUFS.
N=${1:-2630}
D=$(python3 -c "print($N/60)"); FO=$(python3 -c "print(round($N/60-2,2))"); DL=$(python3 -c "print(round((2*4*60/148-0.05)*1000))")
ffmpeg -v error -y -i music.wav -i sfx.wav -filter_complex "[0:a]aformat=channel_layouts=stereo,adelay=${DL}|${DL},highshelf=f=3000:g=-7,lowpass=f=7500:poles=2,equalizer=f=250:t=q:w=1:g=2,volume=0.55,afade=t=out:st=$FO:d=2[m];[m][1:a]amix=inputs=2:normalize=0:duration=longest,atrim=0:$D,loudnorm=I=-14:TP=-1.5:LRA=11[a]" -map "[a]" -ar 48000 mix.wav
ffmpeg -v error -y -i master.mkv -i mix.wav -map 0:v -map 1:a -vf "scale=2560:1440:flags=neighbor,scale=1920:1080:flags=lanczos,format=yuv420p" -c:v libx264 -preset slow -crf 16 -profile:v high -r 60 -c:a aac -b:a 320k -movflags +faststart reel_brawl_trailer_1080p.mp4
ffmpeg -v error -y -i master.mkv -i mix.wav -map 0:v -map 1:a -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -r 60 -c:a aac -b:a 160k -movflags +faststart review.mp4
