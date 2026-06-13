import os

p = r"C:\Users\simok38\.gemini\antigravity-ide\brain\7b5b9f0a-47d2-445b-8a48-06cb4b600838\.system_generated\steps\621\content.md"
sz = os.path.getsize(p)
print(f"Size: {sz} bytes")
with open(p, "r", encoding="utf-8", errors="ignore") as f:
    content = f.read()
idx = content.find("<!DOCTYPE html>")
print(f"DOCTYPE at: {idx}")
print(f"First 300 chars:\n{content[:300]}")
last = content.rfind("</html>")
print(f"Last </html> at: {last}")
if last != -1 and idx != -1:
    html = content[idx:last+7]
    print(f"HTML length: {len(html)}")
    out = r"c:\Users\simok38\.gemini\antigravity-ide\scratch\Student-U\recovered_step621.html"
    with open(out, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"Saved to {out}")
elif idx == -1:
    print("No DOCTYPE found")
    # Show content around keyword
    kw_idx = content.find("Stop rereading. Start remembering.")
    print(f"keyword at: {kw_idx}")
    print(f"Content around keyword:\n{content[max(0,kw_idx-100):kw_idx+200]}")
