const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const match = html.match(/<script>([\s\S]*)<\/script>/);

if (!match) {
  throw new Error('Embedded script block not found in index.html');
}

new Function(match[1]);
console.log('Embedded script syntax OK');
