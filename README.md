# Koi Splash

A calm but juicy match-3 on a moonlit koi pond. Built for the mini-game home assignment.

Play it here: https://danieldaniel128.github.io/koi-splash/

The build is hosted on GitHub Pages and always shows the last finished milestone (see Workflow below).

## Running it

```
npm install
npm run dev      # local server, also reachable from a phone on the same Wi-Fi
npm run check    # typecheck + lint + tests
npm run build    # static web build in dist/
```

## Stack & assets

- TypeScript (strict), Vite, PixiJS 8 (WebGL), GSAP for tweens
- ESLint + Prettier, Vitest, a pre-commit hook
- Koi art: `src/art/koiBank.ts`, a data-driven koi painter. Each variety is plain data and gets baked into a texture once, so the board is just sprites.

## How it's built

I went with MVP, with a passive view. The model (`src/model`) is plain TypeScript with no Pixi in it. When you swipe,
the model works out the whole cascade at once and hands it back as a list of steps (what matched, what fell, what
spawned). The presenter then plays those steps through the view one at a time.

I wanted it this way for two reasons. First, the rules can be tested without a browser. Second, the board on screen
can't drift away from the real board, because the view never decides anything; it only animates what it's told.
Effects and sound will listen on an event bus, so I can add juice without touching the game logic.

The turn itself runs on a small state machine with guarded transitions: the end of a turn picks won, lost or idle
from a table (won is listed before lost, so winning on the last move counts), instead of an if/else chain.

## Code standards

I'd rather have the linter enforce the rules than rely on remembering them, so most of these fail the build:

- **Naming:** camelCase for variables and functions, PascalCase for types and classes, UPPER_CASE only for top-level
  constants.
- **Layout:** the public API sits at the top of a file, private helpers below it. In classes: fields, constructor,
  public methods, then private ones.
- **Size:** functions over 40 lines, nesting deeper than 3 and high complexity are flagged, so long functions get
  split into named steps.
- **Module boundaries:** `src/model` and `src/core` can't import Pixi, GSAP or any presentation folder. It works
  like an assembly definition: the rules stay engine-free and testable.
- **No singletons:** objects get what they need through their constructor, and `main.ts` is the one place that
  wires everything together.
- **Errors:** try/catch only at the edges where things can really fail (boot and asset loading, reading the save,
  audio), not around everything.
- **Assets:** the koi are baked into textures once at startup and reused, never rebuilt mid-game.
- **Patterns only where they pay off:** each one used here is explained below or in the code where it lives.

## Workflow

I split the work the way I'd run it on a team:

```
feature/<task>  ->  develop  ->  main
```

- **feature branches:** one per task (`feature/animation`, `feature/game-scene`...). Small commits, one idea each.
- **develop:** where finished tasks come together. A task gets merged through a pull request with a short note on
  what changed and how I checked it.
- **main:** only finished milestones. Merging into `main` is what deploys the playable build, so the public link
  never shows half-done work.

Two GitHub Actions workflows back this up: `ci.yml` runs the typecheck, lint, tests and a build on every working
branch and every pull request, and `deploy.yml` runs the same checks and publishes to GitHub Pages, only from `main`.

The milestones, in order:

1. **Playable core:** board, swipe, swap/clear/fall animations, turn flow, moves and win/lose
2. **Goal system:** lily pads and lotus buds that bloom, with the goal as a swappable piece
3. **Juice:** splashes, ripples, squash and stretch, shake, the water shader, sound
4. **Specials:** the special koi made by bigger matches, and their combos
5. **Boosters**
6. **Screens and content:** title, tutorial, hint, handmade levels and an endless mode

## Tests and why I have them

`tests/rules.test.ts` was written by AI. I asked for it because the match-3 rules are the one part where a bug is
easy to miss by playing: a board that starts with a ready-made match, a swap that should be refused, a cascade that
leaves a hole. Those are hard to spot by eye and easy to break later when I add specials. So the tests check:

- a new board has no matches and at least one move
- the same seed gives the same board
- rows, columns and T shapes are found
- invalid swaps (no match, diagonal, too far) are refused and change nothing
- a cascade always settles with a full board and pieces only fall down

They run on every commit and on every push, so if I break the rules while working on the feel, I find out right away
instead of in the middle of a playtest.

## AI usage

I used Claude (AI) as a helper during the project. So far:

- Prototype: before starting this repo I had AI build a quick throwaway prototype to test the idea and the feel
  (koi on water, splashes, the lotus goal). This repo is a clean rebuild with a proper structure.

- Project setup and tooling config (Vite, TypeScript, ESLint/Prettier, the CI and deploy workflows): AI-written.
- `src/art/koiBank.ts` (the koi painter and varieties): AI-written.
- `src/model/` (board, matching, cascade) and `src/core/Random.ts`: AI-written, based on the architecture I chose.
- `tests/`: AI-written.
- `src/view/` (board rendering, swipe input, animations, HUD, end card), `src/game/` (the game scene) and
  `src/config/`: AI-written, step by step from my plan,
  reviewed and tested by me on desktop and phone.
- `src/core/StateMachine.ts`: the guarded-transition design with enter/exit hooks is mine; AI wrote the code and
  its tests.
- Run-time notes in `src/model/rules.ts`: I used AI as a second opinion on performance, to go over each method's
  cost and decide where a note is worth having (the non-obvious ones, not every getter).
- Lint rules for the code standards above: I decided the standards, AI helped me turn them into ESLint config.
- This README: I used AI to help me write it.

## Next steps

(to fill in at the end)
