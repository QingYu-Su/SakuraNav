/**
 * 个人空间弹窗组件集合
 * @description 包含修改密码、解绑确认、OAuth 密码提示、注销确认、用户名修改等弹窗
 */

"use client";

import { Eye, EyeOff, LoaderCircle, X, AlertTriangle, Check, KeyRound } from "lucide-react";
import type { OAuthProvider } from "@/lib/base/types";
import { OAUTH_PROVIDERS } from "@/lib/base/types";

/* ==================== 通用样式 ==================== */

type DialogColors = {
  primaryText: string;
  secondaryText: string;
  border: string;
  cardBg: string;
  inputBg: string;
  iconMuted: string;
  mutedText: string;
  faintText: string;
  subtleText: string;
  isDark: boolean;
};

/* ==================== 解绑确认弹窗 ==================== */

export function UnbindDialog({
  provider,
  isBusy,
  colors,
  onConfirm,
  onCancel,
}: {
  provider: OAuthProvider;
  isBusy: boolean;
  colors: DialogColors;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const providerLabel = OAUTH_PROVIDERS.find((p) => p.key === provider)?.label ?? provider;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40">
      <div
        className="animate-panel-rise w-full max-w-sm rounded-3xl border p-6 shadow-2xl backdrop-blur-xl"
        style={{ borderColor: colors.border, background: colors.cardBg }}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold" style={{ color: colors.primaryText }}>确认解绑</h3>
          <button type="button" onClick={onCancel} className="rounded-xl p-2 transition" style={{ color: colors.iconMuted }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 rounded-2xl border px-4 py-3 text-sm font-medium" style={{ borderColor: "rgba(234,179,8,0.6)", background: colors.isDark ? "rgba(234,179,8,0.3)" : "rgba(234,179,8,0.2)", color: colors.isDark ? "#fbbf24" : "#92400e" }}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            解绑后将无法通过 {providerLabel} 登录此账号。确定要继续吗？
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-2xl border px-4 py-3 text-sm font-medium transition-all duration-300"
            style={{ borderColor: colors.border, color: colors.primaryText, background: colors.inputBg }}
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isBusy}
            className="flex-1 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:from-red-700 hover:to-rose-700 disabled:opacity-40"
          >
            {isBusy ? (
              <span className="flex items-center justify-center gap-2">
                <LoaderCircle className="h-4 w-4 animate-spin" /> 解绑中...
              </span>
            ) : "确认解绑"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ==================== OAuth 用户未改用户名就改密码提示弹窗 ==================== */

export function OauthPasswordHintDialog({
  colors,
  onEditUsername,
  onSetPassword,
  onClose,
}: {
  colors: DialogColors;
  onEditUsername: () => void;
  onSetPassword: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40">
      <div
        className="animate-panel-rise w-full max-w-sm rounded-3xl border p-6 shadow-2xl backdrop-blur-xl"
        style={{ borderColor: colors.border, background: colors.cardBg }}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold" style={{ color: colors.primaryText }}>温馨提示</h3>
          <button type="button" onClick={onClose} className="rounded-xl p-2 transition" style={{ color: colors.iconMuted }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 rounded-2xl border px-4 py-3 text-sm font-medium" style={{ borderColor: "rgba(234,179,8,0.6)", background: colors.isDark ? "rgba(234,179,8,0.3)" : "rgba(234,179,8,0.2)", color: colors.isDark ? "#fbbf24" : "#92400e" }}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            您是通过第三方登录创建的账号，建议先修改账号名，再设置密码。设置密码后需重新登录，届时将使用新账号名和密码登录。
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onEditUsername}
            className="flex-1 rounded-2xl border px-4 py-3 text-sm font-medium transition-all duration-300"
            style={{ borderColor: colors.border, color: colors.primaryText, background: colors.inputBg }}
          >
            先改账号名
          </button>
          <button
            type="button"
            onClick={onSetPassword}
            className="flex-1 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300"
          >
            直接设密码
          </button>
        </div>
      </div>
    </div>
  );
}

/* ==================== 修改密码弹窗 ==================== */

export function PasswordDialog({
  showPassword,
  oldPassword,
  newPassword,
  confirmPassword,
  error,
  saving,
  hasPassword,
  colors,
  onToggleShowPassword,
  onOldPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
  onClose,
}: {
  showPassword: boolean;
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
  error: string;
  saving: boolean;
  hasPassword: boolean;
  colors: DialogColors;
  onToggleShowPassword: () => void;
  onOldPasswordChange: (v: string) => void;
  onNewPasswordChange: (v: string) => void;
  onConfirmPasswordChange: (v: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40">
      <div
        className="animate-panel-rise w-full max-w-sm rounded-3xl border p-6 shadow-2xl backdrop-blur-xl"
        style={{ borderColor: colors.border, background: colors.cardBg }}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold" style={{ color: colors.primaryText }}>修改密码</h3>
          <button type="button" onClick={onClose} className="rounded-xl p-2 transition" style={{ color: colors.iconMuted }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* OAuth 用户未设置密码：不显示旧密码，显示提示 */}
          {!hasPassword ? (
            <div className="rounded-xl border px-3.5 py-2.5 text-sm font-medium" style={{ borderColor: "rgba(139,92,246,0.5)", background: colors.isDark ? "rgba(139,92,246,0.2)" : "rgba(139,92,246,0.15)", color: colors.isDark ? "#c4b5fd" : "#6d28d9" }}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                您是通过第三方登录创建的账号，首次设置密码无需输入旧密码。
              </div>
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: colors.secondaryText }}>旧密码</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={oldPassword}
                  onChange={(e) => onOldPasswordChange(e.target.value)}
                  className="w-full rounded-xl border px-3.5 py-2.5 pr-10 text-sm outline-none transition [::-ms-reveal]:hidden [::-ms-clear]:hidden"
                  style={{ borderColor: colors.border, background: colors.inputBg, color: colors.primaryText }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={onToggleShowPassword}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 transition"
                  style={{ color: colors.iconMuted }}
                  aria-label={showPassword ? "隐藏密码" : "显示密码"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: colors.secondaryText }}>新密码</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => onNewPasswordChange(e.target.value)}
                className="w-full rounded-xl border px-3.5 py-2.5 pr-10 text-sm outline-none transition [::-ms-reveal]:hidden [::-ms-clear]:hidden"
                style={{ borderColor: colors.border, background: colors.inputBg, color: colors.primaryText }}
                placeholder="至少 6 位，需含大小写字母和数字"
                autoFocus={!hasPassword}
              />
              <button
                type="button"
                onClick={onToggleShowPassword}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 transition"
                style={{ color: colors.iconMuted }}
                aria-label={showPassword ? "隐藏密码" : "显示密码"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: colors.secondaryText }}>确认密码</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => onConfirmPasswordChange(e.target.value)}
                className="w-full rounded-xl border px-3.5 py-2.5 pr-10 text-sm outline-none transition [::-ms-reveal]:hidden [::-ms-clear]:hidden"
                style={{ borderColor: colors.border, background: colors.inputBg, color: colors.primaryText }}
                onKeyDown={(e) => { if (e.key === "Enter") onSubmit(); }}
              />
              <button
                type="button"
                onClick={onToggleShowPassword}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 transition"
                style={{ color: colors.iconMuted }}
                aria-label={showPassword ? "隐藏密码" : "显示密码"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error ? (
            <p className="rounded-xl border px-3.5 py-2.5 text-sm" style={{ borderColor: "rgba(239,68,68,0.5)", background: colors.isDark ? "rgba(239,68,68,0.2)" : "rgba(239,68,68,0.12)", color: colors.isDark ? "#f87171" : "#b91c1c" }}>
              {error}
            </p>
          ) : null}

          <button
            type="button"
            onClick={onSubmit}
            disabled={saving}
            className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:from-violet-700 hover:to-purple-700 disabled:opacity-50"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <LoaderCircle className="h-4 w-4 animate-spin" /> 处理中...
              </span>
            ) : "确认修改"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ==================== 密码修改成功提示 ==================== */

export function PasswordSuccessDialog({ colors }: { colors: DialogColors }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/40">
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
  );
}

/* ==================== 注销账号确认弹窗 ==================== */

export function DeleteAccountDialog({
  confirmText,
  confirmPhrase,
  submitting,
  colors,
  onConfirmTextChange,
  onConfirm,
  onCancel,
}: {
  confirmText: string;
  confirmPhrase: string;
  submitting: boolean;
  colors: DialogColors;
  onConfirmTextChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40">
      <div
        className="animate-panel-rise w-full max-w-sm rounded-3xl border p-6 shadow-2xl backdrop-blur-xl"
        style={{ borderColor: colors.border, background: colors.cardBg }}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold" style={{ color: colors.primaryText }}>注销账号</h3>
          <button type="button" onClick={onCancel} className="rounded-xl p-2 transition" style={{ color: colors.iconMuted }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: "rgba(239,68,68,0.5)", background: colors.isDark ? "rgba(239,68,68,0.2)" : "rgba(239,68,68,0.12)", color: colors.isDark ? "#f87171" : "#b91c1c" }}>
          此操作不可撤销！注销后，你的所有数据（标签、站点、外观配置、上传资源）将被永久删除。
        </div>

        <p className="mb-2 text-sm" style={{ color: colors.secondaryText }}>
          请输入 <span className="font-semibold text-red-400">&quot;{confirmPhrase}&quot;</span> 以确认注销：
        </p>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => onConfirmTextChange(e.target.value)}
          className="w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition"
          style={{ borderColor: colors.border, background: colors.inputBg, color: colors.primaryText }}
          autoFocus
          placeholder={confirmPhrase}
        />

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-2xl border px-4 py-3 text-sm font-medium transition-all duration-300"
            style={{ borderColor: colors.border, color: colors.primaryText, background: colors.inputBg }}
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmText !== confirmPhrase || submitting}
            className="flex-1 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:from-red-700 hover:to-rose-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <LoaderCircle className="h-4 w-4 animate-spin" /> 注销中...
              </span>
            ) : "确认注销"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ==================== 注销成功提示 ==================== */

