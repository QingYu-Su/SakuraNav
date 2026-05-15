/**
 * 背景层组件
 * @description 根据主题模式和设备类型渲染对应的背景（壁纸/默认渐变）
 */

import { cn } from "@/lib/utils/utils";
import { buildThemeBackground } from "./style-helpers";
import type { ThemeAppearance, ThemeMode } from "@/lib/base/types";

type BackgroundLayerProps = {
  themeMode: ThemeMode;
  appearances: Record<ThemeMode, ThemeAppearance>;
};

export function BackgroundLayer({ themeMode, appearances }: BackgroundLayerProps) {
  const lightDesktopBackground = buildThemeBackground("light", "desktop", appearances);
  const lightMobileBackground = buildThemeBackground("light", "mobile", appearances);
  const darkDesktopBackground = buildThemeBackground("dark", "desktop", appearances);
  const darkMobileBackground = buildThemeBackground("dark", "mobile", appearances);

  return (
    <>
      {/* 移动端壁纸使用 fixed 定位，避免页面高度导致图片被放大裁剪 */}
      <div
        className={cn(
          "fixed inset-0 transition-opacity duration-500 ease-out md:hidden",
          themeMode === "light" ? "opacity-100" : "opacity-0",
        )}
        style={{ backgroundImage: lightMobileBackground, backgroundPosition: "center", backgroundSize: "cover", backgroundRepeat: "no-repeat" }}
      />
      <div
        className={cn(
          "fixed inset-0 transition-opacity duration-500 ease-out md:hidden",
          themeMode === "dark" ? "opacity-100" : "opacity-0",
        )}
        style={{ backgroundImage: darkMobileBackground, backgroundPosition: "center", backgroundSize: "cover", backgroundRepeat: "no-repeat" }}
      />
      {/* 桌面端壁纸使用 absolute 定位 */}
      <div
        className={cn(
          "absolute inset-0 hidden transition-opacity duration-500 ease-out md:block",
          themeMode === "light" ? "opacity-100" : "opacity-0",
        )}
        style={{ backgroundImage: lightDesktopBackground, backgroundPosition: "center", backgroundSize: "cover" }}
      />
      <div
        className={cn(
          "absolute inset-0 hidden transition-opacity duration-500 ease-out md:block",
          themeMode === "dark" ? "opacity-100" : "opacity-0",
        )}
        style={{ backgroundImage: darkDesktopBackground, backgroundPosition: "center", backgroundSize: "cover" }}
      />
      <div className="fixed md:absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:32px_32px] opacity-40 mix-blend-soft-light" />
    </>
  );
}
