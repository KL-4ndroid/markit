// scripts/lint-hex.js
// CI-friendly hex violation check. Exits 1 if count > MAX_HEX_BUDGET.
// Outputs a markdown summary suitable for PR comments.

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const MAX_HEX_BUDGET = Number(process.env.MAX_HEX_BUDGET || 58);

// 1. Capture eslint JSON
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
  let data;
  try {
    data = JSON.parse(buf.toString('utf8'));
  } catch (e) {
    console.error('Failed to parse eslint output:', e.message);
    process.exit(2);
  }

  // 2. Count hex violations
  let total = 0;
  const byFile = new Map();
  for (const result of data) {
    for (const msg of result.messages) {
      if (msg.ruleId === 'no-hex-colors/no-hex-colors') {
        total++;
        const file = result.filePath.replace(/^.*markit-master[/\\]/, '');
        byFile.set(file, (byFile.get(file) || 0) + 1);
      }
    }
  }

  // 3. Output
  console.log(`Total hex violations: ${total}`);
  console.log(`Budget: ${MAX_HEX_BUDGET}`);
  console.log(`Files affected: ${byFile.size}`);

  const topFiles = [...byFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  if (topFiles.length > 0) {
    console.log('\nTop 10 files:');
    for (const [file, count] of topFiles) {
      console.log(`  ${count.toString().padStart(4)} ${file}`);
    }
  }

  // 4. Emit GitHub Actions output (for workflow integration)
  if (process.env.GITHUB_STEP_SUMMARY) {
    const summary = [
      `## 🎨 Hex Violation Report`,
      '',
      `- **Total**: ${total} (budget: ${MAX_HEX_BUDGET})`,
      `- **Status**: ${total <= MAX_HEX_BUDGET ? '✅ Within budget' : '❌ Over budget'}`,
      `- **Files**: ${byFile.size}`,
      '',
      topFiles.length > 0 ? '### Top files\n| Count | File |\n|---|---|\n' +
        topFiles.map(([f, c]) => `| ${c} | \`${f}\` |`).join('\n') : '',
    ].filter(Boolean).join('\n');
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  }

  // 5. Exit code
  if (total > MAX_HEX_BUDGET) {
    console.error(`\n❌ Hex violations (${total}) exceed budget (${MAX_HEX_BUDGET})`);
    process.exit(1);
  } else {
    console.log(`\n✅ Hex violations (${total}) within budget (${MAX_HEX_BUDGET})`);
    process.exit(0);
  }
});