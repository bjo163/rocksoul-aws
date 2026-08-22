const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (file === 'node_modules' || file.startsWith('.')) continue;
    const resolved = path.join(dir, file);
    const stat = fs.statSync(resolved);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(resolved));
    } else {
      if (file === 'package.json') results.push(resolved);
    }
  }
  return results;
}

const files = walk('.');
let bumped = false;
for (const file of files) {
  try {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('"4.2.0"')) {
      fs.writeFileSync(file, content.replace(/"4\.2\.0"/g, '"4.3.0"'));
      console.log('Bumped', file);
      bumped = true;
    }
  } catch (e) {}
}
if (!bumped) console.log('No package.json files had version 4.2.0');
