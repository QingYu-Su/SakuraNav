"use client";

import { type ComponentPropsWithoutRef, forwardRef } from "react";
import { type Site, type ThemeMode } from "@/lib/types";
import { cn } from "@/lib/utils";

export const SiteCardShell = forwardRef<
  HTMLElement,
  ComponentPropsWithoutRef<"article"> & {
    site: Site;
    dragging?: boolean;
    overlay?: boolean;
    themeMode?: ThemeMode;
    wallpaperAware?: boolean;
    cardFrosted?: boolean;
    desktopCardFrosted?: boolean;
    mobileCardFrosted?: boolean;
  }
>(function SiteCardShellInner(
  { site, dragging = false, overlay = false, themeMode = "light", wallpaperAware = false, cardFrosted = false, desktopCardFrosted, mobileCardFrosted, children, className, ...props },
  ref,
) {
  void site;
  // 支持新的独立开关：优先使用 desktopCardFrosted/mobileCardFrosted，否则回退到 cardFrosted
  const effectiveDesktopFrosted = desktopCardFrosted ?? cardFrosted;
  const effectiveMobileFrosted = mobileCardFrosted ?? cardFrosted;
  
  // 桌面端磨砂样式
  const desktopFrostedClass = effectiveDesktopFrosted
    ? wallpaperAware
      ? themeMode === "light"
        ? "lg:border-slate-900/12 lg:bg-white/42 lg:shadow-[0_18px_70px_rgba(148,163,184,0.12)] lg:backdrop-blur-[22px]"
        : "lg:border-white/16 lg:bg-white/14 lg:shadow-[0_18px_70px_rgba(15,23,42,0.22)] lg:backdrop-blur-[24px]"
      : themeMode === "light"
        ? "lg:border-slate-900/10 lg:bg-white/60 lg:shadow-[0_18px_70px_rgba(148,163,184,0.10)] lg:backdrop-blur-[18px]"
        : "lg:border-white/12 lg:bg-white/10 lg:shadow-[0_18px_70px_rgba(15,23,42,0.18)] lg:backdrop-blur-[20px]"
    : wallpaperAware
      ? themeMode === "light"
        ? "lg:border-slate-900/16 lg:bg-transparent lg:shadow-[0_18px_70px_rgba(15,23,42,0.14)]"
        : "lg:border-white/20 lg:bg-transparent lg:shadow-[0_18px_70px_rgba(15,23,42,0.22)]"
      : "lg:border-white/14 lg:bg-[linear-gradient(135deg,rgba(255,255,255,0.14),rgba(255,255,255,0.08))] lg:shadow-[0_18px_70px_rgba(15,23,42,0.14)]";
  
  // 移动端磨砂样式
  const mobileFrostedClass = effectiveMobileFrosted
    ? wallpaperAware
      ? themeMode === "light"
        ? "border-slate-900/12 bg-white/42 shadow-[0_18px_70px_rgba(148,163,184,0.12)] backdrop-blur-[22px]"
        : "border-white/16 bg-white/14 shadow-[0_18px_70px_rgba(15,23,42,0.22)] backdrop-blur-[24px]"
      : themeMode === "light"
        ? "border-slate-900/10 bg-white/60 shadow-[0_18px_70px_rgba(148,163,184,0.10)] backdrop-blur-[18px]"
        : "border-white/12 bg-white/10 shadow-[0_18px_70px_rgba(15,23,42,0.18)] backdrop-blur-[20px]"
    : wallpaperAware
      ? themeMode === "light"
        ? "border-slate-900/16 bg-transparent shadow-[0_18px_70px_rgba(15,23,42,0.14)]"
        : "border-white/20 bg-transparent shadow-[0_18px_70px_rgba(15,23,42,0.22)]"
      : "border-white/14 bg-[linear-gradient(135deg,rgba(255,255,255,0.14),rgba(255,255,255,0.08))] shadow-[0_18px_70px_rgba(15,23,42,0.14)]";
  
  const cardClass = cn(mobileFrostedClass, desktopFrostedClass);
  
  // 桌面端 hover 样式
  const desktopHoverClass = effectiveDesktopFrosted
    ? wallpaperAware
      ? themeMode === "light"
        ? "lg:hover:bg-white/50"
        : "lg:hover:bg-white/18"
      : themeMode === "light"
        ? "lg:hover:bg-white/70"
        : "lg:hover:bg-white/16"
    : wallpaperAware
      ? themeMode === "light"
        ? "lg:hover:bg-white/10"
        : "lg:hover:bg-white/10"
      : "";
  
  // 移动端 hover 样式
  const mobileHoverClass = effectiveMobileFrosted
    ? wallpaperAware
      ? themeMode === "light"
        ? "hover:bg-white/50"
        : "hover:bg-white/18"
      : themeMode === "light"
        ? "hover:bg-white/70"
        : "hover:bg-white/16"
    : wallpaperAware
      ? themeMode === "light"
        ? "hover:bg-white/10"
        : "hover:bg-white/10"
      : "";
  
  const hoverClass = cn(mobileHoverClass, desktopHoverClass);
  
  return (
    <article
      {...props}
      ref={ref}
      className={cn(
        "group relative isolate overflow-hidden rounded-[30px] border p-5 transition duration-200 will-change-transform hover:-translate-y-1 active:scale-[0.985]",
        cardClass,
        hoverClass,
        dragging
          ? overlay
            ? "z-20 scale-[1.015] border-white/24 bg-[linear-gradient(135deg,rgba(255,255,255,0.2),rgba(255,255,255,0.12))] shadow-[0_28px_90px_rgba(15,23,42,0.28)]"
            : "border-dashed border-white/18 bg-white/4 opacity-0"
          : "",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,rgba(255,255,255,0.12),transparent_34%,transparent_68%,rgba(255,255,255,0.06))] opacity-55" />
      {children}
    </article>
  );
});
