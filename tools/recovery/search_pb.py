import re
import os

pb_paths = [
    r"C:\Users\simok38\.gemini\antigravity-ide\conversations\7b5b9f0a-47d2-445b-8a48-06cb4b600838.pb",
    r"C:\Users\simok38\.gemini\antigravity-ide\conversations\abf70b46-43e2-4a48-be1f-fefcce1b4406.pb"
]

def search_pb():
    for pb_path in pb_paths:
        if not os.path.exists(pb_path):
            print(f"File not found: {pb_path}")
            continue
        print(f"\nSearching {pb_path} (size: {os.path.getsize(pb_path)} bytes)...")
        with open(pb_path, "rb") as f:
            data = f.read()
            
        # Search for b"<!DOCTYPE html>" or b"<!DOCTYPE html"
        pattern = b"<!DOCTYPE html"
        indices = [m.start() for m in re.finditer(pattern, data)]
        print(f"Found {len(indices)} occurrences of '<!DOCTYPE html'")
        
        # For each occurrence, let's try to find how far it extends as valid text containing html tags
        for idx, start in enumerate(indices):
            # Let's extract up to 400,000 bytes and find the last </html> tag within valid utf-8 bounds
            chunk = data[start:start+400000]
            # Try to decode as utf-8 (ignoring errors if we hit binary boundary)
            decoded = ""
            try:
                decoded = chunk.decode("utf-8")
            except UnicodeDecodeError as e:
                # Decode up to the failure point
                decoded = chunk[:e.start].decode("utf-8", errors="ignore")
                
            # Find the last </html> tag in the decoded text
            end_tag = "</html>"
            last_end = decoded.rfind(end_tag)
            if last_end != -1:
                html_content = decoded[:last_end + len(end_tag)]
                print(f"  Occurrence {idx} at byte offset {start}: length {len(html_content)} characters")
                # Save it to a file named after the pb file and index
                pb_name = os.path.basename(pb_path).split(".")[0]
                out_name = f"recovered_{pb_name}_{idx}_{len(html_content)}.html"
                with open(out_name, "w", encoding="utf-8") as out_f:
                    out_f.write(html_content)
                print(f"    Saved as {out_name}")
            else:
                # If no </html>, just print length of decoded text
                print(f"  Occurrence {idx} at byte offset {start}: length of text found: {len(decoded)} characters (no </html> found)")

if __name__ == "__main__":
    search_pb()
