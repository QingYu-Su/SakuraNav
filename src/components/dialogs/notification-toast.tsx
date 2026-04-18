/**
 * 通知提示组件
 * @description 显示成功/错误通知的 Toast 组件，支持自动消失和堆叠效果
 */

"use client";

import { useEffect } from "react";
import { CircleAlert, CircleCheckBig, X } from "lucide-react";
import { cn } from "@/lib/utils/utils";

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
};

/**
 * 通知提示组件
 * @param toast - Toast 状态对象
 * @param onClose - 关闭回调
 */
export function NotificationToast({
  toast,
  onClose,
}: {
  toast: ToastState;
  onClose: (toastId: number) => void;
}) {
  useEffect(() => {
    const timeoutId = window.setTimeout(() => onClose(toast.id), toast.durationMs);
    return () => window.clearTimeout(timeoutId);
  }, [onClose, toast.durationMs, toast.id]);

  return (
    <div className="pointer-events-auto relative">
      {toast.count > 1 ? (
        <>
          <div
            className={cn(
              "animate-toast-stack-shadow absolute inset-x-4 top-3 h-full rounded-[24px] border opacity-55",
              toast.tone === "success"
                ? "border-emerald-200/16 bg-emerald-400/8"
                : "border-rose-200/16 bg-rose-400/8",
            )}
          />
          <div
            className={cn(
              "animate-toast-stack-shadow absolute inset-x-2 top-1.5 h-full rounded-[25px] border opacity-72",
              toast.tone === "success"
                ? "border-emerald-200/18 bg-emerald-400/10"
                : "border-rose-200/18 bg-rose-400/10",
            )}
          />
        </>
      ) : null}
      <div
        className={cn(
          "animate-drawer-slide relative rounded-[26px] border px-5 py-4 text-white shadow-[0_24px_80px_rgba(15,23,42,0.28)] backdrop-blur-xl",
          toast.count > 1 ? "animate-toast-stack-pop" : "",
          toast.tone === "success"
            ? "border-emerald-200/24 bg-[linear-gradient(135deg,rgba(16,185,129,0.2),rgba(15,23,42,0.92))]"
            : "border-rose-200/24 bg-[linear-gradient(135deg,rgba(244,63,94,0.18),rgba(15,23,42,0.92))]",
        )}
      >
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border text-white",
              toast.tone === "success"
                ? "border-emerald-200/20 bg-emerald-400/16 text-emerald-50"
                : "border-rose-200/20 bg-rose-400/16 text-rose-50",
            )}
          >
            {toast.tone === "success" ? (
              <CircleCheckBig className="h-5 w-5" />
            ) : (
              <CircleAlert className="h-5 w-5" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p
                className={cn(
                  "text-sm font-semibold tracking-[0.08em]",
                  toast.tone === "success" ? "text-emerald-50/84" : "text-rose-50/84",
                )}
              >
                {toast.title}
              </p>
              {toast.count > 1 ? (
                <span className="animate-toast-stack-pop inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-white/16 bg-white/10 px-2 text-[11px] font-semibold text-white/88">
                  x{toast.count}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm leading-6 text-white/88">{toast.description}</p>
          </div>
          <button
            type="button"
            onClick={() => onClose(toast.id)}
            className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/78 transition hover:bg-white/10 hover:text-white"
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
                stroke="rgba(255,255,255,0.16)"
                strokeWidth="2.5"
              />
              <circle
                cx="22"
                cy="22"
                r="18"
                fill="none"
                stroke="rgba(255,255,255,0.92)"
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
  );
}
