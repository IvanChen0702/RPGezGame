# v510 mobile picker layout and return viewport

Mobile equipment/gem pickers now use real backpack square tiles for grid view and the original full mobile rows for list view. Gem list rows retain base stats and a distinct special-effect frame. Rows keep their content height even with 114 entries, and filtered-out nodes remain hidden under the high-priority grid styles. Search and view switch share a row. Item IDs, direct equip/socket, long-press details, favorites and selection restrictions keep their original handlers.

The mobile picker previously used a lower stacking level than the equipment management modal. It now shares the desktop picker layer, with tooltips and confirmation layers above it. Escape closes the picker without also closing its underlying management page.

Pet management return now explicitly re-measures the mobile viewport and equipment panel after overlay removal and after the keyboard transition. Repeated plain open/close did not reproduce the reported device screenshot. Tests additionally simulate stale reduced viewport measurements and verify restored panel width and navigation position; this is a defensive correction, not proof of the exact device trigger.

Validation (local fixture data, remote requests blocked):
- Chromium and WebKit: 114 equipment and 114 gems at 390×844, 320×568, 844×390; repeated grid/list switches, square bounded artwork, non-overlapping full effect rows, scrolling, sorting and original selection IDs.
- Both engines: search and view toggle on the same row; picker hit-testing above an open manager; close/Escape retains manager.
- Existing inventory suite: desktop 1440×900 plus the three mobile sizes; filters, empty states, favorites DOM preservation, long press, Mist equip/socket routing, account guard and discard/comparison behaviors.
- Pet return viewport recovery: both engines at 390×844 and 320×568, repeated three times.
- Shared combat generation: 183 functions, no missing functions.
- Static package and diff checks.

No database, Apps Script or planning changes.
