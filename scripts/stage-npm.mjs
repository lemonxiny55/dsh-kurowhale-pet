// Prepare a reviewable npm candidate. This script never publishes it.
// Usage: node scripts/stage-npm.mjs <new-empty-staging-directory>
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { downloadAssets } from '../plugin/resources.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
if (!process.argv[2]) throw Error('Specify a new staging directory');
const destination=resolve(process.argv[2]);
// Refuse to merge with or overwrite any existing directory.
await mkdir(destination);
for (const name of ['plugin','LICENSE','LICENSE-ARTWORK','NOTICE-ARTWORK.md','THIRD_PARTY_NOTICES.md','README.md','README.en.md']) {
  await cp(join(root,name),join(destination,name),{recursive:true,errorOnExist:true,force:false});
}
const pkg=JSON.parse(await readFile(join(root,'package.json'),'utf8'));
const pluginPkg=JSON.parse(await readFile(join(root,'plugin/package.json'),'utf8'));
// The upstream market probe verifies the published manifest's repository.
// Fail staging rather than silently producing an unindexable release again.
if (pkg.repository?.type !== 'git' || pkg.repository?.url !== 'git+https://github.com/lemonxiny55/dsh-kurowhale-pet.git') {
  throw Error('The npm candidate must link back to the KuroWhale GitHub repository');
}
for (const field of ['name','version','repository','homepage','bugs','engines']) {
  if (JSON.stringify(pkg[field]) !== JSON.stringify(pluginPkg[field])) {
    throw Error(`Root and plugin manifests disagree on ${field}`);
  }
}
// The source checkout is private; only the explicitly staged release is publishable.
delete pkg.private;
pkg.files=['plugin/','character/','LICENSE','LICENSE-ARTWORK','NOTICE-ARTWORK.md','THIRD_PARTY_NOTICES.md'];
pkg.license='SEE LICENSE IN LICENSE';
await writeFile(join(destination,'package.json'),JSON.stringify(pkg,null,2)+'\n');
await writeFile(join(destination,'LICENSE'),'Code: MIT License (below). Character artwork: see LICENSE-ARTWORK and NOTICE-ARTWORK.md; third-party materials have their own terms.\n\n'+await readFile(join(root,'LICENSE'),'utf8'));
await mkdir(join(destination,'character'));
for (const [name,bytes] of Object.entries(await downloadAssets(new AbortController().signal))) {
  await writeFile(join(destination,'character',name),bytes,{flag:'wx'});
}
console.log(`Staged ${pkg.name}@${pkg.version} at ${destination}; inspect and pack, do not publish before acceptance.`);
