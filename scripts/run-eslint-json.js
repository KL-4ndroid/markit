const { spawn } = require('child_process');
const fs = require('fs');

const child = spawn('npx', ['eslint', '.', '--format', 'json'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: true,
  windowsHide: true,
});

const chunks = [];
child.stdout.on('data', chunk => chunks.push(Buffer.from(chunk)));
child.stderr.on('data', chunk => chunks.push(Buffer.from(chunk)));

child.on('close', code => {
  const buf = Buffer.concat(chunks);
  console.log('Got', buf.length, 'bytes (exit', code, ')');
  fs.writeFileSync('eslint-output.json', buf);
  // Try parse
  try {
    const data = JSON.parse(buf.toString('utf8'));
    console.log('JSON OK:', data.length, 'entries');
  } catch(e) {
    console.log('JSON parse note:', e.message.split('\n')[0]);
  }
});