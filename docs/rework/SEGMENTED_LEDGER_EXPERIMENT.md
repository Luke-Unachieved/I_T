# Experimental segmented ledger backup

This branch preserves the isolated prototype at development commit d76b2d7. It is not integrated into the game UI and is not released. It includes strict segmented replay, a versioned-save migration adapter and a weighted LRU cache. Cold replay remains about 40 seconds for the measured 2025-contract fixture; browser acceptance remains incomplete. See SEGMENTED_LEDGER_PROTOTYPE_20261118.md for measurements and limitations. Do not treat this branch as production or the release candidate.
