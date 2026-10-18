import { Agent, setGlobalDispatcher } from "undici";
// On slow or NAT64 networks the TCP connect to upstreams (Neon Auth, Neon DB)
// can take well over undici's default 10 s budget — successful handshakes were
// measured at 13-14 s while everything slower than 10 s aborted with
// UND_ERR_CONNECT_TIMEOUT and surfaced as 502s on every auth call, including
// get-session, sign-in/social and organization/list. One shared global agent
// with a 30 s connect budget lets those slow-but-working connections complete;
// dead windows still fail fast enough for the proxy's fetch replays to sample
// a healthy moment. Importing this module patches the runtime's global fetch
// dispatcher (verified: the npm undici dispatcher symbol is what Node's
// built-in fetch reads), so every server-side fetch in the auth proxy and the
// database driver picks it up automatically.
const flag = "__collabdocsUndiciDispatcherInstalled";
if (!globalThis[flag]) {
  setGlobalDispatcher(
    new Agent({
      connect: { timeout: 30_000 },
      headersTimeout: 60_000,
      bodyTimeout: 60_000,
      keepAliveTimeout: 30_000,
      keepAliveMaxTimeout: 60_000,
    }),
  );
  globalThis[flag] = true;
}
