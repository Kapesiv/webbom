const authStorageKeys = ["auth", "lumix-auth"];

function getStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function hasStoredAuth() {
  const storage = getStorage();
  return authStorageKeys.some((key) => storage?.getItem(key) === "true");
}

export function markAuthenticated() {
  const storage = getStorage();
  authStorageKeys.forEach((key) => storage?.setItem(key, "true"));
}

export function clearAuthenticated() {
  const storage = getStorage();
  authStorageKeys.forEach((key) => storage?.removeItem(key));
}

export function redirectTo(path) {
  if (window.location.pathname === path) {
    return;
  }

  window.location.replace(path);
}
