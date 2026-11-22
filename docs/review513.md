# v513 independent Mist overflow loot actions

The pending loot detail previously offered a combined “收取／丟棄” primary button that opened another chooser, alongside a separate equipment discard button. It now offers “收取” directly and a red “丟棄” button for pending equipment, gems and legacy chests. Take sends only `loot/take`; discard retains the existing confirmation and sends only `loot/discard`.

Full category capacity disables take and shows a separate full-bag notice. The mobile detail renderer now respects the same disabled state/notice as the desktop detail. The take handler rechecks current loot existence, capacity and the mode action guard before dispatching; it never discards an item to make space. Normal owned-item manager behavior is unchanged.

Validation: `tools/tests/mist513-loot-actions.cjs` exercises actual browser buttons with isolated command spies, on Chromium and WebKit at 1440×900, 390×844 and 320×568. It checks equipment/gems/chests, grid/list views, exact action and item identity, no extra chooser, discard cancellation/confirmation, capacity disabling and direct-handler full-bag protection. Mobile full-capacity rendering visually inspected. Network calls blocked: no production items mutated. Shared combat build and public package checks passed (183 functions, 1020 public files); `git diff --check` clean.

Frontend only. No database or Apps Script changes.
