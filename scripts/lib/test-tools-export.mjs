import { existsSync, lstatSync, realpathSync, rmSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

// Static hosts have no proxy. Remove only the generated test-route directories;
// source files and the shared recovery/sync infrastructure remain untouched.
export function excludeTestToolsFromExport(outputRoot) {
  if (lstatSync(outputRoot).isSymbolicLink()) throw new Error('test_tools_export_symlink_forbidden');
  const root = realpathSync(outputRoot);
  const targets = ['recovery', 'settings/data'].map(route => resolve(root, route));
  for (const target of targets) {
    const relativeTarget = relative(root, target);
    if (!relativeTarget || relativeTarget === '..' || relativeTarget.startsWith(`..${sep}`) || isAbsolute(relativeTarget)) {
      throw new Error('test_tools_export_path_outside_output');
    }
    // Validate every existing ancestor before any recursive deletion.
    let ancestor = root;
    for (const part of relativeTarget.split(sep)) {
      ancestor = join(ancestor, part);
      if (existsSync(ancestor) && lstatSync(ancestor).isSymbolicLink()) throw new Error('test_tools_export_symlink_forbidden');
    }
  }
  for (const target of targets) rmSync(target, { recursive: true, force: true });
}
