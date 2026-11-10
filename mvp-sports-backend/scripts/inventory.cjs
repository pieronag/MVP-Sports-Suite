// Inventario del esquema real a partir de un respaldo: por colección, cada campo con su tipo y en cuántos documentos aparece.
// Uso: node mvp-sports-backend/scripts/inventory.cjs <carpeta del respaldo>
const fs = require('fs'); const path = require('path');
const { docs } = JSON.parse(fs.readFileSync(path.join(process.argv[2], 'firestore.json'), 'utf8'));
const typeOf = (v) => v === null ? 'null' : Array.isArray(v) ? 'array' : v && v.__t ? v.__t : typeof v;
const cols = {};
for (const [p, data] of Object.entries(docs)) {
  const parts = p.split('/'); const col = parts.filter((_, i) => i % 2 === 0).join('/*/');
  const c = (cols[col] ||= { n: 0, fields: {} }); c.n++;
  for (const [k, v] of Object.entries(data)) {
    const f = (c.fields[k] ||= { n: 0, types: {} }); f.n++; f.types[typeOf(v)] = (f.types[typeOf(v)] || 0) + 1;
  }
}
for (const [col, c] of Object.entries(cols).sort()) {
  console.log(`\n## ${col} (${c.n})`);
  console.log(Object.entries(c.fields).sort((a, b) => b[1].n - a[1].n)
    .map(([k, f]) => `${k}:${Object.entries(f.types).map(([t, n]) => Object.keys(f.types).length > 1 ? `${t}×${n}` : t).join('|')}${f.n < c.n ? `(${f.n})` : ''}`).join('  '));
}
