import json
import os

paths = [
    r"C:\Users\simok38\.gemini\antigravity-ide\brain\7b5b9f0a-47d2-445b-8a48-06cb4b600838\.system_generated\logs\transcript.jsonl",
    r"C:\Users\simok38\.gemini\antigravity-ide\brain\abf70b46-43e2-4a48-be1f-fefcce1b4406\.system_generated\logs\transcript.jsonl"
]

def search_file(path):
    print(f"Searching {os.path.basename(os.path.dirname(os.path.dirname(os.path.dirname(path))))}...")
    if not os.path.exists(path):
        print("Path does not exist.")
        return
    
    with open(path, "r", encoding="utf-8") as f:
        for line_num, line in enumerate(f, 1):
            try:
                data = json.loads(line)
                step = data.get("step_index", "unknown")
                source = data.get("source", "unknown")
                type_ = data.get("type", "unknown")
                
                def check_val(val, key_path=""):
                    if isinstance(val, str):
                        if len(val) > 20000:
                            print(f"Found large string at step {step} (length: {len(val)}) type: {type_} source: {source} key: {key_path}")
                            # print first 100 chars
                            print("  Snippet:", repr(val[:100]))
                    elif isinstance(val, dict):
                        for k, v in val.items():
                            check_val(v, f"{key_path}.{k}" if key_path else k)
                    elif isinstance(val, list):
                        for idx, item in enumerate(val):
                            check_val(item, f"{key_path}[{idx}]")
                
                check_val(data)
            except Exception as e:
                pass

for p in paths:
    search_file(p)
