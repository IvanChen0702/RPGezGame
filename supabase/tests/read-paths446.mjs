// Optional integration check against a public planning snapshot, with synthetic
// accounts/saves and fake DB reads only. No authenticated production requests.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
const file = process.argv[2];
if (!file) throw Error('Usage: node read-paths446.mjs /path/to/public-bootstrap.json');
const planning = JSON.parse(readFileSync(file, 'utf8'));
let source = readFileSync(new URL('../functions/game-api/index.ts', import.meta.url), 'utf8');
source = source.slice(0, source.indexOf('// v446: only audited')).replace(/^import .*lease446.ts';\n/m, '').replaceAll('export function ', 'function ');
const context = { crypto: webcrypto, TextEncoder, TextDecoder, Uint8Array, Uint32Array, URL, Response, AbortSignal, console };
vm.createContext(context); vm.runInContext(source + '\nthis.engineFactory = makeEngine;', context);
const save = { level: 10, mainProgressEpoch: 411, maxCleared: 5, base: {}, inventory: [], equipment: {}, skillsOwned: [], gems: [], consumables: {} };
const row = { account_id: 'synthetic-account', save_json: save, revision: 7 };
for (const action of ['quest/status', 'chaos/catalog']) {
  const calls = [];
  const engine = context.engineFactory({ base: 'https://db.test', key: 'test-key', token: 'test-token', actor: { accountId: row.account_id }, planning,
    fetcher: async (url, opts) => {
      const path = new URL(url).pathname; calls.push({ path, method: opts.method });
      if (path === '/rest/v1/PlayerSaves' && opts.method === 'GET') return Response.json([row]);
      if (path === '/rest/v1/rpc/game_quest_read368' && opts.method === 'POST') return Response.json({ save, states: {}, metrics: {}, revision: 7 });
      throw Error('Unexpected read-path I/O: ' + opts.method + ' ' + path);
    }
  });
  const result = await engine.dispatch({ action, sessionToken: 'test-token', boxId: 'chaosBox' });
  assert.equal(result.ok, true);
  if (action === 'quest/status') { assert.ok(result.quests.length > 0); assert.equal(result.revision, 7); }
  else assert.ok(result.tiers.length > 0);
  console.log('PASS full engine:', action, 'read calls:', calls.length, 'no mutation I/O');
  await assert.rejects(() => engine.dispatch({ action, sessionToken: 'wrong', boxId: 'chaosBox' }), /UNAUTHORIZED/);
}
