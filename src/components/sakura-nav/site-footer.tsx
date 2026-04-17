/**
 * 页脚组件
 */

import { cn } from "@/lib/utils";
import type { ThemeMode } from "@/lib/types";

type SiteFooterProps = {
  themeMode: ThemeMode;
  hasActiveMobileWallpaper: boolean;
  hasActiveDesktopWallpaper: boolean;
};

export function SiteFooter({
  themeMode,
  hasActiveMobileWallpaper,
  hasActiveDesktopWallpaper,
}: SiteFooterProps) {
  return (
    <footer className="mx-auto mt-8 w-full max-w-[1440px] pb-6 text-center text-base">
      {/* 移动端 */}
      <span
        className={cn(
          "md:hidden",
          hasActiveMobileWallpaper
            ? "text-white/50 drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
            : themeMode === "light"
              ? "text-slate-500"
              : "text-white/50",
        )}
      >
        Powered By{" "}
        <a
          href="https://github.com/QingYu-Su/SakuraNav"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "font-bold transition",
            hasActiveMobileWallpaper
              ? "text-white/80 drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)] hover:text-white"
              : themeMode === "light"
                ? "text-slate-700 hover:text-slate-900"
                : "text-white/80 hover:text-white",
          )}
        >
          SakuraNav
        </a>
      </span>
      {/* 桌面端 */}
      <span
        className={cn(
          "hidden md:inline",
          hasActiveDesktopWallpaper
            ? "text-white/50 drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
            : themeMode === "light"
              ? "text-slate-500"
              : "text-white/50",
        )}
      >
        Powered By{" "}
        <a
          href="https://github.com/QingYu-Su/SakuraNav"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "font-bold transition",
            hasActiveDesktopWallpaper
              ? "text-white/80 drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)] hover:text-white"
              : themeMode === "light"
                ? "text-slate-700 hover:text-slate-900"
                : "text-white/80 hover:text-white",
          )}
        >
          SakuraNav
        </a>
      </span>
    </footer>
  );
}
