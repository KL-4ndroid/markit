#!/usr/bin/env python3
"""
scripts/apply-hex-tokens-phase5.py
Phase 5: more B-level replacements (use existing tokens, no new tokens added).

This script is intentionally simple (string replace, no regex state issues)
and uses the same algorithm as Phase 4 but without the lastIndex bug.
"""
import re
import sys
from pathlib import Path

# Skip directories
SKIP_DIRS = {'.next', 'node_modules', '.git', 'docs', 'JapaneseD', 'scripts', '.cursor'}

# Replacements: (hex, token_name, description)
# Note: prefix is generic (bg/text/border/etc) — we apply all 12 prefixes.
REPLACEMENTS = [
    ('#6F8B74', 'primary/90', '灰綠 → primary 90% (WelcomeScreen link hover)'),
    ('#8A867D', 'muted-foreground', '中暖灰 → muted-foreground (次要文字)'),
    ('#3F3A37', 'foreground/70', '深暖灰 → foreground 70%'),
    ('#CFC7BA', 'neutral-stripe-dark', '表單邊框 → neutral-stripe-dark (值相近)'),
    ('#4D7F87', 'info', '灰藍 → info token'),
    ('#007AFF', 'info', 'iOS 藍 → info (移除設計依賴)'),
]

PREFIXES = ['bg', 'text', 'border', 'ring', 'shadow', 'fill', 'stroke',
            'from', 'to', 'via', 'decoration', 'divide']

def process_file(filepath: Path) -> int:
    content = filepath.read_text(encoding='utf-8')
    original = content
    total = 0
    log = []

    for hex_val, token, desc in REPLACEMENTS:
        for prefix in PREFIXES:
            # Match: bg-[#XXXX] or bg-[#XXXX]/20
            pattern = re.compile(
                re.escape(f'{prefix}-[{hex_val}]') + r'(\/(?:[0-9]{1,3}))?'
            )
            matches = pattern.findall(content)
            if matches:
                def repl(m):
                    full = m.group(0)
                    op = m.group(1) or ''
                    return f'{prefix}-{token}{op}'
                content = pattern.sub(repl, content)
                count = len(matches)
                total += count
                log.append(f'    {prefix}-[{hex_val}] -> {prefix}-{token} ({count}x)')

    if total > 0:
        filepath.write_text(content, encoding='utf-8', newline='')
        try:
            rel = filepath.relative_to(Path.cwd())
        except ValueError:
            rel = filepath
        print(f'  {rel}:')
        for line in log:
            print(line)
    return total

def walk(root_dirs):
    files = []
    for d in root_dirs:
        p = Path(d)
        if not p.exists():
            continue
        for f in p.rglob('*.tsx'):
            parts = set(f.parts)
            if parts & SKIP_DIRS:
                continue
            files.append(f)
    return files

if __name__ == '__main__':
    print('=== Phase 5: B-level replacements (Python, no regex state bug) ===\n')
    files = walk(['app', 'components', 'hooks', 'lib'])
    total_files = 0
    total_repl = 0
    for f in files:
        n = process_file(f)
        if n > 0:
            total_files += 1
            total_repl += n
    print(f'\n=== Summary ===')
    print(f'Files modified: {total_files}')
    print(f'Total replacements: {total_repl}')