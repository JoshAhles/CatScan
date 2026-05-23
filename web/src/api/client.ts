const token =
  ((window as unknown as Record<string, unknown>)["__CATSCAN_TOKEN__"] as string) ||
  (import.meta.env["VITE_CATSCAN_TOKEN"] as string) ||
  "";

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string> ?? {}), "x-catscan-token": token };
  if (init.body) headers["content-type"] = "application/json";
  const res = await fetch(path, { ...init, headers });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}
