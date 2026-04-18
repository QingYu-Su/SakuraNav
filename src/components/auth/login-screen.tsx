/**
 * 登录界面组件
 * @description 管理员登录页面，提供用户名密码认证功能，支持亮暗主题实时切换
 */

"use client";

import { Eye, EyeOff, LoaderCircle, LockKeyhole, UserRound } from "lucide-react";
import { FormEvent, useState, useTransition, useEffect } from "react";
import { siteConfig } from "@/lib/config/config";
import { DynamicBackground } from "./dynamic-background";

export function LoginScreen() {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
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

    return () => {
      clearTimeout(timer);
      window.removeEventListener("storage", handleStorageChange);
      observer.disconnect();
    };
  }, []);

  // 根据主题计算所有颜色
  const isDark = theme === "dark";
  
  const colors = {
    // 文字颜色
    primaryText: isDark ? "#ffffff" : "#1a1f35",
    secondaryText: isDark ? "rgba(255,255,255,0.8)" : "rgba(26,31,53,0.8)",
    tertiaryText: isDark ? "rgba(255,255,255,0.7)" : "rgba(26,31,53,0.7)",
    mutedText: isDark ? "rgba(255,255,255,0.6)" : "rgba(26,31,53,0.6)",
    faintText: isDark ? "rgba(255,255,255,0.5)" : "rgba(26,31,53,0.5)",
    subtleText: isDark ? "rgba(255,255,255,0.4)" : "rgba(26,31,53,0.4)",
    
    // 背景颜色
    cardBg: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.75)",
    cardBgHover: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.85)",
    inputBg: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.6)",
    inputBgFocus: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.8)",
    iconBg: isDark ? "rgba(255,255,255,0.1)" : "rgba(139,92,246,0.1)",
    logoBg: isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.85)",
    
    // 边框颜色
    border: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
    borderHover: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)",
    borderFocus: isDark ? "rgba(255,255,255,0.2)" : "rgba(139,92,246,0.3)",
    
    // 图标颜色
    iconPrimary: isDark ? "rgba(255,255,255,0.8)" : "rgba(139,92,246,0.9)",
    iconMuted: isDark ? "rgba(255,255,255,0.4)" : "rgba(26,31,53,0.4)",
    iconHover: isDark ? "rgba(255,255,255,0.7)" : "rgba(26,31,53,0.7)",
    
    // 输入框边框和复选框
    inputBorder: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
    checkboxBorder: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.15)",
    checkboxBg: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.6)",
  };

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    startTransition(async () => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password, rememberMe }),
        credentials: "include",
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(data?.error ?? "登录失败，请检查账号和密码。");
        return;
      }

      window.location.href = "/";
    });
  }

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
            <p 
              className="text-sm transition-colors duration-300"
              style={{ color: colors.mutedText }}
            >
              管理员登录
            </p>
          </div>

          {/* 登录表单卡片 */}
          <div 
            className="rounded-3xl border p-8 shadow-2xl backdrop-blur-xl transition-all duration-300"
            style={{
              borderColor: colors.border,
              background: colors.cardBg,
            }}
          >
            <div className="mb-6 flex items-center justify-center gap-2">
              <div 
                className="flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300"
                style={{ background: colors.iconBg }}
              >
                <LockKeyhole 
                  className="h-5 w-5 transition-colors duration-300"
                  style={{ color: colors.iconPrimary }}
                />
              </div>
              <h2 
                className="text-xl font-semibold transition-colors duration-300"
                style={{ color: colors.primaryText }}
              >
                控制面板
              </h2>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-4">
                {/* 账号输入 */}
                <div>
                  <label 
                    className="mb-2 block text-sm font-medium transition-colors duration-300"
                    style={{ color: colors.secondaryText }}
                  >
                    账号
                  </label>
                  <div className="group relative">
                    <UserRound 
                      className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors duration-300"
                      style={{ color: colors.iconMuted }}
                    />
                    <input
                      className="w-full rounded-2xl border px-4 py-3.5 pl-11 outline-none transition-all duration-300"
                      style={{
                        borderColor: colors.inputBorder,
                        background: colors.inputBg,
                        color: colors.primaryText,
                      }}
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      placeholder="请输入账号"
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = colors.borderFocus;
                        e.currentTarget.style.background = colors.inputBgFocus;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = colors.inputBorder;
                        e.currentTarget.style.background = colors.inputBg;
                      }}
                    />
                  </div>
                </div>

                {/* 密码输入 */}
                <div>
                  <label 
                    className="mb-2 block text-sm font-medium transition-colors duration-300"
                    style={{ color: colors.secondaryText }}
                  >
                    密码
                  </label>
                  <div className="group relative">
                    <LockKeyhole 
                      className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors duration-300"
                      style={{ color: colors.iconMuted }}
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      className="w-full rounded-2xl border px-4 py-3.5 pl-11 pr-11 outline-none transition-all duration-300"
                      style={{
                        borderColor: colors.inputBorder,
                        background: colors.inputBg,
                        color: colors.primaryText,
                      }}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="请输入密码"
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = colors.borderFocus;
                        e.currentTarget.style.background = colors.inputBgFocus;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = colors.inputBorder;
                        e.currentTarget.style.background = colors.inputBg;
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 transition-colors duration-300"
                      style={{ color: colors.iconMuted }}
                      aria-label={showPassword ? "隐藏密码" : "显示密码"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* 记住我复选框 - 自定义样式 */}
              <label className="flex cursor-pointer items-center gap-3 text-sm">
                <div className="relative flex items-center justify-center">
                  <div
                    className="h-4 w-4 rounded border-2 transition-all duration-300"
                    style={{
                      borderColor: rememberMe 
                        ? "rgb(139,92,246)" 
                        : colors.checkboxBorder,
                      background: rememberMe 
                        ? "rgb(139,92,246)" 
                        : colors.checkboxBg,
                    }}
                  >
                    {rememberMe && (
                      <svg
                        className="h-full w-full text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="absolute opacity-0 h-4 w-4 cursor-pointer"
                  />
                </div>
                <span 
                  className="transition-colors duration-300"
                  style={{ color: colors.tertiaryText }}
                >
                  保持 30 天登录状态
                </span>
              </label>

              {/* 错误提示 */}
              {error ? (
                <p
                  role="alert"
                  className="rounded-2xl border px-4 py-3 text-sm"
                  style={{
                    borderColor: "rgba(244,63,94,0.4)",
                    background: isDark ? "rgba(244,63,94,0.15)" : "rgba(244,63,94,0.1)",
                    color: "#fca5a5",
                  }}
                >
                  {error}
                </p>
              ) : null}

              {/* 登录按钮 */}
              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:from-violet-700 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    登录中
                  </span>
                ) : (
                  "登录"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
