import sys

filepath = 'src/components/ProductDetail.tsx'
disclaimer = '                        <p className="review-reward-disclaimer">* 비방, 광고성, 제품과 무관한 리뷰는 사전 고지 없이 혜택 지급이 제한될 수 있습니다.</p>'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the closing div of review-reward-banner (second </div> after the last review-reward-block)
target = '                    </div>\n'
# We need to insert BEFORE the closing div of the banner
# Look for the pattern: "                        </div>\n" followed by "                    </div>\n"
# Insert the disclaimer between these two

for i in range(len(lines)):
    if '이달의 평가자 선정' in lines[i]:
        # Found the second reward block title, now look for the closing </div> of that block
        for j in range(i, min(i+10, len(lines))):
            if lines[j].strip() == '</div>' and lines[j].startswith('                        '):
                # This is the closing div of the second block
                # Insert disclaimer after this line
                insert_at = j + 1
                lines.insert(insert_at, disclaimer + '\n')
                print(f'Inserted at line {insert_at}')
                break
        break

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Done')
