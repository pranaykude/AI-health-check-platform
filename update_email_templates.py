import json
import base64
import os

img_path = r"C:\Users\Pranay\.gemini\antigravity-ide\brain\1e954f98-3080-4d1b-9ee2-29e57b10edb6\media__1779319096385.png"
json_path = r"client\src\config\emailTemplates.json"

with open(img_path, "rb") as f:
    b64 = base64.b64encode(f.read()).decode("utf-8")

img_tag = f'<br /><br /><img src="data:image/png;base64,{b64}" alt="ORAI Logo" style="max-width: 150px;" />'

with open(json_path, "r", encoding="utf-8") as f:
    data = json.load(f)

for template in data:
    template["body"] += img_tag

with open(json_path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)

print("Updated successfully.")
