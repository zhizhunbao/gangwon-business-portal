import os
import sys

def process_file(file_path):
    if not os.path.isfile(file_path):
        return

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return

    # Determine skill name
    skill_name = "dev-testing_standards" if ".test." in file_path else "dev-frontend_patterns"
    
    # Determine basic description based on file path
    file_name = os.path.basename(file_path)
    if "Page.tsx" in file_name:
        desc = "页面组件"
    elif "View.tsx" in file_name:
        desc = "页面视图"
    elif "hook" in file_path or file_name.startswith("use"):
        desc = "自定义 Hook"
    elif "service" in file_path or "api" in file_name.lower():
        desc = "API 服务层"
    elif "type" in file_name:
        desc = "类型定义"
    elif "constant" in file_name or "enum" in file_name:
        desc = "常量定义"
    elif ".test." in file_name:
        desc = "测试文件"
    else:
        desc = "组件或工具"

    header = f"""/**
 * {desc}
 *
 * 遵循 {skill_name} skill 规范。
 */

"""

    # Check if file already starts with a JSDoc comment
    if content.strip().startswith("/**"):
        # Find end of the first comment
        end_idx = content.find("*/")
        if end_idx != -1:
            comment_block = content[:end_idx+2]
            # Check if it already has the "遵循" line (Chinese or English version)
            if "遵循" in comment_block or "Follows" in comment_block:
                import re
                lines = comment_block.split('\n')
                new_lines = []
                found = False
                for line in lines:
                    if "遵循" in line or "Follows" in line:
                        # Use the specific skill name based on file type
                        new_lines.append(f" * 遵循 {skill_name} skill 规范。")
                        found = True
                    else:
                        new_lines.append(line)
                if not found:
                    new_lines.insert(-1, f" * 遵循 {skill_name} skill 规范。")
                
                new_comment = '\n'.join(new_lines)
                new_content = new_comment + content[end_idx+2:]
            else:
                # Add the 遵循 line within the existing comment block before the closing */
                new_comment = content[:end_idx] + f" * 遵循 {skill_name} skill 规范。\n " + content[end_idx:]
                new_content = new_comment
        else:
            new_content = header + content
    else:
        new_content = header + content

    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
    except Exception as e:
        print(f"Error writing to {file_path}: {e}")

def main():
    # Use provided path or default to frontend/src
    src_dir = sys.argv[1] if len(sys.argv) > 1 else r"frontend\src"
    
    # Resolve absolute path for consistency
    abs_src_dir = os.path.abspath(src_dir)
    print(f"Updating headers in: {abs_src_dir}")
    
    if not os.path.exists(abs_src_dir):
        print(f"Directory not found: {abs_src_dir}")
        return

    count = 0
    for root, dirs, files in os.walk(abs_src_dir):
        for file in files:
            if file.endswith(('.ts', '.tsx')):
                process_file(os.path.join(root, file))
                count += 1
    
    print(f"Successfully processed {count} files.")

if __name__ == "__main__":
    main()
