import os

brain_dir = r"C:\Users\simok38\.gemini\antigravity-ide\brain"
candidates = []

def search_dir(d):
    for root, dirs, files in os.walk(d):
        for file in files:
            path = os.path.join(root, file)
            # Skip media and browser recordings
            if "browser_recordings" in path or "tempmediaStorage" in path or file.endswith((".png", ".webp", ".jpg", ".mp4")):
                continue
            try:
                # Check size
                sz = os.path.getsize(path)
                if sz < 10000: # We expect index.html to be >100KB or so
                    continue
                with open(path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                    if "<!DOCTYPE html>" in content and "Stop rereading. Start remembering." in content:
                        candidates.append((sz, path))
                        print(f"Found match: {path} (size: {sz} bytes)")
            except Exception as e:
                pass

search_dir(brain_dir)
print(f"Total candidates found: {len(candidates)}")
if candidates:
    candidates.sort(key=lambda x: x[0], reverse=True)
    best_sz, best_path = candidates[0]
    print(f"Best: {best_path} (size: {best_sz} bytes)")
