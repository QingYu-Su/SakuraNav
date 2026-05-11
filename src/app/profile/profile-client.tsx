/**
 * 个人空间页面客户端组件
 * @description 用户资料查看/编辑、头像上传、修改密码、OAuth 绑定管理、退出登录、注销账号
 */

"use client";

import { useEffect, useState, useRef, useTransition } from "react";
import Link from "next/link";
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
  User,
  Shield,
  Key,
} from "lucide-react";
import { DynamicBackground } from "@/components/auth/dynamic-background";
import { OAuthProviderIcon } from "@/components/auth/oauth-provider-icon";
import {
  UnbindDialog,
  UnbindErrorDialog,
  MessageDialog,
  type MessageDialogVariant,
  OauthPasswordHintDialog,
  PasswordDialog,
  PasswordSuccessDialog,
  DeleteAccountDialog,
  DeleteSuccessDialog,
  UsernameDialog,
} from "./profile-dialogs";
import { siteConfig } from "@/lib/config/config";
import { ImageCropDialog } from "@/components/dialogs/image-crop-dialog";
import type { ThemeMode, OAuthBindingInfo, PublicOAuthProvider, OAuthProvider } from "@/lib/base/types";
import { requestJson, postJson, putJson } from "@/lib/base/api";
import { OAUTH_PROVIDERS } from "@/lib/base/types";
import { TokenTab } from "./token-tab";

