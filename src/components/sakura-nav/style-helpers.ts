/**
 * 样式工具函数
 * @description 提取 sakura-nav-app 中的样式计算逻辑为纯函数
 */

import { cn } from "@/lib/utils/utils";
import type { ThemeAppearance, ThemeMode } from "@/lib/base/types";
import type React from "react";

/**
 * 根据磨砂强度 (0-100) 计算 backdrop-filter 的 blur 值 (px)
 * 使用 sqrt 曲线让低值区段变化更明显
 * 0 → 0px（无磨砂），100 → 28px（最大磨砂）
 */
export function getFrostedBlurPx(intensity: number): number {
  if (intensity <= 0) return 0;
  return Math.round(28 * Math.sqrt(intensity / 100));
}

/**
 * 判断磨砂强度是否处于"开启"状态（> 0）
 * 用于样式函数内部决定使用磨砂或非磨砂 CSS 类
 */
function isFrosted(value: number): boolean {
  return value > 0;
}

/**
 * 生成 .frosted-glass 所需的 CSS 自定义属性（通过 inline style 注入）
 * 桌面端/移动端通过 @media 查询完全隔离，互不影响
 *
 * @param themeMode 当前主题
 * @param desktopFrosted 桌面端磨砂强度 (0-100)
 * @param mobileFrosted 移动端磨砂强度 (0-100)
 */
export function getFrostedGlassStyle(
  themeMode: ThemeMode,
  desktopFrosted: number,
  mobileFrosted: number,
): React.CSSProperties {
  const isLight = themeMode === "light";
  // 背景最大不透明度：明亮模式 75%，暗黑模式 18%
  const maxBg = isLight ? 0.75 : 0.18;

  // 模糊值（sqrt 曲线）
  const mBlur = getFrostedBlurPx(mobileFrosted);
  const dBlur = getFrostedBlurPx(desktopFrosted);

  // 背景不透明度（线性 0 → maxBg）
  const mBg = maxBg * (mobileFrosted / 100);
  const dBg = maxBg * (desktopFrosted / 100);

  // hover 时额外增加 10% 不透明度（上限 0.95）
  const mBgHover = mobileFrosted > 0 ? Math.min(mBg + 0.10, 0.95) : 0;
  const dBgHover = desktopFrosted > 0 ? Math.min(dBg + 0.10, 0.95) : 0;

  return {
    "--frosted-blur-m": `${mBlur}px`,
    "--frosted-blur-d": `${dBlur}px`,
    "--frosted-bg-m": mobileFrosted > 0 ? `rgba(255, 255, 255, ${mBg.toFixed(3)})` : "transparent",
    "--frosted-bg-d": desktopFrosted > 0 ? `rgba(255, 255, 255, ${dBg.toFixed(3)})` : "transparent",
    "--frosted-bg-hover-m": mobileFrosted > 0 ? `rgba(255, 255, 255, ${mBgHover.toFixed(3)})` : "transparent",
    "--frosted-bg-hover-d": desktopFrosted > 0 ? `rgba(255, 255, 255, ${dBgHover.toFixed(3)})` : "transparent",
  } as React.CSSProperties;
}

/**
 * 构建主题背景（壁纸 or 默认渐变）
 */
export function buildThemeBackground(
  theme: ThemeMode,
  device: "desktop" | "mobile",
  appearances: Record<ThemeMode, ThemeAppearance>,
) {
  const appearance = appearances[theme];
  const defaultBackground =
    theme === "light"
      ? "radial-gradient(circle at top left, rgba(255,207,150,0.8), transparent 28%), radial-gradient(circle at 80% 10%, rgba(95,134,255,0.4), transparent 32%), linear-gradient(135deg, #f4ede4 0%, #efe5d7 44%, #e2e5ef 100%)"
      : "radial-gradient(circle at top left, rgba(87,65,198,0.34), transparent 28%), radial-gradient(circle at 80% 10%, rgba(0,204,255,0.22), transparent 32%), linear-gradient(145deg, #08101e 0%, #11192a 42%, #101726 100%)";
  const wallpaperOverlay =
    theme === "light"
      ? "linear-gradient(180deg, rgba(255,248,241,0.18) 0%, rgba(244,238,232,0.34) 100%)"
      : "linear-gradient(180deg, rgba(6,11,22,0.54) 0%, rgba(8,15,29,0.68) 100%)";
  const desktopBackground = appearance.desktopWallpaperUrl
    ? `${wallpaperOverlay}, url(${appearance.desktopWallpaperUrl})`
    : defaultBackground;

  if (device === "desktop") {
    return desktopBackground;
  }

  return appearance.mobileWallpaperUrl
    ? `${wallpaperOverlay}, url(${appearance.mobileWallpaperUrl})`
    : defaultBackground;
}

/**
 * 构建 header chrome 样式
 */
export function getHeaderChromeClass(
  themeMode: ThemeMode,
  hasActiveWallpaper: boolean,
) {
  return themeMode === "light"
    ? hasActiveWallpaper
      ? "border-b border-slate-950/8 bg-[linear-gradient(180deg,rgba(255,250,246,0.44),rgba(255,255,255,0.26))] shadow-[0_14px_44px_rgba(148,163,184,0.10)] backdrop-blur-[24px]"
      : "border-b border-slate-950/6 bg-[linear-gradient(90deg,rgba(255,252,247,0.88),rgba(237,244,255,0.82),rgba(223,239,250,0.8))] shadow-[0_16px_60px_rgba(148,163,184,0.16)] backdrop-blur-xl"
    : hasActiveWallpaper
      ? "border-b border-white/10 bg-[linear-gradient(180deg,rgba(8,15,29,0.56),rgba(15,23,42,0.38))] shadow-[0_18px_54px_rgba(2,6,23,0.28)] backdrop-blur-[24px]"
      : "border-b border-white/8 bg-[linear-gradient(90deg,rgba(44,53,84,0.82),rgba(55,71,102,0.72),rgba(57,89,109,0.74))] shadow-[0_16px_60px_rgba(15,23,42,0.18)] backdrop-blur-xl";
}

