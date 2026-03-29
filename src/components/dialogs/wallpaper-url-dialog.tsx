/**
 * 壁纸 URL 对话框组件
 * @description 用于通过 URL 上传壁纸的对话框，支持桌面端和移动端
 */

"use client";

import { LoaderCircle, X } from "lucide-react";
import { type ThemeMode } from "@/lib/types";
import { getThemeDeviceLabel } from "@/lib/theme-styles";

/**
 * 壁纸设备类型
 */
export type WallpaperDevice = "desktop" | "mobile";

/**
 * 壁纸目标（主题 + 设备）
 */
export type WallpaperTarget = {
  theme: ThemeMode;
  device: WallpaperDevice;
};

/**
 * 壁纸 URL 对话框组件
 * @param target - 壁纸目标
 * @param value - URL 值
 * @param error - 错误信息
 * @param busy - 是否正在处理
 * @param onValueChange - 值变更回调
 * @param onClose - 关闭回调
 * @param onSubmit - 提交回调
 */
export function WallpaperUrlDialog({
  target,
  value,
  error,
  busy,
  onValueChange,
  onClose,
  onSubmit,
}: {
  target: WallpaperTarget;
  value: string;
  error: string;
  busy: boolean;
  onValueChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="animate-drawer-fade fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/52 p-4 backdrop-blur-sm sm:items-center">
      <div className="animate-panel-rise w-full max-w-[520px] overflow-hidden rounded-[30px] border border-white/12 bg-[#101a2eee] text-white shadow-[0_32px_120px_rgba(0,0,0,0.42)]">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-white/55">Wallpaper URL</p>
            <h2 className="mt-1 text-2xl font-semibold">
              {getThemeDeviceLabel(target.theme, target.device, "壁纸")}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/6 transition hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-55"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-6">
          <label className="grid gap-2 text-sm">
            <span className="text-white/78">壁纸 URL</span>
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
              placeholder="https://example.com/wallpaper.jpg"
              className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-sky-300/55 focus:bg-white/10"
            />
          </label>

          {error ? (
            <div className="rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm font-medium text-white/84 transition hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-55"
            >
              取消
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
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
