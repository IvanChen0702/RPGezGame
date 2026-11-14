# Town refresh initialization fix 460

The 458 render hook called `syncPetTraining458_` unconditionally from the main script, while that function is declared in the later `pets-ui.js` inline script. A render before that script is parsed throws a ReferenceError, and render's catch replaces the town with the page-load failure panel before town mounting.

The core renderer now calls this optional UI sync only after it exists. The pet module's own paint/busy hooks and later renders still update the disabled state, costs and insufficient-stone hint. No save, authentication, backend or timing changes.

Regression: `node tools/check_town_refresh460.cjs` and the same test with `GAME_TEST_ENGINE=webkit`. A local fixture inserts an early town render immediately before the pet script. Before the fix it reproduces `syncPetTraining458_ is not defined`, with no canvas and no mounted town. After the fix, Chromium and WebKit pass mobile/desktop cold load and reload, town canvas mounting and later rerender. After module initialization, a 91/100 stone pet still disables/greys the training button and shows the nine-stone deficit; 100/100 enables it. Console render failures and other runtime errors fail the test. External requests are blocked; no live accounts used.

`python3 tools/package_site.py` packages 993 public files; `git diff --check` passes.