/**
 * 构建 sidebar chrome 样式
 */
export function getSidebarChromeClass(
  themeMode: ThemeMode,
  hasActiveWallpaper: boolean,
) {
  return themeMode === "light"
    ? hasActiveWallpaper
      ? "lg:border-r border-slate-950/8 bg-[linear-gradient(180deg,rgba(255,251,247,0.46),rgba(255,255,255,0.3))] shadow-[18px_0_48px_rgba(148,163,184,0.10)] backdrop-blur-[26px]"
      : "lg:border-r border-slate-950/6 bg-[linear-gradient(180deg,rgba(247,240,232,0.92),rgba(238,239,245,0.9),rgba(227,236,244,0.92))] shadow-[18px_0_48px_rgba(148,163,184,0.12)] backdrop-blur-xl"
    : hasActiveWallpaper
      ? "lg:border-r border-white/10 bg-[linear-gradient(180deg,rgba(8,15,29,0.64),rgba(15,23,42,0.46))] shadow-[18px_0_48px_rgba(2,6,23,0.26)] backdrop-blur-[26px]"
      : "lg:border-r border-white/8 bg-[linear-gradient(180deg,rgba(66,64,108,0.82),rgba(58,62,99,0.76),rgba(50,58,88,0.78))] shadow-[18px_0_48px_rgba(10,17,31,0.12)] backdrop-blur-xl";
}

/**
 * 构建顶部操作按钮样式
 */
export function getTopActionButtonClass(
  themeMode: ThemeMode,
  hasActiveWallpaper: boolean,
) {
  return cn(
    "inline-flex h-12 min-w-[104px] items-center justify-center gap-2.5 rounded-[18px] border px-4 text-sm font-medium whitespace-nowrap",
    hasActiveWallpaper
      ? themeMode === "light"
        ? "border-slate-900/8 bg-white/34 text-slate-800 shadow-[0_12px_32px_rgba(148,163,184,0.12)] backdrop-blur-[22px] hover:bg-white/48"
        : "border-white/16 bg-white/10 text-white shadow-[0_12px_34px_rgba(2,6,23,0.22)] backdrop-blur-[22px] hover:bg-white/16"
      : themeMode === "light"
        ? "border-slate-800/10 bg-white/66 text-slate-700 shadow-[0_10px_24px_rgba(148,163,184,0.16)] hover:bg-white/86"
        : "border-white/20 bg-white/14 text-white shadow-[0_10px_24px_rgba(15,23,42,0.12)] hover:bg-white/22",
  );
}

/**
 * 构建顶部操作图标样式
 */
export function getTopActionIconClass(
  themeMode: ThemeMode,
  hasActiveWallpaper: boolean,
) {
  return cn(
    "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
    hasActiveWallpaper
      ? themeMode === "light"
        ? "bg-slate-900/8 text-slate-700"
        : "bg-white/10 text-white/92"
      : themeMode === "light"
        ? "bg-slate-900/7 text-slate-700"
        : "bg-white/12 text-white/90",
  );
}

/**
 * 构建移动端工具栏按钮样式
 */
export function getMobileToolbarButtonClass(
  themeMode: ThemeMode,
  hasActiveWallpaper: boolean,
) {
  return cn(
    "inline-flex h-11 w-11 items-center justify-center rounded-[18px] border transition",
    hasActiveWallpaper
      ? themeMode === "light"
        ? "border-slate-900/8 bg-white/34 text-slate-800 shadow-[0_12px_32px_rgba(148,163,184,0.12)] backdrop-blur-[22px] active:scale-95 active:bg-white/48"
        : "border-white/16 bg-white/10 text-white shadow-[0_12px_34px_rgba(2,6,23,0.22)] backdrop-blur-[22px] active:scale-95 active:bg-white/16"
      : themeMode === "light"
        ? "border-slate-800/10 bg-white/66 text-slate-700 shadow-[0_10px_24px_rgba(148,163,184,0.16)] active:scale-95 active:bg-white/86"
        : "border-white/20 bg-white/14 text-white shadow-[0_10px_24px_rgba(15,23,42,0.12)] active:scale-95 active:bg-white/22",
  );
}

/**
 * 构建搜索引擎编辑按钮样式（搜索栏内齿轮按钮）
 */
export function getEngineEditorButtonClass(
  themeMode: ThemeMode,
  hasActiveWallpaper: boolean,
) {
  return cn(
    "inline-flex h-14 w-12 shrink-0 items-center justify-center rounded-2xl border transition",
    hasActiveWallpaper
      ? themeMode === "light"
        ? "border-slate-900/10 bg-white/30 text-slate-600 hover:bg-white/50"
        : "border-white/16 bg-white/8 text-white/70 hover:bg-white/14"
      : themeMode === "light"
        ? "border-slate-800/10 bg-white/60 text-slate-600 hover:bg-white/80"
        : "border-white/16 bg-white/8 text-white/70 hover:bg-white/14",
  );
}

/**
 * 构建站内搜索按钮样式
 */
