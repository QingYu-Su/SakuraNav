/**
 * 主题相关的样式工具函数
 * 统一管理主题相关的文本和样式生成
 */

import type { ThemeMode } from "@/lib/types";

/**
 * 获取主题的中文名称
 */
export function getThemeLabel(theme: ThemeMode): string {
  return theme === "light" ? "明亮" : "暗黑";
}

/**
 * 获取设备类型的中文名称
 */
export function getDeviceLabel(device: "desktop" | "mobile"): string {
  return device === "desktop" ? "桌面" : "移动";
}

/**
 * 获取资源类型的中文名称
 */
export function getAssetKindLabel(kind: "logo" | "favicon"): string {
  return kind === "logo" ? "Logo" : "Favicon";
}

/**
 * 生成主题设备标签
 * 例如："明亮主题桌面壁纸"
 */
export function getThemeDeviceLabel(
  theme: ThemeMode,
  device: "desktop" | "mobile",
  suffix: string = ""
): string {
  return `${getThemeLabel(theme)}主题${getDeviceLabel(device)}${suffix}`;
}

/**
 * 生成主题资源标签
 * 例如："明亮主题Logo"
 */
export function getThemeAssetLabel(
  theme: ThemeMode,
  kind: "logo" | "favicon"
): string {
  return `${getThemeLabel(theme)}主题${getAssetKindLabel(kind)}`;
}

/**
 * 常用的下拉菜单样式
 */
export const dropdownStyles = {
  /**
   * 深色下拉菜单 - 用于暗色主题的弹出菜单
   */
  dark: [
    "rounded-3xl",
    "border",
    "border-white/14",
    "bg-[#0f172ae8]",
    "p-2",
    "text-white",
    "shadow-[0_22px_80px_rgba(15,23,42,0.45)]",
    "backdrop-blur-xl",
  ].join(" "),

  /**
   * 小型深色下拉菜单
   */
  darkSmall: [
    "rounded-xl",
    "border",
    "border-white/14",
    "bg-[#0f172ae8]",
    "p-1",
    "text-white",
    "shadow-[0_22px_80px_rgba(15,23,42,0.45)]",
    "backdrop-blur-xl",
  ].join(" "),

  /**
   * 下拉菜单位置 - 绝对定位在父元素下方
   */
  position: "absolute left-0 top-full z-30 mt-2",
  
  /**
   * 居中下拉菜单位置
   */
  positionCenter: "absolute left-1/2 top-full z-30 mt-3 -translate-x-1/2",
} as const;

/**
 * 主题切换按钮样式
 */
export const themeToggleButtonStyles = {
  light: [
    "border-b",
    "border-slate-950/6",
    "bg-[linear-gradient(90deg,rgba(255,252,247,0.88),rgba(237,244,255,0.82),rgba(223,239,250,0.8))]",
    "shadow-[0_16px_60px_rgba(148,163,184,0.16)]",
    "backdrop-blur-xl",
  ].join(" "),

  dark: [
    "border-b",
    "border-white/8",
    "bg-[linear-gradient(90deg,rgba(44,53,84,0.82),rgba(55,71,102,0.72),rgba(57,89,109,0.74))]",
    "shadow-[0_16px_60px_rgba(15,23,42,0.18)]",
    "backdrop-blur-xl",
  ].join(" "),
} as const;

/**
 * 侧边栏样式
 */
export const sidebarStyles = {
  light: [
    "lg:border-r",
    "border-slate-950/6",
    "bg-[linear-gradient(180deg,rgba(247,240,232,0.92),rgba(238,239,245,0.9),rgba(227,236,244,0.92))]",
    "shadow-[18px_0_48px_rgba(148,163,184,0.12)]",
    "backdrop-blur-xl",
  ].join(" "),

  dark: [
    "lg:border-r",
    "border-white/8",
    "bg-[linear-gradient(180deg,rgba(66,64,108,0.82),rgba(58,62,99,0.76),rgba(50,58,88,0.78))]",
    "shadow-[18px_0_48px_rgba(10,17,31,0.12)]",
    "backdrop-blur-xl",
  ].join(" "),
} as const;

/**
 * 悬浮按钮样式（深色）
 */
export const floatingButtonDark = [
  "inline-flex",
  "items-center",
  "justify-center",
  "rounded-2xl",
  "border",
  "border-white/16",
  "bg-slate-950/42",
  "text-white",
  "shadow-lg",
  "backdrop-blur-xl",
  "transition",
  "hover:bg-slate-950/60",
].join(" ");

/**
 * 小图标按钮样式（深色）
 */
export const iconButtonSmallDark = [
  "inline-flex",
  "h-5",
  "w-5",
  "items-center",
  "justify-center",
  "rounded",
  "border",
  "border-white/16",
  "bg-slate-950/60",
  "text-white",
  "shadow-lg",
  "backdrop-blur-xl",
  "transition",
  "hover:bg-slate-950/80",
].join(" ");
