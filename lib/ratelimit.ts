// Límite sencillo por IP, en memoria. Frena abusos básicos si publicas la web.
// En Vercel cada instancia tiene su propia memoria, así que es una protección
// ligera, no un límite exacto.

const hits = new Map<string, number[]>();

export function allow(req: Request, limit = 20, windowMs = 60_000): boolean {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(ip, recent);
    return false;
  }
  recent.push(now);
  hits.set(ip, recent);
  return true;
}
