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

TypeScript (strict), Vite, PixiJS 8 on WebGL, GSAP for tweens. There are no image files: the koi, stones, lily pads
and reeds are painted on canvases once at startup (`src/art/`) and uploaded as textures.

The water is a wave simulation on the GPU (`WaterSim`, `sim.frag`): a height field stepped 60 times a second, packed
into 8-bit channels so it runs on any phone GPU. The koi disturb it: a moving koi leaves a wake, a resting one flicks
its tail, a swap shoves the water apart and a match splashes. The shore, stones and pads soak the waves up. It's
drawn in an ink and moonlight toon look: the bank around the pond is painted once per screen size, and three passes
read the waves each frame (the water under the koi, a filter that bends the koi under the waves, and a surface pass
with shore foam and gold glints). The koi have a dark cartoon outline, and a broken foam line at their waterline
that follows them and breaks around the fins (drawn each frame from a mask of the koi, `KoiContact`).

## How it's built

MVP with a passive view. The model (`src/model`) is plain TypeScript with no Pixi in it. On a swipe it works out the
whole cascade at once and returns it as data: a list of steps, each with what matched, what cleared, what fell and
what spawned. The presenter (`GameScene`) plays those steps through the animator one at a time. The view never
decides anything, so the board on screen can't drift from the real one, and the rules can be tested without a
browser.

The win condition is a goal object (Strategy, `src/model/goals.ts`): the scene feeds it every cascade round and asks
if it's complete, without knowing which goal it is. A level picks a lotus goal or a score goal in config. The lily
pads (`src/model/pads.ts`) each take a cell. They're placed before the koi, so no koi ever spawns or lands on one,
and koi fall past them; a round hits a pad when it clears a koi right next to it, and a bloomed or drifted pad frees
its cell for the koi above in the same round. Hits to bloom, the number of lotuses, the spacing between pads and the
moves are all in `src/config/level.ts`; the defaults (3 lotuses, 2 hits, 15 moves) were tuned with a simulation of
400 boards.

The turn runs on a small state machine (`src/core/StateMachine.ts`) with guarded transitions and enter/exit hooks.
The end of a turn picks won, lost or idle from a table (won is listed first, so winning on the last move counts),
and entering won or lost shows the end card.

Effects are layered separately: the animator only knows two small interfaces, the water it pushes and the match
effects (`SplashFx`), and the koi's swimming, wakes, shadows and foam run per frame in their own classes (`KoiLife`,
`KoiWaterline`), outside the turn logic.

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
3. Juice: splashes, ripples, squash and stretch, the water shader, sound. Done except sound and screen shake.
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
- the water and the effects (simulation, shaders, splashes, wakes, shadows, ripples, waterline foam)

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

- A new UI built on a reusable style library (one set of colour, type and spacing tokens), adaptive to any screen,
  with the grid's spacing and the pond's size driven by config; the same preset approach for the effects.
- Specials from bigger matches, and boosters.
- A performance check on a real mid-range phone (the water and the koi bake are the costly parts).
- A WebGL1 fallback: the shaders are GLSL ES 3, so the game needs WebGL2 now.
- Have the scene pass each round's points to the animator, so the score popups can't drift from the score.
