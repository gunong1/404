const fs = require('fs');
const f = 'src/components/ProductDetail.tsx';
const content = fs.readFileSync(f, 'utf8');
const lines = content.split('\n');
const disclaimer = '                        <p className="review-reward-disclaimer">* 비방, 광고성, 제품과 무관한 리뷰는 사전 고지 없이 혜택 지급이 제한될 수 있습니다.</p>';

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('이달의 평가자 선정')) {
        for (let j = i; j < Math.min(i + 10, lines.length); j++) {
            if (lines[j].trim() === '</div>' && lines[j].startsWith('                        ')) {
                lines.splice(j + 1, 0, disclaimer);
                console.log('Inserted at index:', j + 1);
                break;
            }
        }
        break;
    }
}

fs.writeFileSync(f, lines.join('\n'), 'utf8');
console.log('Done');
