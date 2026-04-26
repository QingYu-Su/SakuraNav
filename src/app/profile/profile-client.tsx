/**
 * 个人空间页面客户端组件
 * @description 用户资料查看/编辑、头像上传、修改密码、OAuth 绑定管理、退出登录、注销账号
 */

"use client";

import { useEffect, useState, useRef, useTransition } from "react";
import {
  Camera,
  Check,
  KeyRound,
  LoaderCircle,
  LogOut,
  PencilLine,
  Trash2,
  X,
  Link2,
  Unlink,
  AlertTriangle,
} from "lucide-react";
import { DynamicBackground } from "@/components/auth/dynamic-background";
import { siteConfig } from "@/lib/config/config";
import { ImageCropDialog } from "@/components/dialogs/image-crop-dialog";
import type { ThemeMode, OAuthBindingInfo } from "@/lib/base/types";
import { requestJson } from "@/lib/base/api";
import { OAUTH_PROVIDERS } from "@/lib/base/types";

type UserProfile = {
  id: string;
  username: string;
  nickname: string | null;
  avatarUrl: string | null;
  avatarColor: string | null;
  role: string;
  /** 是否已设置密码（OAuth 用户可能未设置） */
  hasPassword?: boolean;
  /** 用户名是否已修改过（OAuth 用户允许修改一次） */
  usernameChanged?: boolean;
};

