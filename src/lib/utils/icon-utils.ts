/**
 * 图标相关共享工具函数
 * @description 供网站编辑器和搜索引擎编辑器共用的图标生成、上传和 favicon 验证逻辑
 */

import { requestJson } from "@/lib/base/api";

/* ============================================ */
/* 文字图标 SVG 生成                             */
/* ============================================ */

/** XML 特殊字符转义 */
export function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 根据字符数量自适应字体大小 */
export function textIconFontSize(len: number): number {
  if (len <= 1) return 54;
  if (len <= 2) return 40;
  if (len <= 3) return 32;
  if (len <= 4) return 26;
  if (len <= 5) return 22;
  return 18;
}

/** 生成文字图标 SVG data URL（支持多字符） */
export function generateTextIconDataUrl(text: string, color: string): string {
  const display = text.trim() || "文";
  const escaped = escapeXml(display);
  const fontSize = textIconFontSize(display.length);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">`
    + `<rect width="120" height="120" rx="28" fill="${color}"/>`
    + `<text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" `
    + `fill="white" font-size="${fontSize}" font-family="Arial,'PingFang SC','Microsoft YaHei',sans-serif">`
    + `${escaped}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** 生成单字符文字图标（搜索引擎编辑器使用，固定 54px） */
export function generateSingleCharIconDataUrl(char: string, color: string): string {
  const display = char.trim() || "?";
  const escaped = escapeXml(display);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">`
    + `<rect width="120" height="120" rx="28" fill="${color}"/>`
    + `<text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" `
    + `fill="white" font-size="54" font-family="Arial,'PingFang SC','Microsoft YaHei',sans-serif">`
    + `${escaped}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/* ============================================ */
/* 域名提取                                      */
/* ============================================ */

/** 从 URL 中提取域名 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return parsed.hostname;
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  }
}

/* ============================================ */
/* Favicon 验证                                  */
/* ============================================ */

/** 生成 favicon.im 预览 URL */
export function getFaviconPreviewUrl(domain: string): string {
  return `https://favicon.im/${domain}?larger=true&throw-error-on-404=true`;
}

/** 验证 favicon 是否可加载，返回验证后的 URL 或 null */
export function verifyFavicon(
  url: string,
  onResult: (verifiedUrl: string | null) => void,
): void {
  const trimmed = url.trim();
  if (!trimmed) { onResult(null); return; }
  const domain = extractDomain(trimmed);
  if (!domain) { onResult(null); return; }

  const previewUrl = getFaviconPreviewUrl(domain);
  const img = new Image();
  img.onload = () => {
    if (img.naturalWidth <= 1 && img.naturalHeight <= 1) {
      onResult(null);
    } else {
      onResult(previewUrl);
    }
  };
  img.onerror = () => onResult(null);
  img.src = previewUrl;
}

/* ============================================ */
/* 图标上传                                      */
/* ============================================ */

/** 上传图标文件（本地文件） */
export async function uploadIconFile(
  file: File,
): Promise<{ id: string; url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("kind", "icon");
  return requestJson<{ id: string; url: string }>("/api/assets/wallpaper", {
    method: "POST",
    body: formData,
  });
}

/** 通过 URL 上传图标 */
export async function uploadIconByUrl(
  sourceUrl: string,
): Promise<{ id: string; url: string }> {
  return requestJson<{ id: string; url: string }>("/api/assets/wallpaper", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceUrl, kind: "icon" }),
  });
}
