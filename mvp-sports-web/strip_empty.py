import os

file_path = r'c:\Users\Piero\Desktop\PROYECTOS 2026\MVP-Sports-Suite\mvp-sports-web\app\dashboard\championships\page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if line.strip() != "":
        new_lines.append(line.rstrip() + "\n")

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"Empty lines removed. New line count: {len(new_lines)}")
