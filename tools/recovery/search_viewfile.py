import json
import os

TRANSCRIPT_PATHS = [
    r"C:\Users\simok38\.gemini\antigravity-ide\brain\7b5b9f0a-47d2-445b-8a48-06cb4b600838\.system_generated\logs\transcript.jsonl",
    r"C:\Users\simok38\.gemini\antigravity-ide\brain\abf70b46-43e2-4a48-be1f-fefcce1b4406\.system_generated\logs\transcript.jsonl",
]

# We need to look at VIEW_FILE steps where index.html content was returned
candidates = []

for path in TRANSCRIPT_PATHS:
    if not os.path.exists(path):
        continue
    conv_id = os.path.basename(os.path.dirname(os.path.dirname(os.path.dirname(path))))
    print(f"\nScanning {conv_id}...")
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            try:
                data = json.loads(line)
            except:
                continue
            step = data.get("step_index", "?")
            type_ = data.get("type", "")
            
            # Check VIEW_FILE steps
            if type_ == "VIEW_FILE":
                content = data.get("content", "")
                if isinstance(content, str) and "<!DOCTYPE html>" in content and len(content) > 50000:
                    candidates.append((len(content), step, conv_id, content))
                    print(f"  Step {step}: VIEW_FILE result length={len(content)}")
                    continue
            
            # Also check tool_calls for view_file  
            tool_calls = data.get("tool_calls", [])
            for tc in tool_calls:
                name = tc.get("name", "")
                if name == "view_file":
                    args = tc.get("args", {})
                    target = str(args.get("AbsolutePath", ""))
                    if "index.html" in target:
                        print(f"  Step {step}: view_file call for {target}")
            
            # Check outputs / results
            content = data.get("content", "")
            if isinstance(content, str) and "<!DOCTYPE html>" in content and len(content) > 50000:
                candidates.append((len(content), step, conv_id, content))
                print(f"  Step {step}: content field has HTML, length={len(content)}")

print(f"\nTotal candidates: {len(candidates)}")
if candidates:
    candidates.sort(key=lambda x: x[0], reverse=True)
    best = candidates[0]
    print(f"Best: step={best[1]}, length={best[0]}")
    out_path = r"c:\Users\simok38\.gemini\antigravity-ide\scratch\Student-U\recovered_viewfile.html"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(best[3])
    print(f"Saved to: {out_path} ({os.path.getsize(out_path)} bytes)")
