import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import test from 'node:test';

const root = new URL('../functions/game-api/', import.meta.url);
const helperSource = readFileSync(new URL('lease446.ts', root), 'utf8');
const { createGameLease446, retainGameRequest446 } = await import('data:text/javascript;base64,' + Buffer.from(helperSource).toString('base64'));
const source = readFileSync(new URL('index.ts', root), 'utf8');
const wrapper = source.slice(source.indexOf('// v446: only audited'), source.indexOf('// Log interrupted phases')).replace('export function', 'function');
const deferred = () => { let resolve; const promise = new Promise(r => resolve = r); return { promise, resolve }; };
const env = key => ({ GAME_ALLOWED_ORIGINS: 'https://game.test', SUPABASE_URL: 'https://db.test', SUPABASE_SERVICE_ROLE_KEY: 'test-only-key', GAME_CRON_SECRET: 'test-only-cron' })[key];
function harness(config = {}) {
  const logs = [], calls = [], operations = [];
  let owner = config.owner || null, acquires = 0, releases = 0, time = Date.now();
  const entered = deferred(), gate = deferred();
  const json = (value, status = 200) => Response.json(value, { status });
  const fetcher = async (url, opts = {}) => {
    const path = new URL(url).pathname, body = opts.body ? JSON.parse(opts.body) : null;
    calls.push({ path, body });
    if (path === '/auth/v1/user') {
      if (config.unauthorized) return json({ message: 'invalid token' }, 401);
      return json({ id: opts.headers.Authorization, is_anonymous: !!config.anonymous, email_confirmed_at: '2026-01-01' });
    }
    if (path === '/rest/v1/game_identity_links') return json(config.unlinked ? [] : [{ legacy_account_id: new URL(url).searchParams.get('auth_user_id') }]);
    if (path === '/rest/v1/Accounts') return json([{ disabled: !!config.disabled }]);
    if (path === '/rest/v1/GameDataCurrent') {
      if (config.planningError) throw Error('private database detail');
      return json([{ data_json: { data: {} } }]);
    }
    if (path === '/rest/v1/game_runtime_config') return json([]);
    if (path === '/rest/v1/rpc/game_edge_lock') {
      if (body.p_release) {
        releases++;
        if (releases <= (config.failReleases || 0)) throw Error('release network failure');
        const same = owner === body.p_owner;
        if (same) owner = null;
        if (config.dropReleaseAck && releases === 1) throw Error('release committed but ack lost');
        return json(same);
      }
      acquires++;
      if (config.loseRenewal && acquires > 1) { owner = 'another-owner'; return json(false); }
      const same = !owner || owner === body.p_owner;
      if (same) owner = body.p_owner;
      if (acquires <= (config.dropAcquireAcks || 0)) throw Error('acquisition response lost');
      if (config.invalidLockReply) return json({ error: 'unexpected' });
      return json(same);
    }
    if (path === '/rest/v1/rpc/game_battle_status79') return json({ ok: true, accountId: body.p_account, revision: 7 });
    if (path === '/rest/v1/rpc/game_battle_cancel79') { operations.push(body); return json({ ok: true, revision: 8 }); }
    if (path === '/rest/v1/rpc/game_worldboss_chest_open') { operations.push(body); return json({ ok: true, award: { gold: 10 }, revision: 8 }); }
    throw Error('Unexpected network path: ' + path);
  };
  class Clock extends Date { static now() { return time; } }
  const context = {
    Response, Request, AbortSignal, crypto: webcrypto, Date: Clock,
    console: { info: line => logs.push(JSON.parse(line)) },
    createGameLease446: opts => createGameLease446({ ...opts, now: () => time, sleep: async ms => { time += ms; } }),
    makeEngine: ({ guard, actor }) => ({
      async dispatch(body) {
        entered.resolve();
        if (config.block) await gate.promise;
        if (config.loseRenewal) { time += 6000; await guard(); }
        operations.push(body);
        if (config.operationError) throw Error('sensitive account SECRET-123');
        return { ok: true, accountId: actor.accountId, requestId: body.requestId };
      },
      async read() { return { ok: true }; },
      async jobs() { operations.push('cron'); return { ok: true }; },
      async boxingJobs() { operations.push('boxing-cron'); return { ok: true }; }
    })
  };
  vm.createContext(context); vm.runInContext(wrapper + '\nthis.handler = makeGameApi;', context);
  const api = context.handler(env, fetcher);
  const request = (action = 'battle/start', extra = {}, account = 'account-a') => api(new Request('https://edge.test', {
    method: 'POST', headers: { Origin: 'https://game.test', Authorization: 'Bearer ' + account, ...(action.startsWith('system/') ? { 'x-game-cron-secret': 'test-only-cron' } : {}) },
    body: JSON.stringify({ action, requestId: 'stable-request-123', ...extra })
  }));
  return { request, api, logs, calls, operations, entered, gate, get owner() { return owner; }, get acquires() { return acquires; }, get releases() { return releases; } };
}

