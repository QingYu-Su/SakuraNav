/**
 * SakuraNav 配置文件导入确认对话框
 * @description 确认清空所有数据后导入 SakuraNav 配置文件
 */

"use client";

import { LoaderCircle, AlertTriangle, Globe, X } from "lucide-react";
import type { ThemeMode } from "@/lib/base/types";
import { cn } from "@/lib/utils/utils";
import {
  getDialogOverlayClass,
  getDialogPanelClass,
  getDialogDividerClass,
  getDialogSubtleClass,
  getDialogCloseBtnClass,
  getDialogSecondaryBtnClass,
} from "@/components/sakura-nav/style-helpers";

export function SakuraImportConfirmDialog({
  filename,
  sitesOnly = false,
  busy,
  themeMode,
  onConfirm,
  onClose,
}: {
  filename: string;
  sitesOnly?: boolean;
  busy: boolean;
  themeMode: ThemeMode;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const isDark = themeMode === "dark";

  // 仅网站卡片模式：更温和的提示
  const alertStyle = sitesOnly
    ? isDark
      ? "border-blue-400/20 bg-blue-400/8 text-blue-100"
      : "border-blue-200/60 bg-blue-50 text-blue-800"
    : isDark
      ? "border-amber-400/20 bg-amber-400/8 text-amber-100"
      : "border-amber-200/60 bg-amber-50 text-amber-800";

  const AlertIcon = sitesOnly ? Globe : AlertTriangle;
  const buttonStyle = sitesOnly
    ? isDark
      ? "bg-blue-500 text-white hover:bg-blue-400"
      : "bg-blue-600 text-white hover:bg-blue-500"
    : isDark
      ? "bg-amber-500 text-white hover:bg-amber-400"
      : "bg-amber-600 text-white hover:bg-amber-500";

  return (
    <div className={cn(getDialogOverlayClass(themeMode), "animate-drawer-fade fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center")}>
      <div className={cn(getDialogPanelClass(themeMode), "animate-panel-rise w-full max-w-[480px] overflow-hidden rounded-[30px] border")}>
        <div className={cn("flex items-center justify-between border-b px-6 py-5", getDialogDividerClass(themeMode))}>
          <div>
            <p className={cn("text-xs uppercase tracking-[0.28em]", getDialogSubtleClass(themeMode))}>Confirm Import</p>
            <h2 className="mt-1 text-2xl font-semibold">确认导入</h2>
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
          <div className={cn(
            "flex items-start gap-3 rounded-2xl border px-4 py-4 text-sm leading-6",
            alertStyle,
          )}>
            <AlertIcon className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              {sitesOnly ? (
                <>
                  <p className="font-semibold">仅替换网站卡片数据</p>
                  <p className={cn("mt-1", isDark ? "text-blue-200/70" : "text-blue-700")}>
                    检测到 SakuraNav 网站卡片文件「{filename}」，导入后将清除当前的网站卡片和相关标签，再导入新的数据。社交卡片和外观设置不受影响，且不可撤销。
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold">此操作将清空当前所有数据</p>
                  <p className={cn("mt-1", isDark ? "text-amber-200/70" : "text-amber-700")}>
                    检测到 SakuraNav 配置文件「{filename}」，导入后将完全替换当前的所有标签、卡片、外观和设置，且不可撤销。
                  </p>
                </>
              )}
            </div>
          </div>

          {busy ? (
            <div className="flex items-center justify-center gap-2 py-2">
              <LoaderCircle className={cn("h-4 w-4 animate-spin", getDialogSubtleClass(themeMode))} />
              <span className={cn("text-sm", getDialogSubtleClass(themeMode))}>正在导入，请稍候...</span>
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
              onClick={onConfirm}
              disabled={busy}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
                buttonStyle,
              )}
            >
              {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {sitesOnly ? "确认导入" : "确认清空并导入"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