export function getSiteSearchButtonClass(
  themeMode: ThemeMode,
  hasActiveWallpaper: boolean,
) {
  return cn(
    "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-2xl border px-3 text-xs font-semibold transition",
    hasActiveWallpaper
      ? themeMode === "light"
        ? "border-orange-500/30 bg-orange-500/12 text-orange-700 hover:bg-orange-500/22"
        : "border-orange-400/40 bg-orange-500/16 text-orange-200 hover:bg-orange-500/26"
      : themeMode === "light"
        ? "border-orange-500/30 bg-orange-500/10 text-orange-700 hover:bg-orange-500/20"
        : "border-orange-400/40 bg-orange-500/16 text-orange-200 hover:bg-orange-500/26",
  );
}

/**
 * 构建搜索提交按钮样式
 */
export function getSearchSubmitButtonClass(
  themeMode: ThemeMode,
  hasActiveWallpaper: boolean,
) {
  return cn(
    "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition",
    hasActiveWallpaper
      ? themeMode === "light"
        ? "border-slate-900/10 bg-white/40 text-slate-700 hover:bg-white/60"
        : "border-white/20 bg-white/18 text-white hover:bg-white/26"
      : themeMode === "light"
        ? "border-slate-800/10 bg-white/60 text-slate-700 hover:bg-white/80"
        : "border-white/20 bg-white/18 text-white hover:bg-white/26",
  );
}

/**
 * 构建搜索栏内清除按钮样式
 */
export function getSearchClearButtonClass(
  themeMode: ThemeMode,
  _hasActiveWallpaper: boolean,
  hasQuery: boolean,
) {
  return cn(
    "inline-flex h-7 w-7 items-center justify-center rounded-full transition",
    themeMode === "light"
      ? hasQuery
        ? "bg-slate-900/8 text-slate-600 opacity-80 hover:bg-slate-900/14 hover:opacity-100"
        : "cursor-default opacity-25 text-slate-600"
      : hasQuery
        ? "bg-white/12 opacity-80 hover:bg-white/20 hover:opacity-100"
        : "cursor-default opacity-25 text-white",
  );
}

/**
 * 构建主题切换按钮样式
 */
export function getThemeToggleButtonClass(
  themeMode: ThemeMode,
  hasActiveWallpaper: boolean,
) {
  const base = getTopActionButtonClass(themeMode, hasActiveWallpaper);
  return cn(
    base,
    "min-w-[116px]",
    hasActiveWallpaper
      ? themeMode === "light"
        ? "bg-white/42 text-slate-800 hover:bg-white/56"
        : "bg-white/12 text-white hover:bg-white/18"
      : themeMode === "light"
        ? "border-slate-800/12 bg-white/84 text-slate-700 shadow-[0_12px_30px_rgba(148,163,184,0.12)] hover:bg-white"
        : "border-white/20 bg-white/14 text-white shadow-[0_14px_32px_rgba(15,23,42,0.2)] hover:bg-white/22",
  );
}

/**
 * 构建搜索栏容器样式
 * 桌面端/移动端磨砂效果独立控制，通过 lg: 前缀响应式切换
 */
export function getSearchBarChromeClass(
  themeMode: ThemeMode,
  desktopFrosted: number,
  mobileFrosted: number,
) {
  const m = isFrosted(mobileFrosted)
    ? themeMode === "light"
      ? "border-slate-900/14 bg-white/75 shadow-[0_14px_38px_rgba(148,163,184,0.14)] backdrop-blur-[22px]"
      : "border-white/16 bg-white/18 shadow-[0_12px_34px_rgba(2,6,23,0.28)] backdrop-blur-[22px]"
    : themeMode === "light"
      ? "border-slate-900/10 bg-white/40 shadow-[0_12px_32px_rgba(148,163,184,0.12)]"
      : "border-white/12 bg-white/6 shadow-[0_12px_34px_rgba(2,6,23,0.16)]";
  const d = isFrosted(desktopFrosted)
    ? themeMode === "light"
      ? "lg:border-slate-900/14 lg:bg-white/75 lg:shadow-[0_14px_38px_rgba(148,163,184,0.14)] lg:backdrop-blur-[22px]"
      : "lg:border-white/16 lg:bg-white/18 lg:shadow-[0_12px_34px_rgba(2,6,23,0.28)] lg:backdrop-blur-[22px]"
    : themeMode === "light"
      ? "lg:border-slate-900/10 lg:bg-white/40 lg:shadow-[0_12px_32px_rgba(148,163,184,0.12)] lg:backdrop-blur-none"
      : "lg:border-white/12 lg:bg-white/6 lg:shadow-[0_12px_34px_rgba(2,6,23,0.16)] lg:backdrop-blur-none";
  return cn(
    "frosted-glass relative z-40 mx-auto flex w-full max-w-[980px] min-[1280px]:max-w-[1120px] flex-col gap-3 rounded-[30px] border p-3 sm:flex-row sm:items-center",
    m, d,
  );
}

/**
 * 构建搜索栏内输入区域样式
 */
export function getSearchInputAreaClass(
  themeMode: ThemeMode,
  desktopFrosted: number,
  mobileFrosted: number,
) {
  const m = isFrosted(mobileFrosted)
    ? themeMode === "light"
      ? "border-slate-900/10 bg-white/50"
      : "border-white/14 bg-white/12"
    : themeMode === "light"
      ? "border-slate-900/8 bg-white/30"
      : "border-white/10 bg-white/4";
  const d = isFrosted(desktopFrosted)
    ? themeMode === "light"
      ? "lg:border-slate-900/10 lg:bg-white/50"
      : "lg:border-white/14 lg:bg-white/12"
    : themeMode === "light"
      ? "lg:border-slate-900/8 lg:bg-white/30"
      : "lg:border-white/10 lg:bg-white/4";
  return cn("frosted-glass relative flex flex-1 items-center gap-3 rounded-2xl border px-4 py-3", m, d);
}

