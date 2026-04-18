/**
 * 资源 URL 对话框组件
 * @description 用于通过 URL 上传 Logo、Favicon 等资源图片的对话框
 */

"use client";

import { LoaderCircle, X } from "lucide-react";
import { type ThemeMode } from "@/lib/base/types";
import { getThemeAssetLabel } from "@/lib/utils/theme-styles";
import { cn } from "@/lib/utils/utils";
import {
  getDialogOverlayClass,
  getDialogPanelClass,
  getDialogDividerClass,
  getDialogSubtleClass,
  getDialogCloseBtnClass,
  getDialogInputClass,
  getDialogPrimaryBtnClass,
  getDialogSecondaryBtnClass,
} from "../sakura-nav/style-helpers";

/**
 * 资源类型
 */
export type AssetKind = "logo" | "favicon";

/**
 * 资源目标（主题 + 类型）
 */
export type AssetTarget = {
  theme: ThemeMode;
  kind: AssetKind;
};

/**
 * 资源 URL 对话框组件
 * @param target - 资源目标
 * @param value - URL 值
 * @param error - 错误信息
 * @param busy - 是否正在处理
 * @param onValueChange - 值变更回调
 * @param onClose - 关闭回调
 * @param onSubmit - 提交回调
 */
export function AssetUrlDialog({
  target,
  value,
  error,
  busy,
  onValueChange,
  onClose,
  onSubmit,
  themeMode,
}: {
  target: AssetTarget;
  value: string;
  error: string;
  busy: boolean;
  onValueChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  themeMode: ThemeMode;
}) {
  return (
    <div className={cn(getDialogOverlayClass(themeMode), "animate-drawer-fade fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center")}>
      <div className={cn(getDialogPanelClass(themeMode), "animate-panel-rise w-full max-w-[520px] overflow-hidden rounded-[30px] border")}>
        <div className={cn("flex items-center justify-between border-b px-6 py-5", getDialogDividerClass(themeMode))}>
          <div>
            <p className={cn("text-xs uppercase tracking-[0.28em]", getDialogSubtleClass(themeMode))}>Asset URL</p>
            <h2 className="mt-1 text-2xl font-semibold">
              {getThemeAssetLabel(target.theme, target.kind)}
            </h2>
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
          <label className="grid gap-2 text-sm">
            <span className={themeMode === "light" ? "text-slate-700" : "text-white/78"}>图片 URL</span>
            <input
              autoFocus
              type="url"
              value={value}
              onChange={(event) => onValueChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onSubmit();
                }
              }}
              placeholder="https://example.com/image.png"
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
              确认上传
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
