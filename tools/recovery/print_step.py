import json

path = r"C:\Users\simok38\.gemini\antigravity-ide\brain\abf70b46-43e2-4a48-be1f-fefcce1b4406\.system_generated\logs\transcript.jsonl"
with open(path, "r", encoding="utf-8", errors="ignore") as f:
    for line in f:
        data = json.loads(line)
        if data.get("step_index") == 167:
            print(f"Step 167 keys: {list(data.keys())}")
            print(f"Step 167 type: {data.get('type')}")
            # Print a recursive summary of strings and lengths
            def print_summary(val, key=""):
                if isinstance(val, str):
                    print(f"  {key}: length {len(val)}, starts with {repr(val[:100])}")
                elif isinstance(val, dict):
                    for k, v in val.items():
                        print_summary(v, f"{key}.{k}" if key else k)
                elif isinstance(val, list):
                    for idx, item in enumerate(val):
                        print_summary(item, f"{key}[{idx}]")
            print_summary(data)
