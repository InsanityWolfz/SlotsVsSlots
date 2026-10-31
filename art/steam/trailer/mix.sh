#!/bin/bash
# Mix 2 (user: the music "felt a little harsh"): music rolled off above 3 kHz (-7 dB shelf, 7.5 kHz lowpass), a touch
# of warmth at 250 Hz, ~4 dB further under the effects; 2 s fade at the end; the whole mix to -14 LUFS.
D=$(python3 -c "print(2585/60)"); FO=$(python3 -c "print(round(2585/60-2,2))")
ffmpeg -v error -y -i music.wav -i sfx.wav -filter_complex "[0:a]aformat=channel_layouts=stereo,highshelf=f=3000:g=-7,lowpass=f=7500:poles=2,equalizer=f=250:t=q:w=1:g=2,volume=0.55,afade=t=out:st=$FO:d=2[m];[m][1:a]amix=inputs=2:normalize=0,atrim=0:$D,loudnorm=I=-14:TP=-1.5:LRA=11[a]" -map "[a]" -ar 48000 mix.wav
