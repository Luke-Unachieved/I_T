# Experimental segmented ledger and snapshot backup

This branch preserves isolated prototype dab4edd (code 9dc2cbd). It is not integrated into the game UI and is not released. Ordinary versioned snapshot loading uses CRC32 for accidental corruption detection, not authentication or anti-cheat. Complete history and explicit strict reconstruction remain available. Measured cloud Node storage load is 215 ms for 2025 contracts; strict recovery remains about 37 seconds. Browser and Windows acceptance remain incomplete. See CHECKSUMMED_SNAPSHOT_20261118.md for the format, measurements and limits.
