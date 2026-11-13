# Beehive Bullrush

A satirical browser game: NZ MPs play Bullrush on the Parliament lawn. Plain HTML, canvas and JavaScript. No build step, no dependencies.

Public repo: github.com/joelyoungman/beehive-bullrush. Collaborator: Sarah (sandwichwilson), who pushes to `sarah/*` branches.

## Run and check

- `node tools/serve.js` then open http://localhost:8123 (or use the `beehive-bullrush` preview config in `.claude/launch.json`).
- `node --check game.js` after every edit. There are no tests.
- In the browser, `window.__bullrush` exposes `G` (game state), `update(dt)`, `Snd`, `bobbles`, `cam` for checks. Simulate a match by calling `update(1/60)` in a loop.
- Mute before testing in the user's browser: `window.__bullrush.Snd.setMuted(true)`.

## Files

- `index.html`: page, all CSS, menus and scoreboard.
- `game.js`: everything else, in one closure. Sections are marked `/* ---------- name ---------- */`.
- Match-day extras (from Sarah's mockups): party signature moves (`MOVES`; tuned small with `window.__moveScale`, switch off with `window.__moves = false` when balancing), the seat scoreboard (`seatsUpdate()`), weather, crowd placards, lawn life and the coalition wobble, the Player of the round card (`roundStar()`, `showStar()`; per-round tallies in `m.rd`), the LIVE ticker (`note()` in `game.js` feeds `#ticker`; descriptions only, never speech) and the full-time front page, "The Lawn Gazette" (`frontPage()`, `sharePaper()`; the quote of the match comes from `QUOTES`).
- `data.js`: generated. Never edit by hand; run `node tools/build-data.js`.
- `manifest/*.json`: research data per party (who was elected, photo URL, licence, source).
- `tools/build-data.js`: merges manifests into `data.js`. `EXTRA` holds party-site photos for MPs with no free photo.
- `tools/voice-lines.js` and `tools/make-voices.py`: regenerate spoken lines into `voices/` (see below).
- `logo/`: `icon.svg` (badge, also the favicon) and `logo.svg` (badge plus wordmark).
- Internal names (`BULLRUSH_DATA`, `window.__bullrush`, `bullrush.*` localStorage keys) keep the old name on purpose, so saved settings and the debug hooks still work.
- `Sarah suggestions/`: Sarah's write-up and screenshots.
- `audit-reports/`: local only, git-ignored.

## How the game is laid out

- World coordinates: `x` across the lawn, `y` along the run. `proj()` maps to screen. Wide screens play left to right (`HZ` true), tall screens top to bottom. `setLayout()` picks this when a match starts.
- Phases in `G.phase`: `builder`, `call`, `run`, `between`, `over`.
- Balance knobs at the top of `game.js`: `window.__dodge`, `__leash`, `__tspd`, `__hunt`. Simulated matches should last about 5 to 8 rounds.
- `person()` draws every figure (MPs and sideline cameos). `drawMP()` wraps it for players.

## Style: "Match-day programme"

- Six inks only, apart from party colours: ink `#1B2A41`, paper `#F3E9D2`, lawn `#3F8F4E`, red `#E4572E`, gold `#F2B134`, sky `#8EC5E8`. In `game.js` use the `INK`, `PAPER`, `RED`, `GOLD` constants.
- Two fonts: Bowlby One for shouts (`SHOUT`), Barlow Condensed for labels (`LABEL`).
- One ink outline on everything. Flat colour, no gradients on bodies.
- Heads: `eggHead()` gives every photo the same head shape and lighting. Framing per photo is in `CROP` (centre x, centre y, size as fractions of the photo), measured so every face has the same eye spacing and eye position as the Louise Upston crop (found with a face detector's eye landmarks). `ADJ` is now empty. Don't hand-tune one head without checking the rest.
- Sound is synthesised in `Snd`: soft tuned plucks, pops and thumps through a small reverb. No whooshes, no whistle (the user disliked both).

## Rules that matter

- Quotes must be real and sourced. `QUOTES` and `SIDELINE_QUOTES` hold `{ t, src }`. Never invent a line for a real person; MPs without a verified quote use the stock `HOUSE` phrases. Excerpts are fine if the words are theirs.
- No recordings or AI clones of politicians' voices. Voices are two generic NZ text-to-speech voices; each speaker gets a caricature speed and pitch from `VOICE_STYLE` in `game.js` (like a cartoon voice actor, not an impression). After changing `VOICE_STYLE`, delete that speaker's files in `voices/` and re-run the two voice tools.
- Photos are hot-linked, never downloaded into the repo. Free-licence Wikimedia Commons photos are preferred; credit every image (the Credits panel reads `data.js`).
- Do not add descriptions of people's appearance or ethnicity to the manifests.
- Rosters use preliminary 7 November 2026 results (official count due 27 November 2026).
- Commit as `joelyoungman <joelyoungman@users.noreply.github.com>` (already set in this repo's git config).

## Adding or changing a quote

1. Edit `QUOTES` or `SIDELINE_QUOTES` in `game.js` (search for `const QUOTES = {`; note `ADJ` also has name keys, so match carefully).
2. `node tools/voice-lines.js`
3. `pip install edge-tts` (once), then `python tools/make-voices.py`. It only makes missing files. Text is sent to Microsoft's speech service.
4. Commit the new files in `voices/`.

## Known gaps

- Tap controls, audio and the phone layout have only been checked by script and screenshot, not by a person on a phone.
- The pointer hand is a painted illustration, not a photo.
- 41 of 60 MPs have no verified quote yet. Sideline figures (Bishop, Goldsmith, Penk, Ferris, Kapa-Kingi, Willis, Brownlee) only say sourced lines.
- GitHub Pages is not enabled; there is no public play link.