/**
 * 构建内容区视图标签徽章样式（"默认视图" / "标签视图"）
 * 桌面端/移动端磨砂效果独立控制
 */
export function getViewBadgeClass(
  themeMode: ThemeMode,
  desktopFrosted: number,
  mobileFrosted: number,
) {
  const m = isFrosted(mobileFrosted)
    ? themeMode === "light"
      ? "border-slate-900/14 bg-white/70 shadow-[0_4px_16px_rgba(148,163,184,0.10)] backdrop-blur-[18px]"
      : "border-white/14 bg-white/16 shadow-[0_4px_16px_rgba(2,6,23,0.22)] backdrop-blur-[18px]"
    : themeMode === "light"
      ? "border-slate-900/10 bg-white/40 shadow-[0_4px_16px_rgba(148,163,184,0.08)]"
      : "border-white/10 bg-white/6 shadow-[0_4px_16px_rgba(2,6,23,0.12)]";
  const d = isFrosted(desktopFrosted)
    ? themeMode === "light"
      ? "lg:border-slate-900/14 lg:bg-white/70 lg:shadow-[0_4px_16px_rgba(148,163,184,0.10)] lg:backdrop-blur-[18px]"
      : "lg:border-white/14 lg:bg-white/16 lg:shadow-[0_4px_16px_rgba(2,6,23,0.22)] lg:backdrop-blur-[18px]"
    : themeMode === "light"
      ? "lg:border-slate-900/10 lg:bg-white/40 lg:shadow-[0_4px_16px_rgba(148,163,184,0.08)] lg:backdrop-blur-none"
      : "lg:border-white/10 lg:bg-white/6 lg:shadow-[0_4px_16px_rgba(2,6,23,0.12)] lg:backdrop-blur-none";
  return cn("frosted-glass rounded-full border px-3 py-1 text-xs uppercase tracking-[0.26em] opacity-70", m, d);
}

/**
 * 构建网站计数标签样式（"已展示 xx 个网站"）
 * 桌面端/移动端磨砂效果独立控制
 */
export function getSiteCountBadgeClass(
  themeMode: ThemeMode,
  desktopFrosted: number,
  mobileFrosted: number,
) {
  const m = isFrosted(mobileFrosted)
    ? themeMode === "light"
      ? "bg-white/60 shadow-[0_4px_16px_rgba(148,163,184,0.10)] backdrop-blur-[18px]"
      : "bg-white/16 shadow-[0_4px_16px_rgba(2,6,23,0.22)] backdrop-blur-[18px]"
    : themeMode === "light"
      ? "bg-white/36 shadow-[0_4px_16px_rgba(148,163,184,0.08)]"
      : "bg-white/6 shadow-[0_4px_16px_rgba(2,6,23,0.12)]";
  const d = isFrosted(desktopFrosted)
    ? themeMode === "light"
      ? "lg:bg-white/60 lg:shadow-[0_4px_16px_rgba(148,163,184,0.10)] lg:backdrop-blur-[18px]"
      : "lg:bg-white/16 lg:shadow-[0_4px_16px_rgba(2,6,23,0.22)] lg:backdrop-blur-[18px]"
    : themeMode === "light"
      ? "lg:bg-white/36 lg:shadow-[0_4px_16px_rgba(148,163,184,0.08)] lg:backdrop-blur-none"
      : "lg:bg-white/6 lg:shadow-[0_4px_16px_rgba(2,6,23,0.12)] lg:backdrop-blur-none";
  return cn("frosted-glass text-sm opacity-72 rounded-full px-3 py-1", m, d);
}

/**
 * 构建标题栏操作按钮样式（新建卡片/新建标签）
 * 与卡片、搜索栏保持一致的磨砂效果
 */
export function getTitleBarButtonClass(
  themeMode: ThemeMode,
  desktopFrosted: number,
  mobileFrosted: number,
) {
  const m = isFrosted(mobileFrosted)
    ? themeMode === "light"
      ? "border-slate-900/10 bg-white/60 shadow-[0_4px_16px_rgba(148,163,184,0.10)] backdrop-blur-[18px] hover:bg-white/80"
      : "border-white/14 bg-white/12 shadow-[0_4px_16px_rgba(2,6,23,0.22)] backdrop-blur-[18px] hover:bg-white/20"
    : themeMode === "light"
      ? "border-slate-900/8 bg-white/40 shadow-[0_4px_16px_rgba(148,163,184,0.08)] hover:bg-white/56"
      : "border-white/10 bg-white/6 shadow-[0_4px_16px_rgba(2,6,23,0.12)] hover:bg-white/12";
  const d = isFrosted(desktopFrosted)
    ? themeMode === "light"
      ? "lg:border-slate-900/10 lg:bg-white/60 lg:shadow-[0_4px_16px_rgba(148,163,184,0.10)] lg:backdrop-blur-[18px] lg:hover:bg-white/80"
      : "lg:border-white/14 lg:bg-white/12 lg:shadow-[0_4px_16px_rgba(2,6,23,0.22)] lg:backdrop-blur-[18px] lg:hover:bg-white/20"
    : themeMode === "light"
      ? "lg:border-slate-900/8 lg:bg-white/40 lg:shadow-[0_4px_16px_rgba(148,163,184,0.08)] lg:hover:bg-white/56 lg:backdrop-blur-none"
      : "lg:border-white/10 lg:bg-white/6 lg:shadow-[0_4px_16px_rgba(2,6,23,0.12)] lg:hover:bg-white/12 lg:backdrop-blur-none";
  return cn("frosted-glass inline-flex h-10 items-center gap-2 rounded-2xl border px-4 text-sm font-medium transition", m, d);
}