export function ProfilePageClient() {
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // 昵称编辑
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [nicknameSaving, setNicknameSaving] = useState(false);

  // 头像上传
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // 修改密码
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPasswordState, setConfirmPasswordState] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  // 密码修改成功提示
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // 注销账号
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  const DELETE_CONFIRM_PHRASE = "我确定注销账号";

  const [isPending, startTransition] = useTransition();

  // OAuth 绑定
  const [oauthBindings, setOauthBindings] = useState<OAuthBindingInfo[]>([]);
  const [oauthBusy, setOAuthBusy] = useState<string | null>(null); // 正在解绑的 provider

  // 用户名修改
  const [usernameDialogOpen, setUsernameDialogOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [usernameSaving, setUsernameSaving] = useState(false);

  // 初始化主题
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
      if (htmlTheme === "light" || htmlTheme === "dark") setTheme(htmlTheme as ThemeMode);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    window.addEventListener("storage", updateTheme);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("storage", updateTheme);
      observer.disconnect();
    };
  }, []);

  // 加载用户资料
  useEffect(() => {
    (async () => {
      try {
        const [data, oauthData] = await Promise.all([
          requestJson<UserProfile>("/api/user/profile"),
          requestJson<{ bindings: OAuthBindingInfo[] }>("/api/user/oauth-bind").catch(() => ({ bindings: [] })),
        ]);
        setProfile(data);
        setOauthBindings(oauthData.bindings);
      } catch {
        // 未授权则跳转首页
        window.location.href = "/";
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const isDark = theme === "dark";

  const colors = {
    primaryText: isDark ? "#ffffff" : "#1a1f35",
    secondaryText: isDark ? "rgba(255,255,255,0.8)" : "rgba(26,31,53,0.8)",
    tertiaryText: isDark ? "rgba(255,255,255,0.7)" : "rgba(26,31,53,0.7)",
    mutedText: isDark ? "rgba(255,255,255,0.6)" : "rgba(26,31,53,0.6)",
    faintText: isDark ? "rgba(255,255,255,0.5)" : "rgba(26,31,53,0.5)",
    subtleText: isDark ? "rgba(255,255,255,0.4)" : "rgba(26,31,53,0.4)",

    cardBg: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.75)",
    inputBg: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.6)",
    inputBgFocus: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.8)",
    border: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
    borderFocus: isDark ? "rgba(255,255,255,0.2)" : "rgba(139,92,246,0.3)",
    iconMuted: isDark ? "rgba(255,255,255,0.4)" : "rgba(26,31,53,0.4)",
  };

  /** 头像上传处理 */
  function handleAvatarFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("图片大小不能超过 5MB");
      return;
    }
    const url = URL.createObjectURL(file);
    setCropSrc(url);
    // 清空 input 以允许重复选择同一文件
    e.target.value = "";
  }

  async function handleAvatarCropConfirm(blob: Blob) {
    setCropSrc(null);
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", blob, "avatar.png");
      const result = await requestJson<{ id: string; url: string }>("/api/user/avatar", {
        method: "POST",
        body: fd,
      });
      setProfile((p) => (p ? { ...p, avatarUrl: result.url } : p));
    } catch (err) {
      alert(err instanceof Error ? err.message : "头像上传失败");
    } finally {
      setAvatarUploading(false);
    }
  }

  /** 昵称保存 */
  async function handleNicknameSave() {
    if (!nicknameDraft.trim()) {
      setEditingNickname(false);
      return;
    }
    setNicknameSaving(true);
    try {
      const data = await requestJson<UserProfile>("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: nicknameDraft.trim() }),
      });
      setProfile(data);
      setEditingNickname(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "保存失败");
    } finally {
      setNicknameSaving(false);
    }
  }

  /** 修改密码 */
  async function handlePasswordSubmit() {
    setPasswordError("");
    // OAuth 用户未设置密码时不需要旧密码
    const needsOldPassword = profile?.hasPassword !== false;
    if (needsOldPassword && !oldPassword) {
      setPasswordError("请输入旧密码");
      return;
    }
    if (!newPassword || !confirmPasswordState) {
      setPasswordError("请填写新密码和确认密码");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("新密码长度不能少于 6 位");
      return;
    }
    if (newPassword !== confirmPasswordState) {
      setPasswordError("两次输入的密码不一致");
      return;
    }
    setPasswordSaving(true);
    try {
      await requestJson("/api/user/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldPassword: needsOldPassword ? oldPassword : undefined,
          newPassword,
          confirmPassword: confirmPasswordState,
        }),
      });
      setPasswordDialogOpen(false);
      setOldPassword("");
      setNewPassword("");
      setConfirmPasswordState("");
      setPasswordSuccess(true);
      // 3 秒后跳转到登录页
      setTimeout(() => {
        startTransition(async () => {
          await requestJson("/api/auth/logout", { method: "POST" });
          window.location.href = "/login";
        });
      }, 3000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "修改失败");
    } finally {
      setPasswordSaving(false);
    }
  }

  /** 退出登录并回到首页 */
  function handleLogoutToHome() {
    startTransition(async () => {
      await requestJson("/api/auth/logout", { method: "POST" });
      window.location.href = "/";
    });
  }

  /** OAuth 解绑 */
  async function handleUnbindOAuth(provider: string) {
    setOAuthBusy(provider);
    try {
      await requestJson("/api/user/oauth-bind", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      setOauthBindings((prev) => prev.filter((b) => b.provider !== provider));
    } catch (err) {
      alert(err instanceof Error ? err.message : "解绑失败");
    }
    setOAuthBusy(null);
  }

  /** OAuth 跳转绑定 */
  function handleBindOAuth(provider: string) {
    window.location.href = `/api/auth/oauth/${provider}`;
  }

  /** 用户名修改 */
  async function handleUsernameSave() {
    if (!newUsername.trim()) {
      setUsernameDialogOpen(false);
      return;
    }
    setUsernameError("");
    setUsernameSaving(true);
    try {
      await requestJson("/api/user/username", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername.trim() }),
      });
      setProfile((p) => (p ? { ...p, username: newUsername.trim(), usernameChanged: true } : p));
      setUsernameDialogOpen(false);
    } catch (err) {
      setUsernameError(err instanceof Error ? err.message : "修改失败");
    } finally {
      setUsernameSaving(false);
    }
  }

  /** 注销账号 */
  async function handleDeleteAccount() {
    if (deleteConfirmText !== DELETE_CONFIRM_PHRASE) return;
    setDeleteSubmitting(true);
    try {
      await requestJson("/api/user/delete-account", { method: "POST" });
      setDeleteDialogOpen(false);
      setDeleteSuccess(true);
      // 3 秒后跳转到首页
      setTimeout(() => {
        window.location.href = "/";
      }, 3000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "注销失败");
    } finally {
      setDeleteSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="relative min-h-screen overflow-hidden">
        <DynamicBackground />
        <div className="relative flex min-h-screen items-center justify-center">
          <LoaderCircle className={`h-8 w-8 animate-spin ${isDark ? "text-white/60" : "text-slate-400"}`} />
        </div>
      </main>
    );
  }

  if (!profile) return null;

  const displayNickname = profile.nickname || profile.username;

  return (
    <main className="relative min-h-screen overflow-hidden">
      <DynamicBackground />

      <div className="relative flex min-h-screen w-full items-center justify-center px-4 py-8">
        <div className="animate-panel-rise w-full max-w-md">
          {/* Logo 和标题 */}
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold tracking-tight transition-colors duration-300" style={{ color: colors.primaryText }}>
              个人空间
            </h1>
            <p className="text-sm transition-colors duration-300" style={{ color: colors.mutedText }}>
              管理你的个人信息
            </p>
          </div>

          {/* 资料卡片 */}
          <div
            className="rounded-3xl border p-8 shadow-2xl backdrop-blur-xl transition-all duration-300"
            style={{ borderColor: colors.border, background: colors.cardBg }}
          >
            {/* 头像区域 */}
            <div className="mb-6 flex justify-center">
              <div className="group relative">
                <div className="h-24 w-24 overflow-hidden rounded-full border-2 transition-all duration-300" style={{ borderColor: colors.border }}>
                  {profile.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.avatarUrl} alt="头像" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-white" style={{ background: profile.avatarColor || "rgba(139,92,246,0.6)" }}>
                      {displayNickname.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                {/* 上传遮罩 */}
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-0"
                >
                  {avatarUploading ? (
                    <LoaderCircle className="h-6 w-6 animate-spin text-white" />
                  ) : (
                    <Camera className="h-6 w-6 text-white" />
                  )}
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarFileSelect}
                />
              </div>
            </div>

            {/* 昵称（可编辑） */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium transition-colors duration-300" style={{ color: colors.secondaryText }}>
                昵称
              </label>
              {editingNickname ? (
                <div className="flex items-center gap-2">
                  <input
                    className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-all duration-300"
                    style={{ borderColor: colors.borderFocus, background: colors.inputBgFocus, color: colors.primaryText }}
                    value={nicknameDraft}
                    onChange={(e) => setNicknameDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") void handleNicknameSave(); if (e.key === "Escape") setEditingNickname(false); }}
                    autoFocus
                    maxLength={20}
                    placeholder="输入昵称"
                  />
                  <button
                    type="button"
                    onClick={() => void handleNicknameSave()}
                    disabled={nicknameSaving}
                    className="shrink-0 rounded-xl bg-violet-600 p-2.5 text-white transition hover:bg-violet-700 disabled:opacity-50"
                  >
                    {nicknameSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingNickname(false)}
                    className="shrink-0 rounded-xl p-2.5 transition"
                    style={{ color: colors.iconMuted }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div
                  className="flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 text-sm transition-all duration-300 hover:border-violet-400/40"
                  style={{ borderColor: colors.border, background: colors.inputBg, color: colors.primaryText }}
                  onClick={() => {
                    setNicknameDraft(profile.nickname || "");
                    setEditingNickname(true);
                  }}
                >
                  <span>{displayNickname}</span>
                  <PencilLine className="h-4 w-4" style={{ color: colors.iconMuted }} />
                </div>
              )}
            </div>

            {/* 账号（OAuth 用户允许修改一次） */}
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium transition-colors duration-300" style={{ color: colors.secondaryText }}>
                账号
              </label>
              <div
                className="flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition-all duration-300"
                style={{ borderColor: colors.border, background: colors.inputBg, color: colors.faintText }}
              >
                <span>{profile.username}</span>
                {profile.usernameChanged !== true && profile.role !== "admin" ? (
                  <button
                    type="button"
                    onClick={() => { setNewUsername(profile.username); setUsernameDialogOpen(true); setUsernameError(""); }}
                    className="flex items-center gap-1.5 text-xs font-medium transition-colors"
                    style={{ color: "rgb(139,92,246)" }}
                  >
                    <PencilLine className="h-3.5 w-3.5" /> 修改
                  </button>
                ) : null}
              </div>
              {profile.usernameChanged !== true && profile.role !== "admin" ? (
                <p className="mt-1.5 text-xs" style={{ color: colors.subtleText }}>
                  账号名仅可修改一次，请谨慎操作
                </p>
              ) : null}
            </div>

            {/* 第三方账号绑定 */}
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium transition-colors duration-300" style={{ color: colors.secondaryText }}>
                第三方账号
              </label>
              <div className="space-y-2">
                {OAUTH_PROVIDERS.map((p) => {
                  const binding = oauthBindings.find((b) => b.provider === p.key);
                  const isBusy = oauthBusy === p.key;
                  return (
                    <div
                      key={p.key}
                      className="flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition-all duration-300"
                      style={{ borderColor: colors.border, background: colors.inputBg }}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-white text-xs font-bold"
                          style={{ background: p.color }}
                        >
                          {p.label.charAt(0)}
                        </span>
                        <div>
                          <span style={{ color: colors.primaryText }}>{p.label}</span>
                          {binding?.displayName ? (
                            <span style={{ color: colors.faintText }}> · {binding.displayName}</span>
                          ) : null}
                        </div>
                      </div>
                      {binding ? (
                        <button
                          type="button"
                          onClick={() => void handleUnbindOAuth(p.key)}
                          disabled={!!oauthBusy}
                          className="flex items-center gap-1.5 text-xs font-medium text-rose-400 transition-colors hover:text-rose-300 disabled:opacity-50"
                        >
                          {isBusy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Unlink className="h-3.5 w-3.5" />}
                          解绑
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleBindOAuth(p.key)}
                          className="flex items-center gap-1.5 text-xs font-medium transition-colors"
                          style={{ color: "rgb(139,92,246)" }}
                        >
                          <Link2 className="h-3.5 w-3.5" /> 绑定
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setPasswordDialogOpen(true)}
                className="w-full flex items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-sm font-medium transition-all duration-300"
                style={{ borderColor: colors.border, background: colors.inputBg, color: colors.primaryText }}
              >
                <KeyRound className="h-4 w-4" />
                修改密码
              </button>
              <button
                type="button"
                onClick={handleLogoutToHome}
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:from-rose-600 hover:to-pink-600 disabled:opacity-50"
              >
                {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                退出登录
              </button>
              {profile.role !== "admin" && (
                <button
                  type="button"
                  onClick={() => { setDeleteDialogOpen(true); setDeleteConfirmText(""); }}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl border border-red-500/30 px-5 py-3 text-sm font-medium text-red-400 transition-all duration-300 hover:border-red-500/60 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                  注销账号
                </button>
              )}
            </div>
          </div>

          {/* 底部提示 */}
          <p className="mt-6 text-center text-xs transition-colors duration-300" style={{ color: colors.subtleText }}>
            {siteConfig.appName} · 个人空间
          </p>
        </div>
      </div>

      {/* 头像裁剪弹窗 */}
      {cropSrc ? (
        <ImageCropDialog
          imageSrc={cropSrc}
          cropShape="round"
          aspectRatio={1}
          title="裁剪头像"
          circular
          onConfirm={(blob) => void handleAvatarCropConfirm(blob)}
          onCancel={() => {
            URL.revokeObjectURL(cropSrc);
            setCropSrc(null);
          }}
          themeMode={theme}
        />
      ) : null}

      {/* 修改密码弹窗 */}
      {passwordDialogOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div
            className="animate-panel-rise w-full max-w-sm rounded-3xl border p-6 shadow-2xl backdrop-blur-xl"
            style={{ borderColor: colors.border, background: colors.cardBg }}
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold" style={{ color: colors.primaryText }}>修改密码</h3>
              <button
                type="button"
                onClick={() => { setPasswordDialogOpen(false); setPasswordError(""); }}
                className="rounded-xl p-2 transition"
                style={{ color: colors.iconMuted }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              {profile?.hasPassword !== false ? (
                <div>
                  <label className="mb-1.5 block text-sm font-medium" style={{ color: colors.secondaryText }}>旧密码</label>
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition"
                    style={{ borderColor: colors.border, background: colors.inputBg, color: colors.primaryText }}
                    autoFocus
                  />
                </div>
              ) : (
                <div className="rounded-xl border px-3.5 py-2.5 text-sm" style={{ borderColor: "rgba(139,92,246,0.4)", background: isDark ? "rgba(139,92,246,0.15)" : "rgba(139,92,246,0.1)", color: "rgb(167,139,250)" }}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    您是通过第三方登录创建的账号，首次设置密码无需输入旧密码。
                  </div>
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-sm font-medium" style={{ color: colors.secondaryText }}>新密码</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition"
                  style={{ borderColor: colors.border, background: colors.inputBg, color: colors.primaryText }}
                  placeholder="至少 6 位"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium" style={{ color: colors.secondaryText }}>确认密码</label>
                <input
                  type="password"
                  value={confirmPasswordState}
                  onChange={(e) => setConfirmPasswordState(e.target.value)}
                  className="w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition"
                  style={{ borderColor: colors.border, background: colors.inputBg, color: colors.primaryText }}
                  onKeyDown={(e) => { if (e.key === "Enter") void handlePasswordSubmit(); }}
                />
              </div>

              {passwordError ? (
                <p className="rounded-xl border px-3.5 py-2.5 text-sm" style={{ borderColor: "rgba(244,63,94,0.4)", background: isDark ? "rgba(244,63,94,0.15)" : "rgba(244,63,94,0.1)", color: "#fca5a5" }}>
                  {passwordError}
                </p>
              ) : null}

              <button
                type="button"
                onClick={() => void handlePasswordSubmit()}
                disabled={passwordSaving}
                className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:from-violet-700 hover:to-purple-700 disabled:opacity-50"
              >
                {passwordSaving ? (
                  <span className="flex items-center justify-center gap-2">
                    <LoaderCircle className="h-4 w-4 animate-spin" /> 处理中...
                  </span>
                ) : (
                  "确认修改"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* 密码修改成功提示 */}
      {passwordSuccess ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div
            className="animate-panel-rise w-full max-w-sm rounded-3xl border p-8 shadow-2xl backdrop-blur-xl text-center"
            style={{ borderColor: colors.border, background: colors.cardBg }}
          >
            <div className="mb-4 flex justify-center">
              <div className="h-16 w-16 rounded-full flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)" }}>
                <Check className="h-8 w-8 text-emerald-500" />
              </div>
            </div>
            <h3 className="mb-2 text-lg font-semibold" style={{ color: colors.primaryText }}>密码修改成功</h3>
            <p className="text-sm" style={{ color: colors.mutedText }}>即将跳转到登录页，请重新登录...</p>
            <div className="mt-4">
              <LoaderCircle className="h-5 w-5 animate-spin mx-auto" style={{ color: colors.mutedText }} />
            </div>
          </div>
        </div>
      ) : null}

      {/* 注销账号确认弹窗 */}
      {deleteDialogOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div
            className="animate-panel-rise w-full max-w-sm rounded-3xl border p-6 shadow-2xl backdrop-blur-xl"
            style={{ borderColor: colors.border, background: colors.cardBg }}
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold" style={{ color: colors.primaryText }}>注销账号</h3>
              <button
                type="button"
                onClick={() => setDeleteDialogOpen(false)}
                className="rounded-xl p-2 transition"
                style={{ color: colors.iconMuted }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-4 rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: "rgba(244,63,94,0.4)", background: isDark ? "rgba(244,63,94,0.15)" : "rgba(244,63,94,0.1)", color: "#fca5a5" }}>
              此操作不可撤销！注销后，你的所有数据（标签、站点、外观配置、上传资源）将被永久删除。
            </div>

            <p className="mb-2 text-sm" style={{ color: colors.secondaryText }}>
              请输入 <span className="font-semibold text-red-400">&quot;{DELETE_CONFIRM_PHRASE}&quot;</span> 以确认注销：
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition"
              style={{ borderColor: colors.border, background: colors.inputBg, color: colors.primaryText }}
              autoFocus
              placeholder={DELETE_CONFIRM_PHRASE}
            />

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteDialogOpen(false)}
                className="flex-1 rounded-2xl border px-4 py-3 text-sm font-medium transition-all duration-300"
                style={{ borderColor: colors.border, color: colors.primaryText, background: colors.inputBg }}
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteAccount()}
                disabled={deleteConfirmText !== DELETE_CONFIRM_PHRASE || deleteSubmitting}
                className="flex-1 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:from-red-700 hover:to-rose-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleteSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <LoaderCircle className="h-4 w-4 animate-spin" /> 注销中...
                  </span>
                ) : (
                  "确认注销"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* 注销成功提示 */}
      {deleteSuccess ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div
            className="animate-panel-rise w-full max-w-sm rounded-3xl border p-8 shadow-2xl backdrop-blur-xl text-center"
            style={{ borderColor: colors.border, background: colors.cardBg }}
          >
            <div className="mb-4 flex justify-center">
              <div className="h-16 w-16 rounded-full flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)" }}>
                <Check className="h-8 w-8 text-emerald-500" />
              </div>
            </div>
            <h3 className="mb-2 text-lg font-semibold" style={{ color: colors.primaryText }}>账号已注销</h3>
            <p className="text-sm" style={{ color: colors.mutedText }}>注销成功，即将返回主页...</p>
            <div className="mt-4">
              <LoaderCircle className="h-5 w-5 animate-spin mx-auto" style={{ color: colors.mutedText }} />
            </div>
          </div>
        </div>
      ) : null}

      {/* 用户名修改弹窗 */}
      {usernameDialogOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div
            className="animate-panel-rise w-full max-w-sm rounded-3xl border p-6 shadow-2xl backdrop-blur-xl"
            style={{ borderColor: colors.border, background: colors.cardBg }}
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold" style={{ color: colors.primaryText }}>修改账号名</h3>
              <button
                type="button"
                onClick={() => setUsernameDialogOpen(false)}
                className="rounded-xl p-2 transition"
                style={{ color: colors.iconMuted }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-xl border px-3.5 py-2.5 text-sm mb-4" style={{ borderColor: "rgba(234,179,8,0.4)", background: isDark ? "rgba(234,179,8,0.15)" : "rgba(234,179,8,0.1)", color: "#fbbf24" }}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                账号名仅可修改一次，修改后无法撤销。
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: colors.secondaryText }}>新账号名</label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => { setNewUsername(e.target.value); setUsernameError(""); }}
                className="w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition"
                style={{ borderColor: colors.border, background: colors.inputBg, color: colors.primaryText }}
                maxLength={20}
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") void handleUsernameSave(); }}
              />
            </div>

            {usernameError ? (
              <p className="mt-2 rounded-xl border px-3.5 py-2.5 text-sm" style={{ borderColor: "rgba(244,63,94,0.4)", background: isDark ? "rgba(244,63,94,0.15)" : "rgba(244,63,94,0.1)", color: "#fca5a5" }}>
                {usernameError}
              </p>
            ) : null}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setUsernameDialogOpen(false)}
                className="flex-1 rounded-2xl border px-4 py-3 text-sm font-medium transition-all duration-300"
                style={{ borderColor: colors.border, color: colors.primaryText, background: colors.inputBg }}
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void handleUsernameSave()}
                disabled={usernameSaving || !newUsername.trim()}
                className="flex-1 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300 disabled:opacity-50"
              >
                {usernameSaving ? <LoaderCircle className="h-4 w-4 animate-spin mx-auto" /> : "确认修改"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
