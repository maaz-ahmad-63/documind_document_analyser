## Purpose
Provide concise, actionable guidance for coding agents working on this repository (a Create React App-based single-page Todo app).

## Big picture
- This is a small Create React App (CRA) project. The UI is a single-page Todo app implemented in `src/App.js` and rendered from `src/index.js`.
- No backend or external APIs are present; data is kept in-memory (see `src/App.js` where todos are created and managed using `useState`).

## Key files to inspect
- [src/App.js](src/App.js): Main UI, todo state (`useState`), add/toggle/remove logic (IDs created with `Date.now()`).
- [src/index.js](src/index.js): App bootstrap and `reportWebVitals()` hook.
- [src/App.css](src/App.css) and [src/index.css](src/index.css): Styling and layout rules for the app.
- [public/index.html](public/index.html): HTML template used by CRA.
- [package.json](package.json): Important npm scripts (`start`, `build`, `test`) and dependencies.

## How to run / developer workflows
- Start dev server: `npm start` (runs `react-scripts start`, opens at http://localhost:3000).
- Run tests: `npm test` (CRA test runner).
- Build production bundle: `npm run build`.
- Do not `eject` unless explicitly requested—ejecting copies CRA internals and is one-way (`npm run eject`).

## Project-specific patterns & conventions
- Functional components and React hooks only (no class components). Follow the style in `src/App.js`.
- Small, colocated structure: UI, state logic, and handlers live in `src/App.js`. When adding features, prefer splitting into new files under `src/` (e.g., `src/components/`) rather than editing CRA configs.
- Styling is plain CSS files under `src/`. Add component-specific CSS files alongside components.
- IDs for todos are generated with `Date.now()` — keep this in mind if you refactor persistence or introduce unique id libs.

## Testing notes
- Tests use CRA's test setup (see `src/App.test.js` present). Run `npm test` to execute.
- The repo uses `@testing-library/react` and related helpers (see `package.json` dependencies).

## Integration points & extensional surface
- No external services or environment variables are referenced in source files. If adding integrations (APIs, analytics), wire them in `src/` and register any necessary env vars in the dev environment (CRA uses `.env` prefixed with `REACT_APP_`).
- `reportWebVitals()` is present in `src/index.js` — metrics can be forwarded there.

## Guidance for AI agents (do / don't)
- Do: Make minimal, focused edits. For UI/logic changes, update `src/App.js` and add new components under `src/components/` with corresponding CSS.
- Do: Run `npm start` or `npm test` locally to validate changes before proposing PR content.
- Don't: Modify CRA internals or `react-scripts` configs unless the user explicitly asks to `eject` and accepts the consequences.
- Don't: Introduce non-essential dev dependencies without confirming — keep the project light.

## Examples of common tasks
- Add persistent storage: implement `localStorage` read/write in `src/App.js` around todo state initialization and updates.
- Add a new component: create `src/components/TodoItem.js` and `src/components/TodoItem.css`, update `src/App.js` to import and use it.

## Merge guidance
- If updating behavior, include a short test in `src/App.test.js` or a new test file under `src/` to cover the new behavior.
- Keep changes confined to `src/` and `public/` unless adding build-time configuration is explicitly requested.

## When you need more context
- Ask for: intended persistence layer (localStorage, backend), component boundaries, or style conventions beyond plain CSS.

Please review and tell me any unclear or missing points to iterate.
