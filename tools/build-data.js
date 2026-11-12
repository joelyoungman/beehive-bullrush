// Merges manifest/*.json (written by the research agents) into data.js for the game.
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'manifest');
const rd = f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
const META = [
  ['labour', 'labour.json', 'Labour', '#D82A20', '#8f1711', '#ffffff', '#ffd9d6'],
  ['national', 'national.json', 'National', '#00529F', '#003366', '#ffffff', '#cfe4ff'],
  ['green', 'green.json', 'Green', '#098137', '#05511f', '#ffffff', '#d2f5dd'],
  ['act', 'act.json', 'ACT', '#FDE401', '#b89f00', '#1a1a1a', '#ff4fa3'],
  ['nzfirst', 'nzfirst.json', 'NZ First', '#1b1b1b', '#000000', '#ffffff', '#c9c9c9'],
  ['top', 'top.json', 'TOP', '#09B598', '#067563', '#ffffff', '#d5fff7'],
  ['tpm', 'tpm_departed.json', 'Te Pāti Māori', '#D12C38', '#111111', '#ffffff', '#ffffff'],
];
const SHORT = { 'Julie Anne Genter': 'Genter', 'Ricardo Menéndez March': 'Menéndez March', 'Hana-Rawhiti Maipi-Clarke': 'Maipi-Clarke' };
// Photos the agents flagged as not confirmed to be the right person: use a drawn stand-in instead.
const NO_PHOTO = new Set();
// Party-site campaign portraits for MPs with no free-licence photo. These are the parties' own copyright, hot-linked for parody.
const P = (img, by, src) => ({ img, by, lic: '© ' + by + ' (campaign photo, not free-licensed)', src });
const EXTRA = {
  'Craig Renney': P('https://www.labour.org.nz/media/inok2c50/craig-renney.jpg?width=640&format=webp&quality=80', 'NZ Labour Party', 'https://www.labour.org.nz/2026-campaign/our-candidates/craig-renney/'),
  'Jessica Rowe': P('https://www.national.org.nz/_next/image?url=https%3A%2F%2Fassets.national.org.nz%2Fweb%2Fprod%2FCandidate-Jessica-Rowe-2026.jpg%3Fv%3D1789094360&w=828&q=75', 'NZ National Party', 'https://www.national.org.nz/team/jessicarowe'),
  'Daniel Eb': P('https://assets.nationbuilder.com/garethmorgan/pages/9874/meta_images/original/candidate-daniel-eb.jpg?1779966213', 'The Opportunity Party', 'https://www.opportunity.org.nz/candidate-daniel-eb'),
  'Eden Skipper': P('https://assets.nationbuilder.com/garethmorgan/pages/9873/meta_images/original/candidate-eden-skipper.jpg?1779966000', 'The Opportunity Party', 'https://www.opportunity.org.nz/candidate-eden-skipper'),
  'Sarah Lucas': P('https://assets.nationbuilder.com/garethmorgan/pages/9872/meta_images/original/candidate-sarah-lucas.jpg?1779965809', 'The Opportunity Party', 'https://www.opportunity.org.nz/candidate-sarah-lucas'),
  'Taine Randell': P('https://assets.nationbuilder.com/nzfirst/pages/10724/features/original/Candidate_Headline_Images_%2874%29.png?1786247112', 'New Zealand First', 'https://www.nzfirst.nz/taine_randell'),
  'Craig Stobo': P('https://assets.nationbuilder.com/nzfirst/pages/12342/features/original/Candidate_Headline_Images_%282%29.png?1789341518', 'New Zealand First', 'https://www.nzfirst.nz/craig_stobo'),
};
const short = n => SHORT[n] || n.split(' ').slice(-1)[0];
// Direct upload.wikimedia.org thumbnail for a Special:FilePath URL. Unlike the FilePath redirect it sends
// CORS headers, so the game can read the pixels to cut the head out for the bobblehead look. (Sarah's idea.)
const crypto = require('crypto');
const corsThumb = url => {
  const m = /Special:FilePath\/([^?]+)/.exec(url || ''); if (!m) return null;
  const file = decodeURIComponent(m[1]).replace(/ /g, '_'), h = crypto.createHash('md5').update(file).digest('hex');
  const enc = encodeURIComponent(file).replace(/%2C/g, ',');
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${h[0]}/${h.slice(0, 2)}/${enc}/250px-${enc}${/\.(svg|tiff?)$/i.test(file) ? '.png' : ''}`;
};
const person = m0 => { const x = EXTRA[m0.name], m = x ? { ...m0, image_url: x.img, attribution: x.by, license: x.lic, source_page: x.src } : m0; return {
  name: m.name, short: short(m.name),
  img: NO_PHOTO.has(m.name) ? null : (m.image_url ? m.image_url.replace(/([?&])width=\d+(?=$)/, '$1width=250') : null),
  cors: NO_PHOTO.has(m.name) ? null : corsThumb(m.image_url),
  status: m.elected_2026 ?? m.departed_2026,
  leader: /leader/i.test(m.role || '') && !/deputy/i.test(m.role || ''),
  credit: m.image_url && !NO_PHOTO.has(m.name) ? { by: m.attribution, lic: m.license, src: m.source_page } : null,
}; };
const out = { parties: [], departed: [], env: null, dropped: [] };
for (const [id, file, name, color, trim, text, tie] of META) {
  const j = rd(file);
  const members = [];
  for (const m of j.members) {
    if (m.elected_2026 === false) { out.dropped.push({ name: m.name, party: name, why: m.elected_note }); continue; }
    members.push(person(m));
  }
  out.parties.push({ id, name, color, trim, text, tie, seats: j.seats_2026, status: j.results_status, members });
  if (j.departed) out.departed = j.departed.map(person);
}
const e = rd('environment.json');
out.env = {
  backgrounds: e.backgrounds.map(b => ({ title: b.title, url: b.image_url, by: b.attribution, lic: b.license, src: b.source_page })),
};
fs.writeFileSync(path.join(__dirname, '..', 'data.js'), '// Generated by tools/build-data.js from manifest/*.json\nwindow.BULLRUSH_DATA = ' + JSON.stringify(out, null, 1) + ';\n');
console.log(out.parties.map(p => p.name + ':' + p.members.length).join(' '), '| departed', out.departed.length, '| dropped', out.dropped.map(d => d.name).join(','));
