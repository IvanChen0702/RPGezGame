import { reduceMist468 } from "./mist-runtime468.js";
const random468 = () =>
  crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
export async function handleMist468(rpc, account, body) {
  const action =
      body.action === "system/mistTick" ? "status" : body.action.slice(5),
    request = action === "status" ? null : body.requestId;
  if (
    action !== "status" &&
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
      String(request || ""),
    )
  )
    return { ok: false, error: "MIST_REQUEST_REQUIRED" };
  const keys = [
    "x",
    "y",
    "itemId",
    "chestId",
    "targetId",
    "battleId",
    "gemId",
    "kind",
    "slot",
    "choice",
    "active",
    "passive",
    "skill",
    "expectedRevision",
  ];
  const payload = Object.fromEntries(
    keys.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]),
  );
  try {
    for (let i = 0; i < 4; i++) {
      const input = await rpc("game_mist_load468", {
        p_account: account,
        p_request: request,
      });
      if (input.previous) {
        if (
          input.previous.action !== action ||
          JSON.stringify(input.previous.payload) !== JSON.stringify(payload)
        ) {
          // jsonb object ordering is not JavaScript insertion order.
          const canonical = (x) =>
            JSON.stringify(
              Object.keys(x)
                .sort()
                .map((k) => [k, x[k]]),
            );
          if (
            input.previous.action !== action ||
            canonical(input.previous.payload) !== canonical(payload)
          )
            return { ok: false, error: "MIST_REQUEST_REUSED" };
        }
        return input.previous.result;
      }
      const out = await reduceMist468(
        input,
        account,
        action,
        payload,
        random468,
      );
      if (!out.patch) return out.result;
      const p = out.patch,
        changed = Object.entries(p).some(([k, v]) =>
          k === "meta"
            ? JSON.stringify(v) !== JSON.stringify(input.world.meta)
            : v.length > 0,
        );
      if (action === "status" && !changed) return out.result;
      const result = await rpc("game_mist_commit468", {
        p_account: account,
        p_request: request,
        p_action: action,
        p_payload: payload,
        p_revision: input.world.revision,
        p_patch: p,
        p_result: out.result,
      });
      if (result.error !== "MIST_RETRY") return result;
    }
    return {
      ok: false,
      error: "MIST_RETRY",
      message: "戰境位置剛有變動，請用同筆操作重試。",
    };
  } catch (e) {
    const code = String(e?.message || e);
    if (/^MIST_[A-Z_]+(?::.*)?$/.test(code))
      return { ok: false, error: code.split(":")[0] };
    throw e;
  }
}