/**
 * 构建站内搜索结果卡片样式
 * 桌面端/移动端磨砂效果独立控制
 */
export function getLocalSearchResultCardClass(
  themeMode: ThemeMode,
  desktopFrosted: number,
  mobileFrosted: number,
) {
  const m = isFrosted(mobileFrosted)
    ? themeMode === "light"
      ? "border-slate-200/60 bg-white/72 hover:bg-white/86 shadow-[0_8px_24px_rgba(148,163,184,0.10)] backdrop-blur-[18px]"
      : "border-white/14 bg-white/14 hover:bg-white/20 shadow-[0_8px_24px_rgba(2,6,23,0.20)] backdrop-blur-[18px]"
    : themeMode === "light"
      ? "border-slate-200/50 bg-slate-100/75 hover:bg-slate-200/88"
      : "border-white/10 bg-white/4 hover:bg-white/8";
  const d = isFrosted(desktopFrosted)
    ? themeMode === "light"
      ? "lg:border-slate-200/60 lg:bg-white/72 lg:hover:bg-white/86 lg:shadow-[0_8px_24px_rgba(148,163,184,0.10)] lg:backdrop-blur-[18px]"
      : "lg:border-white/14 lg:bg-white/14 lg:hover:bg-white/20 lg:shadow-[0_8px_24px_rgba(2,6,23,0.20)] lg:backdrop-blur-[18px]"
    : themeMode === "light"
      ? "lg:border-slate-200/50 lg:bg-slate-100/75 lg:hover:bg-slate-200/88 lg:backdrop-blur-none"
      : "lg:border-white/10 lg:bg-white/4 lg:hover:bg-white/8 lg:backdrop-blur-none";
  return cn("frosted-glass group rounded-[22px] border p-4 transition hover:-translate-y-0.5", m, d);
}

/**
 * 构建站内搜索结果外层容器样式
 * 桌面端/移动端磨砂效果独立控制
 */
export function getLocalSearchContainerClass(
  themeMode: ThemeMode,
  desktopFrosted: number,
  mobileFrosted: number,
) {
  const m = isFrosted(mobileFrosted)
    ? themeMode === "light"
      ? "border-slate-900/10 bg-white/60 shadow-[0_10px_32px_rgba(148,163,184,0.10)] backdrop-blur-[18px]"
      : "border-white/14 bg-white/12 shadow-[0_10px_32px_rgba(2,6,23,0.24)] backdrop-blur-[18px]"
    : themeMode === "light"
      ? "border-slate-900/8 bg-white/40 shadow-[0_8px_28px_rgba(148,163,184,0.08)]"
      : "border-white/10 bg-white/4";
  const d = isFrosted(desktopFrosted)
    ? themeMode === "light"
      ? "lg:border-slate-900/10 lg:bg-white/60 lg:shadow-[0_10px_32px_rgba(148,163,184,0.10)] lg:backdrop-blur-[18px]"
      : "lg:border-white/14 lg:bg-white/12 lg:shadow-[0_10px_32px_rgba(2,6,23,0.24)] lg:backdrop-blur-[18px]"
    : themeMode === "light"
      ? "lg:border-slate-900/8 lg:bg-white/40 lg:shadow-[0_8px_28px_rgba(148,163,184,0.08)] lg:backdrop-blur-none"
      : "lg:border-white/10 lg:bg-white/4 lg:backdrop-blur-none";
  return cn("frosted-glass mx-auto w-full max-w-[1440px] rounded-[28px] border p-4", m, d);
}

/**
 * 构建站内搜索关闭按钮样式
 * 桌面端/移动端磨砂效果独立控制
 */
export function getLocalSearchCloseBtnClass(
  themeMode: ThemeMode,
  desktopFrosted: number,
  mobileFrosted: number,
) {
  const m = isFrosted(mobileFrosted)
    ? themeMode === "light"
      ? "border-slate-900/12 bg-slate-900/8 text-slate-600 hover:bg-slate-900/14 hover:text-slate-800"
      : "border-white/16 bg-white/14 text-white/80 hover:bg-white/20 hover:text-white"
    : themeMode === "light"
      ? "border-slate-900/10 bg-slate-900/6 text-slate-500 hover:bg-slate-900/10 hover:text-slate-700"
      : "border-white/12 bg-white/6 text-white/50 hover:bg-white/12 hover:text-white";
  const d = isFrosted(desktopFrosted)
    ? themeMode === "light"
      ? "lg:border-slate-900/12 lg:bg-slate-900/8 lg:text-slate-600 lg:hover:bg-slate-900/14 lg:hover:text-slate-800"
      : "lg:border-white/16 lg:bg-white/14 lg:text-white/80 lg:hover:bg-white/20 lg:hover:text-white"
    : themeMode === "light"
      ? "lg:border-slate-900/10 lg:bg-slate-900/6 lg:text-slate-500 lg:hover:bg-slate-900/10 lg:hover:text-slate-700"
      : "lg:border-white/12 lg:bg-white/6 lg:text-white/50 lg:hover:bg-white/12 lg:hover:text-white";
  return cn("frosted-glass inline-flex h-7 w-7 items-center justify-center rounded-xl border transition", m, d);
}

/**
 * 构建站内搜索 AI 提示条样式
 * 桌面端/移动端磨砂效果独立控制
 */
