import { copyFileSync, existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

// Next 16's client requests flat segment names; some exported files are nested.
// Keep the originals and provide byte-identical aliases for static asset servers.
export function segmentAliasPath(path) {
  const parts = path.split('/');
  if (parts.some(part => !part || part === '.' || part === '..' || part.includes('\\'))) throw new Error('mobile_segment_path_invalid');
  const index = parts.findIndex(part => part.startsWith('__next.'));
  if (index < 0 || index === parts.length - 1 || !path.endsWith('.txt')) return null;
  return [...parts.slice(0, index), parts.slice(index).join('.')].join('/');
}

export function configureMobileSegmentAliases(root, { check = false } = {}) {
  const files = [];
  function walk(folder) {
    for (const entry of readdirSync(folder)) {
      const path = join(folder, entry); const stat = lstatSync(path);
      if (stat.isSymbolicLink()) throw new Error('mobile_output_symlink_forbidden');
      if (stat.isDirectory()) walk(path);
      else if (stat.isFile()) files.push(relative(root, path).split(sep).join('/'));
    }
  }
  walk(root);
  const aliases = new Map();
  for (const source of files) {
    const target = segmentAliasPath(source);
    if (!target) continue;
    const contents = readFileSync(join(root, source));
    if (aliases.has(target) && !contents.equals(readFileSync(join(root, aliases.get(target))))) throw new Error('mobile_segment_alias_collision');
    if (existsSync(join(root, target))) {
      if (!lstatSync(join(root, target)).isFile() || !contents.equals(readFileSync(join(root, target)))) throw new Error('mobile_segment_alias_collision');
    } else if (check) throw new Error('mobile_segment_alias_missing');
    aliases.set(target, source);
  }
  // Validate the entire plan before writing any alias; never replace a differing file.
  if (!check) for (const [target, source] of aliases) if (!existsSync(join(root, target))) copyFileSync(join(root, source), join(root, target));
  return aliases.size;
}
