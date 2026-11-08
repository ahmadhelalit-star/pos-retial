export function readPreference(key,fallback) {
  try { return window.localStorage.getItem(`retail:ui:${key}`) ?? fallback; } catch { return fallback; }
}
export function writePreference(key,value) {
  try { window.localStorage.setItem(`retail:ui:${key}`,value); } catch { /* Presentation preferences are optional. */ }
}
