import re
import os

with open(r"c:\Users\simok38\.gemini\antigravity-ide\scratch\Student-U\recovered_from_brain.html", "r", encoding="utf-8", errors="ignore") as f:
    content = f.read()

# The content has format: "<!DOCTYPE html>\n2: <html...>\n3: \n4: <head>\n..."
# Line numbers are embedded as "NNN: " at the start of each \n-separated line
# Also there are literal \\n for newlines and escaped quotes

# First unescape the JSON-encoded string:
content = content.replace('\\n', '\n').replace('\\"', '"').replace('\\\\', '\\')

# Now strip line numbers: each line may start with "<number>: "
lines = content.split('\n')
clean_lines = []
for line in lines:
    # Match pattern: "digit(s): remainder"
    m = re.match(r'^\d+: (.*)$', line)
    if m:
        clean_lines.append(m.group(1))
    else:
        clean_lines.append(line)

clean_html = '\n'.join(clean_lines)

print(f"Original length: {len(content)}")
print(f"Clean length: {len(clean_html)}")
print(f"\nFirst 500 chars of clean:")
print(clean_html[:500])
print(f"\nLast 500 chars of clean:")
print(clean_html[-500:])
print(f"\nOccurrences of 'StudentUSync': {clean_html.count('StudentUSync')}")
print(f"Occurrences of 'tab-workspace': {clean_html.count('tab-workspace')}")
print(f"Occurrences of 'tab-profile': {clean_html.count('tab-profile')}")

out = r"c:\Users\simok38\.gemini\antigravity-ide\scratch\Student-U\recovered_clean.html"
with open(out, "w", encoding="utf-8") as f:
    f.write(clean_html)
print(f"\nSaved to {out} ({os.path.getsize(out)} bytes)")
