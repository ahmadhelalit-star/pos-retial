const PREFIX = 'shamtouch:v1:';

function getStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readJSON(key, fallback) {
  const storage = getStorage();
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeJSON(key, value) {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function readLegacyJSON(key, fallback) {
  const storage = getStorage();
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function removeJSON(key) {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.removeItem(PREFIX + key);
    return true;
  } catch {
    return false;
  }
}
