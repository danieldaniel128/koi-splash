# Koi Splash

A calm match-3 on a moonlit koi pond, built for the mini-game home assignment. Swipe a koi into its neighbour's
cell (or tap a koi, then its neighbour) to line up three or more of a colour. Lily pads float between the koi, and
matches next to a lotus bud open it. To win, bloom all three lotuses and clear 10 red koi in 15 moves. The score
earns up to three stars.

**Play it:** https://danieldaniel128.github.io/koi-splash/ (phone or desktop). It's on GitHub Pages, deployed from
`main` only, so it always shows the last finished milestone.

**Run it:** `npm ci`, then `npm run dev` and open http://localhost:5173 (also reachable from a phone on the same
Wi-Fi). `npm run check` runs the typecheck, lint and tests, and `npm run build` makes the web build in `dist/`.
`npm run bake:art` bakes the art atlases again after a painter changes (see [Asset pipeline](#asset-pipeline)).

## Stack & assets

- **Engine and tools:** PixiJS 8 on WebGL 2, TypeScript (strict), Vite, GSAP for the tweens, Vitest, ESLint and
  Prettier, husky and lint-staged for a pre-commit hook, and GitHub Actions, which checks every pull request and
  publishes to GitHub Pages.
- **Third-party packages** the game ships with (everything else is a dev tool):
  - `pixi.js` 8: MIT.
  - `gsap` 3: GSAP's standard "no charge" license.
  - `@fontsource/nunito` 5, the Nunito font, bundled so the text looks the same on every phone: SIL Open Font
    License 1.1.
- **Visual assets:** all made by us, no third-party images. The koi, lily pads, lotuses and effects are painted by our
  own code painters (`src/art/`) at build time and shipped as texture atlases (`public/art/`, see
  [Asset pipeline](#asset-pipeline)). The garden and the stones round the pond are painted while the game loads, for
  the screen it's on, and the water, the bank and the foam are shaders (`src/view/water/shaders/`). The booster icons
  are small inline SVGs (`src/ui/icons.ts`).
- **Audio assets:** none. Every sound is synthesized live with Web Audio (`src/audio/`): the effects, the music and
  the night ambience. There are no sound files.
- **Requirements:** a browser with WebGL 2 (an up-to-date Chrome, Safari or Firefox; without it the game says so).
  To build it, Node 22.22.1 or newer (`engines` in `package.json`; `.nvmrc` and CI use 24).

### Why this stack

- **PixiJS 8 on WebGL 2.** A fast 2D renderer for the web that batches sprites and lets me write my own shaders. The
  water is a GPU simulation, so I needed real WebGL, not a DOM or canvas-only engine. Pixi gives me that without the
  weight of a full engine, and it runs the same on a phone browser and a desktop.
- **TypeScript, strict.** The game has a lot of small data types (cells, pieces, rounds, blasts, boosters). Strict
  types catch mistakes at build time and make refactors safe; the type maps also tell me every place to touch when I
  add a special, a goal or a booster.
- **Vite.** Instant dev server with hot reload, so I could tune feel and look while playing, and a small, fast
  production build that splits Pixi and GSAP into their own chunks.
- **GSAP.** Game feel lives in timing and easing. GSAP gives me timelines I can chain and await, like DOTween in
  Unity, so a turn is just `await`ed animations, and one clock I can slow for hit-stop.
- **Web Audio, no sound files.** Every sound is synthesized live, so it stays in key with the music, never needs
  loading, and adds nothing to the download.
- **Art painted in code, shipped as atlases.** The art is authored as code painters, so it can be restyled from config
  and the theme and tried at once (`?paint=1`). A build step bakes it into texture atlases at 1x, 2x and 3x, and the
  game loads the one its screen needs like any other asset, so a phone downloads ready pictures instead of painting
  them while it loads, and an artist can swap any atlas for hand-made art.
- **HTML and CSS for the UI, over the canvas.** Text stays crisp, the UI is accessible (real buttons, focus, screen
  readers) and themed with the same tokens as the game.
- **Vitest, ESLint, Prettier, husky.** Tests for the rules and the systems, lint rules that keep each layer to its own
  imports and keep functions small, and formatting and checks on every commit.
- **GitHub Actions and Pages.** Every pull request is checked, and `main` deploys itself, so the play link always has
  the latest stable build.

## AI usage

I built Koi Splash with Claude as my main tool, and I'm upfront about it: most of the code was written by AI, under
my direction.

**What AI did:** wrote most of the code (the model, the view and effects, the water shaders, the sound and music
synthesis, the UI, the tests and the tooling), painted the art in code, ran the browser regression tests, and reviewed
the code against my standards.

**What I did:**

- **Architecture and standards.** I set the architecture and held the code to it.
  - I chose the patterns from the start, and where each one belongs: MVP with a passive view (the whole cascade comes
    back as data), a composition root with constructor injection and no singletons, ports between the presenter and
    the view, state machines for the turn, the boosters and the screens, an event bus, Strategy maps keyed by type (so
    a new special, booster or goal is a few entries), Composite goals, object pools for effects and a boot pipeline.
  - I reviewed with a human eye, reading the code as the teammate who would change it next. I sent back anything
    over-engineered, unclear or a pattern for its own sake, and pushed for one name per idea, every tuning number in
    config, every color from the theme, short self-explanatory functions, and async code that can't lock the game.
  - The standards are enforced, not just written: lint rules decide which layer can import which, CI fails on any
    warning or on functions that grow too long or complex, and over 260 tests guard the rules.
- **Game design.** The rules, the goals, the boosters and specials (from my own prototype), the level and the feel
  targets.
- **Art direction.** I picked the ink-and-moonlight look, the stone pond, the garden and the HUD from references, and
  rejected what didn't fit.
- **Testing and judgement.** I play-tested every change on desktop and on my phone, sent things back until they felt
  right, and decided what shipped.

Working this way let me try many ideas fast and spend my time on direction, feel and polish. There are no third-party
images or sounds: everything you see and hear is generated in code.

## If I had more time

**Special combos.** Swiping two specials together should fire one bigger combo instead of two separate blasts:

- striped + striped: a cross, a full row and column through the swap;
- striped + whirlpool: a giant current, three rows and three columns;
- whirlpool + whirlpool: a maelstrom that swallows a 5x5 area;
- rainbow + striped or rainbow + whirlpool: every koi of that color turns into that special, then they all fire in a
  wave;
- rainbow + rainbow: the whole pond clears.

**New specials.**

- A 2x2 match makes a leaping koi: it jumps out of the water and lands on a target, like the planes in Homescapes. It
  would aim at a bud or the goal koi the player still needs.

**A victory sequence.** When the player reaches three stars before the last move, the remaining moves turn into a
finale: leftover specials fire on their own, combos chain across the pond, and each move left becomes bonus points
with a splash.

**More levels.**

- Ponds in new shapes, like a heart or a crescent, drawn as text in the level config the way the current pond is.
- A difficulty curve across them: fewer moves, harder goals, more lily pads.
- Saved progress and the best stars on each level.
- Retuning the current level. A simulation shows a player who goes for the goals wins about 97% of boards within
  the 15 moves (median 6), which is too easy for a first level that comes before harder ones.

**Seasons.** A theme per season, using the theme and art system that is already swappable. Winter would bring:

- an icy pond with frost on the stones;
- frozen koi that need a match beside them to thaw before they can move;
- ice blocks to break.

The garden, the music and the ambience change with each season.

**Smaller things.**

- A first-time goal card and a hint when the player sits idle.
- Laying the game out again when the phone turns (today it rescales).
- Color-blind-friendly koi, with a pattern per color.
- A swirl animation for the reshuffle.
- The heartbeat speeding up over the last moves.

## How it's built

### Architecture

MVP with a passive view. The model (`src/model`) is plain TypeScript with no Pixi in it. On a swipe it works out
the whole turn at once and returns it as data: a list of cascade rounds, each with what matched, what cleared, what
fell, what spawned and which specials were made or fired. The presenter (`GameScene`) counts the turn first (points,
goals, moves), then plays it through the animator one round at a time, with its points. The view never decides
anything, so the board on screen can't drift from the real one, the points that pop up add up to the score, and the
rules can be tested without a browser.

The presenter only talks to ports: small interfaces it declares itself (`BoardDisplay`, `TurnAnimator`,
`StatusDisplay`, `PadDisplay`, `ResultDisplay` in `src/game/GameScene.ts`), which the view and the UI implement.
`src/game` can't import the view or the UI, and the tests stub each port. The boosters' presenter
(`BoosterControl`) and the swap by hand (`SwapControl`) work the same way.

`src/main.ts` is the composition root: the one place that creates the objects and hands each one what it needs,
through its constructor. Each area is put together in its own module in `src/boot/` (the app, the screen, the koi,
the pond, the game, the stage, the sound, the frame loop), so there are no singletons.

The game boots behind a loading screen. Its markup is in `index.html`, and the theme's tokens are written into the
page at build time, so it shows, themed, from the first paint. `src/boot/loading.ts` lists the loading as named
steps, each weighted by about how long it takes: the font, the art atlases, the goals' icons, the koi, the shore's distance field,
the water, the garden, the stones, the game itself, the koi's in-between tail poses and the special koi, and one frame
drawn unseen so every shader is compiled before the first real one. `BootPipeline` (`src/core`) runs them in order,
lets the page paint between them and moves the bar. The last bakes are lists of small jobs (one pose or one color
each), run back to back with a paint every 50 ms, so the bar keeps moving and nothing is baked while the game is
played. Everything is made once, and playing again reuses it. If boot fails, `main.ts` stops whatever had started and shows a readable error (no WebGL 2, the GPU lost).

The screens (loading, playing, the end card, playing again) are a state machine (`ScreenFlow`), which also moves the
keyboard focus. The turn runs on the same small state machine (`src/core/StateMachine.ts`), with guarded transitions
in a table and enter/exit hooks.

The level plays to its last move. Once every goal is met the rest is a victory lap: the moves stop warning, the music
calms down, and every match still scores toward the stars. When the moves run out, the level is won if every goal is
met. A met goal pays a 500-point bonus, a star unlocks at each of three scores (`starsFor`), and a win is worth one
star at least.

The game says what happens on a typed event bus (`src/core/EventBus.ts`, the events in `src/game/events.ts`). The
scene, the animator and the effects each say it at the moment it happens on screen (a beam landing, a whirlpool
popping). The sound, the camera and the banners listen, and the game doesn't know they exist. A listener that throws
is logged and the others still run.

The board is dealt from the clock. Add `?seed=42` (any whole number) to the address to deal the same board every
time, to play a bug again.

The layout is worked out from the screen, not fixed (`src/layout/gameLayout.ts`, values in `src/config/layout.ts`).
The stage is at least 360 x 640 and grows to cover the whole screen with no letterboxing. The HUD goes at the top,
the booster bar at the bottom (inside the phone's notch and home bar), and the board takes the biggest cell that fits
between them; on a short phone or an upright tablet it gives up a little, so the garden keeps its strip of sky. The
layout is made once, for the screen the game starts on, and a later resize scales it. Phones play
upright; turned sideways they get a notice.

The UI is HTML and CSS over the canvas, laid out in the same stage units and scaled with it, so the text stays sharp.
I modelled the HUD on the casual match-3s I studied: moves big in a glass orb (it warns when they run low), the
score, a chip per goal that ticks down to a check, and a star bar that fills with the score. It's small BEM components
on a little CSS kit (`src/ui/kit.css`: control, glass panel, orb, chip, gold badge and button, star, track, switch,
reveal) that only reads theme tokens (`src/theme`), the same tokens the Pixi side reads. Every button is a real button
with a focus ring and a finger-wide tap area, and players who ask for less motion get the same feedback without the
movement. The end card is a modal dialog that shows each goal the way the HUD does, and when the moves run out it
says what to try next.

### Levels, board shapes and sizes

- **Any board shape.**
  - A level draws its board as text, one string per row: `#` is water with a koi, `.` is the bank
    (`LEVEL.shape` in `src/config/level.ts`, parsed by `src/model/shape.ts`). The current pond is a rounded cross.
  - A heart, a ring with an island, or a plain 6 x 6 is a few lines of text.
  - Everything follows the shape: gravity runs per stretch of water, the shore is traced from it, the stones line it,
    and the water shaders read its distance field.
- **Any board size, on any screen.**
  - The layout (`src/layout/gameLayout.ts`) works out the biggest cell that fits the room between the HUD and the
    booster bar on the screen the game starts on. The pond, the koi, the stones and the HUD all scale from that one
    number.
  - On a short phone or an upright tablet, the cell gives up a little size so the garden keeps its sky, but never
    below `LAYOUT.minCell`.
  - A bigger or smaller board just gets bigger or smaller cells. The spacing, the margins and the HUD sizes are all in
    `src/config/layout.ts`.
- **A level is plain data.**
  - `LEVEL` holds:
    - the moves and the low-moves warning;
    - the shape;
    - the goals (lotuses, a score, or so many koi of a color, in any mix);
    - the star thresholds;
    - the lily pads: buds, empty pads, hits to bloom, spacing.
  - It's only strings, numbers and arrays, with no code in it, so the same object can come from a JSON file or a
    level server instead of a TypeScript file.
  - It's checked at startup: a goal the board can't meet, more lotuses than buds, a color that isn't in play or a bad
    shape stops the game with a clear message instead of a broken level.
- **Testing a level is quick.**
  - Change the config and the dev server reloads.
  - `?seed=42` in the address deals the same board every time, to replay a case.
  - `tests/config.test.ts` deals the shipped level for 200 seeds, and checks:
    - every board is playable;
    - the goals can be met;
    - the stars climb.

### The board

A board can have holes, drawn in the level's shape (`src/model/shape.ts`). A koi can't swim over the bank, so a hole
splits its column: koi only swim down within their own stretch of water, and new koi rise from the deep into the top
of each stretch.

The lily pads (`src/model/pads.ts`) each take a cell. They're placed before the koi, so no koi ever spawns or lands
on one, and koi fall past them. A round hits a pad when it clears a koi right next to it, and a bloomed or drifted
pad frees its cell for the koi above in the same round.

The specials (`src/model/specials.ts`) are made from shapes: the matched runs are joined into groups first
(`groupMatches`), so an L or a T is one shape. A run of 4 makes a striped koi, an L or T a whirlpool, a run of 5 a
rainbow koi, where the player swapped. A special fires when it's matched, swapped (even without a match) or caught in
another's blast. A queue fires the specials each blast catches, so chains just happen. Each round reports what was
made, what fired and which blast took each koi, which is all the view needs to time it.

The boosters (swap any two koi, feed a colour into lines, power a koi up into a special) follow the same split. The
model plans what each does to the board (`src/model/boosters.ts`; the feed lays its lines nearest the food and always
makes a match). The scene applies it and settles the board like after a swap, with no move spent.

### Patterns

- **MVP with a passive view:** `src/model`, the presenter `GameScene`, the views in `src/view` and `src/ui`. The rules
  are tested without a browser, and the screen can't disagree with the board.
- **Composition root and constructor injection:** `src/main.ts` and `src/boot/*` build everything and pass each object
  what it needs. No singletons, so any class can be built with fakes in a test.
- **Ports and adapters:** `GameScene`, `BoosterControl` and `SwapControl` declare the displays they drive, and the
  view and the UI implement them. The game never imports the view.
- **Observer:** the typed event bus (`src/core/EventBus.ts`). The sound, the camera, the haptics and the banners hang
  off it without the game knowing.
- **State machines:** one guarded, table-driven class (`src/core/StateMachine.ts`) runs the turn (`GameScene`), the
  booster flow (`BoosterControl`) and the screen flow (`ScreenFlow`), so a swipe mid-cascade or a booster mid-turn
  can't happen.
- **Strategy maps keyed by type:** `SPECIAL_REACH` (`src/model/specials.ts`), `LOOKS` (`src/view/SpecialLooks.ts`),
  `SHORE_STYLES` (`src/art/shoreStyles.ts`), `SOUND_OF` (`src/audio/SoundBoard.ts`). Each is typed as one entry per
  type, so a new type makes the compiler ask for its entry.
- **Composite:** `AllGoals` (`src/model/goals.ts`) plays a level's goals as one, so the scene never knows how many
  there are.
- **Flyweight:** the koi and special koi textures are baked once per colour and shared by every sprite
  (`KoiTextures`, `SpecialTextures`), and every synth voice shares one noise buffer (`src/audio/Mixer.ts`).
- **Object pool:** `Pool` (`src/core/Pool.ts`) for the score popups, the flying points and the sparkles, which are
  made and dropped many times a second.
- **Pipeline:** `BootPipeline` (`src/core`) runs loading as named, weighted steps, each getting what the steps before
  it made.
- **Plan, then play:** pure planners decide before anything moves. `planRound` (`src/view/specialTiming.ts`) times
  every koi in a cascade round, and `planBackdrop` (`src/art/backdrop.ts`) decides how the garden is dressed. Both are
  tested.

### Tech art

The water is a wave simulation on the GPU (`WaterSim`, `sim.frag`): a height field stepped 60 times a second, packed
into 8-bit channels so it runs on any phone GPU (read back at high precision; `waterCodec` mirrors the packing and
tests it). The koi disturb it: a moving koi leaves a wake, a resting one flicks
its tail, a swap shoves the water apart, and matched koi dive with a ring in the water while the koi above swim down
into the gaps, under the lily pads. The shore and the pads soak the waves up. It's drawn in an ink and moonlight toon
look: the bank is painted once per screen size, and three passes read the waves each frame (the water under the koi,
a filter that bends the koi under the waves, and a surface pass with shore foam and gold glints). A leaping koi
leaves the water's filter while it's in the air. One moon lights the whole scene (`THEME.scene.light`): the water's
relief, the koi's, stones' and pads' shadows and the highlights all follow it. The koi have a dark
cartoon outline, and a broken foam line at their waterline that follows them and breaks around the fins (drawn each
frame from a mask of the koi, `KoiContact`).

Every texture is painted in code: sizes and colours come from config. The koi, pads and effects are baked into atlases
at build time (see [Asset pipeline](#asset-pipeline)); what depends on the screen's layout is painted once for the
screen it will be shown on, at its real pixel density. The pond takes the board's shape.
`traceShore` walks the edge of the cells (round notches, bays and islands of bank), pushes it out by the margins and
rounds every corner. That outline is baked once into a distance field (`bakeDistanceField`), so every water shader
knows how far it is from the shore of any shape with a single texture read. The border is a ring of pieces along the
same outline. Where they go is plain math (`ringAlongShore`: random sizes round each loop, scaled to close with no
seam); what they look like is a painter. All the pieces are baked into one atlas (`bakeAtlas`, shelf-packed), so the
whole border is one texture and one draw call. The tracer, the field, the ring and the atlas packing are all unit
tested.

Above the pond, the layout leaves an open scene (the pond sits low, like the art over the board in commercial
match-3s), and a moonlit garden is painted into it once (`src/art/backdrop.ts`): sky, stars and the moon, misty
hills, a pagoda, a tree line and a maple with a paper lantern. On a wide screen the ground beside the pond is dressed
too: the maple on one side, a stone lantern on the other. The ground is a soft moss lawn, low in contrast so it never
competes with the board, with the pond's light spilling onto it round the shore (read from the same distance field
as the water) and a few fallen petals.

The special koi come from the prototype, rebuilt in layers. Their art is painted from the board's own koi
(`src/art/specialKoi.ts`): the koi painter takes a dressing that repaints the body and fins before they're inked, so
a striped koi gets bands of its colour and white and a rainbow koi gets its scales recoloured with the spectrum (the
'color' blend keeps their light and shade), under the same outline as every other koi. A whirlpool is a painted eddy
with the koi curled into its eye. At rest each has its own look (`SpecialLooks`, one class per special): a striped
koi faces along its line over a pulsing glow with a sheen sweeping it, a rainbow koi's colours flow (one hue filter
shared by every rainbow koi, at the screen's resolution) over a rainbow glow with orbiting sparkles, and a whirlpool's
eddy turns (its curled koi casts a curled shadow and waterline). When they fire, `planRound` works
out from the model's data when every koi goes and how (dive, spiral into the special that was made, drain into a
whirlpool, zapped by a rainbow arc), the animator plays that plan, `SpecialFx` draws the light (beam, eddy, rainbow arcs
arcs, a flash at birth), and every effect also moves the water. The timings and sizes are in `TIMING.specials` and
`SPECIAL_FX`.

### Asset pipeline

The art is authored in code and shipped as ordinary image assets, the way a production game reuses art instead of
drawing it at runtime.

- **Authored with painters.** Each picture has a painter in `src/art/` (the koi, the special koi, the pads and
  lotuses, the glows, sparkles, beam, eddies and pellet). Sizes and colours come from config and the theme.
- **Baked to atlases at build time.** `npm run bake:art` (`tools/bakeArt.mts`) starts Vite and a headless Chrome,
  opens the bake page (`tools/bake/`), and for each tier (1x, 2x, 3x pixels per stage px) paints every picture with
  the same code the game uses, packs them on 2048 px sheets (`packSheets`, shelf-packed, more sheets when they don't
  fit) and writes each sheet as a PNG and a Pixi spritesheet JSON to `public/art/@<n>x/`, with `sheets.json` listing
  them. The art is painted for a cell of `ART_ATLAS.cellSize` (`src/config/art.ts`); a bigger board scales the sprites
  up and picks a higher tier, so it's as sharp as painting for that board would be. The atlases are committed: they
  are the shipped assets.
- **Frame names** say what a picture is, then its frame, two digits so they sort: `koi/<variety>/swim/07`,
  `koi/<variety>/shadow`, `koi/<variety>/contact/03`, `special/striped/<variety>/05`,
  `special/rainbow/<variety>/05`, `special/striped/<variety>/sheen/02`, `special/whirlpool/<variety>/koi` (and
  `/shadow`, `/contact`), `fx/glow`, `fx/sparkle`, `fx/rainbow-glow`, `fx/beam`, `fx/firefly`, `fx/pellet`,
  `fx/eddy/<variety>`, `pad/<look>/bloom/02`, `pad/<look>/leaf`, `ui/goal/lotus`, `ui/goal/koi/<variety>`. The variety
  is the koi's id in `KOI_SET` (`m3-red`, `dream-jade`...).
- **Loaded with Pixi `Assets`.** The boot step `art` (`src/boot/art.ts`) works out the tier from the screen's bake
  resolution (rounded up, at most 3), loads that tier's sheets with progress on the loading bar, and hands their
  frames to an `ArtBook` (`src/view/ArtBook.ts`). Every texture is asked of the book by name with its painter next to
  it, so a frame missing from the atlases is painted instead. `?paint=1` skips the atlases and paints everything for
  the board on screen, to try a painter's change without baking; if the atlases fail to load, the game paints too.
- **Replacing an atlas with hand-made art.** Draw over a sheet PNG in `public/art/@<n>x/` (keep each frame inside its
  rectangle in the sheet's JSON), or pack new art at the same frame names with any tool that writes Pixi or
  TexturePacker JSON, and list the sheets in `sheets.json`. Do it for each tier, and don't run the bake again, which
  would paint over it.
- **Re-baking** after changing a painter, its config or `ART_ATLAS`: `npm run bake:art`, check it with and without
  `?paint=1`, and commit `public/art/`.
- **What stays runtime, and why.** The garden (`src/art/backdrop.ts`) is sized to the screen and drawn around its
  layout, and the stones round the pond are cut to fit each stretch of this board's shore, so both are painted once
  for the screen the game starts on. The shore's distance field is computed from that same shore, and the water, the
  bank and the foam are shaders that run every frame, so none of them is a picture to bake.

### Game feel

Turns are paced on a real game: I timed a Candy Crush recording frame by frame (it was sped up, so I scaled it
back), where a plain match gives the board back in about 0.7 s. Ours took 2 s; after retuning `src/config/timing.ts`
it's about 0.7 s, measured over real turns in a headless browser.

The motions come from one small library (`src/view/motion`): sink, rise, spiral, pop, squash, flash and a head shake,
each a GSAP timeline that takes its numbers from config, so a dive is "kick, then sink" and a rainbow's hit is "pop
and flash, then sink". `play()` resolves when a motion ends or is killed, so an awaited turn can't hang.

How hard each moment hits is one listener on the game's events (`Impact`), with the prototype's numbers (`CAMERA`
and `IMPACT` in `src/config/fx.ts`):

- `Camera` shakes the canvas world (never the HTML HUD) and pushes in on a win. Players who ask for less motion get a
  gentler shake and no push-in.
- `HitStop` slows the animations' clock for an instant so a big hit lands. The water, the swimming, the sound and the
  UI keep real time.
- A white flash when a special is born, a whirlpool pops or a rainbow fires, and a short vibration on phones while
  the effects channel is on.

Over the pond, an HTML banner lane (`BannerLane`) announces combos, specials made, a reshuffle and every goal met.
Points pop up in their cascade round's colour, sized by their match, and big gains fly over the HUD into the score,
which takes them as they land. A touched koi squashes at once, a refused move shakes the koi's heads, and a won pond
is celebrated with a banner, sparkles and a push-in before the end card.

The effects are layered apart from the turn logic: the animator only knows two small interfaces (the water it pushes
and the score popups), and the koi's swimming, wakes, shadows and foam run per frame in their own classes (`KoiLife`,
`KoiWaterline`).

### Sound

The sound is the prototype's: no sound files, a small Web Audio synth (`src/audio/Synth.ts`) playing plucked notes on
a pentatonic scale, water plips and soft noise splashes, ported recipe by recipe (`src/audio/recipes.ts`).
`SoundBoard` maps every game event to its recipe in one place.

It plays on three channels, effects, music and ambience, each with its own volume and switch, mixed in
`src/audio/Mixer.ts` into one compressor. The music dips for a moment under a match or a special so the effects come
through. The music and the ambience are tracks (`src/audio/Track.ts`): a track is either made as it plays or a
recorded loop, and naming a file in `src/config/audio.ts` swaps one in.

`src/audio/composer.ts` writes the music a bar at a time, just before it plays: a slow D major piece at 68 bpm, with
a pad and a bass on a four-chord loop, a quiet koto arpeggio, and a melody that wanders the pentatonic scale. It lands
on the chord on the strong beats, closes each phrase on a long chord tone, and sometimes answers on a breathy flute.
It's in the same key as the effects, so a match always sounds in tune with it, and it's never the same twice. With
few moves left it grows a soft taiko heartbeat, a win plays a short climb home to D, and after a level the chords
rest. The composer is pure and seeded, so it's tested. The ambience is the pond at night: water lapping at the
stones, a drop now and then, crickets from either side and a far wind chime, each on its own random gap. Both are
scheduled a little ahead on the audio clock, so they keep time when a frame is late.

A first touch starts the sound, and it sleeps while the tab is hidden. The speaker at the end of the booster bar
opens a small menu with a switch per channel, and each choice is kept between visits. An iPhone in silent mode mutes
web audio, so there the game plays silently until the ring switch is turned back on.

### Performance

The goal: smooth 60 fps on a mid-range phone, and no stutter once the loading bar is gone.

- **Art baked at build time into texture atlases.**
  - The art is authored by code painters, and `npm run bake:art` bakes it once into atlases at 1x, 2x and 3x
    (`public/art/`). The game loads the tier its screen needs with Pixi's `Assets`, so the phone downloads ready
    pictures instead of painting about 500 of them while it loads.
  - Loading time, from opening the page to the loading screen gone (production build, Chrome, median of 5):
    a 390 x 844 phone at 3x with the CPU slowed 4x went from 13.3 s painting to 2.5 s with atlases, and a
    1366 x 768 laptop from 5.8 s to 1.2 s. The atlases add 4.3 MB of PNG at 3x, 2.2 MB at 2x and 0.9 MB at 1x
    (one tier per visit), so on a slow mobile network the download takes back part of that time.
  - Sprites on one atlas share a texture, so Pixi batches them into few draw calls.
  - An artist can replace any atlas with hand-made art (see [Asset pipeline](#asset-pipeline)).
- **Everything heavy happens behind the loading bar.**
  - The boot pipeline (`src/core/BootPipeline.ts`, steps in `src/boot/loading.ts`) runs named, weighted steps. Each
    one is a list of small jobs, and the page gets to paint every 50 ms, so the bar keeps moving.
  - The steps load the atlases and paint what depends on the screen: the garden, the shore's distance field and the
    stones round it.
  - A last step sends every texture to the GPU and builds the effect shaders. The first frames of play don't upload
    or compile anything.
- **Made once, shared everywhere (flyweight).**
  - The art is loaded once, at the atlas tier that matches the screen's real pixel density (worked out at boot).
  - Every sprite shares those textures: 60 koi on the board use one set of poses per color. Nothing is rebuilt on
    replay.
  - The audio does the same: one noise buffer and one set of channels shared by every sound.
- **Fewer draw calls.**
  - The stones around the pond are packed into one atlas (`src/art/atlas.ts`), so the whole ring is one texture and
    one draw call.
  - The bank under the water is a shader pass cached as a texture (`cacheAsTexture`), drawn once rather than every
    frame.
  - Koi, pads and effects are sprites on shared textures, so Pixi batches them.
  - The art is baked pictures, not shapes redrawn each frame.
  - A full frame is about 13 draw calls.
- **Object pools.** Effects that come and go many times a second come from a generic `Pool<T>` (`src/core/Pool.ts`)
  instead of being created and destroyed: the score popups, the points that fly to the score, and the win sparkles.
  No garbage-collection hitches in a big cascade.
- **The shore as a distance field.**
  - The pond's outline is baked once into a distance texture (about 25 ms, `src/art/distanceField.ts`).
  - Every water shader reads "how far from the shore" in one texture fetch, instead of looping over the outline for
    every pixel.
- **The water.**
  - The wave simulation runs on the GPU at a fixed 60 steps a second, with a cap on catch-up steps after a slow frame.
  - The frame rate is capped at 60, so 120 Hz phones don't draw the same water twice as often.
  - GSAP runs on the same clock as Pixi, so animation and rendering never drift apart.
- **A lean download.**
  - No sound files, and one atlas tier per visit: the one the screen needs.
  - The koi painter keeps only the five koi the game uses.
  - Pixi and GSAP ship as their own cached chunks (about 280 kB gzipped in total).

### How to add…

- **A level:** `LEVEL` in `src/config/level.ts`. Draw the board in `shape` (`#` a cell, `.` bank) and the water, the
  stones and the rules follow it. Set the moves, the goals, the pads and the star scores there too. Goals the board
  can't meet fail at startup, and `tests/config.test.ts` deals the level for 200 seeds.
- **A special:** add its type to `Special` (`src/model/types.ts`), the shape that makes it to `specialFor` and what it
  reaches to `SPECIAL_REACH` (`src/model/specials.ts`). Then its look in `LOOKS` (`src/view/SpecialLooks.ts`), its
  art in `src/art/specialKoi.ts` (baked by `SpecialTextures`), its effect in `SpecialFx`, its timing in
  `src/view/specialTiming.ts`, and a petal in `SPECIAL_MENU` (`src/config/ui.ts`).
- **A booster:** a case in `BoosterUse`, `canTarget` and `applyBooster` (`src/model/boosters.ts`), its slot in
  `BOOSTERS` (`src/config/ui.ts`) and its icon in `src/ui/icons.ts`, its arming steps in the table in
  `src/game/BoosterControl.ts`, and its motion in `BoosterMotions`, played from `BoardAnimator.playBooster`.
- **A goal:** a case in `GoalDef` and `createGoal` (`src/model/goals.ts`) that counts from what a round did
  (`RoundOutcome`), its chip icon in `src/ui/GoalTray.ts`, then list it in `LEVEL.goals`.
- **A sound:** an event in `GameEvents` (`src/game/events.ts`), said where it happens on screen, a recipe in
  `src/audio/recipes.ts`, and its entry in `SOUND_OF` (`src/audio/SoundBoard.ts`; the compiler asks for one per
  event).
- **A shore style** (planks, bushes, lanterns): name it in `ShoreStyle` (`src/config/pond.ts`), write a painter for one
  piece in `src/art` and add it to `SHORE_STYLES` (`src/art/shoreStyles.ts`), then set `POND.shore.style`. Piece
  sizes and spacing are in `POND.shore`, and `LAYOUT.shoreWidth` keeps room for them on screen. Rocks in the water
  are `POND.props`.
- **A theme:** copy `src/theme/moonlitGarden.ts`, change its tokens (colours, type, spacing, motion, the bank and the
  garden) and point `THEME` at it in `src/theme/theme.ts`. The CSS and Pixi read the same object.

## Code standards

The compiler and ESLint enforce them, so I don't have to remember them:

- TypeScript strict, plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
- ESLint's strict type-checked rules, run with `--max-warnings 0`, so a warning fails the lint, the pre-commit hook
  and CI like an error.
- Size and complexity are errors in `src`: at most 40 lines per function, nesting 3 deep and complexity 10.
- Naming: camelCase values and functions, PascalCase types, UPPER_CASE only for top-level constants. Class layout:
  fields, constructor, public methods, then private ones. Type-only imports, `===`.
- No floating promises, and `void` doesn't count as handling one. Async work nobody awaits (a turn started from a
  swipe, a popup flying off) goes through `runDetached` (`src/core/detached.ts`), which logs a failure.
- Per-folder import rules, like assembly definitions (`LAYERS` in `eslint.config.js`). Each folder lists the folders
  it must not import, so imports point one way. Only `view`, `ui` and the wiring in `src/boot` may use Pixi and GSAP;
  the rest stays engine-free. `tests/imports.test.ts` fails on any import cycle, type imports
  included.

Beyond lint: tuning numbers live in `src/config`, and every colour, size and timing of the look in the theme. try/catch
is only at the edges: boot, a turn whose animation fails (it still ends as the model played it), an event listener
that throws, and browser APIs that can refuse (audio, storage, vibration). The one file lint and Prettier skip is
`src/art/koiBank.ts`, the AI-written koi painter.

## Tests

266 Vitest tests in 56 files, in `tests/`. Most cover the match-3 rules, because that's where a bug is easy to miss by
playing: a new board with a ready-made match or no move, a swap that should be refused, a cascade that leaves a hole,
specials that chain, boosters aimed at a pad or the bank. The presenters are tested with stubs for their ports: a
level won or lost on its last move, a turn whose animation fails, the booster flow, the swap by hand and the screen
flow. The rest cover the core pieces (state machine, event bus, pool, boot pipeline), the layout, the
shore tracer, the distance field and the atlas, the music and the sound board, the shipped level (a playable deal
for any seed), and the import graph. They run in CI on every pull request, so when I work on the feel I find out
before merging if I broke the rules.

## Workflow

Feature branches go into `develop` through pull requests, and `develop` goes into `main` when a milestone is done.
`ci.yml` runs the typecheck, lint, tests and build on every pull request and again on `develop` after each merge.
`deploy.yml` runs the same checks on `main` and publishes to GitHub Pages. A pre-commit hook runs ESLint and Prettier
on the staged files.

Milestones:

1. Playable core: board, swipe, swap/clear/fall animations, turn flow, moves, win/lose. Done.
2. Goal system: lily pads and lotus buds that bloom, a koi goal, with the goal as a swappable piece. Done.
3. Juice: dives, swims, ripples, the water shader, sound effects, screen shake, hit-stop, combo banners, points that
   fly into the score, a win celebration. Done.
4. Specials: special koi from bigger matches, and the chains between them. Done.
5. Boosters: swap, special and feed. Done.
6. Music and ambience. Done.
7. Screens: the loading screen, and the flow from it to the game and the end card. Done.
