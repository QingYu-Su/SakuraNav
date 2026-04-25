/**
 * 管理员初始化引导界面
 * @description 首次启动时引导创建管理员账户，UI 风格与登录页保持一致
 */

"use client";

import { useState, useEffect } from "react";
import { LoaderCircle, Eye, EyeOff } from "lucide-react";
import { DynamicBackground } from "@/components/auth/dynamic-background";
import { siteConfig } from "@/lib/config/config";
import { requestJson } from "@/lib/base/api";
import type { ThemeMode } from "@/lib/base/types";

export function SetupScreen() {
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const updateTheme = () => {
      const stored = window.localStorage.getItem("sakura-theme");
      if (stored === "light" || stored === "dark") {
        setTheme(stored);
      } else {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        setTheme(prefersDark ? "dark" : "light");
      }
    };
    const timer = setTimeout(updateTheme, 0);
    const observer = new MutationObserver(() => {
      const htmlTheme = document.documentElement.dataset.theme;
      if (htmlTheme === "light" || htmlTheme === "dark") setTheme(htmlTheme as ThemeMode);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => { clearTimeout(timer); observer.disconnect(); };
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
    border: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
    borderFocus: isDark ? "rgba(255,255,255,0.2)" : "rgba(139,92,246,0.3)",
    iconMuted: isDark ? "rgba(255,255,255,0.4)" : "rgba(26,31,53,0.4)",
    logoBg: isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.85)",
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!username || !password || !confirmPassword) {
      setError("请填写所有字段");
      return;
    }
    if (username.length < 2 || username.length > 20) {
      setError("用户名长度需在 2-20 个字符之间");
      return;
    }
    if (password.length < 6) {
      setError("密码长度不能少于 6 位");
      return;
    }
    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }
    setBusy(true);
    try {
      await requestJson<{ ok: boolean }>("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, confirmPassword }),
      });
      // 初始化成功，跳转到首页
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "初始化失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <DynamicBackground />

      <div className="relative flex min-h-screen w-full items-center justify-center px-4 py-8">
        <div className="animate-panel-rise w-full max-w-md">
          {/* Logo 和标题 */}
          <div className="mb-8 text-center">
            <div className="mb-4 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={siteConfig.logoSrc}
                alt={`${siteConfig.appName} logo`}
                className="h-16 w-16 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all duration-500"
                style={{ borderColor: colors.border, background: colors.logoBg }}
              />
            </div>
            <h1 className="mb-2 text-3xl font-bold tracking-tight transition-colors duration-300" style={{ color: colors.primaryText }}>
              欢迎使用 {siteConfig.appName}
            </h1>
            <p className="text-sm transition-colors duration-300" style={{ color: colors.mutedText }}>
              首次使用，请创建管理员账户
            </p>
          </div>

          {/* 表单卡片 */}
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border p-8 shadow-2xl backdrop-blur-xl transition-all duration-300"
            style={{ borderColor: colors.border, background: colors.cardBg }}
          >
            <div className="space-y-4">
              {/* 用户名 */}
              <div>
                <label className="mb-1.5 block text-sm font-medium transition-colors duration-300" style={{ color: colors.secondaryText }}>
                  用户名
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-all duration-300"
                  style={{ borderColor: colors.border, background: colors.inputBg, color: colors.primaryText }}
                  placeholder="2-20 个字符"
                  autoFocus
                  disabled={busy}
                />
              </div>

              {/* 密码 */}
              <div>
                <label className="mb-1.5 block text-sm font-medium transition-colors duration-300" style={{ color: colors.secondaryText }}>
                  密码
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border px-4 py-3 pr-11 text-sm outline-none transition-all duration-300"
                    style={{ borderColor: colors.border, background: colors.inputBg, color: colors.primaryText }}
                    placeholder="至少 6 位"
                    disabled={busy}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 transition"
                  >
                    {showPassword
                      ? <EyeOff className="h-4 w-4" style={{ color: colors.iconMuted }} />
                      : <Eye className="h-4 w-4" style={{ color: colors.iconMuted }} />}
                  </button>
                </div>
              </div>

              {/* 确认密码 */}
              <div>
                <label className="mb-1.5 block text-sm font-medium transition-colors duration-300" style={{ color: colors.secondaryText }}>
                  确认密码
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-2xl border px-4 py-3 pr-11 text-sm outline-none transition-all duration-300"
                    style={{ borderColor: colors.border, background: colors.inputBg, color: colors.primaryText }}
                    placeholder="再次输入密码"
                    disabled={busy}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 transition"
                  >
                    {showPassword
                      ? <EyeOff className="h-4 w-4" style={{ color: colors.iconMuted }} />
                      : <Eye className="h-4 w-4" style={{ color: colors.iconMuted }} />}
                  </button>
                </div>
              </div>

              {/* 错误提示 */}
              {error && (
                <div
                  className="rounded-xl border px-4 py-3 text-sm"
                  style={{
                    borderColor: "rgba(244,63,94,0.4)",
                    background: isDark ? "rgba(244,63,94,0.15)" : "rgba(244,63,94,0.1)",
                    color: isDark ? "#fca5a5" : "#e11d48",
                  }}
                >
                  {error}
                </div>
              )}

              {/* 提交按钮 */}
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:from-violet-700 hover:to-purple-700 disabled:opacity-50"
              >
                {busy ? (
                  <span className="flex items-center justify-center gap-2">
                    <LoaderCircle className="h-4 w-4 animate-spin" /> 正在创建...
                  </span>
                ) : (
                  "创建管理员账户"
                )}
              </button>
            </div>
          </form>

          {/* 底部提示 */}
          <p className="mt-6 text-center text-xs transition-colors duration-300" style={{ color: colors.subtleText }}>
            {siteConfig.appName} · 初始化设置
          </p>
        </div>
      </div>
    </main>
  );
}
