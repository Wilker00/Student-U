import os

browser_dir = r"C:\Users\simok38\.gemini\antigravity-ide\brain\7b5b9f0a-47d2-445b-8a48-06cb4b600838\browser"
for file in os.listdir(browser_dir):
    if file.startswith("scratchpad"):
        path = os.path.join(browser_dir, file)
        size = os.path.getsize(path)
        print(f"File: {file}, Size: {size} bytes")
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
            print(f"  First 200 chars: {repr(content[:200])}")
            print(f"  Last 200 chars: {repr(content[-200:])}\n")
