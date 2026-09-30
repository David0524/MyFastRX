# Word-level transcript of a VO file (offline, faster-whisper). python3 tools/transcribe.py vo/body.wav
import sys, json
from faster_whisper import WhisperModel
m = WhisperModel("small.en", device="cpu", compute_type="int8")
for f in sys.argv[1:]:
    segs, _ = m.transcribe(f, word_timestamps=True, beam_size=5, vad_filter=False)
    words = [dict(w=w.word.strip(), t0=round(w.start, 2), t1=round(w.end, 2)) for s in segs for w in s.words]
    print(f, ' '.join(w['w'] for w in words))
    print(json.dumps(words))