test('lost acquisition acknowledgement retries the same owner and executes exactly once', async () => {
  const h = harness({ dropAcquireAcks: 1 });
  const res = await h.request(); assert.equal(res.status, 200);
  assert.equal(h.operations.length, 1); assert.equal(h.operations[0].requestId, 'stable-request-123');
  assert.equal(h.acquires, 2); assert.equal(h.releases, 1); assert.equal(h.owner, null);
  assert.equal(new Set(h.calls.filter(x => x.path.endsWith('game_edge_lock')).map(x => x.body.p_owner)).size, 1);
});
test('two lost acquisition responses clean up the possible owner without dispatching', async () => {
  const h = harness({ dropAcquireAcks: 2 }); const res = await h.request();
  assert.equal(res.status, 503); assert.equal((await res.json()).error, 'LOCK_ACQUIRE_UNCERTAIN');
  assert.equal(h.operations.length, 0); assert.equal(h.releases, 1); assert.equal(h.owner, null);
});
test('transient release failures retry without replaying or changing the committed response', async () => {
  const h = harness({ failReleases: 2 }); const res = await h.request();
  assert.equal(res.status, 200); assert.equal(h.releases, 3); assert.equal(h.operations.length, 1); assert.equal(h.owner, null);
  assert.ok(h.logs.some(x => x.kind === 'lock_release_recovered'));
});
test('permanent release failure is bounded and traceable, preserving committed success', async () => {
  const h = harness({ failReleases: 99 }); const res = await h.request();
  assert.equal(res.status, 200); assert.equal(h.releases, 3); assert.ok(h.owner);
  assert.equal(h.logs.at(-1).release_state, 'unconfirmed');
  assert.ok(h.logs.some(x => x.kind === 'lock_release_unconfirmed'));
});
test('lost release acknowledgement is safe and stops after the owner is absent', async () => {
  const h = harness({ dropReleaseAck: true }); assert.equal((await h.request()).status, 200);
  assert.equal(h.releases, 2); assert.equal(h.owner, null); assert.equal(h.logs.at(-1).release_state, 'not_owner');
});
test('busy mutations never dispatch or release another owner, and carry retry guidance', async () => {
  const h = harness({ owner: 'other-request' }); const res = await h.request();
  assert.equal(res.status, 429); assert.equal((await res.json()).error, 'SERVER_BUSY');
  assert.equal(h.acquires, 12); assert.equal(h.releases, 0); assert.equal(h.owner, 'other-request');
  assert.equal(h.operations.length, 0); assert.equal(res.headers.get('Retry-After'), '2');
  assert.ok(res.headers.get('X-Game-Trace-Id'));
});
for (const action of ['battle/status', 'quest/status', 'chaos/catalog']) test(`${action} remains authenticated and available while another player holds the global lease`, async () => {
  const h = harness({ owner: 'another-player' }); const res = await h.request(action, {}, 'account-b');
  assert.equal(res.status, 200); assert.equal((await res.json()).accountId, 'eq.Bearer account-b');
  assert.equal(h.acquires, 0); assert.equal(h.releases, 0); assert.equal(h.owner, 'another-player');
  assert.ok(h.calls.some(x => x.path === '/auth/v1/user'));
});
for (const config of [{ anonymous: true }, { disabled: true }, { unlinked: true }, { unauthorized: true }]) test(`read bypass rejects invalid identity ${Object.keys(config)[0]}`, async () => {
  const h = harness(config); assert.notEqual((await h.request('battle/status')).status, 200);
  assert.equal(h.calls.some(x => x.path.endsWith('game_battle_status79')), false); assert.equal(h.acquires, 0);
});
for (const action of ['battle/cancel', 'worldboss/chest/open']) test(`${action} retains the mutation lease and executes its RPC only once`, async () => {
  const h = harness(); const res = await h.request(action, { battleId: 'test-battle', rewardId: 'test-reward', expectedSaveRevision: 7 });
  assert.equal(res.status, 200); assert.equal(h.acquires, 1); assert.equal(h.releases, 1); assert.equal(h.operations.length, 1);
});
test('planning failure never acquires the shared lease', async () => {
  const h = harness({ planningError: true }); assert.equal((await h.request()).status, 503); assert.equal(h.acquires, 0);
});
test('planning I/O precedes lock acquisition', async () => {
  const h = harness(); await h.request();
  const plan = h.calls.findIndex(x => x.path === '/rest/v1/GameDataCurrent');
  const config = h.calls.findIndex(x => x.path === '/rest/v1/game_runtime_config');
  const lock = h.calls.findIndex(x => x.path.endsWith('game_edge_lock'));
  assert.ok(plan >= 0 && plan < lock && config < lock);
});
test('live concurrent read succeeds while a mutation holds the lease; another mutation stays blocked', async () => {
  const h = harness({ block: true });
  const first = h.request('battle/start', {}, 'account-a'); await h.entered.promise;
  const originalOwner = h.owner;
  const read = await h.request('battle/status', { accountId: 'account-a' }, 'account-b');
  assert.equal(read.status, 200); assert.equal((await read.json()).accountId, 'eq.Bearer account-b');
  assert.equal((await h.request('battle/start', {}, 'account-b')).status, 429);
  assert.equal(h.owner, originalOwner); assert.equal(h.operations.length, 0);
  h.gate.resolve(); assert.equal((await first).status, 200);
  assert.equal(h.operations.length, 1); assert.equal(h.owner, null);
});
test('renewal loss stops work and cannot release a replacement owner', async () => {
  const h = harness({ loseRenewal: true }); const res = await h.request();
  assert.equal(res.status, 503); assert.equal((await res.json()).error, 'LOCK_LOST');
  assert.equal(h.operations.length, 0); assert.equal(h.owner, 'another-owner'); assert.equal(h.logs.at(-1).release_state, 'not_owner');
});
test('operation error still releases the lease; logs redact caller and error content', async () => {
  const h = harness({ operationError: true }); await h.request('SECRET-123', { sessionToken: 'SECRET-123', save: 'SECRET-123' }, 'SECRET-123');
  assert.equal(h.owner, null); assert.equal(h.releases, 1);
  assert.equal(JSON.stringify(h.logs).includes('SECRET-123'), false); assert.equal(h.logs[0].action, 'unknown');
  assert.ok(h.logs.some(x => x.kind === 'request_failed' && x.phase === 'execute'));
});
test('malformed lock response fails closed and attempts cleanup', async () => {
  const h = harness({ invalidLockReply: true }); assert.equal((await h.request()).status, 503);
  assert.equal(h.operations.length, 0); assert.equal(h.owner, null);
});
test('public reads and CORS do not acquire locks', async () => {
  const h = harness({ owner: 'other' }); assert.equal((await h.request('health')).status, 200);
  const res = await h.api(new Request('https://edge.test', { method: 'OPTIONS', headers: { Origin: 'https://game.test' } }));
  assert.equal(res.status, 204); assert.equal(h.acquires, 0);
});
test('cron still needs its secret and shares the protected mutation path', async () => {
  const h = harness(); assert.equal((await h.request('system/tick')).status, 200);
  assert.equal(h.acquires, 1); assert.equal(h.releases, 1); assert.deepEqual(h.operations, ['cron']);
  const before = h.calls.length;
  const rejected = await h.api(new Request('https://edge.test', { method: 'POST', body: JSON.stringify({ action: 'system/tick' }) }));
  assert.equal(rejected.status, 403); assert.equal(h.calls.length, before);
});
test('runtime tracks the whole request through cleanup, including client abort', async () => {
  const cleanup = deferred(), controller = new AbortController(); let retained, finished = false;
  const handler = retainGameRequest446(async () => { try { return Response.json({ ok: true }); } finally { await cleanup.promise; finished = true; } }, { waitUntil: p => retained = p });
  const response = handler(new Request('https://edge.test', { signal: controller.signal })); controller.abort();
  assert.ok(retained); assert.equal(finished, false); cleanup.resolve();
  assert.equal((await response).status, 200); await retained; assert.equal(finished, true);
});
