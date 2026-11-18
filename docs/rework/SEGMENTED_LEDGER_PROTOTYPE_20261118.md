# Isolated v2 ledger prototype (not deployed)

Branch feat/segmented-ledger; source modules deal-room-ledger-v2.js and
deal-room-ledger-save-v2.js. Neither main UI nor production save keys use these
modules. This is not automatic migration or a release claim.

## Protocol

State version 2 keeps ordinary business fields unchanged. journal version 1 has
segments and totalActions. Each segment is {kind,actions}. A first legacy segment
contains the complete verified v1 journal (1..4096 actions). New action segments
seal at active history length 1024: first new segment has 1024 events if there was
no archive, subsequent segments have 1023 new events. Activity keeps the previous
segment's last canonical event as context, never executes/counts it twice.

Normalization first validates schemas, segment lengths, total count and context,
then replays canonical events from the original initial state (or an exactly
verified process-local prefix), and compares the complete resulting state.
No self-supplied financial checkpoint or hash is trusted. Business snapshots are
separated from immutable archive arrays during each domain reducer call, so
domain deep copying does not include all archived events. Existing contracts
still grow and are copied; this is not constant-time business processing.

V1 migration first uses the unchanged strict v1 normalizer. V2 does not invoke
legacy live decoration-tail compression: the active segment is not a fresh-game
journal. All v2 recorded events remain archived, including decoration.

Four cache entries are permitted, each combined serialized domain and complete
archive/activity identity <= 1M UTF-16 units. No caller references are retained.
Matches use exact strings across the whole archive and active prefix; rollover
can resume a previously verified partial active segment. Full resulting fields
are still compared before adding a cache entry. Oversized entries skip caching.

## Save adapter

The prototype writes only isolated online/offline prototype keys, never the
production v1 keys. Version 1 backup envelopes validate and migrate; version 2
exports retain complete archives and report totalActions, not activity length.
The original v1 envelope is retained verbatim before migration writes. The
existing confirmation/CAS/backup/readback/failure behavior is retained.

Known limitation: imported-v1 currently retains only one distinct original text;
a different second v1 import returns explicit backup-conflict without replacing
the first original. This is not suitable final UX; multiple identifiable retained
sources or an explicit migration policy is needed before live integration.

The 5MiB UTF-8 input/output limit still applies. Browser storage quota may fail
earlier, especially when previous and source backups coexist. This prototype
does not claim unlimited history, constant cold load, or Windows acceptance.

## Measurements and verification

Cloud Node, genuine independently generated old save: 910 contracts, 4092 events,
452841 bytes after migration. No injected cash or fabricated journal.
- Verify v1 and migrate: 10242 ms
- Immediate post-migration validation: 28 ms
- Fresh module cold v2 validation: 13880 ms
- Warm v2 validation: 23 ms
- Append accepted quote: 6 ms
- Validate grown state: 166 ms
- Save including prior-state check: 70 ms

Migration preserves all original financial/contract fields. Continuing
PROPOSE repeat-small, ADVANCE, NEXT_CLIENT succeeds, reaching 911 contracts.
The warm path is useful but cold replay is still seconds.

1014 aggregate tests pass. Focused tests cover three real navigation-event
segments, unsettled contract rollover, canonical journal rejection, exact totals,
mutation isolation, cache rollover/eviction, test-only forced cache-size bypass,
v1/v2 backup compatibility, source preservation, quota failures, CAS conflicts,
main-write failure after backup, and UTF-8 byte limits. Forced small cache-limit
testing is not itself a large-save performance measurement.

## Suggested integration trigger (not implemented)

First validate in an isolated import/test UI. Only after independent long-save,
cold/warm, storage and recovery acceptance, migrate a loaded-and-validated legacy
state before rendering capacity-limited quote previews. Preserve the source
before any replacement. Do not wait for a 4092-wall button that is already
disabled; do not make v1 normalize silently return v2; do not auto-deploy.

## Genuine oversized cache-entry degradation (confirmed)

Starting from that same verified 4092-event/910-contract legacy state, another
1115 legitimate small orders reached 9108 total events and 2025 contracts. No
injected cash, dates or fabricated events. Saved JSON is 996429 UTF-8 bytes; the
cache payload (domain plus escaped exact identity strings) is 1048759 UTF-16
units, just above the 1M-entry limit.

Validation passed, proving continued commercial operation beyond the former
wall. However first validation took 27755 ms and repeated validation 24282 ms:
the newest prefix is not cached, so it repeatedly replays from an earlier
verified prefix. This is far below the 5MiB save limit and is a real outstanding
performance blocker for UI integration, not an acceptable “unlimited” result.

A weighted total-memory-budget cache permitting a larger single verified prefix,
or a nonduplicating bounded identity structure, should be evaluated next. This
prototype has not silently raised the cache budget to hide that result.

## Weighted total-budget cache follow-up

Commit 799355b replaces the per-entry 1M-character threshold described above.
At most four cache entries now share 32 MiB of retained UTF-16 serialized payload
(2 * string.length, including domain and complete exact identity strings).
Hits refresh LRU order; insertion evicts least-recently-used entries until both
count and byte limits hold. A single entry beyond the entire budget still skips
caching; the fallback remains strict replay.

This is a budget for retained serialized cache data, not a promise about total
JavaScript heap usage: parsed transient objects, state, contracts and storage
strings also consume memory. The larger total budget can retain current and
previous ordinary large saves without automatically discarding every entry
above 1M characters. It does not guarantee unlimited records or constant cold
replay time.

1015 aggregate tests pass. Added tests inspect LRU order and exact weighted byte
accounting in an in-memory test module, and force a small budget to prove weighted
eviction rather than merely the four-entry count. Tiny-budget injection only
checks semantics; the 2025-contract fixture is measured separately with
scripts/diagnostics/ledger-v2-benchmark.mjs.

### Weighted-cache genuine long commercial benchmark

Same 2025 contracts / 9108 events / 996429-byte state, generated by another
1115 legal small orders from the independent legacy fixture. Cloud Node:
- Entirely cold normalization in an independent module: 40172 ms
- Warm normalization: 161 ms
- Append navigation/accepted quote: 23 ms
- Validate appended state: 85 ms
- Save with both current and previous state validation: 126 ms
- Repeat save: 130 ms

Thus repeated ~24-second fallback at the former per-entry threshold is fixed;
current and previous states do not evict each other in this measured case.
Cold first-load replay remains ~40 seconds and is still a separate unresolved
UX/performance issue. These are not browser frame times or Windows measurements.

Reproduce with an actual legacy fixture:
node scripts/diagnostics/ledger-v2-benchmark.mjs legacy-commercial-4092.json output-v2.json
Or supply the generated v2 fixture as the first argument to avoid regenerating
1115 orders. The module-isolated cold measurement remains fresh either way.
