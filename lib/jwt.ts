// Minimal JWT payload decode — just enough to read the `roles` claim off the
// access token. No signature verification (the token is only ever trusted
// because it's the one this app's own login flow received from the backend
// over HTTPS) and no external jwt-decode dependency, per the task's ask.
//
// There is no separate "me" endpoint that returns roles (GET /users/me
// intentionally has no roles field, per frontend_handover.md) — the JWT's own
// `roles` claim (see ../salonjaa-backend/src/config/jwt.ts) is the only
// source of the current role set, and it's refreshed on every silent token
// refresh (auth.service.ts's refreshAccessToken re-reads roles from the DB
// each time), so decoding it after a refresh reflects roles granted since
// login too.
export function decodeJwtRoles(token: string | null | undefined): string[] {
  if (!token) return [];
  try {
    const payload = token.split(".")[1];
    if (!payload) return [];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json = decodeURIComponent(
      atob(padded)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    const decoded = JSON.parse(json);
    return Array.isArray(decoded?.roles) ? decoded.roles : [];
  } catch {
    return [];
  }
}
