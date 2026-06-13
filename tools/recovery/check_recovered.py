import os

out = r"c:\Users\simok38\.gemini\antigravity-ide\scratch\Student-U\recovered_from_brain.html"
sz = os.path.getsize(out)
print(f"Size: {sz} bytes")
with open(out, "r", encoding="utf-8", errors="ignore") as f:
    content = f.read()
print(f"Length: {len(content)} chars")
print(f"\nFirst 500 chars:")
print(content[:500])
print(f"\nLast 500 chars:")
print(content[-500:])

# Count occurrences of some key markers
print(f"\nOccurrences of 'switchTab': {content.count('switchTab')}")
print(f"Occurrences of 'tab-workspace': {content.count('tab-workspace')}")
print(f"Occurrences of 'tab-profile': {content.count('tab-profile')}")
print(f"Occurrences of 'StudyDesk': {content.count('study-desk')}")
print(f"Occurrences of 'StudentUSync': {content.count('StudentUSync')}")
print(f"Occurrences of 'startStudySession': {content.count('startStudySession')}")
