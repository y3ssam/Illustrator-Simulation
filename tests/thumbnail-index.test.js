const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildIndex } = require('../scripts/generate-thumbnail-index');
const { Engine, validateSave, VERSION } = require('../engine');

const root = path.resolve(__dirname, '..');
const index = JSON.parse(fs.readFileSync(path.join(root, 'data', 'thumbnail-index.json'), 'utf8'));
const typeNames = { 낙서:'sketch', 단색:'mono', 풀채색:'color' };
const scopeNames = { 두상:'head', 흉상:'bust', 반신:'half', 전신:'full' };
assert.equal(Object.keys(index).length, 12);
const sampleIndex = structuredClone(index);
sampleIndex['sketch/head'] = ['assets/thumbnails/sketch/head/01.png', 'assets/thumbnails/sketch/head/03.png'];
for (const [type, folder] of Object.entries(typeNames)) for (const [scope, subfolder] of Object.entries(scopeNames)) {
  const key = `${folder}/${subfolder}`;
  for (const image of index[key]) assert.ok(image.startsWith(`assets/thumbnails/${key}/`));
  const engine = new Engine();
  engine.s.level = 100;
  assert.equal(engine.setThumbnailIndex(index), true);
  const jobs = Array.from({ length: 20 }, () => {
    engine.openTypes = () => [{ type, scope }];
    return engine.createJob();
  });
  assert.ok(jobs.every(job => index[key].length ? index[key].includes(job.thumbnail) : job.thumbnail === undefined));
}

const engine = new Engine();
engine.s.level = 5;
assert.equal(engine.setThumbnailIndex(sampleIndex), true);
engine.openTypes = () => [{ type:'낙서', scope:'두상' }];
const originalRandom = Math.random;
try {
  Math.random = () => 0;
  const first = engine.createJob();
  Math.random = () => 0.999;
  const second = engine.createJob();
  assert.notEqual(first.thumbnail, second.thumbnail);
  engine.s.inbox.push(first);
  assert.equal(engine.reserve(first.id), true);
  assert.equal(engine.s.reservations[0].thumbnail, first.thumbnail);
  assert.equal(engine.accept(first.id), true);
  assert.equal(engine.s.jobs[0].thumbnail, first.thumbnail);
  const saved = engine.export();
  assert.equal(saved.version, VERSION);
  const reloaded = new Engine(saved);
  assert.equal(reloaded.s.jobs[0].thumbnail, first.thumbnail);
  assert.equal(reloaded.setThumbnailIndex(sampleIndex), true);
  assert.equal(reloaded.assignMissingThumbnails(), false);
  assert.equal(reloaded.s.jobs[0].thumbnail, first.thumbnail);
  const oldSave = structuredClone(saved);
  delete oldSave.jobs[0].thumbnail;
  oldSave.inbox.push(second);
  delete oldSave.inbox[0].thumbnail;
  const old = new Engine(oldSave);
  assert.equal(old.s.jobs[0].thumbnail, undefined);
  old.setThumbnailIndex(sampleIndex);
  assert.equal(old.assignMissingThumbnails(), true);
  assert.ok(old.s.jobs[0].thumbnail);
  assert.ok(old.s.inbox[0].thumbnail);
  assert.equal(old.assignMissingThumbnails(), false);
  assert.equal(new Engine(old.export()).s.jobs[0].thumbnail, old.s.jobs[0].thumbnail);
  const deletedImage = structuredClone(saved);
  deletedImage.jobs[0].thumbnail = 'assets/thumbnails/sketch/head/99.png';
  assert.equal(validateSave(deletedImage).jobs[0].thumbnail, deletedImage.jobs[0].thumbnail);
  const noIndex = new Engine();
  noIndex.openTypes = () => [{ type:'낙서', scope:'두상' }];
  const pending = noIndex.createJob();
  assert.equal(pending.thumbnail, undefined);
  noIndex.s.inbox.push(pending);
  noIndex.setThumbnailIndex(sampleIndex);
  assert.equal(noIndex.assignMissingThumbnails(), true);
} finally {
  Math.random = originalRandom;
}

const fixture = fs.mkdtempSync(path.join(__dirname, '.thumbnail-fixture-'));
try {
  const folder = path.join(fixture, 'assets', 'thumbnails', 'sketch', 'head');
  fs.mkdirSync(folder, { recursive:true });
  for (const name of ['01.png', '03.png', '08.webp', 'ignore.txt']) fs.writeFileSync(path.join(folder, name), 'x');
  assert.deepEqual(buildIndex(fixture)['sketch/head'], [
    'assets/thumbnails/sketch/head/01.png',
    'assets/thumbnails/sketch/head/03.png',
    'assets/thumbnails/sketch/head/08.webp'
  ]);
  fs.rmSync(path.join(folder, '03.png'));
  assert.equal(buildIndex(fixture)['sketch/head'].length, 2);
} finally {
  if (!fixture.startsWith(__dirname + path.sep)) throw new Error('Unexpected fixture path');
  fs.rmSync(fixture, { recursive:true, force:true });
}
console.log('thumbnail index and save compatibility: passed');