export function getLocalSearchAiHintClass(
  themeMode: ThemeMode,
  desktopFrosted: number,
  mobileFrosted: number,
) {
  const m = isFrosted(mobileFrosted)
    ? themeMode === "light"
      ? "border-purple-400/24 bg-purple-500/8 backdrop-blur-[12px]"
      : "border-purple-400/24 bg-purple-500/10 backdrop-blur-[12px]"
    : themeMode === "light"
      ? "border-purple-400/20 bg-purple-500/6"
      : "border-purple-400/16 bg-purple-500/4";
  const d = isFrosted(desktopFrosted)
    ? themeMode === "light"
      ? "lg:border-purple-400/24 lg:bg-purple-500/8 lg:backdrop-blur-[12px]"
      : "lg:border-purple-400/24 lg:bg-purple-500/10 lg:backdrop-blur-[12px]"
    : themeMode === "light"
      ? "lg:border-purple-400/20 lg:bg-purple-500/6 lg:backdrop-blur-none"
      : "lg:border-purple-400/16 lg:bg-purple-500/4 lg:backdrop-blur-none";
  return cn("frosted-glass mb-3 flex items-center justify-center rounded-[22px] border border-dashed px-4 py-3 text-sm", m, d);
}

/**
 * 构建站内搜索 AI 推荐面板样式
 * 桌面端/移动端磨砂效果独立控制
 */
export function getLocalSearchAiPanelClass(
  themeMode: ThemeMode,
  desktopFrosted: number,
  mobileFrosted: number,
) {
  const m = isFrosted(mobileFrosted)
    ? themeMode === "light"
      ? "border-purple-300/30 bg-purple-500/6 backdrop-blur-[14px]"
      : "border-purple-400/24 bg-purple-500/10 backdrop-blur-[14px]"
    : themeMode === "light"
      ? "border-purple-300/24 bg-purple-500/5"
      : "border-purple-400/16 bg-purple-500/4";
  const d = isFrosted(desktopFrosted)
    ? themeMode === "light"
      ? "lg:border-purple-300/30 lg:bg-purple-500/6 lg:backdrop-blur-[14px]"
      : "lg:border-purple-400/24 lg:bg-purple-500/10 lg:backdrop-blur-[14px]"
    : themeMode === "light"
      ? "lg:border-purple-300/24 lg:bg-purple-500/5 lg:backdrop-blur-none"
      : "lg:border-purple-400/16 lg:bg-purple-500/4 lg:backdrop-blur-none";
  return cn("frosted-glass mb-3 rounded-[22px] border p-4", m, d);
}

/**
 * 构建站内搜索 AI 推荐结果卡片样式
 * 桌面端/移动端磨砂效果独立控制
 */
export function getLocalSearchAiCardClass(
  themeMode: ThemeMode,
  desktopFrosted: number,
  mobileFrosted: number,
) {
  const m = isFrosted(mobileFrosted)
    ? themeMode === "light"
      ? "border-purple-300/30 bg-purple-500/6 hover:bg-purple-500/12 backdrop-blur-[12px]"
      : "border-purple-400/22 bg-purple-500/10 hover:bg-purple-500/18 backdrop-blur-[12px]"
    : themeMode === "light"
      ? "border-purple-300/24 bg-purple-500/5 hover:bg-purple-500/10"
      : "border-purple-400/14 bg-purple-500/4 hover:bg-purple-500/8";
  const d = isFrosted(desktopFrosted)
    ? themeMode === "light"
      ? "lg:border-purple-300/30 lg:bg-purple-500/6 lg:hover:bg-purple-500/12 lg:backdrop-blur-[12px]"
      : "lg:border-purple-400/22 lg:bg-purple-500/10 lg:hover:bg-purple-500/18 lg:backdrop-blur-[12px]"
    : themeMode === "light"
      ? "lg:border-purple-300/24 lg:bg-purple-500/5 lg:hover:bg-purple-500/10 lg:backdrop-blur-none"
      : "lg:border-purple-400/14 lg:bg-purple-500/4 lg:hover:bg-purple-500/8 lg:backdrop-blur-none";
  return cn("frosted-glass group rounded-[22px] border p-4 transition hover:-translate-y-0.5", m, d);
}

/**
 * 构建站内搜索 AI 推荐图标容器样式
 * 桌面端/移动端磨砂效果独立控制
 */
export function getLocalSearchAiIconClass(
  themeMode: ThemeMode,
  desktopFrosted: number,
  mobileFrosted: number,
) {
  const m = isFrosted(mobileFrosted)
    ? themeMode === "light"
      ? "border-purple-300/30 bg-purple-400/10"
      : "border-purple-400/20 bg-purple-400/16"
    : themeMode === "light"
      ? "border-purple-300/24 bg-purple-400/8"
      : "border-purple-400/10 bg-purple-400/6";
  const d = isFrosted(desktopFrosted)
    ? themeMode === "light"
      ? "lg:border-purple-300/30 lg:bg-purple-400/10"
      : "lg:border-purple-400/20 lg:bg-purple-400/16"
    : themeMode === "light"
      ? "lg:border-purple-300/24 lg:bg-purple-400/8"
      : "lg:border-purple-400/10 lg:bg-purple-400/6";
  return cn("frosted-glass h-11 w-11 rounded-2xl border object-cover", m, d);
}

/**
 * 构建站内搜索 AI 推荐加载占位骨架屏样式
 */
export function getLocalSearchSkeletonClass(themeMode: ThemeMode) {
  return cn(
    "h-52 animate-pulse rounded-[28px] border",
    themeMode === "light"
      ? "border-slate-200/60 bg-slate-100/60"
      : "border-white/18 bg-white/12",
  );
}

/**
 * 构建站内搜索空状态样式
 */
