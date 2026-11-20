# v511 mobile picker follows the actual mobile backpack

The mobile equipment/gem chooser now renders the backpack's existing `viewControl204_` details menu (檢視 → ☰ 條列式 / ▦ 棋盤式). Choice handlers remain local to the picker so changing view does not render/close the underlying equipment manager. Search stays on the same row.

Replace the desktop market `cell402` tile markup with the mobile backpack `collection-tile205` markup and extend the existing collection-layout205 selectors to the picker. Both use four columns, the same padding/gaps, 24% icon bottom inset, full contained image, name strip, enhance and socket positioning. Remove the previous independent picker icon geometry and narrow-screen three-column override. Keep full gem list effects and the v510 overlay stacking.

Validation:
- `picker511-backpack.cjs`: compares actual rendered backpack and picker menu text and tile metrics (radius, icon insets/ratios, image padding, name typography, grid columns/gaps/padding), Chromium and WebKit at 390×844, 320×568, 844×390. All passed.
- `picker510-layout.cjs`: 114 equipment and gems, repeated view changes, full gem effect frames, scroll, sorting, original item identity, manager stacking and return. Both engines passed.
- `inventory504-ui.cjs`: desktop plus mobile filters, favorite DOM preservation, long press, equipment/gem actions, Mist callbacks and account guards. Both engines passed.
- Visually inspected the mobile WebKit grid and expanded view menu.

No backend or Apps Script changes.
