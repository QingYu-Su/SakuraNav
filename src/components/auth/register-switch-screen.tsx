/**
 * 注册界面组件（切换用户场景专用）
 * @description 注册成功后直接返回主页，不跳转登录页，并提示可在切换用户中添加新用户
 */

"use client";

import { Eye, EyeOff, LoaderCircle, LockKeyhole, UserRound } from "lucide-react";
import { FormEvent, useState, useTransition, useEffect } from "react";
import { siteConfig } from "@/lib/config/config";
import { DynamicBackground } from "./dynamic-background";

export function RegisterSwitchScreen({ registrationEnabled: _registrationEnabled }: { registrationEnabled: boolean }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
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
      if (htmlTheme === "light" || htmlTheme === "dark") setTheme(htmlTheme as "light" | "dark");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
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
    secondaryText: isDark ? "rgba(255,255,255,0.8)" : "rgba(26,31,53,0.8)",
    mutedText: isDark ? "rgba(255,255,255,0.6)" : "rgba(26,31,53,0.6)",
    subtleText: isDark ? "rgba(255,255,255,0.4)" : "rgba(26,31,53,0.4)",

    cardBg: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.75)",
    inputBg: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.6)",
    inputBgFocus: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.8)",
    iconBg: isDark ? "rgba(255,255,255,0.1)" : "rgba(139,92,246,0.1)",
    logoBg: isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.85)",

    border: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
    borderFocus: isDark ? "rgba(255,255,255,0.2)" : "rgba(139,92,246,0.3)",

    iconPrimary: isDark ? "rgba(255,255,255,0.8)" : "rgba(139,92,246,0.9)",
    iconMuted: isDark ? "rgba(255,255,255,0.4)" : "rgba(26,31,53,0.4)",
    inputBorder: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
  };

  function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    startTransition(async () => {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, confirmPassword }),
        credentials: "include",
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "注册失败，请重试。");
        return;
      }

      // 注册成功 — 显示提示然后返回主页（不自动登录为新用户）
      setIsSuccess(true);
      setTimeout(() => {
        window.location.href = "/";
      }, 3000);
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
                style={{ borderColor: colors.border, background: colors.logoBg }}
              />
            </div>
            <h1
              className="mb-2 text-3xl font-bold tracking-tight transition-colors duration-300"
              style={{ color: colors.primaryText }}
            >
              {siteConfig.appName}
            </h1>
            <p className="text-sm transition-colors duration-300" style={{ color: colors.mutedText }}>
              注册新账号
            </p>
          </div>

          {/* 表单卡片 */}
          <div
            className="rounded-3xl border p-8 shadow-2xl backdrop-blur-xl transition-all duration-300"
            style={{ borderColor: colors.border, background: colors.cardBg }}
          >
            <div className="mb-6 flex items-center justify-center gap-2">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300"
                style={{ background: colors.iconBg }}
              >
                <LockKeyhole className="h-5 w-5 transition-colors duration-300" style={{ color: colors.iconPrimary }} />
              </div>
              <h2 className="text-xl font-semibold transition-colors duration-300" style={{ color: colors.primaryText }}>
                创建账号
              </h2>
            </div>

            {!isSuccess ? (
              <form className="space-y-5" onSubmit={handleRegister}>
                <div className="space-y-4">
                  {/* 账号输入 */}
                  <div>
                    <label className="mb-2 block text-sm font-medium transition-colors duration-300" style={{ color: colors.secondaryText }}>
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
                        onChange={(e) => setUsername(e.target.value)}
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
                    <label className="mb-2 block text-sm font-medium transition-colors duration-300" style={{ color: colors.secondaryText }}>
                      密码
                    </label>
                    <div className="group relative">
                      <LockKeyhole
                        className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors duration-300"
                        style={{ color: colors.iconMuted }}
                      />
                      <input
                        type={showPassword ? "text" : "password"}
                        className="w-full rounded-2xl border px-4 py-3.5 pl-11 pr-11 outline-none transition-all duration-300 [::-ms-reveal]:hidden [::-ms-clear]:hidden"
                        style={{
                          borderColor: colors.inputBorder,
                          background: colors.inputBg,
                          color: colors.primaryText,
                        }}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="请输入密码"
                        autoComplete="new-password"
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
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 transition-colors duration-300"
                        style={{ color: colors.iconMuted }}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* 确认密码 */}
                  <div>
                    <label className="mb-2 block text-sm font-medium transition-colors duration-300" style={{ color: colors.secondaryText }}>
                      确认密码
                    </label>
                    <div className="group relative">
                      <LockKeyhole
                        className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors duration-300"
                        style={{ color: colors.iconMuted }}
                      />
                      <input
                        type={showPassword ? "text" : "password"}
                        className="w-full rounded-2xl border px-4 py-3.5 pl-11 pr-11 outline-none transition-all duration-300 [::-ms-reveal]:hidden [::-ms-clear]:hidden"
                        style={{
                          borderColor: colors.inputBorder,
                          background: colors.inputBg,
                          color: colors.primaryText,
                        }}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="请再次输入密码"
                        autoComplete="new-password"
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
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 transition-colors duration-300"
                        style={{ color: colors.iconMuted }}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 错误信息 */}
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

                {/* 提交按钮 */}
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:from-violet-700 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      注册中
                    </span>
                  ) : (
                    "注册"
                  )}
                </button>
              </form>
            ) : (
              /* 注册成功提示 */
              <div className="text-center py-4">
                <div className="mb-4 flex justify-center">
                  <div
                    className="h-16 w-16 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(16,185,129,0.15)" }}
                  >
                    <svg className="h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <h3 className="mb-2 text-lg font-semibold" style={{ color: colors.primaryText }}>
                  注册成功
                </h3>
                <p className="text-sm mb-1" style={{ color: colors.mutedText }}>
                  即将返回主页...
                </p>
                <p className="text-xs mt-3" style={{ color: colors.subtleText }}>
                  现在可以在「切换用户」中添加新注册的用户
                </p>
                <div className="mt-4">
                  <LoaderCircle className="h-5 w-5 animate-spin mx-auto" style={{ color: colors.mutedText }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
