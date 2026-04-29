/**
 * 访问规则解析器
 * @description 根据 Site 的 accessRules 配置，解析出实际跳转 URL
 */

import type { Site, AccessRules, AccessCondition, TimeCondition, DeviceCondition } from "@/lib/base/types";

/**
 * 解析网站卡片的实际跳转 URL
 * - 无 accessRules 或 urls 为空 → 返回主 URL
 * - auto 模式 → 主 URL 在线时用主 URL，否则按顺序找第一个在线的备选
 * - conditional 模式 → 按顺序检查条件，第一个匹配的 URL
 */
export function resolveSiteUrl(site: Site): string {
  const rules = site.accessRules;
  if (!rules || rules.enabled === false || rules.urls.length === 0) return site.url;

  switch (rules.mode) {
    case "auto":
      return resolveAuto(site, rules);
    case "conditional":
      return resolveConditional(site, rules);
    default:
      return site.url;
  }
}

/** 自动模式：主 URL 离线时按顺序尝试备选 */
function resolveAuto(site: Site, rules: AccessRules): string {
  // 主 URL 在线或未检查 → 使用主 URL
  if (site.isOnline !== false) return site.url;

  // 按顺序查找第一个启用且在线的备选
  for (const alt of rules.urls) {
    if (!alt.enabled) continue;
    if (alt.isOnline === true) return alt.url;
  }

  // 全部离线或未检查 → 仍返回主 URL
  return site.url;
}

/** 条件模式：按顺序检查条件，第一个匹配的 URL */
function resolveConditional(site: Site, rules: AccessRules): string {
  for (const alt of rules.urls) {
    if (!alt.enabled || !alt.condition) continue;
    if (evaluateCondition(alt.condition)) return alt.url;
  }
  // 无匹配条件 → 使用主 URL
  return site.url;
}

/** 评估单个条件 */
function evaluateCondition(condition: AccessCondition): boolean {
  switch (condition.type) {
    case "schedule":
      return evaluateTimeCondition(condition);
    case "device":
      return evaluateDeviceCondition(condition);
    default:
      return false;
  }
}

/** 评估时间条件 */
function evaluateTimeCondition(cond: TimeCondition): boolean {
  const now = new Date();

  // 日期范围
  if (cond.startDate) {
    const start = new Date(cond.startDate);
    start.setHours(0, 0, 0, 0);
    if (now < start) return false;
  }
  if (cond.endDate) {
    const end = new Date(cond.endDate);
    end.setHours(23, 59, 59, 999);
    if (now > end) return false;
  }

  // 星期
  if (cond.weekDays.length > 0) {
    // JS 中 0=周日, 1=周一 ... 6=周六
    // 我们的约定: 1=周一, 7=周日
    const jsDay = now.getDay();
    const ourDay = jsDay === 0 ? 7 : jsDay;
    if (!cond.weekDays.includes(ourDay)) return false;
  }

  // 时间段
  const hour = now.getHours();
  if (hour < cond.startHour || hour > cond.endHour) return false;

  return true;
}

/** 评估设备条件 */
function evaluateDeviceCondition(cond: DeviceCondition): boolean {
  if (typeof window === "undefined") return false;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  return cond.device === "mobile" ? isMobile : !isMobile;
}
