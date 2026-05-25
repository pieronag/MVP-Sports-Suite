const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'mvp-sports-app', 'components', 'icons', 'achievements');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
files.forEach(f => {
    const p = path.join(dir, f);
    let content = fs.readFileSync(p, 'utf8');
    if (!content.includes('viewBox')) {
        content = content.replace('<Svg ', '<Svg viewBox="0 0 512 512" ');
        fs.writeFileSync(p, content);
    }
});
console.log('Done fixing viewBox');
