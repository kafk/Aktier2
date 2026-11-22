const STORAGE_KEY = "admin-api-key";

export function getStoredAdminApiKey(): string {
  if (typeof window === "undefined") return "";
  try {
    return (localStorage.getItem(STORAGE_KEY) || "").trim();
  } catch {
    return "";
  }
}

export function setStoredAdminApiKey(key: string): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = key.trim();
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export function getWriteHeaders(extraHeaders?: Record<string, string>): Record<string, string> {
  const apiKey = getStoredAdminApiKey();
  return {
    "Content-Type": "application/json",
    "X-Requested-With": "Aktier2-Client",
    ...(apiKey ? { "x-api-key": apiKey } : {}),
    ...(extraHeaders || {}),
  };
}

