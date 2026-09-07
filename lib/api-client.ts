// The one place in the app that knows about NEXT_PUBLIC_API_URL, attaches
// the Authorization header, and retries once on 401 after refreshing the
// access token. Every other file calls apiFetch() — never fetch() directly.
//
// Tokens live in memory (module-level, not React state, not localStorage) as
// the source of truth for the current session immediately after login — see
// hooks/use-account.ts's verifyOtp. That alone doesn't survive a reload,
// which is the bug docs/KNOWN_BACKEND_LIMITATIONS.md's "Sessions don't
// survive a page reload" entry describes. Module 14a (backend) fixed this at
// the root: POST /auth/verify-otp and POST /auth/refresh-token now *also*
// set accessToken/refreshToken as httpOnly cookies (alongside the unchanged
// JSON body), so `credentials: "include"` below is what makes a reload
// recoverable — hooks/use-account.ts's mount-time restore effect calls
// POST /auth/refresh-token with an empty body and lets the cookie answer.
// A companion, deliberately non-httpOnly `csrfToken` cookie must be echoed
// back as `X-CSRF-Token` on every mutating request or the backend 403s a
// cookie-authenticated one (a Bearer-header request is never CSRF-checked).

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export class ApiError extends Error {
  status: number;
  retryAfterSeconds?: number;

  constructor(message: string, status: number, retryAfterSeconds?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

// Thrown specifically when a refresh attempt itself fails (refresh token
// expired/revoked). Callers use this to distinguish "force sign-out" from
// an ordinary request error.
export class SessionExpiredError extends ApiError {
  constructor() {
    super("Your session has expired. Please sign in again.", 401);
    this.name = "SessionExpiredError";
  }
}

type Tokens = { accessToken: string; refreshToken: string };

let tokens: Tokens | null = null;

// Subscribers are notified on every token change — login, sign-out, and the
// silent refresh below. account-context uses this to recompute decoded JWT
// roles (see lib/jwt.ts) without every caller needing to know that happened.
type TokensListener = (tokens: Tokens | null) => void;
const listeners = new Set<TokensListener>();

function updateTokens(next: Tokens | null) {
  tokens = next;
  listeners.forEach((fn) => fn(tokens));
}

export function setTokens(next: Tokens | null) {
  updateTokens(next);
}

export function subscribeTokens(fn: TokensListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getTokens() {
  return tokens;
}

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// No cookie library needed for a single-cookie read — this only ever reads
// the deliberately non-httpOnly `csrfToken` cookie (Module 14a), never the
// httpOnly accessToken/refreshToken ones, which JS can't read by design.
function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

async function rawRequest(path: string, options: RequestInit, accessToken?: string): Promise<Response> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  // Only meaningful when auth actually resolved via the cookie rather than
  // the Authorization header above, but harmless to always send once
  // credentials are included — the backend only checks it for a
  // cookie-authenticated mutating request.
  const method = (options.method || "GET").toUpperCase();
  if (MUTATING_METHODS.has(method)) {
    const csrfToken = readCookie("csrfToken");
    if (csrfToken) headers.set("X-CSRF-Token", csrfToken);
  }

  // credentials: "include" is what makes the browser actually send/receive
  // the httpOnly accessToken/refreshToken/csrfToken cookies — needed here
  // and on the refresh-token retry below, since both go through this
  // function.
  return fetch(`${API_BASE_URL}${path}`, { ...options, headers, credentials: "include" });
}

async function toApiError(response: Response): Promise<ApiError> {
  const body = await response.json().catch(() => ({}));
  const retryAfterSeconds = body?.error?.details?.retryAfterSeconds;
  return new ApiError(body?.error?.message || "We couldn't complete that request.", response.status, retryAfterSeconds);
}

/**
 * Request against the backend. Pass `auth: false` for the handful of
 * endpoints that intentionally run unauthenticated (send-otp/verify-otp,
 * which happen before any token exists).
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
  { auth = true }: { auth?: boolean } = {}
): Promise<T> {
  let response = await rawRequest(path, options, auth ? tokens?.accessToken : undefined);

  // Guards on `tokens` being present (we believe there's a session), not on
  // `tokens.refreshToken` specifically — a session restored on mount (see
  // hooks/use-account.ts) has no in-memory refreshToken string at all, only
  // the httpOnly cookie, and still needs this retry path to work. When we do
  // have a real refreshToken, it's sent in the body exactly as before
  // (unchanged behavior for a normal login); when we don't, an empty body
  // lets the backend fall back to the cookie.
  if (auth && response.status === 401 && tokens) {
    const refreshResponse = await rawRequest("/auth/refresh-token", {
      method: "POST",
      body: JSON.stringify(tokens.refreshToken ? { refreshToken: tokens.refreshToken } : {}),
    });
    if (refreshResponse.ok) {
      const { accessToken } = await refreshResponse.json();
      updateTokens({ accessToken, refreshToken: tokens.refreshToken });
      response = await rawRequest(path, options, accessToken);
    } else {
      updateTokens(null);
      throw new SessionExpiredError();
    }
  }

  if (!response.ok) throw await toApiError(response);
  return response.status === 204 ? (null as T) : response.json();
}

export function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}
