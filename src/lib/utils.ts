import { clsx } from "clsx";

export function cn(...inputs: Array<string | false | null | undefined>) {
  return clsx(inputs);
}

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function encodeCursor(offset: number) {
  return Buffer.from(JSON.stringify({ offset }), "utf8").toString("base64url");
}

export function decodeCursor(cursor: string | null) {
  if (!cursor) return 0;

  try {
    const decoded = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    ) as { offset?: number };

    return typeof decoded.offset === "number" && decoded.offset >= 0
      ? decoded.offset
      : 0;
  } catch {
    return 0;
  }
}

export function createSvgPlaceholder(label: string, color: string) {
  const first = label.trim().charAt(0).toUpperCase() || "S";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="28" fill="${color}"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="54" font-family="Arial">${first}</text></svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return Response.json(data, init);
}

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}
