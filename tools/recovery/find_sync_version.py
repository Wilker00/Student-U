import json
import os
import re

# Search the CURRENT conversation transcript for the best (latest complete) view_file output of index.html
path = r"C:\Users\simok38\.gemini\antigravity-ide\brain\7b5b9f0a-47d2-445b-8a48-06cb4b600838\.system_generated\logs\transcript.jsonl"

candidates = []
steps_with_html = []

with open(path, "r", encoding="utf-8", errors="ignore") as f:
    for line in f:
        try:
            data = json.loads(line)
        except:
            continue
        step = data.get("step_index", 0)
        type_ = data.get("type", "")
        content = data.get("content", "")
        
        # Look for any content that has StudentUSync (added in latest version)
        if isinstance(content, str) and "StudentUSync" in content:
            if len(content) > 5000:
                print(f"Step {step} (type={type_}): content has StudentUSync, len={len(content)}")
                candidates.append((step, len(content), content))
        
        # Check tool_calls outputs
        tool_calls = data.get("tool_calls", [])
        for tc in tool_calls:
            result = tc.get("result", "")
            if isinstance(result, str) and "StudentUSync" in result and len(result) > 5000:
                print(f"Step {step}: tool_call result has StudentUSync, len={len(result)}")
                candidates.append((step, len(result), result))

print(f"\nTotal candidates with StudentUSync: {len(candidates)}")
for step, length, _ in sorted(candidates, key=lambda x: x[0]):
    print(f"  Step {step}: length={length}")

if candidates:
    # Take the latest one (highest step before the corruption at step 545)
    pre545 = [(s, l, c) for s, l, c in candidates if s <= 545]
    if pre545:
        best = sorted(pre545, key=lambda x: x[0], reverse=True)[0]
        print(f"\nBest pre-545: step={best[0]}, length={best[1]}")
    else:
        best = sorted(candidates, key=lambda x: x[0], reverse=True)[0]
        print(f"\nBest overall: step={best[0]}, length={best[1]}")
    
    content = best[2]
    
    # Strip line numbers
    content = content.replace('\\n', '\n').replace('\\"', '"').replace('\\\\', '\\')
    lines = content.split('\n')
    clean_lines = []
    for line in lines:
        m = re.match(r'^\d+: (.*)$', line)
        if m:
            clean_lines.append(m.group(1))
        else:
            clean_lines.append(line)
    clean = '\n'.join(clean_lines)
    
    out = r"c:\Users\simok38\.gemini\antigravity-ide\scratch\Student-U\recovered_with_sync.html"
    with open(out, "w", encoding="utf-8") as f:
        f.write(clean)
    print(f"Saved to {out} ({os.path.getsize(out)} bytes)")
    print(f"Has StudentUSync: {'StudentUSync' in clean}")
    print(f"Has tab-workspace: {'tab-workspace' in clean}")
    print(f"Has tab-profile: {'tab-profile' in clean}")
