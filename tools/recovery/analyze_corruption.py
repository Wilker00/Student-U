import json
import os
import re

# Load the current broken index.html
with open(r"c:\Users\simok38\.gemini\antigravity-ide\scratch\Student-U\index.html", "r", encoding="utf-8", errors="ignore") as f:
    current_lines = f.readlines()

print(f"Current file: {len(current_lines)} lines")

# The corruption: line 562 ends the Study Streak HTML div
# Line 563 abruptly starts JavaScript (StudentUSync.saveQuizResult)
# We need to:
# 1. Keep lines 1-562 (everything through the Study Streak span)
# 2. Insert missing HTML body: close open divs, add workspace/profile/etc tabs
# 3. Add opening <script> tag
# 4. Keep lines 563 onwards (all the JavaScript)

# Let's look at what we need to close / add
# After line 562 we need:
# - Close the Study Streak <div> (3 levels: div>div>div = 3 closing divs)
# - Close the stats row div
# - The workspace/study tab HTML
# - The profile/classes tab HTML
# - The progress tab HTML
# - The planner tab HTML
# - Mobile nav
# - Notification box
# - Grain overlay
# - <script> opening tag + JS variable declarations

# Look at what variables are defined at the top of the JS block in the current file
# (which starts at line 563 mid-function)
print("\nLooking for where JS variables are in current file...")
for i, line in enumerate(current_lines[560:580], start=561):
    print(f"{i}: {line.rstrip()}")
