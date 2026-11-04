import fs from 'node:fs';

const pkgPath = new URL('../package.json', import.meta.url);
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const keepDeps = ['electron-store', 'electron-updater'];
const newDependencies = {};
const newDevDependencies = { ...pkg.devDependencies };

for (const [name, version] of Object.entries(pkg.dependencies || {})) {
  if (keepDeps.includes(name)) {
    newDependencies[name] = version;
  } else {
    newDevDependencies[name] = version;
  }
}

// Sort alphabetically
const sortObj = (obj) => Object.fromEntries(Object.entries(obj).sort((a, b) => a[0].localeCompare(b[0])));

pkg.dependencies = sortObj(newDependencies);
pkg.devDependencies = sortObj(newDevDependencies);

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log('Successfully moved dependencies to devDependencies!');
