import os
import re

BASE = r"C:\Users\simok38\.gemini\antigravity-ide\brain"

def scan_for_html():
    largest = (0, None, None)
    for conv_id in os.listdir(BASE):
        conv_path = os.path.join(BASE, conv_id)
        if not os.path.isdir(conv_path):
            continue
        for root, dirs, files in os.walk(conv_path):
            for fname in files:
                fpath = os.path.join(root, fname)
                # Skip known image/video/recording files
                ext = os.path.splitext(fname)[1].lower()
                if ext in ('.png', '.webp', '.jpg', '.mp4', '.pb'):
                    continue
                try:
                    sz = os.path.getsize(fpath)
                    if sz < 100000:
                        continue
                    with open(fpath, 'rb') as f:
                        raw = f.read()
                    # Search for DOCTYPE in raw bytes
                    idx = raw.find(b'<!DOCTYPE html>')
                    if idx == -1:
                        # Try with HTML keyword used in this project
                        idx = raw.find(b'Stop rereading. Start remembering.')
                    if idx != -1:
                        print(f"HIT: {fpath} (size={sz}, keyword at byte {idx})")
                        if sz > largest[0]:
                            largest = (sz, fpath, raw)
                except PermissionError:
                    pass
                except Exception as e:
                    pass
    
    if largest[1]:
        print(f"\nLargest match: {largest[1]} ({largest[0]} bytes)")
        # Extract HTML chunk
        raw = largest[2]
        idx = raw.find(b'<!DOCTYPE html>')
        if idx == -1:
            idx = raw.find(b'Stop rereading. Start remembering.')
        chunk = raw[max(0, idx):idx+500000]
        text = chunk.decode('utf-8', errors='replace')
        # Find last </html>
        last = text.rfind('</html>')
        if last != -1:
            html = text[:last+7]
            out = r"c:\Users\simok38\.gemini\antigravity-ide\scratch\Student-U\recovered_from_brain.html"
            with open(out, 'w', encoding='utf-8') as f:
                f.write(html)
            print(f"Saved HTML ({len(html)} chars) to {out}")
        else:
            print(f"No </html> found in {len(text)} chars")
    else:
        print("No HTML candidates found in brain directory")

scan_for_html()
