/**
 * 标签行卡片组件
 * @description 标签行的外层容器，处理主题样式、选中状态、拖拽状态等
 */

"use client";

import { type ComponentPropsWithoutRef, forwardRef } from "react";
import { type Tag, type ThemeMode } from "@/lib/base/types";
import { cn } from "@/lib/utils/utils";

export const TagRowCard = forwardRef<
  HTMLElement,
  ComponentPropsWithoutRef<"article"> & {
    tag: Tag;
    active: boolean;
    collapsed: boolean;
    themeMode: ThemeMode;
    wallpaperAware: boolean;
    dragging?: boolean;
    overlay?: boolean;
  }
>(function TagRowCardInner(
  {
    tag,
    active,
    collapsed,
    themeMode,
    wallpaperAware,
    dragging = false,
    overlay = false,
    children,
    className,
    ...props
  },
  ref,
) {
  void tag;
  const activeCardClass = wallpaperAware
    ? themeMode === "light"
      ? "border-slate-900/12 bg-white/42 shadow-[0_18px_40px_rgba(148,163,184,0.12)] backdrop-blur-[22px]"
      : "border-white/16 bg-white/14 shadow-[0_20px_44px_rgba(2,6,23,0.2)] backdrop-blur-[24px]"
    : themeMode === "light"
      ? "border-slate-400/70 bg-slate-200/80 shadow-[0_8px_24px_rgba(148,163,184,0.18)]"
      : "border-white/24 bg-white/24 shadow-lg";
  const idleCardClass = wallpaperAware
    ? themeMode === "light"
      ? "border-slate-900/8 bg-white/26 hover:bg-white/34 shadow-[0_12px_26px_rgba(148,163,184,0.08)] backdrop-blur-[20px]"
      : "border-white/12 bg-white/8 hover:bg-white/12 shadow-[0_14px_28px_rgba(2,6,23,0.14)] backdrop-blur-[22px]"
    : themeMode === "light"
      ? "border-slate-200/50 bg-slate-50/60 hover:bg-slate-200/70 shadow-[0_4px_16px_rgba(148,163,184,0.08)]"
      : "border-white/10 bg-white/8 hover:bg-white/16";
  return (
    <article
      {...props}
      ref={ref}
      className={cn(
        "relative flex items-center gap-3 rounded-[24px] border px-4 py-4 text-left transition duration-200 will-change-transform",
        active ? activeCardClass : idleCardClass,
        collapsed ? "justify-center w-full" : "justify-between",
        !overlay ? "w-full" : "",
        dragging
          ? overlay
            ? "z-20 border-white/28 bg-white/22 shadow-[0_24px_72px_rgba(15,23,42,0.3)]"
            : "border-dashed border-white/18 bg-white/4 opacity-0"
          : "",
        className,
      )}
    >
      {children}
    </article>
  );
});
