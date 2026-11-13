// Lease I/O is retried; game operations are never replayed here.
export function createGameLease446({ owner, rpc, log, now = Date.now, sleep = ms => new Promise(r => setTimeout(r, ms)) }) {
  let held = false, possibleOwner = false, closing = false;
  let acquiredAt = 0, attempts = 0, releaseAttempts = 0, releaseState = 'not_needed';
  return {
    get held() { return held; },
    get summary() { return { lock_attempts: attempts, release_attempts: releaseAttempts, release_state: releaseState, held_ms: acquiredAt ? now() - acquiredAt : 0 }; },
    async acquire() {
      let failures = 0;
      for (let i = 0; i < 12; i++) {
        if (closing) throw Error('LOCK_CLOSED');
        attempts++;
        // Set before await: a committed UPDATE can lose its HTTP response.
        possibleOwner = true;
        let result;
        try {
          result = await rpc({ p_owner: owner });
          if (typeof result !== 'boolean') throw Error('LOCK_RESPONSE_INVALID');
        } catch (err) {
          log('lock_acquire_error', { attempt: attempts });
          if (++failures >= 2) throw Error('LOCK_ACQUIRE_UNCERTAIN');
          await sleep(150);
          continue; // Same owner, never another game-operation attempt.
        }
        if (result) {
          held = true; acquiredAt = now();
          log('lock_acquired', { attempts });
          return;
        }
        // Keep cleanup armed after ANY ambiguous earlier acquisition.
        possibleOwner = failures > 0;
        if (i < 11) await sleep(200);
      }
      throw Error('SERVER_BUSY');
    },
    async renew() {
      if (!held || closing) throw Error('LOCK_LOST');
      const result = await rpc({ p_owner: owner });
      if (result !== true) throw Error('LOCK_LOST');
    },
    async release() {
      closing = true;
      if (!possibleOwner) return;
      // The DB only releases this request's owner, never somebody else's lease.
      for (let i = 0; i < 3; i++) {
        releaseAttempts++;
        try {
          const result = await rpc({ p_owner: owner, p_release: true });
          if (typeof result !== 'boolean') throw Error('LOCK_RESPONSE_INVALID');
          releaseState = result ? 'released' : 'not_owner';
          held = false; possibleOwner = false;
          if (i > 0 || !result) log('lock_release_recovered', { attempt: releaseAttempts, result: releaseState });
          return;
        } catch (err) {
          log('lock_release_error', { attempt: releaseAttempts });
          if (i < 2) await sleep(150 * (i + 1));
        }
      }
      releaseState = 'unconfirmed';
      log('lock_release_unconfirmed', { attempts: releaseAttempts });
      // Do not turn a committed game operation into a retryable failure.
    }
  };
}

// Keep the handler (including finally/cleanup) registered with the runtime.
// This is not a guarantee against CPU, memory or hard worker lifetime limits.
export function retainGameRequest446(handler, runtime = globalThis.EdgeRuntime) {
  return req => {
    const pending = handler(req);
    if (runtime?.waitUntil) runtime.waitUntil(pending.then(() => undefined, () => undefined));
    return pending;
  };
}
