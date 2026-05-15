/**
 * 登录/注册界面组件
 * @description 支持用户登录和注册，可切换模式
 */

"use client";

import { Eye, EyeOff, LoaderCircle, LockKeyhole, UserRound, Check } from "lucide-react";
import { FormEvent, useState, useTransition, useEffect } from "react";
import { siteConfig } from "@/lib/config/config";
import { DynamicBackground } from "./dynamic-background";
import { OAuthProviderIcon } from "./oauth-provider-icon";
import type { PublicOAuthProvider } from "@/lib/base/types";

type AuthMode = "login" | "register";

export function LoginScreen({
  registrationEnabled,
  oauthProviders = [],
}: {
  registrationEnabled: boolean;
  oauthProviders?: PublicOAuthProvider[];
}) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // OAuth 成功弹窗：检测 URL 参数（使用同步初始值避免 effect 中 setState）
  const [oauthStatus] = useState<"success" | "error" | "">(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    if (params.get("oauth") === "success") return "success";
    if (params.get("oauth") === "error") return "error";
    return "";
  });
  const showOAuthSuccess = oauthStatus === "success";

  const [error, setError] = useState(oauthStatus === "error" ? "第三方登录失败，请重试。" : "");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [oauthCountdown, setOauthCountdown] = useState(oauthStatus === "success" ? 5 : 0);

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

    const handleStorageChange = () => {
      updateTheme();
    };

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

  // 清理 URL 中的 oauth 参数
  useEffect(() => {
    if (oauthStatus) {
      const url = new URL(window.location.href);
      url.searchParams.delete("oauth");
      window.history.replaceState({}, "", url.pathname);
    }
  }, [oauthStatus]);

  // OAuth 成功倒计时
  useEffect(() => {
    if (!showOAuthSuccess) return;
    if (oauthCountdown <= 0) {
      window.location.href = "/";
      return;
    }
    const timer = setTimeout(() => setOauthCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [showOAuthSuccess, oauthCountdown]);

  const isDark = theme === "dark";

  const colors = {
    primaryText: isDark ? "#ffffff" : "#1a1f35",
    secondaryText: isDark ? "rgba(255,255,255,0.8)" : "rgba(26,31,53,0.8)",
    tertiaryText: isDark ? "rgba(255,255,255,0.7)" : "rgba(26,31,53,0.7)",
    mutedText: isDark ? "rgba(255,255,255,0.6)" : "rgba(26,31,53,0.6)",
    faintText: isDark ? "rgba(255,255,255,0.5)" : "rgba(26,31,53,0.5)",
    subtleText: isDark ? "rgba(255,255,255,0.4)" : "rgba(26,31,53,0.4)",

    cardBg: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.75)",
    cardBgHover: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.85)",
    inputBg: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.6)",
    inputBgFocus: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.8)",
    iconBg: isDark ? "rgba(255,255,255,0.1)" : "rgba(139,92,246,0.1)",
    logoBg: isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.85)",

    border: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
    borderHover: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)",
    borderFocus: isDark ? "rgba(255,255,255,0.2)" : "rgba(139,92,246,0.3)",

    iconPrimary: isDark ? "rgba(255,255,255,0.8)" : "rgba(139,92,246,0.9)",
    iconMuted: isDark ? "rgba(255,255,255,0.4)" : "rgba(26,31,53,0.4)",

    inputBorder: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
    checkboxBorder: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.15)",
    checkboxBg: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.6)",
  };

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    startTransition(async () => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, rememberMe }),
        credentials: "include",
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "登录失败，请检查账号和密码。");
        return;
      }

      window.location.replace("/");
    });
  }

  function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    // 前端预校验
    if (!username.trim()) {
      setError("请输入账号");
      return;
    }
    if (/\s/.test(username)) {
      setError("用户名不能包含空格");
      return;
    }
    if (username.length < 2 || username.length > 10) {
      setError("用户名长度需在 2-10 个字符之间");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError("用户名只能包含字母、数字和下划线");
      return;
    }
    if (/\s/.test(password)) {
      setError("密码不能包含空格");
      return;
    }
    if (password.length < 6) {
      setError("密码长度不能少于 6 位");
      return;
    }
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      setError("密码需包含大写字母、小写字母和数字");
      return;
    }
    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

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

      // 注册成功后切换到登录模式
      setMode("login");
      setPassword("");
      setConfirmPassword("");
      setIsSuccess(true);
      setError("注册成功，请使用新账号登录。");
    });
  }

  function switchMode(newMode: AuthMode) {
    setMode(newMode);
    setError("");
    setIsSuccess(false);
    setPassword("");
    setConfirmPassword("");
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
              {mode === "login" ? "用户登录" : "注册新账号"}
            </p>
          </div>

          {/* 表单卡片 */}
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
                {mode === "login" ? "控制面板" : "创建账号"}
              </h2>
            </div>

            <form
              className="space-y-5"
              onSubmit={mode === "login" ? handleLogin : handleRegister}
            >
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
                      placeholder={mode === "register" ? "字母、数字或下划线，2-10 个字符" : "请输入账号"}
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
                      className="w-full rounded-2xl border px-4 py-3.5 pl-11 pr-11 outline-none transition-all duration-300 [::-ms-reveal]:hidden [::-ms-clear]:hidden"
                      style={{
                        borderColor: colors.inputBorder,
                        background: colors.inputBg,
                        color: colors.primaryText,
                      }}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder={mode === "register" ? "至少 6 位，需含大小写字母和数字" : "请输入密码"}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
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
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* 确认密码（仅注册模式） */}
                {mode === "register" ? (
                  <div>
                    <label
                      className="mb-2 block text-sm font-medium transition-colors duration-300"
                      style={{ color: colors.secondaryText }}
                    >
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
                        onChange={(event) => setConfirmPassword(event.target.value)}
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
                        onClick={() => setShowPassword((current) => !current)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 transition-colors duration-300"
                        style={{ color: colors.iconMuted }}
                        aria-label={showPassword ? "隐藏密码" : "显示密码"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* 记住我（仅登录模式） */}
              {mode === "login" ? (
                <label className="flex cursor-pointer items-center gap-3 text-sm">
                  <div className="relative flex items-center justify-center">
                    <div
                      className="h-4 w-4 rounded border-2 transition-all duration-300"
                      style={{
                        borderColor: rememberMe ? "rgb(139,92,246)" : colors.checkboxBorder,
                        background: rememberMe ? "rgb(139,92,246)" : colors.checkboxBg,
                      }}
                    >
                      {rememberMe ? (
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
                      ) : null}
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
              ) : null}

              {/* 提示信息 */}
              {error ? (
                <p
                  role="alert"
                  className="rounded-2xl border px-4 py-3 text-sm"
                  style={
                    isSuccess
                      ? {
                          borderColor: "rgba(16,185,129,0.4)",
                          background: isDark ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.1)",
                          color: "#6ee7b7",
                        }
                      : {
                          borderColor: "rgba(244,63,94,0.4)",
                          background: isDark ? "rgba(244,63,94,0.15)" : "rgba(244,63,94,0.1)",
                          color: "#fca5a5",
                        }
                  }
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
                    {mode === "login" ? "登录中" : "注册中"}
                  </span>
                ) : (
                  mode === "login" ? "登录" : "注册"
                )}
              </button>
            </form>

            {/* 切换登录/注册 */}
            {registrationEnabled ? (
              <div className="mt-5 text-center">
                {mode === "login" ? (
                  <button
                    type="button"
                    onClick={() => switchMode("register")}
                    className="text-sm transition-colors duration-200 hover:underline"
                    style={{ color: colors.mutedText }}
                  >
                    还没账号？去注册 →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="text-sm transition-colors duration-200 hover:underline"
                    style={{ color: colors.mutedText }}
                  >
                    ← 返回登录
                  </button>
                )}
              </div>
            ) : null}

            {/* 第三方登录 */}
            {mode === "login" && oauthProviders.length > 0 ? (
              <div className="mt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px" style={{ background: colors.border }} />
                  <span className="text-xs" style={{ color: colors.subtleText }}>其他登录方式</span>
                  <div className="flex-1 h-px" style={{ background: colors.border }} />
                </div>
                <div className="flex justify-center gap-4">
                  {oauthProviders.map((provider) => (
                    <button
                      key={provider.key}
                      type="button"
                      onClick={() => { window.location.href = `/api/auth/oauth/${provider.key}`; }}
                      className="group relative flex items-center justify-center h-11 w-11 rounded-2xl border transition-all duration-200 hover:scale-110"
                      style={{ borderColor: colors.border, background: colors.inputBg }}
                    >
                      <OAuthProviderIcon providerKey={provider.key} size={22} />
                      {/* Tooltip */}
                      <span
                        className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"
                        style={{
                          background: isDark ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.95)",
                          color: isDark ? "#fff" : "#1a1f35",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                        }}
                      >
                        {provider.label} 登录
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* OAuth 登录成功弹窗 */}
      {showOAuthSuccess ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}>
          <div
            className="animate-panel-rise w-full max-w-sm rounded-3xl border p-8 shadow-2xl backdrop-blur-xl text-center"
            style={{ borderColor: colors.border, background: colors.cardBg }}
          >
            <div className="mb-4 flex justify-center">
              <div className="h-16 w-16 rounded-full flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)" }}>
                <Check className="h-8 w-8 text-emerald-500" />
              </div>
            </div>
            <h3 className="mb-2 text-lg font-semibold" style={{ color: colors.primaryText }}>登录成功</h3>
            <p className="text-sm" style={{ color: colors.mutedText }}>
              {oauthCountdown} 秒后自动跳转到主页...
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <LoaderCircle className="h-4 w-4 animate-spin" style={{ color: colors.mutedText }} />
            </div>
            <button
              type="button"
              onClick={() => { window.location.href = "/"; }}
              className="mt-5 w-full rounded-2xl px-5 py-3 text-sm font-medium transition"
              style={{
                background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                color: colors.primaryText,
              }}
            >
              立即前往
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}


