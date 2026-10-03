# Koi Splash

A calm but juicy match-3 on a moonlit koi pond. Built for the mini-game home assignment.

Play it here: https://danieldaniel128.github.io/koi-splash/

The build is hosted on GitHub Pages. A GitHub Actions workflow (`.github/workflows/deploy.yml`) runs the
typecheck, lint and tests on every push to `main`, then builds with Vite and deploys the `dist/` folder.

## Running it

```
npm install
npm run dev      # local server, also reachable from a phone on the same Wi-Fi
npm run check    # typecheck + lint + tests
npm run build    # static web build in dist/
```

Every push to `main` runs the checks and deploys to GitHub Pages.

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
Effects and sound listen on an event bus, so I can add juice without touching the game logic.

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

- Project setup and tooling config (Vite, TypeScript, ESLint/Prettier, the deploy workflow): AI-written.
- `src/art/koiBank.ts` (the koi painter and varieties): AI-written.
- `src/model/` (board, matching, cascade) and `src/core/Random.ts`: AI-written, based on the architecture I chose.
- `tests/rules.test.ts`: AI-written.
- Run-time notes in `src/model/rules.ts`: I used AI as a second opinion on performance, to go over each method's
  cost and decide where a note is worth having (the non-obvious ones, not every getter).
- This README: I used AI to help me write it.

## Next steps

(to fill in at the end)
