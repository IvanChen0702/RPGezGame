# Battle visuals and pet training 459

## Changes and evidence

- Dragon-vein warlock resolves to `family_dragonMage`. Its deployed SVG matches the repository, has a viewBox but no explicit dimensions, and clips its embedded 128×128 bitmap at y=104. Chromium and WebKit report 150×150 natural dimensions but their unsized Canvas draws differ: cached foot ratios were 0.8067 and 0.6867 respectively. Sized draws in both engines reach approximately 0.81. The replacement WebP uses the same embedded art and existing crop, fixed 128×128 dimensions, transparent pixels and q85 encoding. It lives under the existing enemy/families folder and resolves through assetSrc393_. Old assets and URLs remain available. New SHA-256 prefix: ee677460fd; 7,408 bytes.
- The reported near-total disappearance was not fully reproduced in the available WebKit build. The confirmed measurement discrepancy is removed; original-device confirmation is still useful. No claim that all possible image-loading failures are covered.
- Reflection previously called drawRay with physical damage, which creates a normal attack movement. It now emits a dedicated visual event: a stationary cyan/gold force shield followed by a returning energy streak. It never creates attack/cast/hit movement or interrupts an existing action. PvE player equipment, enemy magic reflection, and both arena sides share the presentation. Reduced motion shows only the stationary shield. Damage formulas, recursion prevention and timing are unchanged.
- Pet training's disabled state was implemented in 458 but the global theme's high-specificity important rules could override its grey styling. The button now owns its disabled styles and removes them when enabled. A level-25 fixture with 91 stones and cost 100 verifies disabled, grey, and `強化石不足（還差 9 顆）`. Receipt recovery remains available with insufficient funds.

## Validation

All browser fixtures block external network access and use synthetic state.

- `tools/check_enemy459.cjs`, Chromium and WebKit: 390×844, 390×680, 320×740 and desktop 1440×900; bitmap dimensions/alpha, measurement consistency, 20 idle/hit/attack/cast samples per viewport, rerender and mobile navigation. Short landscape was explored but its synthetic layout has too little scene height for these pixel assertions; it is not included in this coverage claim.
- `tools/check_reflect459.cjs`, Chromium and WebKit: both directions, stationary actor event selection, active cast preservation, visible shield/projectile pixels and reduced-motion frames; actual PvE 100 damage → 15 physical reflection / 30 enemy magic reflection; arena 20%/60% reflection produces 15/55 damage after defense, with no reflection recursion.
- `tools/check_battle_pet458.cjs`, Chromium and WebKit: notices, pet funds/cost/lock/preflight/recovery cases, including the reported 91/100 balance and computed grey background.
- WebKit emitted one ResizeObserver delivery warning during forced viewport changes; geometry assertions, subsequent rendering and pet actions passed. The test reports this specific browser advisory separately while still failing on other page errors.
- `node tools/check_assets456.cjs`: 964 catalog hashes, 947 image decodes, 4,419 aliases and 591 runtime art keys passed.
- `python3 tools/package_site.py`: 993 public files; review/test files excluded.

No backend, database, player save or balance changes.
