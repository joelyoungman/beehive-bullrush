"""Renders every spoken line to an MP3 in voices/ using Microsoft's online neural voices (pip install edge-tts).

Usage:
    node tools/voice-lines.js
    python tools/make-voices.py

Only missing files are generated, so it is safe to re-run after adding quotes.
The line text is sent to Microsoft's speech service. The voices are generic New Zealand
voices, not impressions of the people quoted.
"""
import asyncio
import json
import os

import edge_tts

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "voices")


async def main():
    with open(os.path.join(HERE, "voice-lines.json"), encoding="utf8") as f:
        lines = json.load(f)
    os.makedirs(OUT, exist_ok=True)
    made = 0
    for line in lines:
        target = os.path.join(OUT, line["file"])
        if os.path.exists(target) and os.path.getsize(target) > 0:
            continue
        part = target + ".part"  # write beside the target, then rename, so a dropped connection never leaves half a file
        for attempt in range(4):
            try:
                await edge_tts.Communicate(line["text"], line["voice"], rate=line["rate"], pitch=line["pitch"]).save(part)
                os.replace(part, target)
                break
            except Exception as err:  # the service times out now and then
                if attempt == 3:
                    raise
                print("retrying", line["file"], "-", type(err).__name__)
                await asyncio.sleep(2 + attempt * 3)
        made += 1
        print("made", line["file"])  # file name only: the text can hold macrons a Windows console cannot print
    wanted = {line["file"] for line in lines}
    stale = [n for n in os.listdir(OUT) if n.endswith(".mp3") and n not in wanted]
    print(f"{made} new, {len(lines) - made} already there, {len(stale)} no longer used: {stale}")


asyncio.run(main())
