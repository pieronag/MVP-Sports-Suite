const fs = require('fs');
const path = require('path');

const srcDir = 'c:\\\\Users\\\\Piero\\\\Desktop\\\\PROYECTOS 2026\\\\MVP-Sports-Suite\\\\mvp-sports-app\\\\components\\\\icons\\\\sports';

const files = ['futbol.svg', 'padel.svg', 'tenis.svg', 'basquetbol.svg', 'voleibol.svg'];
const names = ['FutbolIcon', 'PadelIcon', 'TenisIcon', 'BasquetbolIcon', 'VoleibolIcon'];
const webNames = ['SoccerIcon', 'PadelIcon', 'TennisIcon', 'BasketballIcon', 'VolleyballIcon'];

let appCode = `import React from 'react';\nimport Svg, { Path, G } from 'react-native-svg';\n\n`;
let webCode = `import React from 'react';\n\n`;

files.forEach((f, i) => {
    const content = fs.readFileSync(path.join(srcDir, f), 'utf-8');
    const dMatches = [...content.matchAll(/<path d=\"([^\"]+)\"/g)].map(m => m[1]);
    
    // React Native App Code
    appCode += `export const ${names[i]} = ({ color = "currentColor", size = 24, ...props }: any) => (
  <Svg width={size} height={size} viewBox="0 0 512 512" fill="none" {...props}>
    <G transform="translate(0,512) scale(0.1,-0.1)" fill={color}>
`;
    dMatches.forEach(d => {
        appCode += `      <Path d="${d}" />\n`;
    });
    appCode += `    </G>
  </Svg>
);\n\n`;

    // React Web Code
    webCode += `export const ${webNames[i]} = ({ className = "w-6 h-6", ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor" className={className} {...props}>
    <g transform="translate(0,512) scale(0.1,-0.1)">
`;
    dMatches.forEach(d => {
        webCode += `      <path d="${d}" />\n`;
    });
    webCode += `    </g>
  </svg>
);\n\n`;
});

fs.writeFileSync(path.join(srcDir, 'index.tsx'), appCode);
fs.writeFileSync('c:\\\\Users\\\\Piero\\\\Desktop\\\\PROYECTOS 2026\\\\MVP-Sports-Suite\\\\mvp-sports-web\\\\components\\\\icons\\\\SportsIcons.tsx', webCode);

console.log('SVGs processed and components generated.');
