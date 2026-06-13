import os

pb_paths = [
    r"C:\Users\simok38\.gemini\antigravity-ide\conversations\7b5b9f0a-47d2-445b-8a48-06cb4b600838.pb",
    r"C:\Users\simok38\.gemini\antigravity-ide\conversations\abf70b46-43e2-4a48-be1f-fefcce1b4406.pb"
]

for p in pb_paths:
    if os.path.exists(p):
        with open(p, "rb") as f:
            head = f.read(64)
            print(f"{os.path.basename(p)} head: {head}")
