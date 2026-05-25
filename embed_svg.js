const fs = require('fs');
const path = require('path');

const inputDir = path.join(__dirname, 'iconos svg');
const outputFilePath = path.join(__dirname, 'mvp-sports-app', 'components', 'icons', 'achievements', 'index.tsx');

const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.svg'));

let components = `import React from 'react';\nimport { Image as RNImage } from 'react-native';\n\n`;

function processFile(file) {
    const filePath = path.join(inputDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Extract base64
    const match = content.match(/href="data:image\/png;base64,([^"]+)"/);
    if (!match) {
        console.warn('No base64 found in ' + file);
        return null;
    }
    
    const base64Data = "data:image/png;base64," + match[1];
    
    // Generate Component Name
    const baseName = file.replace('.svg', '');
    const componentName = baseName.charAt(0).toUpperCase() + baseName.slice(1);
    
    const componentStr = `export const ${componentName} = ({ size = 24, color, ...props }: any) => (
  <RNImage
    source={{ uri: "${base64Data}" }}
    style={[{ width: props.width || size, height: props.height || size }, color ? { tintColor: color } : undefined]}
    {...props}
  />
);
`;
    return { name: componentName, code: componentStr };
}

let results = [];
for (const file of files) {
    const res = processFile(file);
    if (res) {
        results.push(res);
    }
}

// Sort components by name
results.sort((a, b) => a.name.localeCompare(b.name));

for (const res of results) {
    components += res.code + '\n';
}

fs.writeFileSync(outputFilePath, components);
console.log('Generated ' + outputFilePath);