export function DeleteSuccessDialog({ colors }: { colors: DialogColors }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/40">
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
  );
}

/* ==================== 用户名修改弹窗 ==================== */

export function UsernameDialog({
  username,
  error,
  saving,
  colors,
  onUsernameChange,
  onSubmit,
  onClose,
}: {
  username: string;
  error: string;
  saving: boolean;
  colors: DialogColors;
  onUsernameChange: (v: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40">
      <div
        className="animate-panel-rise w-full max-w-sm rounded-3xl border p-6 shadow-2xl backdrop-blur-xl"
        style={{ borderColor: colors.border, background: colors.cardBg }}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold" style={{ color: colors.primaryText }}>修改账号名</h3>
          <button type="button" onClick={onClose} className="rounded-xl p-2 transition" style={{ color: colors.iconMuted }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-xl border px-3.5 py-2.5 text-sm font-medium mb-4" style={{ borderColor: "rgba(234,179,8,0.6)", background: colors.isDark ? "rgba(234,179,8,0.3)" : "rgba(234,179,8,0.2)", color: colors.isDark ? "#fbbf24" : "#92400e" }}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            账号名仅可修改一次，修改后无法撤销。
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium" style={{ color: colors.secondaryText }}>新账号名</label>
          <input
            type="text"
            value={username}
            onChange={(e) => { onUsernameChange(e.target.value); }}
            className="w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition"
            style={{ borderColor: colors.border, background: colors.inputBg, color: colors.primaryText }}
            minLength={2}
            maxLength={10}
            autoFocus
            placeholder="字母、数字或下划线，2-10 个字符"
            onKeyDown={(e) => { if (e.key === "Enter") onSubmit(); }}
          />
        </div>

        {error ? (
          <p className="mt-2 rounded-xl border px-3.5 py-2.5 text-sm" style={{ borderColor: "rgba(239,68,68,0.5)", background: colors.isDark ? "rgba(239,68,68,0.2)" : "rgba(239,68,68,0.12)", color: colors.isDark ? "#f87171" : "#b91c1c" }}>
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl border px-4 py-3 text-sm font-medium transition-all duration-300"
            style={{ borderColor: colors.border, color: colors.primaryText, background: colors.inputBg }}
          >
            取消
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={saving || !username.trim()}
            className="flex-1 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300 disabled:opacity-50"
          >
            {saving ? <LoaderCircle className="h-4 w-4 animate-spin mx-auto" /> : "确认修改"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ==================== 通用消息弹窗（替代 alert） ==================== */

export type MessageDialogVariant = "success" | "warning" | "error";

export function MessageDialog({
  title,
  message,
  variant = "warning",
  colors,
  onClose,
}: {
  title: string;
  message: string;
  variant?: MessageDialogVariant;
  colors: DialogColors;
  onClose: () => void;
}) {
  const styles: Record<MessageDialogVariant, { border: string; bg: string; color: string; icon: React.ReactNode }> = {
    success: {
      border: "rgba(16,185,129,0.6)",
      bg: colors.isDark ? "rgba(16,185,129,0.25)" : "rgba(16,185,129,0.18)",
      color: colors.isDark ? "#34d399" : "#047857",
      icon: <Check className="h-4 w-4 shrink-0" />,
    },
    warning: {
      border: "rgba(234,179,8,0.6)",
      bg: colors.isDark ? "rgba(234,179,8,0.3)" : "rgba(234,179,8,0.2)",
      color: colors.isDark ? "#fbbf24" : "#92400e",
      icon: <AlertTriangle className="h-4 w-4 shrink-0" />,
    },
    error: {
      border: "rgba(239,68,68,0.5)",
      bg: colors.isDark ? "rgba(239,68,68,0.2)" : "rgba(239,68,68,0.12)",
      color: colors.isDark ? "#f87171" : "#b91c1c",
      icon: <AlertTriangle className="h-4 w-4 shrink-0" />,
    },
  };
  const s = styles[variant];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40">
      <div
        className="animate-panel-rise w-full max-w-sm rounded-3xl border p-6 shadow-2xl backdrop-blur-xl"
        style={{ borderColor: colors.border, background: colors.cardBg }}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold" style={{ color: colors.primaryText }}>{title}</h3>
          <button type="button" onClick={onClose} className="rounded-xl p-2 transition" style={{ color: colors.iconMuted }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-5 rounded-2xl border px-4 py-3 text-sm font-medium" style={{ borderColor: s.border, background: s.bg, color: s.color }}>
          <div className="flex items-center gap-2">
            {s.icon}
            {message}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300"
        >
          知道了
        </button>
      </div>
    </div>
  );
}

/* ==================== 解绑错误提示弹窗（唯一登录方式等） ==================== */

export function UnbindErrorDialog({
  message,
  colors,
  onSetPassword,
  onClose,
}: {
  message: string;
  colors: DialogColors;
  onSetPassword: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40">
      <div
        className="animate-panel-rise w-full max-w-sm rounded-3xl border p-6 shadow-2xl backdrop-blur-xl"
        style={{ borderColor: colors.border, background: colors.cardBg }}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold" style={{ color: colors.primaryText }}>无法解绑</h3>
          <button type="button" onClick={onClose} className="rounded-xl p-2 transition" style={{ color: colors.iconMuted }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 rounded-2xl border px-4 py-3 text-sm font-medium" style={{ borderColor: "rgba(234,179,8,0.6)", background: colors.isDark ? "rgba(234,179,8,0.3)" : "rgba(234,179,8,0.2)", color: colors.isDark ? "#fbbf24" : "#92400e" }}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {message}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl border px-4 py-3 text-sm font-medium transition-all duration-300"
            style={{ borderColor: colors.border, color: colors.primaryText, background: colors.inputBg }}
          >
            知道了
          </button>
          <button
            type="button"
            onClick={onSetPassword}
            className="flex-1 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
          >
            <KeyRound className="h-4 w-4" /> 去设密码
          </button>
        </div>
      </div>
    </div>
  );
}
