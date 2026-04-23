/**
 * 配置确认对话框组件
 * @description 用于恢复默认等敏感操作的二次确认
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
 */
export function ConfigConfirmDialog({
  action,
  error,
  busy,
  onClose,
  onSubmit,
  themeMode,
}: {
  action: ConfigConfirmAction;
  error: string;
  busy: boolean;
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
            <p className={cn("text-xs uppercase tracking-[0.28em]", getDialogSubtleClass(themeMode))}>Confirm</p>
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
            确定要{title}吗？此操作将清除您的所有个人数据（标签、网站、外观配置），且不可恢复。
          </div>

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
