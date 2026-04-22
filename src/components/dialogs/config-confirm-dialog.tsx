/**
 * 配置确认对话框组件
 * @description 用于配置导入、导出、恢复默认等敏感操作的密码确认
 */

"use client";

import { LoaderCircle, X } from "lucide-react";
import type { ThemeMode } from "@/lib/base/types";
import { cn } from "@/lib/utils/utils";
import {
  getDialogOverlayClass,
  getDialogPanelClass,
  getDialogDividerClass,
  getDialogSubtleClass,
  getDialogCloseBtnClass,
  getDialogInputClass,
  getDialogSectionClass,
  getDialogPrimaryBtnClass,
  getDialogSecondaryBtnClass,
} from "../sakura-nav/style-helpers";

/**
 * 配置确认操作类型
 */
export type ConfigConfirmAction = "reset";

/**
 * 配置操作标签映射
 */
export const configActionLabels: Record<ConfigConfirmAction, string> = {
  reset: "恢复默认",
};

/**
 * 配置确认对话框组件
 * @param action - 操作类型
 * @param password - 密码值
 * @param error - 错误信息
 * @param busy - 是否正在处理
 * @param onPasswordChange - 密码变更回调
 * @param onClose - 关闭回调
 * @param onSubmit - 提交回调
 */
export function ConfigConfirmDialog({
  action,
  password,
  error,
  busy,
  onPasswordChange,
  onClose,
  onSubmit,
  themeMode,
}: {
  action: ConfigConfirmAction;
  password: string;
  error: string;
  busy: boolean;
  onPasswordChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  themeMode: ThemeMode;
}) {
  const title = configActionLabels[action];

  return (
    <div className={cn(getDialogOverlayClass(themeMode), "animate-drawer-fade fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center")}>
      <div className={cn(getDialogPanelClass(themeMode), "animate-panel-rise w-full max-w-[460px] overflow-hidden rounded-[30px] border")}>
        <div className={cn("flex items-center justify-between border-b px-6 py-5", getDialogDividerClass(themeMode))}>
          <div>
            <p className={cn("text-xs uppercase tracking-[0.28em]", getDialogSubtleClass(themeMode))}>Password Check</p>
            <h2 className="mt-1 text-2xl font-semibold">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className={cn(getDialogCloseBtnClass(themeMode), "inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition disabled:cursor-not-allowed disabled:opacity-55")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div className={cn(getDialogSectionClass(themeMode), "rounded-[24px] border px-4 py-4 text-sm leading-7", getDialogSubtleClass(themeMode))}>
            请输入当前账号密码，以确认{title}。密码会以密文方式输入，本次只用于当前操作校验。
          </div>

          <label className="grid gap-2 text-sm">
            <span className={themeMode === "light" ? "text-slate-700" : "text-white/78"}>确认密码</span>
            <input
              autoFocus
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onSubmit();
                }
              }}
              placeholder="请输入当前账号密码"
              className={cn(getDialogInputClass(themeMode), "rounded-2xl px-4 py-3 outline-none transition focus:border-sky-300/55")}
            />
          </label>

          {error ? (
            <div className={cn(
              "rounded-2xl border px-4 py-3 text-sm",
              themeMode === "light"
                ? "border-red-200/60 bg-red-50 text-red-600"
                : "border-rose-300/20 bg-rose-400/10 text-rose-100",
            )}>
              {error}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className={cn(getDialogSecondaryBtnClass(themeMode), "inline-flex items-center justify-center rounded-2xl border px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-55")}
            >
              取消
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={busy}
              className={cn(getDialogPrimaryBtnClass(themeMode), "inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60")}
            >
              {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              确认并继续
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
