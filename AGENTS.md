# Repository development instructions

Read `HANDOFF.md` and `docs/STATUS.md` before editing. Preserve the original proposal in `README.md`.

- Keep this a small, playable, mobile-friendly prototype. Do not add a framework, backend, paid API, deployment, or new platform without a concrete need and authorization.
- Source of truth: `src/content.js` contains data; `src/engine.js` is a pure reducer; `src/app.js` owns UI/storage; `src/style.css` owns styling.
- Keep both protagonist genders mechanically equal. Romantic routes are opposite-sex only. Romance is opt-in, can stop without business penalties, and is never required for progression or recruitment.
- All romance characters are adults. No direct-manager romance before the player leaves the employer. Characters can decline recruitment.
- Do not replace saved-state keys or character IDs casually. Save schema changes need validation, migration and tests.
- Never interpolate imported save text as raw HTML. Keep all business values finite, safe integers and nonnegative.
- Run `npm run check` after changes. Report browser checks separately from unit tests; don't say they ran if they didn't.
- Use small feature branches for parallel work. Fetch and inspect remote changes before integrating. Never force-push or overwrite another contributor's work.
- Update the handoff/status docs for material changes and blockers. Do not put credentials or private external data in this repository.