export function getLocalSearchEmptyClass(themeMode: ThemeMode) {
  return cn(
    "flex items-center justify-center rounded-[22px] border border-dashed px-4 py-5 text-sm opacity-58",
    themeMode === "light"
      ? "border-slate-300/40 bg-slate-50/60"
      : "border-white/12 bg-white/4",
  );
}

/**
 * 构建站内搜索结果卡片内图标样式
 * 桌面端/移动端磨砂效果独立控制
 */
export function getLocalSearchIconClass(
  themeMode: ThemeMode,
  desktopFrosted: number,
  mobileFrosted: number,
) {
  const m = isFrosted(mobileFrosted)
    ? themeMode === "light"
      ? "border-slate-200/60 bg-white/80"
      : "border-white/14 bg-white/14"
    : themeMode === "light"
      ? "border-slate-200/60 bg-slate-100/80"
      : "border-white/14 bg-white/14";
  const d = isFrosted(desktopFrosted)
    ? themeMode === "light"
      ? "lg:border-slate-200/60 lg:bg-white/80"
      : "lg:border-white/14 lg:bg-white/14"
    : themeMode === "light"
      ? "lg:border-slate-200/60 lg:bg-slate-100/80"
      : "lg:border-white/14 lg:bg-white/14";
  return cn("frosted-glass h-11 w-11 rounded-2xl border object-cover", m, d);
}

/* ========== 弹窗 / 抽屉明亮模式适配 ========== */

/** 弹窗遮罩层 */
export function getDialogOverlayClass(themeMode: ThemeMode) {
  return themeMode === "light"
    ? "bg-black/20 backdrop-blur-sm"
    : "bg-slate-950/52 backdrop-blur-sm";
}

/** 弹窗面板（居中卡片） */
export function getDialogPanelClass(themeMode: ThemeMode) {
  return themeMode === "light"
    ? "border-slate-200/50 bg-white/96 text-slate-900 shadow-[0_32px_120px_rgba(0,0,0,0.08)] backdrop-blur-2xl"
    : "border-white/12 bg-[#101a2eee] text-white shadow-[0_32px_120px_rgba(0,0,0,0.42)]";
}

/** 抽屉面板（侧边栏） */
export function getDrawerPanelClass(themeMode: ThemeMode) {
  return themeMode === "light"
    ? "border-slate-200/50 bg-white/96 text-slate-900 shadow-[-30px_0_120px_rgba(0,0,0,0.06)] backdrop-blur-2xl"
    : "border-white/12 bg-[#0f172af0] text-white shadow-[0_30px_120px_rgba(0,0,0,0.45)]";
}

/** 弹窗关闭按钮 */
export function getDialogCloseBtnClass(themeMode: ThemeMode) {
  return themeMode === "light"
    ? "border-slate-200/50 bg-slate-100 text-slate-500 hover:bg-slate-200"
    : "border-white/12 bg-white/6 hover:bg-white/12";
}

/** 弹窗内输入框 */
export function getDialogInputClass(themeMode: ThemeMode) {
  return themeMode === "light"
    ? "border-slate-200/60 bg-slate-50 text-slate-900 placeholder:text-slate-400"
    : "border-white/12 bg-white/8 text-white placeholder:text-white/35";
}

/** 弹窗内区块容器 */
export function getDialogSectionClass(themeMode: ThemeMode) {
  return themeMode === "light"
    ? "border-slate-200/50 bg-slate-50/80"
    : "border-white/10 bg-white/6";
}

/** 弹窗内次要文字（标签、提示） */
export function getDialogSubtleClass(themeMode: ThemeMode) {
  return themeMode === "light"
    ? "text-slate-500"
    : "text-white/55";
}

/** 弹窗分隔线 */
export function getDialogDividerClass(themeMode: ThemeMode) {
  return themeMode === "light"
    ? "border-slate-200/50"
    : "border-white/10";
}

/** 弹窗主要操作按钮 */
export function getDialogPrimaryBtnClass(themeMode: ThemeMode) {
  return themeMode === "light"
    ? "bg-slate-900 text-white hover:bg-slate-800"
    : "bg-white text-slate-950 hover:bg-slate-200";
}

/** 弹窗次要按钮 */
export function getDialogSecondaryBtnClass(themeMode: ThemeMode) {
  return themeMode === "light"
    ? "border-slate-200/60 bg-white text-slate-600 hover:bg-slate-50"
    : "border-white/12 bg-white/6 text-white/84 hover:bg-white/12";
}

/** 弹窗危险操作按钮 */
export function getDialogDangerBtnClass(themeMode: ThemeMode) {
  return themeMode === "light"
    ? "border-red-200/60 bg-red-50 text-red-600 hover:bg-red-100"
    : "border-rose-500/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20";
}

/** 弹窗内列表项 */
export function getDialogListItemClass(themeMode: ThemeMode) {
  return themeMode === "light"
    ? "border-slate-200/50 bg-slate-50/60 hover:bg-slate-100/80"
    : "border-white/10 bg-white/4 hover:bg-white/7";
}

/** 弹窗内虚线添加按钮 */
export function getDialogAddItemClass(themeMode: ThemeMode) {
  return themeMode === "light"
    ? "border-slate-300/50 text-slate-400 hover:bg-slate-50 hover:text-slate-500"
    : "border-white/16 text-white/50 hover:bg-white/6 hover:text-white/70";
}

/** 搜索下拉面板（搜索引擎选择 / 搜索建议） */
export function getSearchDropdownClass(themeMode: ThemeMode) {
  return themeMode === "light"
    ? "border-slate-200/50 bg-white/96 text-slate-900 shadow-[0_22px_80px_rgba(0,0,0,0.08)] backdrop-blur-2xl"
    : "border-white/16 bg-[#0f172ae8] text-white shadow-[0_22px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl";
}

