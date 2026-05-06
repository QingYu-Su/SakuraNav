/**
 * 访问规则解析器
 * @description 已简化：卡片始终跳转主 URL，备选 URL 仅在右键菜单中展示
 */

import type { Site } from "@/lib/base/types";

/**
 * 解析网站卡片的实际跳转 URL
 * - 始终返回主 URL（site.url）
 */
export function resolveSiteUrl(site: Site): string {
  return site.url;
}
