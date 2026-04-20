/**
 * 404 页面组件
 * @description 页面不存在时的提示页面，复用登录页背景和 UI 风格
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import { siteConfig } from "@/lib/config/config";
import { DynamicBackground } from "@/components/auth/dynamic-background";

export default function NotFound() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const updateTheme = () => {
      const storedTheme = window.localStorage.getItem("sakura-theme");
      if (storedTheme === "light" || storedTheme === "dark") {
        setTheme(storedTheme);
      } else {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        setTheme(prefersDark ? "dark" : "light");
      }
    };

    const timer = setTimeout(updateTheme, 0);

    const observer = new MutationObserver(() => {
      const htmlTheme = document.documentElement.dataset.theme;
      if (htmlTheme === "light" || htmlTheme === "dark") {
        setTheme(htmlTheme);
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    window.addEventListener("storage", updateTheme);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("storage", updateTheme);
      observer.disconnect();
    };
  }, []);

  const isDark = theme === "dark";

  const colors = {
    primaryText: isDark ? "#ffffff" : "#1a1f35",
    secondaryText: isDark ? "rgba(255,255,255,0.6)" : "rgba(26,31,53,0.6)",
    mutedText: isDark ? "rgba(255,255,255,0.4)" : "rgba(26,31,53,0.4)",
    cardBg: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.75)",
    border: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
    iconBg: isDark ? "rgba(255,255,255,0.1)" : "rgba(139,92,246,0.1)",
    iconPrimary: isDark ? "rgba(255,255,255,0.8)" : "rgba(139,92,246,0.9)",
    logoBg: isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.85)",
    btnBg: isDark ? "rgba(255,255,255,0.08)" : "rgba(139,92,246,0.08)",
    btnHoverBg: isDark ? "rgba(255,255,255,0.14)" : "rgba(139,92,246,0.15)",
    btnText: isDark ? "#ffffff" : "#7c3aed",
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <DynamicBackground />

      <div className="relative flex min-h-screen w-full items-center justify-center px-4 py-8">
        <div className="animate-panel-rise w-full max-w-md text-center">
          {/* Logo */}
          <div className="mb-6 inline-flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={siteConfig.logoSrc}
              alt={`${siteConfig.appName} logo`}
              className="h-16 w-16 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all duration-500"
              style={{ borderColor: colors.border, background: colors.logoBg }}
            />
          </div>

          {/* 提示卡片 */}
          <div
            className="rounded-3xl border p-8 shadow-2xl backdrop-blur-xl transition-all duration-300"
            style={{ borderColor: colors.border, background: colors.cardBg }}
          >
            {/* 图标 */}
            <div className="mb-5 flex justify-center">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full transition-all duration-300"
                style={{ background: colors.iconBg }}
              >
                <SearchX
                  className="h-8 w-8 transition-colors duration-300"
                  style={{ color: colors.iconPrimary }}
                />
              </div>
            </div>

            {/* 标题 */}
            <h1
              className="mb-2 text-3xl font-bold tracking-tight transition-colors duration-300"
              style={{ color: colors.primaryText }}
            >
              404
            </h1>
            <p
              className="mb-6 text-sm transition-colors duration-300"
              style={{ color: colors.secondaryText }}
            >
              页面不存在，请检查地址是否正确
            </p>

            {/* 装饰分割线 */}
            <div className="mb-6 flex items-center justify-center gap-2">
              <div
                className="h-px w-12 transition-colors duration-300"
                style={{ background: colors.border }}
              />
              <div
                className="h-1.5 w-1.5 rotate-45 transition-colors duration-300"
                style={{ background: colors.mutedText }}
              />
              <div
                className="h-px w-12 transition-colors duration-300"
                style={{ background: colors.border }}
              />
            </div>

            {/* 返回按钮 */}
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold transition-all duration-300"
              style={{
                background: colors.btnBg,
                color: colors.btnText,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = colors.btnHoverBg;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = colors.btnBg;
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              返回首页
            </Link>
          </div>

          {/* 底部文字 */}
          <p
            className="mt-6 text-xs transition-colors duration-300"
            style={{ color: colors.mutedText }}
          >
            {siteConfig.appName}
          </p>
        </div>
      </div>
    </main>
  );
}
