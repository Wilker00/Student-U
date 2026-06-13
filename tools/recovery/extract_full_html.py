import json
import os

TRANSCRIPT_PATHS = [
    r"C:\Users\simok38\.gemini\antigravity-ide\brain\7b5b9f0a-47d2-445b-8a48-06cb4b600838\.system_generated\logs\transcript.jsonl",
    r"C:\Users\simok38\.gemini\antigravity-ide\brain\abf70b46-43e2-4a48-be1f-fefcce1b4406\.system_generated\logs\transcript.jsonl",
]

candidates = []

for path in TRANSCRIPT_PATHS:
    if not os.path.exists(path):
        print(f"[SKIP] {path} not found")
        continue
    conv_id = path.split("\\")[9]  # Extract conv ID from path
    print(f"\nScanning {conv_id}...")
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            try:
                data = json.loads(line)
            except:
                continue
            step = data.get("step_index", "?")
            tool_calls = data.get("tool_calls", [])
            for tc in tool_calls:
                name = tc.get("name", "")
                args = tc.get("args", {})
                if name == "write_to_file":
                    code = args.get("CodeContent", "")
                    target = args.get("TargetFile", "")
                    if "index.html" in target and "<!DOCTYPE html>" in code:
                        length = len(code)
                        print(f"  Step {step}: write_to_file index.html, length={length}")
                        candidates.append((length, step, conv_id, code))
                elif name == "replace_file_content":
                    code = args.get("ReplacementContent", "")
                    target = args.get("TargetFile", "")
                    if "index.html" in target and len(code) > 20000:
                        print(f"  Step {step}: replace_file_content index.html, length={len(code)}")
                elif name == "multi_replace_file_content":
                    chunks = args.get("ReplacementChunks", [])
                    if isinstance(chunks, list):
                        for chunk in chunks:
                            if isinstance(chunk, dict):
                                rc = chunk.get("ReplacementContent", "")
                                if len(rc) > 20000:
                                    print(f"  Step {step}: multi_replace chunk length={len(rc)}")

if not candidates:
    print("\nNo write_to_file candidates found. Trying content fields...")
    # Try to find HTML in model content fields (view_file results, etc.)
    for path in TRANSCRIPT_PATHS:
        if not os.path.exists(path):
            continue
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                try:
                    data = json.loads(line)
                except:
                    continue
                step = data.get("step_index", "?")
                content = data.get("content", "")
                if isinstance(content, str) and "<!DOCTYPE html>" in content and len(content) > 50000:
                    candidates.append((len(content), step, "content", content))
                    print(f"  Step {step}: content field, length={len(content)}")
else:
    # Sort by length
    candidates.sort(key=lambda x: x[0], reverse=True)
    best_len, best_step, best_conv, best_html = candidates[0]
    print(f"\nBest candidate: step {best_step} from {best_conv}, length={best_len}")
    
    out_path = r"c:\Users\simok38\.gemini\antigravity-ide\scratch\Student-U\recovered_full.html"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(best_html)
    print(f"Saved to: {out_path}")
    print(f"File size: {os.path.getsize(out_path)} bytes")
    
    # Also show all candidates sorted
    print("\nAll candidates (sorted by length):")
    for length, step, conv, _ in candidates:
        print(f"  step={step}, conv={conv[:8]}..., length={length}")
