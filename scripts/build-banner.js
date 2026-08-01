#!/usr/bin/env node
/**
 * Post-build step: prepend a Node shebang to dist/index.js and chmod +x.
 * TypeScript's tsc strips the shebang from source files when emitting JS,
 * so we re-add it after compilation so the bin entry works as expected.
 */
import fs from 'node:fs';

const FILE = 'dist/index.js';
const SHEBANG = '#!/usr/bin/env node\n';

if (!fs.existsSync(FILE)) {
  console.error(`build-banner: ${FILE} not found. Run \`npm run build\` first.`);
  process.exit(1);
}

const current = fs.readFileSync(FILE, 'utf8');
if (current.startsWith(SHEBANG)) {
  // Already has the shebang (e.g. running build twice in a row).
  process.exit(0);
}

fs.writeFileSync(FILE, SHEBANG + current);
fs.chmodSync(FILE, 0o755);
console.log(`build-banner: shebang added to ${FILE}`);