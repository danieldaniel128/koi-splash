# Koi Splash

A calm match-3 on a moonlit koi pond, built for the mini-game home assignment. Swipe a koi into its neighbour's
cell to line up three or more of a colour. Lily pads float between the koi; matches next to a lotus bud open it, and
the goal is to bloom all three lotuses in 15 moves.

Play it here: https://danieldaniel128.github.io/koi-splash/ (GitHub Pages, deployed by GitHub Actions from `main`
only, so it always shows the last finished milestone).

## Running it

```
npm install
npm run dev      # local server, also reachable from a phone on the same Wi-Fi
npm run check    # typecheck + lint + tests
npm run build    # static web build in dist/
```

## Stack & assets

TypeScript (strict), Vite, PixiJS 8 on WebGL, GSAP for tweens. There are no image files: the koi, stones and lily
pads are painted on canvases once at startup (`src/art/`) and uploaded as textures.

## Tech art

The water is a wave simulation on the GPU (`WaterSim`, `sim.frag`): a height field stepped 60 times a second, packed
into 8-bit channels so it runs on any phone GPU. The koi disturb it: a moving koi leaves a wake, a resting one flicks
its tail, a swap shoves the water apart, and matched koi dive with a ring in the water while the koi above swim down
into the gaps, under the lily pads. The shore and the pads soak the waves up. It's drawn in an ink and moonlight
toon look: the bank around the pond is painted once per screen size, and three passes read the waves each frame (the
water under the koi, a filter that bends the koi under the waves, and a surface pass with shore foam and gold
glints). The koi have a dark cartoon outline, and a broken foam line at their waterline that follows them and breaks
around the fins (drawn each frame from a mask of the koi, `KoiContact`).

Every texture is painted in code, so nothing is a fixed asset: sizes and colours come from config, and a texture is
baked once for the screen it will be shown on. The pond takes the board's shape. `traceShore` walks the edge of the
cells (round notches, bays and islands of bank), pushes it out by the margins and rounds every corner; that outline
is baked once into a distance field (`bakeDistanceField`), so every water shader knows how far it is from the shore
of any shape with a single texture read. The border is a ring of pieces along the same outline. Where they go is
plain math (`ringAlongShore`: random sizes round each loop, scaled to close with no seam); what they look like is a
painter. The tracer, the field, the ring and the atlas packing are all unit tested.

Above the pond, the layout leaves an open scene (the pond sits low, like the art over the board in commercial
match-3s), and a moonlit garden is painted into it once (`src/art/backdrop.ts`): sky, stars and the moon, misty
hills, a pagoda, a tree line and a maple with a paper lantern. On a wide screen the sky still ends at the pond, so it
sits on the ground, and the ground beside it is dressed: a maple tree with its lantern on one side, a stone lantern on
the other (`planBackdrop` decides, tested). The ground
itself is a soft moss lawn, low in contrast so it never competes with the board, with the pond's light spilling
onto it round the shore (read from the same distance field as the water, so it follows any pond shape) and a few
fallen petals. All the pieces are baked into one atlas (`bakeAtlas`, shelf-packed) at the
screen's real pixel density, so the whole border is one texture and one draw call.

Changing the look is meant to be config, not surgery:

- **A different board shape:** draw it in `LEVEL.shape` (`#` a cell, `.` bank). The water, the stones and the
  rules all follow; a notch one cell wide is too thin for stones on both its sides, so it gets one along it.
- **A different border** (planks, bushes, lanterns): write a painter for one piece in `src/art`, add it to
  `SHORE_STYLES` and set `POND.shore.style`. Piece sizes, spacing, how far they sit out on the bank and the corner
  pieces are in `POND.shore`; `LAYOUT.shoreWidth` keeps room for them on screen.
- **No ring at all** (say, one wooden deck): `ShoreRing` is the only thing that draws the border. Anything else that
  takes the pond's rect from the layout can replace it.
- **Rocks in the water:** `POND.props`. They stop the ripples and get the same shore foam as the pond's edge.
- **Water and bank:** colours, waves and foam in `src/config/water.ts` and `src/config/pond.ts`.
- **UI and background:** colours, type, spacing, motion, the bank and the garden above the pond are one theme in
  `src/theme`, read by the CSS and by Pixi. A new look is a new theme file.

The special koi come from the prototype, rebuilt in layers. Their art is painted from the board's own koi
(`src/art/specialKoi.ts`): the koi painter takes a dressing that repaints the body and fins before they're inked, so
a striped koi gets bands of its colour and white and a rainbow koi gets its scales recoloured with the spectrum (the
'color' blend keeps their light and shade), under the same outline as every other koi. A whirlpool is a painted eddy
with the koi curled into its eye. They're baked the first time a game makes one (`SpecialTextures`), so boot pays
nothing for them. At rest each has its own look (`SpecialLooks`, one class per special): a striped koi faces along
its line over a pulsing glow with a sheen sweeping it, a rainbow koi's colours flow (a colour-matrix filter) over a
prism glow with orbiting sparkles, a whirlpool's eddy turns. When they fire, `planRound` works out from the model's
data when every koi goes and how (dive, spiral into the special that was made, drain into a whirlpool, zapped by a
prism beam), the animator plays that plan, `SpecialFx` draws the light (beam, vortex, prism arcs, a flash at birth),
and every effect also moves the water. The timings and sizes are in `TIMING.specials` and `SPECIAL_FX`.

