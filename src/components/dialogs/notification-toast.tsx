/**
 * 通知提示组件
 * @description 显示成功/错误通知的 Toast 组件，支持自动消失和堆叠效果
 */

"use client";

import { useEffect } from "react";
import { CircleAlert, CircleCheckBig, Undo2, X } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import type { ThemeMode } from "@/lib/base/types";
import {
  getToastPanelClass,
  getToastIconClass,
  getToastTitleClass,
  getToastDescClass,
  getToastCountBadgeClass,
  getToastStackShadowClass,
  getToastCloseBtnClass,
  getToastUndoBtnClass,
} from "@/components/sakura-nav/style-helpers";

/**
 * Toast 状态类型
 */
export type ToastState = {
  id: number;
  title: string;
  description: string;
  tone: "success" | "error";
  durationMs: number;
  count: number;
  signature: string;
  /** 可选的撤销动作标签 */
  undoLabel?: string;
};

/**
 * 通知提示组件
 * @param toast - Toast 状态对象
 * @param themeMode - 当前主题模式
 * @param onClose - 关闭回调
 */
export function NotificationToast({
  toast,
  themeMode,
  onClose,
  onUndo,
}: {
  toast: ToastState;
  themeMode: ThemeMode;
  onClose: (toastId: number) => void;
  onUndo?: (toastId: number) => void;
}) {
  useEffect(() => {
    const timeoutId = window.setTimeout(() => onClose(toast.id), toast.durationMs);
    return () => window.clearTimeout(timeoutId);
  }, [onClose, toast.durationMs, toast.id]);

  const isLight = themeMode === "light";

  return (
    <div className="pointer-events-auto relative">
      {toast.count > 1 ? (
        <>
          <div className={getToastStackShadowClass(themeMode, toast.tone, 1)} />
          <div className={getToastStackShadowClass(themeMode, toast.tone, 2)} />
        </>
      ) : null}
      <div
        className={cn(
          getToastPanelClass(themeMode, toast.tone),
          toast.count > 1 ? "animate-toast-stack-pop" : "",
        )}
      >
        <div className="flex items-start gap-3">
          <span className={getToastIconClass(themeMode, toast.tone)}>
            {toast.tone === "success" ? (
              <CircleCheckBig className="h-5 w-5" />
            ) : (
              <CircleAlert className="h-5 w-5" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className={getToastTitleClass(themeMode, toast.tone)}>
                {toast.title}
              </p>
              {toast.count > 1 ? (
                <span className={getToastCountBadgeClass(themeMode)}>
                  x{toast.count}
                </span>
              ) : null}
            </div>
            <p className={getToastDescClass(themeMode)}>{toast.description}</p>
          </div>
          <div className="flex items-center gap-1">
            {toast.undoLabel && onUndo ? (
              <button
                type="button"
                onClick={() => onUndo(toast.id)}
                className={getToastUndoBtnClass(themeMode)}
                aria-label="撤销"
              >
                <Undo2 className="h-4 w-4" />
                <span className="text-xs font-medium">{toast.undoLabel}</span>
              </button>
            ) : null}
            <button
            type="button"
            onClick={() => onClose(toast.id)}
            className={getToastCloseBtnClass(themeMode)}
            aria-label="关闭通知"
          >
            <svg
              viewBox="0 0 44 44"
              className="pointer-events-none absolute inset-0 -rotate-90"
              aria-hidden="true"
            >
              <circle
                cx="22"
                cy="22"
                r="18"
                fill="none"
                stroke={isLight ? "rgba(100,116,139,0.16)" : "rgba(255,255,255,0.16)"}
                strokeWidth="2.5"
              />
              <circle
                cx="22"
                cy="22"
                r="18"
                fill="none"
                stroke={isLight ? "rgba(100,116,139,0.6)" : "rgba(255,255,255,0.92)"}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="113.1"
                strokeDashoffset="0"
                style={{ animation: `toast-ring-drain ${toast.durationMs}ms linear forwards` }}
              />
            </svg>
            <X className="relative z-10 h-4 w-4" />
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}
