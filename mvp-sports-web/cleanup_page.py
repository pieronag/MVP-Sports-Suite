import os

file_path = r'c:\Users\Piero\Desktop\PROYECTOS 2026\MVP-Sports-Suite\mvp-sports-web\app\dashboard\championships\page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Aggressively remove duplicate newlines
import re
# Replace 3 or more newlines with 2
content = re.sub(r'\n{3,}', '\n\n', content)
# Replace 2 or more newlines with 1 (actually we want to keep some spacing for readability)
# But here we seem to have \n \n between EVERY line.
# Let's check a sample.
# 1: "use client";
# 2: 
# 3: import React...
# This is fine.
# But if it is:
# 1: "use client";
# 2:
# 3:
# 4: import React...
# Then it's too much.

# Actually, let's just remove EVERY empty line and then re-add them where appropriate? No.
# I'll just remove lines that only contain whitespace.
lines = content.splitlines()
fixed_lines = []
for line in lines:
    if line.strip() == "":
        fixed_lines.append("")
    else:
        fixed_lines.append(line)

# Now remove consecutive empty lines
result = []
for i, line in enumerate(fixed_lines):
    if line == "":
        if i > 0 and result[-1] == "":
            continue
    result.append(line)

final_content = "\n".join(result)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(final_content)

print("File spacing fixed.")