## How it's built

MVP with a passive view. The model (`src/model`) is plain TypeScript with no Pixi in it. On a swipe it works out the
whole cascade at once and returns it as data: a list of steps, each with what matched, what cleared, what fell and
what spawned. The presenter (`GameScene`) scores each step and plays it through the animator with its points, one at
a time. The view never decides anything, so the board on screen can't drift from the real one (and the points that
pop up add up to the score), and the rules can be tested without a browser.

The win condition is a goal object (Strategy, `src/model/goals.ts`): the scene feeds it every cascade round and asks
if it's complete, without knowing which goal it is. A goal can be lotuses to bloom, points to score or koi of one
colour to clear, and a level lists as many as it likes: `createGoals` plays them as one (Composite), won when all are
reached. This level asks for 3 lotuses and 10 red koi, and the HUD shows a chip per goal. The lily pads
(`src/model/pads.ts`) each take a cell. They're placed before the koi, so no koi ever spawns or lands on one, and koi
fall past them; a round hits a pad when it clears a koi right next to it, and a bloomed or drifted pad frees its cell
for the koi above in the same round. Hits to bloom, the number of lotuses, the spacing between pads and the moves are
all in `src/config/level.ts`; the defaults (3 lotuses, 2 hits, 15 moves) were tuned with a simulation of 400 boards
(on the plain 7 x 9, before the board had a shape).

The specials (`src/model/specials.ts`) are made from shapes: the matched runs are joined into groups first
(`groupMatches`), so an L or a T is one shape. A run of 4 makes a striped koi, an L or T a whirlpool, a run of 5 a
rainbow koi, where the player swapped. A special fires when it's matched, swapped (even without a match) or caught in
another's blast; what each one reaches is one entry in a Strategy map, and a queue fires the specials each blast
catches, so chains just happen. Each round reports what was made, what fired and which blast took each koi, which is
all the view needs to time it.

The boosters (Swap any two koi, Feed a colour into lines, power a koi up into a Special) follow the same split. The
model plans what each does to the board (`src/model/boosters.ts`: the feed plans its lines nearest the food and
always makes a match), the scene applies it and settles the board like after a swap (no move spent), and
`BoosterControl` runs the arming flow (armed, picked, choosing, playing) on the same guarded state machine as the
turn, with the bar, the pill, the board's marks, the petal menu and the sounds injected, so it's tested with fakes.

The sound is the prototype's: no sound files, a small Web Audio synth (`src/audio/Synth.ts`) playing plucked notes on a
pentatonic scale, water plips and soft noise splashes, ported recipe by recipe (`src/audio/recipes.ts`). The game
doesn't know it exists. The scene, the animator and the effects say what happens on a typed event bus
(`src/core/EventBus.ts`, Observer), each at the moment it happens (a beam landing, a whirlpool popping), and
`SoundBoard` maps every event to its recipe in one place.

The sound plays on three channels, effects, music and ambience, each with its own volume and switch, mixed in
`src/audio/Mixer.ts` into one compressor. The music dips for a moment under a match or a special so the effects come
through (ducking). The music and the ambience are tracks (`src/audio/Track.ts`), and a track is either made as it
plays or a recorded loop: naming a file in `src/config/audio.ts` swaps one in, with nothing else changing.

The made ones are generative. `src/audio/composer.ts` writes the music a bar at a time, just before it plays: a slow
D major piece at 68 bpm, with a pad and a bass on a four-chord loop, a quiet koto arpeggio, and a melody that wanders
the pentatonic scale. It lands on the chord on the strong beats and closes each phrase on a long chord tone, and the
answering phrases sometimes go to a breathy flute. It's in the same key as the effects, so a match always sounds in
tune with it, and it's never the same twice. It follows the game through the event bus. With few moves left it grows a
soft taiko heartbeat, a win plays a short climb home to D, and after a level the chords rest. The composer is pure
and seeded, so it's tested: the scale, the range, the phrase endings, each mood. The ambience is the pond at night:
water lapping at the stones, a drop now and then, crickets from either side, and a far wind chime, each on its own
random gap. Both are scheduled a little ahead on the audio clock, so they keep time when a frame is late.

A first touch starts the sound, and it sleeps while the tab is hidden. The speaker at the end of the booster bar opens
a small menu with a switch per channel, and each choice is kept between visits.