/** 搜索下拉选中项 */
export function getSearchDropdownActiveClass(themeMode: ThemeMode) {
  return themeMode === "light"
    ? "bg-slate-100 text-slate-900"
    : "bg-white/16 text-white";
}

/** 搜索下拉未选中项 */
export function getSearchDropdownInactiveClass(themeMode: ThemeMode) {
  return themeMode === "light"
    ? "text-slate-600 hover:bg-slate-50"
    : "text-white/78 hover:bg-white/10";
}

/** 搜索下拉收起按钮 */
export function getSearchDropdownDismissClass(themeMode: ThemeMode) {
  return themeMode === "light"
    ? "text-slate-400 hover:bg-slate-50"
    : "text-white/50 hover:bg-white/8";
}

/** 搜索下拉分隔线 */
export function getSearchDropdownDividerClass(themeMode: ThemeMode) {
  return themeMode === "light"
    ? "border-slate-200/50"
    : "border-white/8";
}

/** 搜索下拉加载文字 */
export function getSearchDropdownLoadingClass(themeMode: ThemeMode) {
  return themeMode === "light"
    ? "text-slate-500"
    : "text-white/70";
}

/* ========== Toast 通知主题适配 ========== */

/** Toast 主面板 */
export function getToastPanelClass(themeMode: ThemeMode, tone: "success" | "error") {
  return cn(
    "animate-drawer-slide relative rounded-[26px] border px-5 py-4 backdrop-blur-xl",
    themeMode === "light"
      ? tone === "success"
        ? "border-slate-200/50 bg-white/96 text-slate-900 shadow-[0_24px_80px_rgba(0,0,0,0.06)]"
        : "border-slate-200/50 bg-white/96 text-slate-900 shadow-[0_24px_80px_rgba(0,0,0,0.06)]"
      : tone === "success"
        ? "shadow-[0_24px_80px_rgba(15,23,42,0.28)]"
        : "shadow-[0_24px_80px_rgba(15,23,42,0.28)]",
    themeMode === "light"
      ? tone === "success"
        ? "bg-[linear-gradient(135deg,rgba(16,185,129,0.08),rgba(255,255,255,0.96))]"
        : "bg-[linear-gradient(135deg,rgba(244,63,94,0.06),rgba(255,255,255,0.96))]"
      : tone === "success"
        ? "bg-[linear-gradient(135deg,rgba(16,185,129,0.2),rgba(15,23,42,0.92))]"
        : "bg-[linear-gradient(135deg,rgba(244,63,94,0.18),rgba(15,23,42,0.92))]",
  );
}

/** Toast 图标容器 */
export function getToastIconClass(themeMode: ThemeMode, tone: "success" | "error") {
  return cn(
    "mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border",
    themeMode === "light"
      ? tone === "success"
        ? "border-emerald-200/40 bg-emerald-50 text-emerald-600"
        : "border-rose-200/40 bg-rose-50 text-rose-600"
      : tone === "success"
        ? "border-emerald-200/20 bg-emerald-400/16 text-emerald-50"
        : "border-rose-200/20 bg-rose-400/16 text-rose-50",
  );
}

/** Toast 标题文字 */
export function getToastTitleClass(themeMode: ThemeMode, tone: "success" | "error") {
  return cn(
    "text-sm font-semibold tracking-[0.08em]",
    themeMode === "light"
      ? tone === "success"
        ? "text-emerald-700"
        : "text-rose-700"
      : tone === "success"
        ? "text-emerald-50/84"
        : "text-rose-50/84",
  );
}

/** Toast 描述文字 */
export function getToastDescClass(themeMode: ThemeMode) {
  return themeMode === "light"
    ? "mt-1 text-sm leading-6 text-slate-600"
    : "mt-1 text-sm leading-6 text-white/88";
}

/** Toast 计数徽章 */
export function getToastCountBadgeClass(themeMode: ThemeMode) {
  return cn(
    "animate-toast-stack-pop inline-flex h-6 min-w-6 items-center justify-center rounded-full border px-2 text-[11px] font-semibold",
    themeMode === "light"
      ? "border-slate-200/50 bg-slate-100 text-slate-600"
      : "border-white/16 bg-white/10 text-white/88",
  );
}

/** Toast 堆叠阴影层 */
export function getToastStackShadowClass(
  themeMode: ThemeMode,
  tone: "success" | "error",
  layer: 1 | 2,
) {
  const isFirst = layer === 1;
  return cn(
    "animate-toast-stack-shadow absolute h-full rounded-[24px] border",
    isFirst ? "inset-x-4 top-3 opacity-55" : "inset-x-2 top-1.5 opacity-72",
    themeMode === "light"
      ? "border-slate-200/30 bg-slate-100/40"
      : tone === "success"
        ? isFirst ? "border-emerald-200/16 bg-emerald-400/8" : "border-emerald-200/18 bg-emerald-400/10"
        : isFirst ? "border-rose-200/16 bg-rose-400/8" : "border-rose-200/18 bg-rose-400/10",
  );
}

/** Toast 关闭按钮 */
export function getToastCloseBtnClass(themeMode: ThemeMode) {
  return cn(
    "relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition",
    themeMode === "light"
      ? "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
      : "text-white/78 hover:bg-white/10 hover:text-white",
  );
}

/** Toast 撤销按钮 */
export function getToastUndoBtnClass(themeMode: ThemeMode) {
  return cn(
    "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 transition",
    themeMode === "light"
      ? "text-slate-600 hover:bg-slate-100"
      : "text-white/78 hover:bg-white/10",
  );
}
