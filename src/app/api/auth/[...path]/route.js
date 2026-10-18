import { auth } from "@/lib/auth/server";
// GET/POST proxies Managed Better Auth API through /api/auth/*. Public scope.
// Some browsers (in-app browsers, WebViews, privacy modes) send "Origin: null"
// on fetch POSTs, and the Neon Auth server rejects that with
// MISSING_OR_NULL_ORIGIN — which broke OTP resend and code verification.
// Normalizing a missing or null Origin to this app's own origin keeps the
// server's CSRF origin check meaningful (it still verifies the origin against
// its trusted-domains list) while fixing those browsers.
//
// The Neon Auth host is reached over a flaky route on some networks (single
// connects timing out into 502s on get-session/sign-in/social). Requests are
// therefore replayed up to 3 times when the upstream fetch fails; bodies are
// buffered once so each replay gets a fresh Request (a NextRequest stream can
// only be consumed once).
const handlers = auth.handler();
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 400;

function prepareRequest(nextRequest) {
  const hasBody = nextRequest.method !== "GET" && nextRequest.method !== "HEAD";
  const bodyPromise = hasBody ? nextRequest.arrayBuffer() : Promise.resolve(undefined);
  return async () => {
    const headers = new Headers(nextRequest.headers);
    const origin = headers.get("origin");
    if (!origin || origin === "null") {
      headers.set("origin", new URL(nextRequest.url).origin);
    }
    const body = await bodyPromise;
    // Rebuild as a plain Request: NextRequest instances cannot be passed to
    // `new Request()`, and stream bodies need the duplex flag on Node.
    return new Request(nextRequest.url, {
      method: nextRequest.method,
      headers,
      body,
      ...(hasBody ? { duplex: "half" } : {}),
    });
  };
}

async function replayOnUpstreamFailure(handler, nextRequest, context) {
  const buildRequest = prepareRequest(nextRequest);
  let response;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    response = await handler(await buildRequest(), context);
    const isLastAttempt = attempt === MAX_ATTEMPTS;
    // 502 here means the proxy could not reach Neon Auth (network-level
    // failure), not an application error — safe to replay.
    if (response.status !== 502 || isLastAttempt) return response;
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
  }
  return response;
}

export const GET = (request, context) =>
  replayOnUpstreamFailure((req, ctx) => handlers.GET(req, ctx), request, context);
export const POST = (request, context) =>
  replayOnUpstreamFailure((req, ctx) => handlers.POST(req, ctx), request, context);
