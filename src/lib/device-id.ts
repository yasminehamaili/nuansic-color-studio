/**
 * A random id for this browser, used ONLY to key the anonymous daily
 * generation quota (3/day by default -- see backend/palette_api.py).
 * Not an account, not a fingerprint -- just a courtesy identity so the
 * "3 credits" badge can persist across page reloads. Clearing storage or
 * opening a private window resets it, which is expected and fine: the
 * real abuse backstop is the per-IP cap on the backend, not this.
 */
const KEY = "nuansic_device_id";

export function getDeviceId(): string {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}
