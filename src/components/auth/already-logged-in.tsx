/**
 * 已登录提示页面组件
 * @description 当用户已登录时访问登录页面，显示提示信息并自动跳转，支持亮暗主题实时切换
 */

"use client";

import { useEffect, useState } from "react";
import { CheckCircle, LoaderCircle, Home } from "lucide-react";
import { siteConfig } from "@/lib/config";
import { DynamicBackground } from "./dynamic-background";

export function AlreadyLoggedIn() {
  const [countdown, setCountdown] = useState(5);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    // 初始化主题
    const updateTheme = () => {
      const storedTheme = window.localStorage.getItem("sakura-theme");
      if (storedTheme === "light" || storedTheme === "dark") {
        setTheme(storedTheme);
      } else {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        setTheme(prefersDark ? "dark" : "light");
      }
    };

    // 延迟初始化以避免同步调用 setState
    const timer = setTimeout(updateTheme, 0);

    // 监听 localStorage 变化
    const handleStorageChange = () => {
      updateTheme();
    };

    // 监听 DOM 属性变化
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

    window.addEventListener("storage", handleStorageChange);

    // 倒计时逻辑
    const countdownTimer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = "/";
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(countdownTimer);
      window.removeEventListener("storage", handleStorageChange);
      observer.disconnect();
    };
  }, []);

  // 根据主题计算所有颜色
  const isDark = theme === "dark";
  
  const colors = {
    // 文字颜色
    primaryText: isDark ? "#ffffff" : "#1a1f35",
    secondaryText: isDark ? "rgba(255,255,255,0.7)" : "rgba(26,31,53,0.7)",
    tertiaryText: isDark ? "rgba(255,255,255,0.6)" : "rgba(26,31,53,0.6)",
    mutedText: isDark ? "rgba(255,255,255,0.5)" : "rgba(26,31,53,0.5)",
    subtleText: isDark ? "rgba(255,255,255,0.4)" : "rgba(26,31,53,0.4)",
    
    // 背景颜色
    cardBg: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.75)",
    logoBg: isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.85)",
    successBg: isDark ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.15)",
    
    // 边框颜色
    border: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
    successBorder: "rgba(16,185,129,0.3)",
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <DynamicBackground />
      
      <div className="relative flex min-h-screen w-full items-center justify-center px-4 py-8">
        <div className="animate-panel-rise w-full max-w-md">
          {/* Logo 和标题 */}
          <div className="mb-8 text-center">
            <div className="mb-6 inline-flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={siteConfig.logoSrc}
                alt={`${siteConfig.appName} logo`}
                className="h-16 w-16 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all duration-500"
                style={{
                  borderColor: colors.border,
                  background: colors.logoBg,
                }}
              />
            </div>
            <h1 
              className="mb-2 text-3xl font-bold tracking-tight transition-colors duration-300"
              style={{ color: colors.primaryText }}
            >
              {siteConfig.appName}
            </h1>
          </div>

          {/* 提示卡片 */}
          <div 
            className="rounded-3xl border p-8 shadow-2xl backdrop-blur-xl transition-all duration-300"
            style={{
              borderColor: colors.border,
              background: colors.cardBg,
            }}
          >
            <div className="flex flex-col items-center justify-center text-center">
              {/* 成功图标 */}
              <div 
                className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border transition-all duration-300"
                style={{
                  borderColor: colors.successBorder,
                  background: colors.successBg,
                }}
              >
                <CheckCircle 
                  className="h-10 w-10 transition-colors duration-300"
                  style={{ color: "#34d399" }}
                />
              </div>

              <h2 
                className="mb-3 text-2xl font-semibold transition-colors duration-300"
                style={{ color: colors.primaryText }}
              >
                您已登录
              </h2>

              <p 
                className="mb-6 text-sm leading-relaxed transition-colors duration-300"
                style={{ color: colors.tertiaryText }}
              >
                检测到您已经登录了管理员账号，无需重复登录。
              </p>

              <div 
                className="mb-6 flex items-center gap-2 text-sm transition-colors duration-300"
                style={{ color: colors.mutedText }}
              >
                <LoaderCircle className="h-4 w-4 animate-spin" />
                <span>
                  即将返回导航页
                  <span 
                    className="ml-1 font-medium transition-colors duration-300"
                    style={{ color: colors.secondaryText }}
                  >
                    {countdown}
                  </span>
                  秒...
                </span>
              </div>

              <button
                onClick={() => (window.location.href = "/")}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:from-violet-700 hover:to-purple-700"
              >
                <Home className="h-4 w-4" />
                立即返回
              </button>
            </div>
          </div>

          {/* 底部提示 */}
          <p 
            className="mt-6 text-center text-xs transition-colors duration-300"
            style={{ color: colors.subtleText }}
          >
            您可以安全地关闭此页面
          </p>
        </div>
      </div>
    </main>
  );
}
