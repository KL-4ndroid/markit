const fs = require('fs');

const buf = fs.readFileSync('eslint-output.json');
const raw = buf.toString('utf8');
const data = JSON.parse(raw);

const fileHexMap = new Map();
const hexCounts = new Map();
let totalErrors = 0;
for (const result of data) {
  for (const msg of result.messages) {
    if (msg.ruleId === 'no-hex-colors/no-hex-colors') {
      const m = msg.message.match(/"(#[0-9A-Fa-f]{3,8})"/);
      if (m) {
        totalErrors++;
        const file = result.filePath.replace(/^.*markit-master[/\\]/, '');
        if (!fileHexMap.has(file)) fileHexMap.set(file, new Map());
        const inner = fileHexMap.get(file);
        inner.set(m[1], (inner.get(m[1]) || 0) + 1);
        hexCounts.set(m[1], (hexCounts.get(m[1]) || 0) + 1);
      }
    }
  }
}

console.log(`Total hex errors: ${totalErrors}`);
console.log(`Unique hex colors: ${hexCounts.size}`);

console.log('\n=== Top 15 files ===');
[...fileHexMap.entries()].sort((a,b) => {
  return [...b[1].values()].reduce((x,y)=>x+y, 0) - [...a[1].values()].reduce((x,y)=>x+y, 0);
}).slice(0, 15).forEach(([file, hexes]) => {
  const t = [...hexes.values()].reduce((a,b)=>a+b, 0);
  const u = hexes.size;
  console.log(`  ${t.toString().padStart(4)} (${u} unique) ${file}`);
});

console.log('\n=== ALL hex colors ===');
[...hexCounts.entries()].sort((a,b) => b[1] - a[1]).forEach(([hex, n]) => {
  console.log(`  ${hex.padEnd(8)} ${n.toString().padStart(4)}`);
});