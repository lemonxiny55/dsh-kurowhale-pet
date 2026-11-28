import { validateSkinDirectory } from '../plugin/skins.js';

const args = process.argv.slice(2);
let dirArg = null;
let strict = false;
let asJson = false;

for (const arg of args) {
  if (arg === '--strict') strict = true;
  else if (arg === '--json') asJson = true;
  else if (!dirArg) dirArg = arg;
  else {
    console.error(`Unexpected argument: ${arg}`);
    process.exit(1);
  }
}

if (!dirArg) {
  console.error('Usage: node scripts/validate-skin.mjs <skin-directory> [--strict] [--json]');
  process.exit(1);
}

const result = validateSkinDirectory(dirArg, { strict });
if (asJson) {
  console.log(JSON.stringify(result, null, 2));
} else {
  const status = result.ok ? 'PASS' : 'FAIL';
  console.log(`[${status}] ${result.skinName ?? dirArg} (${result.mode})`);
  if (result.metadata) {
    console.log(`  Spritesheet: ${result.metadata.width}x${result.metadata.height} (${result.metadata.rows} rows, ${result.metadata.format}, alpha=${result.metadata.hasAlpha})`);
  }
  const soundKeys = Object.keys(result.sounds ?? {});
  if (soundKeys.length) console.log(`  Custom sounds: ${soundKeys.join(', ')}`);
  for (const w of result.warnings) console.log(`  WARN: ${w}`);
  for (const e of result.errors) console.error(`  ERR: ${e}`);
}

process.exit(result.ok ? 0 : 1);
