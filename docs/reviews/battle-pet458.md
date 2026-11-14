# Battle notices and pet training 458

Implemented 2026-11-15 (Asia/Taipei). Production deployment is not part of this local change.

## Behavior

- Remove player skill explanation overlays in PvE and arena. Keep skill animations, floating damage/effects, combat calculations and logs.
- Existing enemy phase, cycle, Orion and cyber notices use the enemy-side cinematic text treatment. Desktop retains the larger type; mobile uses the approved 84px right-aligned layout. Existing speed and auto-battle controls stay in place.
- Full enemy rules are recorded before visual shortening. Notifications do not delay combat. A phase transition replaces older visual notices; queued notices are bounded, deduplicated and discarded when their battle/turn is stale. A rerender retains the active node and expiry. Leaving or finishing a battle clears it.
- In very short mobile landscape layouts, the notice uses spare space below enemy HUD content; if no safe space exists, the complete rule remains in the combat log. Reduced-motion preference disables entry animation.
- Pet training reads the configured cost for the current locked-trait count. Insufficient stones disable and grey the training button and show the missing amount. Equal funds remain usable. Busy/pending operations and invalid costs remain disabled.
- New training requests recheck funds after inventory preflight. Recovery of an already-pending receipt bypasses new-request funds checks, including when the previous successful training spent the last stone.

## Validation

- `node tools/check_battle_pet458.cjs`: desktop 1440px, phones 390/320px, short landscape; unchanged controls and HP geometry; rerender lifetime; phase priority, bounded/deduplicated queue, stale events, cyber producer, navigation/end cleanup, reduced motion. Pet insufficient/equal funds, lock-dependent costs, all locked, invalid costs, preflight balance change, last-stone training, zero-stone receipt recovery. Uses synthetic state and blocks external network access.
- Existing avatar454 browser regression with an additional MutationObserver rejecting player skill overlays: nine real skill flows across desktop/mobile, damage totals and unlocked controls, mobile navigation, reduced motion, mirrored actor and missing-asset fallback passed.
- `python3 tools/package_site.py`: 992 public files; tooling/review documents excluded.
- `git diff --check`: passed.

No backend, data, assets, skill damage formulas or combat delays changed.
