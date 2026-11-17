// Validasi anti-SSRF untuk URL target scan. Dipakai di client (form Scan URL)
// DAN server (POST /api/scans) — jangan pernah percaya validasi client saja.
// Aturan: hanya http/https; tolak host privat/internal agar worker Nuclei tidak
// bisa diarahkan memindai jaringan internal, localhost, atau endpoint metadata
// cloud (mis. 169.254.169.254). Validasi ini memeriksa host secara literal;
// hostname yang me-resolve ke IP privat tetap tanggung jawab operator worker.

export interface UrlCheck {
  ok: boolean;
  /** URL ternormalisasi (url.href) bila valid. */
  url?: string;
  /** Pesan error Bahasa Indonesia bila tidak valid. */
  error?: string;
}

function isIPv4(host: string): boolean {
  return /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.test(host);
}

function ipv4Octets(host: string): number[] | null {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const parts = m.slice(1).map((p) => Number(p));
  if (parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return parts;
}

function isPrivateIPv4(host: string): boolean {
  const o = ipv4Octets(host);
  if (!o) return false;
  const [a, b] = o;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // 127.0.0.0/8 (loopback)
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 (link-local, metadata cloud)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  return false;
}

function isPrivateIPv6(host: string): boolean {
  // host sudah tanpa kurung siku (URL.hostname menghapusnya).
  const h = host.toLowerCase();
  if (h === "::1" || h === "::") return true; // loopback / unspecified
  if (h.startsWith("fe8") || h.startsWith("fe9") || h.startsWith("fea") || h.startsWith("feb")) return true; // fe80::/10 link-local
  if (h.startsWith("fc") || h.startsWith("fd")) return true; // fc00::/7 unique-local
  // IPv4-mapped / IPv4-compatible: ::ffff:192.168.1.1 — periksa bagian IPv4-nya.
  const v4 = h.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (v4 && isPrivateIPv4(v4[1])) return true;
  return false;
}

/** Cek apakah hostname tergolong privat/internal. */
export function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.+$/, "");
  if (host === "localhost") return true;
  if (host.endsWith(".local")) return true;
  if (host === "metadata.google.internal") return true;
  if (isIPv4(host)) return isPrivateIPv4(host);
  if (host.includes(":")) return isPrivateIPv6(host);
  return false;
}

/**
 * Validasi URL target scan. Mengembalikan URL ternormalisasi bila lolos,
 * atau pesan error bila tidak. Dipakai identik di client dan server.
 */
export function validateScanUrl(raw: unknown): UrlCheck {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return { ok: false, error: "URL target wajib diisi." };
  }
  const input = raw.trim();
  if (input.length > 2048) {
    return { ok: false, error: "URL terlalu panjang (maksimum 2048 karakter)." };
  }
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return { ok: false, error: "URL tidak valid. Contoh: https://staging.contohku.id" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "Hanya URL http:// atau https:// yang boleh dipindai." };
  }
  if (!parsed.hostname) {
    return { ok: false, error: "URL harus memiliki hostname." };
  }
  if (isPrivateHost(parsed.hostname)) {
    return {
      ok: false,
      error: `Host "${parsed.hostname}" adalah alamat privat/internal dan tidak boleh dipindai (anti-SSRF).`,
    };
  }
  return { ok: true, url: parsed.href };
}
