# Koi Splash

A calm match-3 on a moonlit koi pond, built for the mini-game home assignment. Swipe a koi into its neighbour's
cell (or tap a koi, then its neighbour) to line up three or more of a colour. Lily pads float between the koi, and
matches next to a lotus bud open it. To win, bloom all three lotuses and clear 10 red koi in 15 moves. The score
earns up to three stars.

**Play it:** https://danieldaniel128.github.io/koi-splash/ (phone or desktop). It's on GitHub Pages, deployed from
`main` only, so it always shows the last finished milestone.

**Run it:** `npm ci`, then `npm run dev` and open http://localhost:5173 (also reachable from a phone on the same
Wi-Fi). `npm run check` runs the typecheck, lint and tests, and `npm run build` makes the web build in `dist/`.

## Stack & assets

- **Engine and tools:** PixiJS 8 on WebGL 2, TypeScript (strict), Vite, GSAP for the tweens, Vitest, ESLint and
  Prettier, husky and lint-staged for a pre-commit hook, and GitHub Actions, which checks every pull request and
  publishes to GitHub Pages.
- **Third-party packages** the game ships with (everything else is a dev tool):
  - `pixi.js` 8: MIT.
  - `gsap` 3: GSAP's standard "no charge" license.
  - `@fontsource/nunito` 5, the Nunito font, bundled so the text looks the same on every phone: SIL Open Font
    License 1.1.
- **Visual assets:** all drawn in code, none from outside. The koi, lily pads, lotuses, stones and the garden are
  painted on canvases while the game loads (`src/art/`), and the water, the bank and the foam are shaders
  (`src/view/water/shaders/`). The booster icons are small inline SVGs (`src/ui/icons.ts`). The only image file is
  the page's icon.
- **Audio assets:** none. Every sound is synthesized live with Web Audio (`src/audio/`): the effects, the music and
  the night ambience. There are no sound files.
- **Requirements:** a browser with WebGL 2 (an up-to-date Chrome, Safari or Firefox; without it the game says so).
  To build it, Node 22.22.1 or newer (`engines` in `package.json`; `.nvmrc` and CI use 24).

## AI usage

I used Claude throughout. AI wrote the code:

- the project setup and tooling (Vite, TypeScript, ESLint, Prettier, the CI and deploy workflows)
- the koi art painter (`src/art/koiBank.ts`, `koiInk.ts`) and the pond props
- the model and its tests
- the view and game code (board, input, animations, HUD, end card, the game scene, the state machine's code)
- the water and the effects (simulation, shaders, dives and swims, wakes, shadows, ripples, waterline foam)

My part:

- I designed the architecture (MVP, passive view, the cascade as data) and the code standards, and had AI turn the
  standards into ESLint config.
- I designed the state machine: guarded transitions in a table, with enter/exit hooks.
- I planned the lotus goal: the rules, a goal interface so a level can swap goals, and every number in config (hits
  to bloom, lotuses, moves).
- I directed the art. AI built three looks and I picked ink and moonlight. I asked for the koi to touch the water and
  for cartoon outlines, and I rejected the thin light lines on the water because they read as scribbles.
- I reviewed the code and play-tested it on desktop and on my phone.

AI also built a throwaway prototype before this repo, and helped me write this README.

## Next steps

With more time, I'd add:

- A first-time goal card that shows what the level asks for, and a hint that points at a move when the player sits
  idle.
- The prototype's two-special combos (cross, giant current, rainbow wave, maelstrom). Today swapping two specials
  fires both, each on its own.
- More levels, with saved progress and the best stars of each.
- Laying the game out again when the phone turns or the window resizes. Today the layout is made once, for the
  screen the game starts on, and a resize only rescales it.
- Retuning the level. A simulation shows a player who goes for the goals wins about 97% of boards within the 15
  moves (median 6), which is too easy.
- Colour-blind-friendly koi: a shape or pattern per colour, so the colour isn't the only way to tell them apart.
- A swirl animation for the reshuffle. Today the new board just appears under its banner.
- The heartbeat speeding up over the last moves. Today it keeps one tempo.

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
steps, each weighted by about how long it takes: the font, the goals' icons, the koi, the shore's distance field,
the water, the garden, the stones, the game itself, and one frame drawn unseen so every shader is compiled before the
first real one. `BootPipeline` (`src/core`) runs them in order, lets the page paint between them and moves the bar.
Everything is made once, and playing again reuses it. The special koi aren't needed to start, so they're baked in the
background once the game shows, one job per idle moment (`runWhenIdle`); one wanted sooner is baked on the spot. If
boot fails, `main.ts` stops whatever had started and shows a readable error (no WebGL 2, the GPU lost).

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
into 8-bit channels so it runs on any phone GPU. The koi disturb it: a moving koi leaves a wake, a resting one flicks
its tail, a swap shoves the water apart, and matched koi dive with a ring in the water while the koi above swim down
into the gaps, under the lily pads. The shore and the pads soak the waves up. It's drawn in an ink and moonlight toon
look: the bank is painted once per screen size, and three passes read the waves each frame (the water under the koi,
a filter that bends the koi under the waves, and a surface pass with shore foam and gold glints). The koi have a dark
cartoon outline, and a broken foam line at their waterline that follows them and breaks around the fins (drawn each
frame from a mask of the koi, `KoiContact`).

Every texture is painted in code, so nothing is a fixed asset: sizes and colours come from config, and a texture is
baked once for the screen it will be shown on, at its real pixel density. The pond takes the board's shape.
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
koi faces along its line over a pulsing glow with a sheen sweeping it, a rainbow koi's colours flow (a colour-matrix
filter) over a prism glow with orbiting sparkles, and a whirlpool's eddy turns. When they fire, `planRound` works
out from the model's data when every koi goes and how (dive, spiral into the special that was made, drain into a
whirlpool, zapped by a prism beam), the animator plays that plan, `SpecialFx` draws the light (beam, vortex, prism
arcs, a flash at birth), and every effect also moves the water. The timings and sizes are in `TIMING.specials` and
`SPECIAL_FX`.

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

246 Vitest tests in 53 files, in `tests/`. Most cover the match-3 rules, because that's where a bug is easy to miss by
playing: a new board with a ready-made match or no move, a swap that should be refused, a cascade that leaves a hole,
specials that chain, boosters aimed at a pad or the bank. The presenters are tested with stubs for their ports: a
level won or lost on its last move, a turn whose animation fails, the booster flow, the swap by hand and the screen
flow. The rest cover the core pieces (state machine, event bus, pool, boot pipeline, idle work), the layout, the
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
