with open(r"c:\Users\simok38\.gemini\antigravity-ide\scratch\Student-U\index.html", "r", encoding="utf-8", errors="ignore") as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")
# Find all <script> tags
for i, line in enumerate(lines):
    if '<script' in line.lower() or '</script' in line.lower():
        print(f"Line {i+1}: {line.rstrip()}")

print("\n---")
# Find where studentPoints or geminiApiKey appear
for i, line in enumerate(lines):
    if 'studentPoints' in line or 'geminiApiKey' in line:
        print(f"Line {i+1}: {line.rstrip()}")
        break
