/**
 * 会话失效弹窗
 * @description 当用户登录态失效（被删除、会话过期等）时弹出的独立确认弹窗
 */

"use client";

import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import type { ThemeMode } from "@/lib/base/types";
import {
  getDialogOverlayClass,
  getDialogPanelClass,
  getDialogSubtleClass,
} from "@/components/sakura-nav/style-helpers";

type SessionExpiredDialogProps = {
  open: boolean;
  themeMode: ThemeMode;
  /** 标题，默认"登录状态已失效" */
  title?: string;
  /** 描述文字 */
  message: string;
  /** 确认按钮文字，默认"确认" */
  confirmLabel?: string;
  onConfirm: () => void;
};

export function SessionExpiredDialog({
  open,
  themeMode,
  title = "登录状态已失效",
  message,
  confirmLabel = "确认",
  onConfirm,
}: SessionExpiredDialogProps) {
  if (!open) return null;
  const isDark = themeMode === "dark";

  return (
    <div
      className={cn(
        getDialogOverlayClass(themeMode),
        "animate-drawer-fade fixed inset-0 z-[10001] flex items-end justify-center p-4 sm:items-center",
      )}
    >
      <div
        className={cn(
          getDialogPanelClass(themeMode),
          "animate-panel-rise w-full max-w-[420px] overflow-hidden rounded-[30px] border",
        )}
      >
        {/* 图标 */}
        <div className="flex items-center justify-center pt-8 pb-2">
          <div
            className={cn(
              "flex h-16 w-16 items-center justify-center rounded-full",
              isDark ? "bg-amber-500/15" : "bg-amber-100",
            )}
          >
            <AlertTriangle
              className={cn("h-8 w-8", isDark ? "text-amber-400" : "text-amber-500")}
              strokeWidth={1.5}
            />
          </div>
        </div>

        {/* 内容 */}
        <div className="px-6 pb-3 text-center">
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className={cn("mt-2 text-sm leading-relaxed", getDialogSubtleClass(themeMode))}>
            {message}
          </p>
        </div>

        {/* 确认按钮 */}
        <div className="px-6 pb-6 pt-3">
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              "inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition",
              isDark
                ? "bg-amber-500/80 text-white hover:bg-amber-400/90"
                : "bg-amber-500 text-white hover:bg-amber-600",
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
