/**
 * 删除社交标签确认对话框
 * @description 确认删除社交卡片标签时弹出，提示用户该操作将删除所有社交卡片
 */

"use client";

import { AlertTriangle, X } from "lucide-react";
import type { ThemeMode } from "@/lib/base/types";
import { cn } from "@/lib/utils/utils";
import {
  getDialogOverlayClass,
  getDialogPanelClass,
  getDialogDividerClass,
  getDialogSubtleClass,
  getDialogCloseBtnClass,
  getDialogSecondaryBtnClass,
} from "../sakura-nav/style-helpers";

export function DeleteSocialTagDialog({
  open,
  themeMode,
  onConfirm,
  onClose,
}: {
  open: boolean;
  themeMode: ThemeMode;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className={cn(getDialogOverlayClass(themeMode), "animate-drawer-fade fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center")}>
      <div className={cn(getDialogPanelClass(themeMode), "animate-panel-rise w-full max-w-[460px] overflow-hidden rounded-[30px] border")}>
        <div className={cn("flex items-center justify-between border-b px-6 py-5", getDialogDividerClass(themeMode))}>
          <div>
            <p className={cn("text-xs uppercase tracking-[0.28em]", getDialogSubtleClass(themeMode))}>Confirm</p>
            <h2 className="mt-1 text-2xl font-semibold">删除标签</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(getDialogCloseBtnClass(themeMode), "inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div className={cn(
            "flex items-start gap-3 rounded-[22px] border px-4 py-4 text-sm leading-7",
            themeMode === "light"
              ? "border-amber-200/60 bg-amber-50 text-amber-700"
              : "border-amber-300/20 bg-amber-400/10 text-amber-100",
          )}>
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>删除该标签会导致所有社交卡片全部被删除，是否确认？此操作不可撤销。</span>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className={cn(getDialogSecondaryBtnClass(themeMode), "inline-flex items-center justify-center rounded-2xl border px-4 py-3 text-sm font-medium transition")}
            >
              取消
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white transition",
                themeMode === "light"
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-red-600 hover:bg-red-500",
              )}
            >
              确认删除
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