A board can have holes, drawn in the level's shape (`src/model/shape.ts`). A koi can't swim over the bank, so a hole
splits its column: koi only swim down within their own stretch of water, and new koi rise from the deep into the top
of each stretch. For a notch at the top that means just below it, like the shaped boards in commercial match-3s.

Turns are paced on one too: I timed a Candy Crush recording frame by frame (it was sped up, so I scaled it back), where
a plain match gives the board back in about 0.7 s. Ours took 2 s; after retuning `src/config/timing.ts` it's about
0.7 s, measured over real turns in a headless browser.

The turn runs on a small state machine (`src/core/StateMachine.ts`) with guarded transitions and enter/exit hooks.
The end of a turn picks won, lost or idle from a table (won is listed first, so winning on the last move counts),
and entering won or lost shows the end card.

The layout is worked out from the screen, not fixed (`src/layout/gameLayout.ts`, values in `src/config/layout.ts`):
the stage is at least 360 x 640 and grows to cover the whole screen with no letterboxing, then the HUD goes at the
top, the specials bar at the bottom (inside the phone's notch and home bar), and the board takes the biggest cell
that fits between them. Paddings, gaps, the space between koi, the water around the board and the room for the
shore are all config. The border follows the pond's outline and the moon is pinned to its corner, so the scene keeps
its shape on any phone, tablet or desktop. Phones play upright; turned sideways they get a notice.

The UI is HTML and CSS over the canvas, laid out in the same stage units and scaled with it, so the text stays sharp.
I modelled the HUD on the casual match-3s I studied: moves big in a glass orb (it warns when they run low), the
score, a chip per goal that ticks down to a check, and a star bar that fills with the score and unlocks a star at
each of three scores (`starsFor`); a win is worth one star at least. A met goal pays a 500-point bonus, and the level
plays to its last move, so meeting the goals early leaves moves to chase the stars. Under the pond, the booster bar
uses the prototype's icons with count badges. It's all small components on a little CSS kit (glass panel, orb, chip,
badge, track, button) that only reads theme tokens (`src/theme`), with the same tokens used by the Pixi side, so a new
look is a change of tokens, not of components. The rounded font (Nunito) is bundled, so it's the same on every phone.

Effects are layered separately: the animator only knows two small interfaces, the water it pushes and the score
popups (`ScorePopups`), and the koi's swimming, wakes, shadows and foam run per frame in their own classes
(`KoiLife`, `KoiWaterline`), outside the turn logic.

## Code standards

ESLint enforces them, so I don't have to remember them:

- Strict type-checked TypeScript rules, type-only imports, `===`.
- Naming: camelCase values and functions, PascalCase types, UPPER_CASE only for top-level constants.
- Class layout: fields, constructor, public methods, then private ones.
- `src/model` and `src/core` can't import Pixi, GSAP or any presentation folder, like an assembly definition.
- Warnings for functions over 40 lines, nesting deeper than 3 and complexity over 10.

Beyond lint: no singletons (`main.ts` is the one place that creates objects and hands each one what it needs), tuning
numbers live in `src/config`, and try/catch only at the edges (boot, and a failed turn animation). The one file lint
skips is `src/art/koiBank.ts`, the AI-written koi painter.

## Workflow

Feature branches go into `develop` through pull requests, and `develop` goes into `main` when a milestone is done.
`ci.yml` runs the typecheck, lint, tests and build on every push to a working branch and on every pull request.
`deploy.yml` runs the same checks on `main` and publishes to GitHub Pages. A pre-commit hook runs ESLint and
Prettier on the staged files.

Milestones:

1. Playable core: board, swipe, swap/clear/fall animations, turn flow, moves, win/lose. Done.
2. Goal system: lily pads and lotus buds that bloom, with the goal as a swappable piece. Done.
3. Juice: dives, swims, ripples, the water shader, sound. Done except screen shake.
4. Specials: special koi from bigger matches, and their combos.
5. Boosters.
6. Screens and content: title, tutorial, hint, handmade levels, an endless mode.

## Tests

32 Vitest tests in `tests/`. Most cover the match-3 rules, because that's where a bug is easy to miss by playing: a
new board with a ready-made match or no move, a swap that should be refused, a cascade that leaves a hole. The rest
cover scoring, the lily pads and goals, the state machine's guards and hooks, and how a swipe picks its cell. They
run in CI on every push, so when I work on the feel I find out right away if I broke the rules.

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

- The same preset approach as the UI theme for the effects.
- The prototype's combos (two specials swapped together: cross, giant current, rainbow wave, maelstrom). Swapping
  two specials already fires both.
- Earning more boosters (a level gives one of each for now).
- A performance check on a real mid-range phone (the water and the koi bake are the costly parts).
- A WebGL1 fallback: the shaders are GLSL ES 3, so the game needs WebGL2 now.
