with open(r"c:\Users\simok38\.gemini\antigravity-ide\scratch\Student-U\index.html", "r", encoding="utf-8", errors="ignore") as f:
    content = f.read()
lines = content.split("\n")
print(f"Lines: {len(lines)}")
print(f"Size: {len(content)} chars")
print(f"tab-workspace: {content.count('tab-workspace')}")
print(f"tab-profile: {content.count('tab-profile')}")
print(f"tab-moat-profile: {content.count('tab-moat-profile')}")
print(f"tab-planner: {content.count('tab-planner')}")
print(f"study-desk-setup: {content.count('study-desk-setup')}")
print(f"study-desk-active: {content.count('study-desk-active')}")
print(f"session-summary-screen: {content.count('session-summary-screen')}")
print(f"StudentUSync: {content.count('StudentUSync')}")
print(f"switchTab: {content.count('switchTab')}")
print(f"</html>: {content.count('</html>')}")
print(f"</body>: {content.count('</body>')}")
print(f"</script>: {content.count('</script>')}")
print(f"startStudySession: {content.count('startStudySession')}")
print(f"course-selector: {content.count('course-selector')}")
# Check the stitch point
for i, line in enumerate(lines):
    if "3 Days" in line:
        print(f"\nLine {i+1}: {line.strip()}")
        for j in range(i+1, min(i+5, len(lines))):
            print(f"Line {j+1}: {lines[j].strip()}")
        break
