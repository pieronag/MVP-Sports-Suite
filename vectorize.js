const fs = require('fs');
const path = require('path');
const potrace = require('potrace');

const inputDir = path.join(__dirname, 'iconos svg');
const outputFilePath = path.join(__dirname, 'mvp-sports-app', 'components', 'icons', 'achievements', 'index.tsx');

const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.svg'));

let components = `import React from 'react';\nimport Svg, { Path, G } from 'react-native-svg';\n\n`;

async function processFile(file) {
    return new Promise((resolve, reject) => {
        const filePath = path.join(inputDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Extract base64
        const match = content.match(/href="data:image\/png;base64,([^"]+)"/);
        if (!match) {
            console.warn('No base64 found in ' + file);
            resolve(null);
            return;
        }
        
        const base64Data = match[1];
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Trace parameters
        const params = {
            color: 'currentColor',
            optTolerance: 0.2,
            turdSize: 2,
            alphaMax: 1
        };

        potrace.trace(buffer, params, (err, svg) => {
            if (err) {
                console.error('Error tracing ' + file, err);
                resolve(null);
                return;
            }
            
            // Extract the path data
            const pathMatch = svg.match(/<path[^>]*d="([^"]+)"/);
            const pathData = pathMatch ? pathMatch[1] : '';
            
            // Extract dimensions
            const wMatch = svg.match(/width="([^"]+)"/);
            const hMatch = svg.match(/height="([^"]+)"/);
            const w = wMatch ? wMatch[1] : 512;
            const h = hMatch ? hMatch[1] : 512;
            
            // Generate Component Name
            const baseName = file.replace('.svg', '');
            const componentName = baseName.charAt(0).toUpperCase() + baseName.slice(1);
            
            const componentStr = `export const ${componentName} = ({ color = "currentColor", size = 24, ...props }: any) => (
  <Svg width={props.width || size} height={props.height || size} viewBox="0 0 ${w} ${h}" fill="none" {...props}>
    <G fill={color}>
      <Path d="${pathData}" />
    </G>
  </Svg>
);
`;
            resolve({ name: componentName, code: componentStr });
        });
    });
}

async function main() {
    let results = [];
    for (const file of files) {
        console.log('Processing ' + file);
        const res = await processFile(file);
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
}

main().catch(console.error);
