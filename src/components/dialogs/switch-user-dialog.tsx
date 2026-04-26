/**
 * 切换用户弹窗组件
 * @description 展示可切换的用户列表，支持直接切换（免密码）和新增用户（内嵌登录表单）
 */

"use client";

import {
  Check,
  Eye,
  EyeOff,
  LoaderCircle,
  LogOut,
  Plus,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { FormEvent, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils/utils";
import { requestJson } from "@/lib/base/api";
import type { ThemeMode } from "@/lib/base/types";

// ── 类型定义 ──

/** 可切换用户的简要信息 */
export type SwitchableUser = {
  userId: string;
  username: string;
  nickname: string | null;
  avatarUrl: string | null;
  avatarColor: string | null;
};

type SwitchUserDialogProps = {
  open: boolean;
  themeMode: ThemeMode;
  /** 当前已登录的用户 ID */
  currentUserId: string;
  /** 已知用户列表（由父组件管理，localStorage 持久化） */
  users: SwitchableUser[];
  /** 注册是否开放 */
  registrationEnabled: boolean;
  /** 切换用户成功后的回调 */
  onSwitched: (user: {
    username: string;
    userId: string;
    role: string;
  }) => void;
  /** 删除用户回调 */
  onRemoveUser: (userId: string) => void;
  onClose: () => void;
};

// ── 子组件 ──

/** 用户头像（复用 app-header 中的逻辑） */
function AvatarItem({
  avatarUrl,
  avatarColor,
  displayName,
  size = "md",
}: {
  avatarUrl: string | null;
  avatarColor: string | null;
  displayName: string;
  size?: "sm" | "md" | "lg";
}) {
  const dimension =
    size === "lg" ? "h-16 w-16" : size === "md" ? "h-12 w-12" : "h-9 w-9";
  const fontSize =
    size === "lg" ? "text-xl" : size === "md" ? "text-base" : "text-sm";

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt="头像"
        className={cn(
          "rounded-full object-cover border-2 border-white/20",
          dimension,
        )}
      />
    );
  }

  const initial = displayName ? displayName.charAt(0).toUpperCase() : "?";
  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-bold text-white shrink-0",
        fontSize,
        dimension,
      )}
      style={{ background: avatarColor || "rgba(139,92,246,0.6)" }}
    >
      {initial}
    </div>
  );
}

// ── 主组件 ──

