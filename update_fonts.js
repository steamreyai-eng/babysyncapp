const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) { 
      results.push(file);
    }
  });
  return results;
}
const files = walk('D:/project/baby log/babysync/src');
let changed = 0;
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  content = content.replace(/PlayfairDisplay_\w+/g, 'Nunito_900Black');
  content = content.replace(/DMSans_\w+/g, 'Nunito_800ExtraBold');
  if (content !== original) {
    fs.writeFileSync(file, content);
    changed++;
  }
});
console.log('Modified files:', changed);
