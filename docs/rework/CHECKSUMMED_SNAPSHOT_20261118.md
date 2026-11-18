# Versioned offline snapshot prototype

This supersedes strict event replay for ordinary v2 save loading in the isolated
prototype only. Production UI/keys are not switched. Full event history and the
strict normalizeSegmentedDealRoom validator remain intact.

## Format and trust model

Envelope:
- type: deal-room-snapshot
- version: 1
- state: complete version-2 state including all archived and active events
- integrity: { algorithm: crc32-utf8-v1, value: eight-digit lowercase hex }

CRC32 IEEE is computed over canonical key-sorted JSON of {type,version,state},
encoded as UTF-8. Array order remains significant. Object key reordering and JSON
whitespace changes do not invalidate content. CRC32 is accidental corruption
detection, NOT authentication or anti-cheat. A user can alter cash and recompute
the checksum. A test explicitly demonstrates that such a snapshot can load while
the strict event validator rejects the fabricated balance.

Synchronous encode/parse preserves the current save API without introducing
asynchronous crypto plumbing into the whole UI. The known standard vector
123456789 => cbf43926 and UTF-8 Chinese 外贸账本 => 3e918ebf are tested
(the Chinese value was independently checked with Python zlib).

## Normal load (no from-start economic replay)

Validate byte size, exact envelope keys, supported format/version/algorithm,
checksum, ledger segment schema/count/context, canonical event shapes, cash/day/
client/phase/feedback types, contract status/identity/numeric fields, arithmetic
relationships and dates, and optional personal-life spending sum. These are
basic consistency checks, NOT proof that the economic snapshot follows events.
Unknown versions/algorithms are rejected rather than guessed or auto-migrated.

The existing 5MiB UTF-8 limit and real browser quota still apply. Saved output and
backups now use this envelope; old raw v2 states and v1/v2 event backup envelopes
continue to take their strict verification paths.

## Explicit damage recovery

parseDealSnapshot never silently falls back to a different state. A damaged
stored snapshot is reported corrupt and ordinary autosave will not overwrite it.
recoverDealSnapshot(text) is a separate, read-only, potentially slow operation:
it reconstructs business state from the complete existing events, reports changed
top-level fields, returns originalText verbatim, and explicitly labels its result
“依现存事件重建”. It does not promise that available events are the original truth.

- Corrupt checksum alone: reconstruction can be identical, no changed fields.
- Wrong cash with intact events: reconstruction reports cash as changed.
- Missing/inconsistent segment length or total, bad context, invalid event order,
  unknown actions/versions: recovery fails; events are never silently trimmed.
- A fully self-consistent edited event stream cannot be authenticated offline.
  Reconstructed output is a candidate based on available events, not a claim to
  have recovered facts absent from the file.

For a damaged current stored save, the tested flow is explicit reconstruction →
preview restored snapshot → confirmation → original corrupt text retained under
the unreadable-backup key → verified replacement. A source file not currently in
storage must likewise retain originalText before any user-facing replacement;
the codec itself does not write files or storage.

## Remaining prototype limitations

- A second different v1 import currently conflicts with the single imported-v1
  source slot rather than overwriting it. This is explicit and tested, but needs
  a usable multiple-source retention policy before formal UI integration.
- No automatic main-UI migration, deployment, Windows testing or unlimited-save
  claim is made.
- Strict legacy migration and explicit recovery can still take tens of seconds;
  they are no longer the ordinary cold startup path.

## Final measured verification

Code 9dc2cbd; 1022 aggregate tests passed. Cloud Node on the real 2025-contract,
9108-event fixture (996540-byte snapshot):
- Encode with consistency checks: 123 ms
- Fresh-module cold snapshot parse: 193 ms
- Repeated snapshot parse: 155 ms
- Storage load: 215 ms
- Save with previous-state verification: 374 ms
- Explicit strict reconstruction after a cash-field corruption: 36844 ms

The ordinary cold load no longer performs the ~40-second from-start replay.
These are Node timings, not browser frame timings or Windows validation.

A separate genuine old 910-contract / 4092-event v1 backup completed preview,
confirmed migration, verbatim original-envelope retention, snapshot write and
reload in 11652 ms. Reloaded cash and every contract equal the old source.
All five independent deposit/outstanding-balance/two-live-contract fixtures also
passed snapshot encode/parse without changing their state.
