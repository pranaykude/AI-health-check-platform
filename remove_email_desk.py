import os

filepath = r"client/src/pages/SupportMemberProfile.jsx"

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    line_num = i + 1
    # Skip button block (lines 888 to 896)
    if 888 <= line_num <= 896:
        continue
    # Skip tab content block (lines 1224 to 1346)
    if 1224 <= line_num <= 1346:
        continue
    new_lines.append(line)

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Email Desk removed successfully.")
