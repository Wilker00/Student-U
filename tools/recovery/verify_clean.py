import os

with open(r"c:\Users\simok38\.gemini\antigravity-ide\scratch\Student-U\recovered_clean.html", "r", encoding="utf-8", errors="ignore") as f:
    content = f.read()

print(f"Length: {len(content)} chars")
print(f"\nKey feature checks:")
print(f"  switchTab: {content.count('switchTab')}")
print(f"  tab-workspace: {content.count('tab-workspace')}")
print(f"  tab-profile: {content.count('tab-profile')}")
print(f"  tab-moat-profile: {content.count('tab-moat-profile')}")
print(f"  tab-planner: {content.count('tab-planner')}")
print(f"  tab-landing: {content.count('tab-landing')}")
print(f"  study-desk-setup: {content.count('study-desk-setup')}")
print(f"  session-summary-screen: {content.count('session-summary-screen')}")
print(f"  study-material: {content.count('study-material')}")
print(f"  course-selector: {content.count('course-selector')}")
print(f"  startStudySession: {content.count('startStudySession')}")
print(f"  generateAdaptiveQuiz: {content.count('generateAdaptiveQuiz')}")
print(f"  signInWithGoogle: {content.count('signInWithGoogle')}")
print(f"  firebase: {content.count('firebase')}")
print(f"  StudentUSync: {content.count('StudentUSync')}")
print(f"  </html>: {content.count('</html>')}")
print(f"  </body>: {content.count('</body>')}")
print(f"  </script>: {content.count('</script>')}")

# Find what's at line 562 area in the clean file
lines = content.split('\n')
print(f"\nTotal lines: {len(lines)}")

# Find Study Streak
for i, line in enumerate(lines):
    if 'Study Streak' in line:
        print(f"\nStudy Streak at line {i+1}: {line.strip()}")
        # Show surrounding context
        print(f"Context lines {i-1} to {i+5}:")
        for j in range(max(0,i-1), min(len(lines), i+6)):
            print(f"  {j+1}: {lines[j]}")
        break