type ProfileTab = "profile" | "oauth" | "tokens";

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
  const [activeTab, setActiveTab] = useState<ProfileTab>("profile");

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
  const [showPassword, setShowPassword] = useState(false);
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
  const [oauthBusy, setOAuthBusy] = useState<string | null>(null);
  // 已启用的供应商（从公开 API 获取）
  const [enabledProviders, setEnabledProviders] = useState<PublicOAuthProvider[]>([]);

  // 解绑确认弹窗
  const [unbindDialogProvider, setUnbindDialogProvider] = useState<OAuthProvider | null>(null);

  // 用户名修改
  const [usernameDialogOpen, setUsernameDialogOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [usernameSaving, setUsernameSaving] = useState(false);

  // OAuth 用户未改用户名就改密码的提示弹窗
  const [oauthPasswordHintOpen, setOauthPasswordHintOpen] = useState(false);

  // 解绑失败提示（唯一登录方式等）
  const [unbindErrorOpen, setUnbindErrorOpen] = useState(false);
  const [unbindErrorMsg, setUnbindErrorMsg] = useState("");

  // 通用消息弹窗（替代 alert）
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [messageDialogTitle, setMessageDialogTitle] = useState("");
  const [messageDialogMsg, setMessageDialogMsg] = useState("");
  const [messageDialogVariant, setMessageDialogVariant] = useState<MessageDialogVariant>("warning");

  /** 显示消息弹窗 */
  function showMessage(title: string, message: string, variant: MessageDialogVariant = "warning") {
    setMessageDialogTitle(title);
    setMessageDialogMsg(message);
    setMessageDialogVariant(variant);
    setMessageDialogOpen(true);
  }

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

  // 处理 OAuth 绑定结果回调（URL 参数）
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthResult = params.get("oauth");
    if (oauthResult) {
      setActiveTab("oauth");
      window.history.replaceState({}, "", "/profile");
      if (oauthResult === "bound") {
        // 绑定成功：刷新绑定列表并显示成功弹窗
        requestJson<{ bindings: OAuthBindingInfo[] }>("/api/user/oauth-bind")
          .then((data) => setOauthBindings(data.bindings))
          .catch(() => {});
        showMessage("绑定成功", "第三方账号已成功绑定", "success");
      } else if (oauthResult === "conflict") {
        showMessage("绑定失败", "该第三方账号已绑定到其他用户，无法重复绑定", "error");
      }
    }
  }, []);

  // 加载用户资料 + OAuth 绑定 + 已启用供应商
  useEffect(() => {
    (async () => {
      try {
        const [data, oauthData, providersData] = await Promise.all([
          requestJson<UserProfile>("/api/user/profile"),
          requestJson<{ bindings: OAuthBindingInfo[] }>("/api/user/oauth-bind").catch(() => ({ bindings: [] })),
          requestJson<{ providers: PublicOAuthProvider[] }>("/api/auth/oauth-providers").catch(() => ({ providers: [] })),
        ]);
        setProfile(data);
        setOauthBindings(oauthData.bindings);
        setEnabledProviders(providersData.providers);
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
    isDark,
  };

  /** 已启用的供应商元数据（用于第三方账号 tab） */
  const enabledProviderMetas = OAUTH_PROVIDERS.filter((p) =>
    enabledProviders.some((ep) => ep.key === p.key),
  );

  /** 头像上传处理 */
  function handleAvatarFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showMessage("上传失败", "图片大小不能超过 5MB", "error");
      return;
    }
    const url = URL.createObjectURL(file);
    setCropSrc(url);
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
      showMessage("上传失败", err instanceof Error ? err.message : "头像上传失败", "error");
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
      showMessage("保存失败", err instanceof Error ? err.message : "保存失败", "error");
    } finally {
      setNicknameSaving(false);
    }
  }

  /** 点击修改密码 — OAuth 用户未改用户名时先提示 */
  function handlePasswordClick() {
    // OAuth 用户（没有密码）且未修改过用户名 → 先提示
    if (profile?.hasPassword === false && !profile.usernameChanged) {
      setOauthPasswordHintOpen(true);
      return;
    }
    setPasswordDialogOpen(true);
    setPasswordError("");
    setOldPassword("");
    setNewPassword("");
    setConfirmPasswordState("");
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
    if (!/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setPasswordError("密码需包含大写字母、小写字母和数字");
      return;
    }
    if (newPassword !== confirmPasswordState) {
      setPasswordError("两次输入的密码不一致");
      return;
    }
    setPasswordSaving(true);
    try {
      await requestJson("/api/user/password", putJson({
          oldPassword: needsOldPassword ? oldPassword : undefined,
          newPassword,
          confirmPassword: confirmPasswordState,
        }));
      setPasswordDialogOpen(false);
      setOldPassword("");
      setNewPassword("");
      setConfirmPasswordState("");
      setPasswordSuccess(true);
      setTimeout(() => {
        startTransition(async () => {
          await requestJson("/api/auth/logout", postJson({}));
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
      await requestJson("/api/auth/logout", postJson({}));
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
    setUnbindDialogProvider(null);
    showMessage("解绑成功", "第三方账号已成功解绑", "success");
  } catch (err) {
      setUnbindDialogProvider(null);
      setUnbindErrorMsg(err instanceof Error ? err.message : "解绑失败");
      setUnbindErrorOpen(true);
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
    if (newUsername.trim().length < 2 || newUsername.trim().length > 10) {
      setUsernameError("用户名长度需在 2-10 个字符之间");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(newUsername.trim())) {
      setUsernameError("用户名只能包含字母、数字和下划线");
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
      await requestJson("/api/user/delete-account", postJson({}));
      setDeleteDialogOpen(false);
      setDeleteSuccess(true);
      setTimeout(() => {
        window.location.href = "/";
      }, 3000);
    } catch (err) {
      showMessage("注销失败", err instanceof Error ? err.message : "注销失败", "error");
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

  /** Tab 按钮 */
  function TabButton({ tabKey, icon: TabIcon, label }: { tabKey: ProfileTab; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; label: string }) {
    const isActive = activeTab === tabKey;
    return (
      <button
        type="button"
        onClick={() => setActiveTab(tabKey)}
        className="flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200"
        style={{
          background: isActive ? (isDark ? "rgba(139,92,246,0.2)" : "rgba(139,92,246,0.12)") : "transparent",
          color: isActive ? "rgb(139,92,246)" : colors.mutedText,
        }}
      >
        <TabIcon className="h-4 w-4" />
        {label}
      </button>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <DynamicBackground />

      <div className="relative flex min-h-screen w-full items-center justify-center px-4 py-8">
        <div className="animate-panel-rise w-full max-w-lg">
          {/* Logo 和标题 */}
          <div className="mb-8 text-center">
            <Link
              href="/"
              className="mb-4 inline-block transition-transform duration-200 hover:scale-105"
              title="返回主页"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={siteConfig.logoSrc}
                alt={`${siteConfig.appName} logo`}
                className="h-12 w-12 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all duration-500"
                style={{ borderColor: colors.border, background: isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.85)" }}
              />
            </Link>
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
            {/* Tab 切换 — 始终显示（tokens Tab 始终可用） */}
            <div
              className="mb-6 flex rounded-xl border p-1 transition-all duration-300"
              style={{ borderColor: colors.border, background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" }}
            >
              <TabButton tabKey="profile" icon={User} label="个人资料" />
              {enabledProviderMetas.length > 0 && (
                <TabButton tabKey="oauth" icon={Shield} label="第三方账号" />
              )}
              <TabButton tabKey="tokens" icon={Key} label="访问令牌" />
            </div>

            {/* ===== 个人资料 Tab ===== */}
            {activeTab === "profile" ? (
              <>
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

                {/* 账号 */}
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
                    <p className="mt-1.5 text-xs" style={{ color: colors.mutedText }}>
                      账号名仅可修改一次，请谨慎操作
                    </p>
                  ) : null}
                </div>

                {/* 操作按钮 */}
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handlePasswordClick}
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
              </>
            ) : null}

            {/* ===== 第三方账号 Tab ===== */}
            {activeTab === "oauth" ? (
              <>
                {enabledProviderMetas.length > 0 ? (
                  <div className="space-y-2">
                    {enabledProviderMetas.map((p) => {
                      const binding = oauthBindings.find((b) => b.provider === p.key);
                      const isBusy = oauthBusy === p.key;
                      return (
                        <div
                          key={p.key}
                          className="flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition-all duration-300"
                          style={binding
                            ? { borderColor: isDark ? "rgba(16,185,129,0.25)" : "rgba(16,185,129,0.2)", background: isDark ? "rgba(16,185,129,0.08)" : "rgba(16,185,129,0.06)" }
                            : { borderColor: colors.border, background: colors.inputBg }}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className="flex h-8 w-8 items-center justify-center rounded-lg"
                              style={binding
                                ? { background: isDark ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.12)" }
                                : { background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }}
                            >
                              <OAuthProviderIcon providerKey={p.key} size={18} />
                            </span>
                            <div>
                              <span className={binding ? "font-medium" : ""} style={{ color: colors.primaryText }}>{p.label}</span>
                              {binding?.displayName ? (
                                <span style={{ color: isDark ? "rgba(16,185,129,0.8)" : "rgba(5,150,105,0.8)" }}> · {binding.displayName}</span>
                              ) : null}
                            </div>
                          </div>
                          {binding ? (
                            <button
                              type="button"
                              onClick={() => setUnbindDialogProvider(p.key)}
                              disabled={!!oauthBusy}
                              className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 px-2.5 py-1.5 text-xs font-medium text-rose-400 transition-all duration-200 hover:border-rose-500/60 hover:bg-rose-500/10 disabled:opacity-50"
                            >
                              {isBusy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Unlink className="h-3.5 w-3.5" />}
                              解绑
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleBindOAuth(p.key)}
                              className="flex items-center gap-1.5 rounded-lg border border-violet-500/30 px-2.5 py-1.5 text-xs font-medium transition-all duration-200 hover:border-violet-500/60 hover:bg-violet-500/10"
                              style={{ color: "rgb(139,92,246)" }}
                            >
                              <Link2 className="h-3.5 w-3.5" /> 绑定
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-sm" style={{ color: colors.mutedText }}>暂无可用的第三方登录服务</p>
                  </div>
                )}
              </>
            ) : null}

            {/* ===== 访问令牌 Tab ===== */}
            {activeTab === "tokens" ? (
              <TokenTab colors={colors} />
            ) : null}
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

      {/* 解绑确认弹窗 */}
      {unbindDialogProvider ? (
        <UnbindDialog
          provider={unbindDialogProvider}
          isBusy={oauthBusy === unbindDialogProvider}
          colors={colors}
          onConfirm={() => void handleUnbindOAuth(unbindDialogProvider)}
          onCancel={() => setUnbindDialogProvider(null)}
        />
      ) : null}

      {/* 解绑失败提示弹窗（唯一登录方式等） */}
      {unbindErrorOpen ? (
        <UnbindErrorDialog
          message={unbindErrorMsg}
          colors={colors}
          onSetPassword={() => {
            setUnbindErrorOpen(false);
            setPasswordDialogOpen(true);
            setPasswordError("");
            setOldPassword("");
            setNewPassword("");
            setConfirmPasswordState("");
          }}
          onClose={() => setUnbindErrorOpen(false)}
        />
      ) : null}

      {/* OAuth 用户未改用户名就改密码的提示弹窗 */}
      {oauthPasswordHintOpen ? (
        <OauthPasswordHintDialog
          colors={colors}
          onEditUsername={() => {
            setOauthPasswordHintOpen(false);
            setNewUsername(profile.username);
            setUsernameDialogOpen(true);
            setUsernameError("");
          }}
          onSetPassword={() => {
            setOauthPasswordHintOpen(false);
            setPasswordDialogOpen(true);
            setPasswordError("");
            setOldPassword("");
            setNewPassword("");
            setConfirmPasswordState("");
          }}
          onClose={() => setOauthPasswordHintOpen(false)}
        />
      ) : null}

      {/* 修改密码弹窗 */}
      {passwordDialogOpen ? (
        <PasswordDialog
          showPassword={showPassword}
          oldPassword={oldPassword}
          newPassword={newPassword}
          confirmPassword={confirmPasswordState}
          error={passwordError}
          saving={passwordSaving}
          hasPassword={profile?.hasPassword !== false}
          colors={colors}
          onToggleShowPassword={() => setShowPassword((v) => !v)}
          onOldPasswordChange={setOldPassword}
          onNewPasswordChange={setNewPassword}
          onConfirmPasswordChange={setConfirmPasswordState}
          onSubmit={() => void handlePasswordSubmit()}
          onClose={() => { setPasswordDialogOpen(false); setPasswordError(""); }}
        />
      ) : null}

      {/* 密码修改成功提示 */}
      {passwordSuccess ? <PasswordSuccessDialog colors={colors} /> : null}

      {/* 注销账号确认弹窗 */}
      {deleteDialogOpen ? (
        <DeleteAccountDialog
          confirmText={deleteConfirmText}
          confirmPhrase={DELETE_CONFIRM_PHRASE}
          submitting={deleteSubmitting}
          colors={colors}
          onConfirmTextChange={setDeleteConfirmText}
          onConfirm={() => void handleDeleteAccount()}
          onCancel={() => setDeleteDialogOpen(false)}
        />
      ) : null}

      {/* 注销成功提示 */}
      {deleteSuccess ? <DeleteSuccessDialog colors={colors} /> : null}

      {/* 用户名修改弹窗 */}
      {usernameDialogOpen ? (
        <UsernameDialog
          username={newUsername}
          error={usernameError}
          saving={usernameSaving}
          colors={colors}
          onUsernameChange={(v) => { setNewUsername(v); setUsernameError(""); }}
          onSubmit={() => void handleUsernameSave()}
          onClose={() => setUsernameDialogOpen(false)}
        />
      ) : null}

      {/* 通用消息弹窗（替代 alert） */}
      {messageDialogOpen ? (
        <MessageDialog
          title={messageDialogTitle}
          message={messageDialogMsg}
          variant={messageDialogVariant}
          colors={colors}
          onClose={() => setMessageDialogOpen(false)}
        />
      ) : null}
    </main>
  );
}