export function SwitchUserDialog({
  open,
  themeMode,
  currentUserId,
  users,
  registrationEnabled,
  onSwitched,
  onRemoveUser,
  onClose,
}: SwitchUserDialogProps) {
  const isDark = themeMode === "dark";

  // 状态：用户列表视图 / 登录视图
  const [view, setView] = useState<"list" | "login">("list");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [switchBusy, setSwitchBusy] = useState(false);

  // 删除确认状态
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // 登录表单状态
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginPending, startLoginTransition] = useTransition();

  // 每次打开弹窗时重置内部状态 — 通过 key 在 open 变化时重新创建组件
  if (!open) return null;

  // ── 颜色主题 ──
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
    inputBorder: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
  };

  /** 直接切换用户（免密码） */
  function handleSwitchUser() {
    if (!selectedUserId || selectedUserId === currentUserId || switchBusy) return;
    setSwitchBusy(true);

    fetch("/api/auth/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selectedUserId }),
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error ?? "切换用户失败");
        }
        const result = (await response.json()) as {
          ok: boolean;
          username: string;
          userId: string;
          role: string;
        };
        onSwitched({ username: result.username, userId: result.userId, role: result.role });
        onClose();
      })
      .catch((err) => {
        // 切换失败不做太多处理，简单 log
        console.error("切换用户失败:", err);
      })
      .finally(() => setSwitchBusy(false));
  }

  /** 确认删除用户 */
  function handleConfirmDelete() {
    if (!deleteTarget) return;
    onRemoveUser(deleteTarget);
    // 如果删除的是选中用户，清除选中状态
    if (selectedUserId === deleteTarget) {
      setSelectedUserId(null);
    }
    setDeleteTarget(null);
  }

  /** 登录并添加新用户 */
  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError("");

    startLoginTransition(async () => {
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: loginUsername,
            password: loginPassword,
            rememberMe: true,
          }),
          credentials: "include",
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          setLoginError(data?.error ?? "登录失败，请检查账号和密码。");
          return;
        }

        const result = (await response.json()) as {
          ok: boolean;
          username: string;
          role: string;
        };

        // 登录成功，获取完整用户信息
        const session = await requestJson<{
          userId: string;
          nickname: string | null;
          avatarUrl: string | null;
          avatarColor: string | null;
        }>("/api/auth/session");

        onSwitched({
          username: result.username,
          userId: session.userId,
          role: result.role,
        });
        onClose();
      } catch (err) {
        setLoginError(
          err instanceof Error ? err.message : "登录失败，请重试。",
        );
      }
    });
  }

  // ── 渲染 ──

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="animate-panel-rise w-full max-w-md rounded-3xl border shadow-2xl backdrop-blur-xl overflow-hidden"
        style={{
          borderColor: colors.border,
          background: colors.cardBg,
          maxHeight: "80vh",
        }}
      >
        {/* 标题栏 */}
        <div
          className={cn(
            "flex items-center justify-between px-6 py-4 border-b",
            isDark ? "border-white/8" : "border-slate-100",
          )}
        >
          <h3
            className="text-lg font-semibold"
            style={{ color: colors.primaryText }}
          >
            {view === "list" ? "切换用户" : "添加用户"}
          </h3>
          <div className="flex items-center gap-1">
            {view === "login" ? (
              <button
                type="button"
                onClick={() => {
                  setView("list");
                  setLoginError("");
                }}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-sm transition",
                  isDark ? "hover:bg-white/8" : "hover:bg-slate-100",
                )}
                style={{ color: colors.mutedText }}
              >
                返回
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 transition"
              style={{ color: colors.iconMuted }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 内容区 */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: "calc(80vh - 64px)" }}>
          {view === "list" ? (
            <UserListView
              colors={colors}
              isDark={isDark}
              currentUserId={currentUserId}
              users={users}
              selectedUserId={selectedUserId}
              deleteTarget={deleteTarget}
              onSelect={setSelectedUserId}
              onAddUser={() => {
                setLoginUsername("");
                setLoginPassword("");
                setLoginError("");
                setView("login");
              }}
              onSwitch={handleSwitchUser}
              switchBusy={switchBusy}
              onDeleteRequest={setDeleteTarget}
              onDeleteConfirm={handleConfirmDelete}
              onDeleteCancel={() => setDeleteTarget(null)}
            />
          ) : (
            <LoginView
              colors={colors}
              isDark={isDark}
              loginUsername={loginUsername}
              loginPassword={loginPassword}
              showPassword={showPassword}
              loginError={loginError}
              loginPending={loginPending}
              registrationEnabled={registrationEnabled}
              onUsernameChange={setLoginUsername}
              onPasswordChange={setLoginPassword}
              onTogglePassword={() => setShowPassword((v) => !v)}
              onSubmit={handleLogin}
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── 用户列表视图 ──

function UserListView({
  colors,
  isDark,
  currentUserId,
  users,
  selectedUserId,
  deleteTarget,
  onSelect,
  onAddUser,
  onSwitch,
  switchBusy,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
}: {
  colors: Record<string, string>;
  isDark: boolean;
  currentUserId: string;
  users: SwitchableUser[];
  selectedUserId: string | null;
  deleteTarget: string | null;
  onSelect: (id: string | null) => void;
  onAddUser: () => void;
  onSwitch: () => void;
  switchBusy: boolean;
  onDeleteRequest: (id: string | null) => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}) {
  // 当前用户始终排在第一位
  const sortedUsers = [...users].sort((a, b) => {
    if (a.userId === currentUserId) return -1;
    if (b.userId === currentUserId) return 1;
    return 0;
  });

  // 删除确认目标用户
  const deleteTargetUser = deleteTarget
    ? users.find((u) => u.userId === deleteTarget)
    : null;

  return (
    <div>
      {/* 顶部添加按钮 */}
      <div className="flex justify-center mb-5">
        <button
          type="button"
          onClick={onAddUser}
          title="添加用户"
          className={cn(
            "h-14 w-14 rounded-full flex items-center justify-center transition-all duration-200 border-2",
            isDark
              ? "border-white/40 hover:border-violet-400 hover:bg-violet-500/10"
              : "border-slate-400 hover:border-violet-500 hover:bg-violet-50",
          )}
          style={{ color: colors.mutedText }}
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {/* 用户网格 */}
      <div className="flex flex-wrap justify-center gap-4">
        {sortedUsers.map((user) => {
          const isSelected = selectedUserId === user.userId;
          const displayNickname = user.nickname || user.username;

          return (
            <button
              key={user.userId}
              type="button"
              onClick={() => onSelect(user.userId)}
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-2xl transition-all duration-200 w-[90px] relative",
                isSelected
                  ? isDark
                    ? "bg-violet-500/20 ring-2 ring-violet-400/50"
                    : "bg-violet-50 ring-2 ring-violet-400/50"
                  : isDark
                    ? "hover:bg-white/5"
                    : "hover:bg-slate-50",
              )}
            >
              {/* 删除按钮 — 头像上方，不遮挡当前已登录用户 */}
              {user.userId !== currentUserId && (
                <div
                  className="absolute -top-1 -right-1 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteRequest(user.userId);
                  }}
                >
                  <div
                    className={cn(
                      "h-5 w-5 rounded-full flex items-center justify-center transition-all duration-150",
                      isDark
                        ? "bg-white/10 hover:bg-red-500/80"
                        : "bg-slate-200 hover:bg-red-500",
                    )}
                    style={isDark ? undefined : undefined}
                  >
                    <Trash2 className="h-3 w-3" style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(100,100,100,0.7)" }} />
                  </div>
                </div>
              )}

              {/* 头像 */}
              <div className="relative">
                <AvatarItem
                  avatarUrl={user.avatarUrl}
                  avatarColor={user.avatarColor}
                  displayName={displayNickname}
                  size="md"
                />
                {/* 选中打勾（仅在选中时显示） */}
                {isSelected && (
                  <div
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full flex items-center justify-center",
                      isDark ? "bg-violet-500" : "bg-violet-600",
                    )}
                  >
                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
                  </div>
                )}
              </div>

              {/* 昵称和用户名 */}
              <div className="text-center min-w-0 w-full">
                <p
                  className={cn(
                    "text-xs truncate w-full",
                    isSelected && "font-bold",
                  )}
                  style={{
                    color: isSelected
                      ? "rgb(139,92,246)"
                      : colors.primaryText,
                  }}
                >
                  {displayNickname}
                </p>
                <p
                  className="text-[10px] truncate w-full"
                  style={{ color: colors.subtleText }}
                >
                  {user.username}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* 删除确认浮层 */}
      {deleteTarget && deleteTargetUser ? (
        <div
          className="mt-4 rounded-2xl border p-4"
          style={{
            borderColor: "rgba(244,63,94,0.3)",
            background: isDark ? "rgba(244,63,94,0.1)" : "rgba(244,63,94,0.06)",
          }}
        >
          <p className="text-sm mb-1" style={{ color: colors.primaryText }}>
            移除「{deleteTargetUser.nickname || deleteTargetUser.username}」
          </p>
          <p className="text-xs mb-3" style={{ color: colors.mutedText }}>
            移除后，再次登录该用户时需要重新输入账号和密码
          </p>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onDeleteCancel}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-medium transition",
                isDark ? "hover:bg-white/8" : "hover:bg-slate-100",
              )}
              style={{ color: colors.mutedText }}
            >
              取消
            </button>
            <button
              type="button"
              onClick={onDeleteConfirm}
              className="rounded-xl px-3 py-1.5 text-xs font-medium bg-red-500/90 text-white transition hover:bg-red-600"
            >
              确认移除
            </button>
          </div>
        </div>
      ) : null}

      {/* 底部操作按钮 */}
      <div className="mt-6">
        <button
          type="button"
          onClick={onSwitch}
          disabled={
            !selectedUserId ||
            selectedUserId === currentUserId ||
            switchBusy
          }
          className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:from-violet-700 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {switchBusy ? (
            <span className="flex items-center justify-center gap-2">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              切换中...
            </span>
          ) : !selectedUserId ? (
            <span className="flex items-center justify-center gap-2">
              <LogOut className="h-4 w-4" />
              请先选择要切换的用户
            </span>
          ) : selectedUserId === currentUserId ? (
            <span className="flex items-center justify-center gap-2">
              <LogOut className="h-4 w-4" />
              当前已是该用户
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <LogOut className="h-4 w-4" />
              立即切换
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

// ── 登录视图 ──

function LoginView({
  colors,
  isDark,
  loginUsername,
  loginPassword,
  showPassword,
  loginError,
  loginPending,
  registrationEnabled,
  onUsernameChange,
  onPasswordChange,
  onTogglePassword,
  onSubmit,
}: {
  colors: Record<string, string>;
  isDark: boolean;
  loginUsername: string;
  loginPassword: string;
  showPassword: boolean;
  loginError: string;
  loginPending: boolean;
  registrationEnabled: boolean;
  onUsernameChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onTogglePassword: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div>
      <div className="mb-5 text-center">
        <p className="text-sm" style={{ color: colors.mutedText }}>
          输入账号密码来添加并切换到其他用户
        </p>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        {/* 账号 */}
        <div>
          <label
            className="mb-1.5 block text-sm font-medium"
            style={{ color: colors.secondaryText }}
          >
            账号
          </label>
          <div className="relative">
            <UserRound
              className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: colors.iconMuted }}
            />
            <input
              className="w-full rounded-xl border px-4 py-2.5 pl-10 text-sm outline-none transition"
              style={{
                borderColor: colors.inputBorder,
                background: colors.inputBg,
                color: colors.primaryText,
              }}
              value={loginUsername}
              onChange={(e) => onUsernameChange(e.target.value)}
              placeholder="请输入账号"
              autoFocus
            />
          </div>
        </div>

        {/* 密码 */}
        <div>
          <label
            className="mb-1.5 block text-sm font-medium"
            style={{ color: colors.secondaryText }}
          >
            密码
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              className="w-full rounded-xl border px-4 py-2.5 pr-10 text-sm outline-none transition [::-ms-reveal]:hidden [::-ms-clear]:hidden"
              style={{
                borderColor: colors.inputBorder,
                background: colors.inputBg,
                color: colors.primaryText,
              }}
              value={loginPassword}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder="请输入密码"
            />
            <button
              type="button"
              onClick={onTogglePassword}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
              style={{ color: colors.iconMuted }}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* 错误信息 */}
        {loginError ? (
          <p
            className="rounded-xl border px-3.5 py-2.5 text-sm"
            style={{
              borderColor: "rgba(244,63,94,0.4)",
              background: isDark
                ? "rgba(244,63,94,0.15)"
                : "rgba(244,63,94,0.1)",
              color: "#fca5a5",
            }}
          >
            {loginError}
          </p>
        ) : null}

        {/* 登录按钮 */}
        <button
          type="submit"
          disabled={loginPending}
          className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:from-violet-700 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loginPending ? (
            <span className="flex items-center justify-center gap-2">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              登录中
            </span>
          ) : (
            "登录并切换"
          )}
        </button>
      </form>

      {/* 注册提示 */}
      {registrationEnabled ? (
        <div className="mt-4 text-center">
          <p className="text-xs" style={{ color: colors.subtleText }}>
            没有账号？{" "}
            <a
              href="/register-switch"
              target="_blank"
              rel="noopener noreferrer"
              className="underline transition-colors hover:text-violet-400"
              style={{ color: colors.mutedText }}
            >
              去注册新用户
            </a>
            <br />
            注册成功后可在此添加
          </p>
        </div>
      ) : null}
    </div>
  );
}
