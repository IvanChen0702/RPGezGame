# v512 mobile preparation viewport and orientation recovery

Saving a loadout removes a focused name input and rerenders preparation. The shared mobile shell previously used cached `visualViewport.height` and `offsetTop`; keyboard-size measurements could remain after a delayed dismissal without a subsequent resize event. The equipment fitter then correctly fitted to the wrong, short app, leaving a tiny equipment panel and raised navigation. Pet management, picker searches, and other input/modal returns share this shell; per-dialog timeout retries do not fix that dependency.

The shell now uses browser-managed `100dvh` with a `100vh` fallback and a fixed zero top. Visual viewport values remain available to the existing temporary gift overlays. Native pinch zoom is not disabled. Browser chrome/orientation can resize the layout without storing a keyboard height in the shell.

A separate WebKit rotation test found automatic equipment grid rows retaining landscape heights after portrait width returned (rows 111px vs current 68px columns). The existing mobile equipment fitter now derives four square rows from the current untransformed column width before computing scale. It clears the owned row override when leaving mobile fitting. This also covers the shared preparation room selector, without altering desktop fitting or equipment data.

Validation:
- Reproduced the first failure on the previous implementation by saving a real local loadout while simulating a visual viewport shrinking to 360px, then recovering after focusout timers with no resize notification. App stayed at 360px in a 664px viewport, equipment shrank to ~104px, navigation rose to y289. New shell stays 664px, equipment ~376px, navigation y593.
- `viewport512-layout.cjs`, Chromium and WebKit: 390×664, 320×568, 390×844. Save/apply/cancel loadouts, pet return, equipment/gem search followed by actual local equip/socket operations, delayed keyboard recovery, zoom measurements, rotation and return. Real mode class updates verify navigation hidden for battle/arena/Mist and restored for preparation. Network blocked; no player accounts changed.
- `pet510-layout.cjs`, both engines: repeated pet management returns; updated regression asserts stale keyboard measurements cannot compress the shell in the first place.
- `picker511-backpack.cjs`, both engines: existing backpack/picker view menu and tile/icon metrics still match at portrait/narrow/landscape sizes.
- `inventory504-ui.cjs`, both engines: desktop/mobile filters, item identity, favorite DOM preservation, Mist item callbacks, confirmation and account guards.
- `mist506-prep.cjs`, Chromium: desktop and mobile preparation layout, skill editing isolation, paperdoll reuse, bag tab compatibility.
- Visual review of the recovered WebKit 390×664 screen. Browser simulations are not physical iPhone keyboard testing or live cloud-save API testing.
- Shared combat build: 183 functions, no missing functions. Public site package: 1020 files. `git diff --check`.

No Apps Script, backend, game balance or player-save schema changes.
