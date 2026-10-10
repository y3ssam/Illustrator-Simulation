const fs = require('node:fs');
const path = require('node:path');

const types = ['sketch', 'mono', 'color'];
const scopes = ['head', 'bust', 'half', 'full'];
const imageExtension = /\.(?:png|jpe?g|webp|gif)$/i;

function buildIndex(root) {
  const index = {};
  for (const type of types) for (const scope of scopes) {
    const key = `${type}/${scope}`;
    const directory = path.join(root, 'assets', 'thumbnails', type, scope);
    index[key] = fs.existsSync(directory)
      ? fs.readdirSync(directory, { withFileTypes: true })
          .filter(entry => entry.isFile() && imageExtension.test(entry.name))
          .map(entry => `assets/thumbnails/${key}/${entry.name}`)
          .sort()
      : [];
  }
  return index;
}

if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  const output = path.join(root, 'data', 'thumbnail-index.json');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(buildIndex(root), null, 2) + '\n');
}

module.exports = { buildIndex };
