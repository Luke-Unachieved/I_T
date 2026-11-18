# Bounded verified replay cache

This is a warm-save performance fix, not a rewrite of economic history or the
4096 action cap. Four process-local entries keep fully validated serialized
snapshots only. Each snapshot is limited to 1M UTF-16 code units; per-action
serialized strings additionally duplicate at most its journal, plus bounded
array/object overhead. No raw input/returned object is retained by reference.
Exact action-string prefix match resumes a copied snapshot, replays the suffix,
and still deep-compares every derived field against submitted state. A mismatch
never enters the cache. JSON key reordering may cause a harmless cache miss.
Eviction, reload, truncation or a divergent history may require cold replay.

## Verification

Five focused tests cover forged cash/day/feedback/extra fields, invalid or altered
actions, mutated input and output, growing and shortened histories, divergent
branches, old purchase wording, more than four validated entries (eviction), and
reordered JSON object keys. All preserve acceptance/rejection semantics.

Fresh Node process observational benchmark (cloud, not Windows or browser):

| Actions | JSON bytes | Cold normalize | Warm normalize | Append normalize | Warm save incl. previous state |
| --- | --- | --- | --- | --- | --- |
| 2000 | 132833 | 2065 ms | 10 ms | 10 ms | 20 ms |
| 4095 | 271103 | 8295 ms | 73 ms | 21 ms | 39 ms |

Reproduce: `node scripts/benchmark-deal-replay-cache.mjs 2000` or `4095`.
The script deliberately retains an authentic old uncompressed decoration journal
so a newer tail-compacting reducer does not prevent legacy long-save measurement.

**Remaining limitation:** cold loading a legacy long journal still takes seconds;
this cache does not remove that first-load cost. It is not evidence of complete
release readiness or target-device frame timing.

## Follow-up: legacy décor replay and bounded preference tails

Pure life setters (position, reading bookmark, selected record) have a replay-only fast path. They still use the original canonical validator and life reducer; only the already-owned internal journal is excluded from deep cloning and appended afterwards. Business actions retain their original reducer. Differential tests cover 1804 cases, including explicitly constructed boundary branches, not a claim about every long commercial save.

New consecutive pure-setting tails of 128 or more changes are reduced to final values only after exact replay proves every non-journal field unchanged. Old journals are never silently rewritten during loading. A valid new action can compact the preference tail, including an old 4096-event décor save, so repeated furniture moves no longer consume all business-history capacity. Commercial and saved-exhibition events are not discarded. A purely commercial 4096-event journal remains a separate unresolved long-term capacity limit.

Cloud Node observational benchmark after this fast path: 4095 old décor events, cold normalize 280ms, warm normalize 32ms, save with prior progress 72ms. These are not browser/Windows frame-time claims. 5000 new position changes preserve cash/day and permit subsequent purchase. Browser acceptance pending.
