// The one place in the app that knows about NEXT_PUBLIC_API_URL, attaches
// the Authorization header, and retries once on 401 after refreshing the
// access token. Every other file calls apiFetch() — never fetch() directly.
//
// Tokens live in memory only (module-level, not React state, not
// localStorage), matching the behavior of the inline api() helper this
// replaced: a full page reload still signs the user out. That's an
// existing gap, not something introduced here — see frontend/CLAUDE.md.

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

export function setTokens(next: Tokens | null) {
  tokens = next;
}

export function getTokens() {
  return tokens;
}

async function rawRequest(path: string, options: RequestInit, accessToken?: string): Promise<Response> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  return fetch(`${API_BASE_URL}${path}`, { ...options, headers });
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

  if (auth && response.status === 401 && tokens?.refreshToken) {
    const refreshResponse = await rawRequest("/auth/refresh-token", {
      method: "POST",
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });
    if (refreshResponse.ok) {
      const { accessToken } = await refreshResponse.json();
      tokens = { accessToken, refreshToken: tokens.refreshToken };
      response = await rawRequest(path, options, accessToken);
    } else {
      tokens = null;
      throw new SessionExpiredError();
    }
  }

  if (!response.ok) throw await toApiError(response);
  return response.status === 204 ? (null as T) : response.json();
}

export function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}
