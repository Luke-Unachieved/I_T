# Lightweight isolated QA entries

This is a build-only helper, not a new product entry and not a deployment. Production save rules and existing pages are unchanged.

`buildLightweightQA({key, seed, releasePath, qaPath})` returns three isolated JS modules and HTML. `writeLightweightQA(options, newDirectory)` writes with exclusive creation and will not overwrite existing files. CLI: `node scripts/build-lightweight-qa.mjs config.json new-output-directory`.

- `key` must use `trade-tycoon:qa-<unique-test-name>:v1`.
- `seed` must pass the actual engine's canonical-state validation.
- `releasePath` points to an already prepared same-version immutable shared release, for example `/releases/486613a`.
- `qaPath` is a separate same-origin QA directory. Upload the four resulting files there only after the shared version is ready.
- The generated app initializes the seed only for an empty QA key; valid, unreadable and inaccessible existing saves keep production loading behavior. Generation does not itself initialize browser storage.
- App, save and save-view imports form an isolated three-module group. Other imports share the release. The QA save module accepts only its own key, not production or other QA keys.
- The document base is the shared release, keeping HTML-relative product/life imagery under its assets. Stylesheets use that release explicitly, so their relative URLs remain correct.
- Runtime rendering, storage conflict rules, backup limits, canonical validation and restore confirmation are unchanged.

## Validation

Seven tests cover namespace rejection, three-module resolution, seed handling, main-save sentinels, two QA stores, restore preview/cancel/confirm, malformed input, retained restore copies, CSS paths and production source rules. Full check: 986 passed. Browser execution of this new packaging mode is still required before its first deployment is used as QA evidence.

## Assets and sizing

The helper does not copy the full source tree, historical artwork, PNG originals or old builds. It depends on the already prepared shared release. Measured four-file payload with the first-day seed is 77,134 bytes (app 64,789; save 5,877; save-view 5,856; HTML 612), instead of embedding several MB of images per fixture.

A future release packer can traverse static modern module imports and CSS URLs, plus explicitly enumerate JS-rendered image literals. It must fail or request a declared manifest for dynamic asset paths; it must not guess and silently omit them. PNG originals remain in source/backup even when excluded from a runtime artifact. No prior artifacts are removed by this helper.

## Browser verification (2026-11-17)

The owner-private isolated harness was deployed with two unique QA keys and shared release `486613a`. A read-only observer compared the production and offline production raw strings against their startup values; it never wrote either key. A started at day 4 / 5510, signed Samir at 2910 and collected at day 6 / 6950. B independently started at day 1 / 5000, signed at 3200 and retained that state after reload. A remained 6950, B remained 3200 and both production strings remained unchanged. Product art, CSS and module loading were visible. This validates the tested startup/save/reload isolation path; restore/cancel/conflict coverage remains automated and was not re-run through Browser in this pass.
