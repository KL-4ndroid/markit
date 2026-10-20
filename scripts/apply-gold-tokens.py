#!/usr/bin/env python3
"""
scripts/apply-gold-tokens.py
Replace #FFD700 -> text-gold and #FFA500 -> text-gold-warm
across the codebase (gold/award icons).
"""
import re
from pathlib import Path

SKIP_DIRS = {'.next', 'node_modules', '.git', 'docs', 'JapaneseD', 'scripts', '.cursor'}
ROOT = Path('.')

PREFIXES = ['bg', 'text', 'border', 'ring', 'shadow', 'fill', 'stroke',
            'from', 'to', 'via', 'decoration', 'divide']

REPLACEMENTS = [
    ('#FFD700', 'gold'),
    ('#FFA500', 'gold-warm'),
]

def process_file(filepath: Path) -> int:
    content = filepath.read_text(encoding='utf-8')
    original = content
    total = 0
    log = []
    for hex_val, token in REPLACEMENTS:
        for prefix in PREFIXES:
            pattern = re.compile(re.escape(f'{prefix}-[{hex_val}]') + r'(\/(?:[0-9]{1,3}))?')
            matches = pattern.findall(content)
            if matches:
                def repl(m, p=prefix, t=token):
                    return f'{p}-{t}{m.group(1) or ""}'
                content = pattern.sub(repl, content)
                total += len(matches)
                log.append(f'    {prefix}-[{hex_val}] -> {prefix}-{token} ({len(matches)}x)')
    if total > 0:
        filepath.write_text(content, encoding='utf-8', newline='')
        rel = filepath
        try:
            rel = filepath.relative_to(Path.cwd())
        except ValueError:
            pass
        print(f'  {rel}:')
        for line in log:
            print(line)
    return total

def walk(dirs):
    files = []
    for d in dirs:
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
    print('=== Gold/award token replacements ===\n')
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