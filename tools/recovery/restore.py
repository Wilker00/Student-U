import json
import os
import re

paths = [
    r"C:\Users\simok38\.gemini\antigravity-ide\brain\61943f3f-b87c-4d1a-a074-841a63ae7928\.system_generated\logs\transcript.jsonl",
    r"C:\Users\simok38\.gemini\antigravity-ide\brain\7b5b9f0a-47d2-445b-8a48-06cb4b600838\.system_generated\logs\transcript.jsonl",
    r"C:\Users\simok38\.gemini\antigravity-ide\brain\abf70b46-43e2-4a48-be1f-fefcce1b4406\.system_generated\logs\transcript.jsonl"
]

def search_for_html():
    candidates = []
    for path in paths:
        if not os.path.exists(path):
            print(f"Path does not exist: {path}")
            continue
        print(f"Reading {path}...")
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            for line_num, line in enumerate(f, 1):
                # Search for occurrences of <!DOCTYPE html>
                if "<!DOCTYPE html>" in line:
                    try:
                        # Try to parse as JSON
                        data = json.loads(line)
                        # We want to extract any string in the json that contains <!DOCTYPE html>
                        # Let's write a recursive function to find all such strings
                        found_strings = []
                        def find_strings(val, key_path=""):
                            if isinstance(val, str):
                                if "<!DOCTYPE html>" in val:
                                    found_strings.append((len(val), val, key_path))
                            elif isinstance(val, dict):
                                for k, v in val.items():
                                    find_strings(v, f"{key_path}.{k}" if key_path else k)
                            elif isinstance(val, list):
                                for idx, item in enumerate(val):
                                    find_strings(item, f"{key_path}[{idx}]")
                        
                        find_strings(data)
                        for length, val, key in found_strings:
                            candidates.append({
                                "path": path,
                                "line_num": line_num,
                                "step": data.get("step_index", "unknown"),
                                "length": length,
                                "content": val,
                                "key": key
                            })
                            print(f"  Step {data.get('step_index')}: found string of length {length} in key: {key}")
                    except Exception as e:
                        # If not JSON, maybe just try a regex or manual extraction
                        print(f"  Line {line_num} error parsing JSON: {e}")
                        
    if not candidates:
        print("No candidates found.")
        return
        
    # Sort by length descending, and write the longest one
    candidates.sort(key=lambda x: x["length"], reverse=True)
    longest = candidates[0]
    print(f"\nLongest HTML found is of length {longest['length']} at step {longest['step']} of {os.path.basename(os.path.dirname(os.path.dirname(os.path.dirname(longest['path']))))}")
    
    out_path = r"c:\Users\simok38\.gemini\antigravity-ide\scratch\Student-U\recovered_index.html"
    with open(out_path, "w", encoding="utf-8") as out_f:
        out_f.write(longest["content"])
    print(f"Saved to {out_path}")

if __name__ == "__main__":
    search_for_html()
