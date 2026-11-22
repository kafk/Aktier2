import crypto from "crypto";
import { NextRequest } from "next/server";

export interface WriteAuthResult {
  authorized: boolean;
  status: number;
  error?: string;
}

function getConfiguredApiKey(): string {
  return (process.env.ADMIN_API_KEY || process.env.ARTICLES_API_KEY || "").trim();
}

export function isWriteProtectionConfigured(): boolean {
  return getConfiguredApiKey().length > 0;
}

function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function extractProvidedApiKey(request: NextRequest): string {
  const headerKey = request.headers.get("x-api-key")?.trim();
  if (headerKey) return headerKey;

  const authHeader = request.headers.get("authorization")?.trim();
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }

  return "";
}

function isSameOriginRequest(request: NextRequest): boolean {
  const host = (
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    ""
  )
    .split(",")[0]
    .trim()
    .toLowerCase();

  if (!host) return false;

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const originHost = new URL(origin).host.toLowerCase();
      if (originHost !== host) return false;
    } catch {
      return false;
    }
  }

  const referer = request.headers.get("referer");
  if (!origin && referer) {
    try {
      const refererHost = new URL(referer).host.toLowerCase();
      if (refererHost !== host) return false;
    } catch {
      return false;
    }
  }

  const requestedWith = request.headers.get("x-requested-with");
  return requestedWith === "Aktier2-Client";
}

/**
 * Verifies whether a write/delete request to a protected API route is authorized.
 * - If ADMIN_API_KEY (or ARTICLES_API_KEY) is set on the server, the request MUST provide a matching key.
 * - If no key is set in production (and ALLOW_UNAUTHENTICATED_WRITES !== "true"), write/delete requests are rejected.
 * - In local development without ADMIN_API_KEY configured, same-origin requests with X-Requested-With: Aktier2-Client are permitted.
 */
export function verifyWriteAccess(request: NextRequest): WriteAuthResult {
  const configuredKey = getConfiguredApiKey();
  const providedKey = extractProvidedApiKey(request);

  if (configuredKey) {
    if (!providedKey || !timingSafeCompare(providedKey, configuredKey)) {
      return {
        authorized: false,
        status: 401,
        error:
          "Åtkomst nekad: Giltig API-nyckel (ADMIN_API_KEY) krävs för att spara, ändra eller radera artiklar.",
      };
    }
    return { authorized: true, status: 200 };
  }

  // If no ADMIN_API_KEY is configured:
  const isProd = process.env.NODE_ENV === "production";
  const allowUnauthenticated = process.env.ALLOW_UNAUTHENTICATED_WRITES === "true";

  if (isProd && !allowUnauthenticated) {
    return {
      authorized: false,
      status: 403,
      error:
        "Skrivning och radering är blockerad i produktion tills miljövariabeln ADMIN_API_KEY har konfigurerats på servern.",
    };
  }

  if (!isSameOriginRequest(request)) {
    return {
      authorized: false,
      status: 403,
      error: "Åtkomst nekad: Ogiltig avsändare (CSRF-skydd).",
    };
  }

  return { authorized: true, status: 200 };
}

