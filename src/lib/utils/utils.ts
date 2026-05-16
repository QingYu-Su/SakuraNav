/**
 * @description 工具函数 - 通用工具函数集合，包括类名合并、字符串处理、游标编解码等
 */

import { clsx } from "clsx";

/**
 * 合并类名字符串
 * @param inputs 类名输入（支持条件表达式）
 * @returns 合并后的类名字符串
 */
export function cn(...inputs: Array<string | false | null | undefined>) {
  return clsx(inputs);
}

/**
 * 将字符串转换为 URL 友好的 slug 格式
 * @param value 原始字符串
 * @returns slug 字符串
 */
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

/**
 * 规范化 URL 用于重复比较
 * - 去掉 http:// 或 https:// 前缀
 * - 去掉末尾 /
 * - 转小写
 */
export function normalizeUrlForCompare(url: string): string {
  return url
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "")
    .toLowerCase();
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return Response.json(data, init);
}

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

/**
 * 移动端检测：视口宽度 < 1024px
 */
export function isMobileViewport(): boolean {
  return typeof window !== "undefined" && window.innerWidth < 1024;
}

/**
 * 导航时自动补全协议前缀：如 URL 不含 :// 则补齐 https://
 * 支持任意协议（chrome://、p2p:// 等），仅对无协议前缀的 URL 补齐 https://
 */
export function withProtocol(url: string): string {
  return /:\/\//i.test(url) ? url : `https://${url}`;
}

/**
 * 在合适的窗口中打开 URL：移动端当前页跳转，桌面端新标签页
 */
export function openUrl(url: string): void {
  const target = withProtocol(url);
  if (isMobileViewport()) {
    window.location.href = target;
  } else {
    window.open(target, "_blank", "noopener,noreferrer");
  }
}
