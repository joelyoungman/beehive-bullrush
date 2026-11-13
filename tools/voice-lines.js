// Lists every spoken line in game.js with the file name the game expects, for tools/make-voices.py.
// Usage: node tools/voice-lines.js   (writes tools/voice-lines.json)
const fs = require('fs'), path = require('path'), vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'game.js'), 'utf8');
const i = src.indexOf('const QUOTES = {'), j = src.indexOf('];', src.indexOf('const HOUSE = [')) + 2;
if (i < 0 || j < 2) throw new Error('quotes block not found in game.js');
const ctx = {}; vm.runInNewContext(src.slice(i, j).replace(/^const /gm, 'var '), ctx);

// Must match hash() and slug() in game.js.
const hash = s => { let h = 2166136261; for (let k = 0; k < s.length; k++) { h ^= s.charCodeAt(k); h = Math.imul(h, 16777619); } return h >>> 0; };
const slug = n => n.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
const speak = t => t.replace(/\bBS\b/g, 'B S').replace(/\bcoq\b/g, 'cock');

// Two New Zealand voices. These are generic voices, not impressions of the people quoted.
const MALE = 'en-NZ-MitchellNeural', FEMALE = 'en-NZ-MollyNeural';
const USES_FEMALE = new Set(['Nicola Willis', 'Chlöe Swarbrick', 'Hana-Rawhiti Maipi-Clarke', 'Qiulae Wong']);
const sign = (n, unit) => (n >= 0 ? '+' : '') + n + unit;
const lines = [];
const add = (name, text) => { const h = hash(name); lines.push({ file: `${slug(name)}-${hash(text).toString(36)}.mp3`, text: speak(text), voice: USES_FEMALE.has(name) ? FEMALE : MALE, rate: sign((h % 13) - 6, '%'), pitch: sign(((h >>> 4) % 17) - 8, 'Hz') }); };
for (const [name, qs] of Object.entries({ ...ctx.QUOTES, ...ctx.SIDELINE_QUOTES })) for (const q of qs) add(name, q.t);
for (const t of ['Order!', 'Order! Order!']) add('Gerry Brownlee', t);
for (const t of ctx.HOUSE) { lines.push({ file: `house-a-${hash(t).toString(36)}.mp3`, text: t, voice: MALE, rate: '+0%', pitch: '+0Hz' }); lines.push({ file: `house-b-${hash(t).toString(36)}.mp3`, text: t, voice: FEMALE, rate: '+0%', pitch: '+0Hz' }); }
const seen = new Set(), out = lines.filter(l => !seen.has(l.file) && seen.add(l.file));
fs.writeFileSync(path.join(__dirname, 'voice-lines.json'), JSON.stringify(out, null, 1) + '\n');
console.log(out.length, 'lines');
