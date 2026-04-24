/**
 * 壁纸插槽卡片组件
 * @description 用于显示和管理壁纸的上传和移除，点击直接打开文件选择器
 */

"use client";

import { Plus, Trash2, Upload } from "lucide-react";
import type { ThemeMode } from "@/lib/base/types";
import { cn } from "@/lib/utils/utils";
import { getDialogAddItemClass } from "@/components/sakura-nav/style-helpers";

export function WallpaperSlotCard({
  label,
  imageUrl,
  uploading,
  onUploadLocal,
  onRemove,
  themeMode = "dark",
}: {
  label: string;
  imageUrl: string | null;
  uploading: boolean;
  onUploadLocal: () => void;
  onRemove?: () => void;
  themeMode?: ThemeMode;
}) {
  const hasImage = Boolean(imageUrl);

  const menuDeleteHover = themeMode === "light" ? "text-red-600 hover:bg-red-50" : "text-rose-100 hover:bg-rose-500/18";

  return (
    <div className="relative">
      <div className={cn("relative flex h-36 items-center justify-center overflow-visible rounded-2xl border border-dashed", getDialogAddItemClass(themeMode), "bg-transparent")}>
        {hasImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl!} alt={label} className="h-full w-full rounded-2xl object-cover" />
            <div className="absolute right-3 top-3 z-20 flex gap-2">
              <button
                type="button"
                onClick={onUploadLocal}
                className={cn(
                  "inline-flex h-10 w-10 items-center justify-center rounded-2xl border shadow-lg backdrop-blur-xl transition",
                  themeMode === "light"
                    ? "border-slate-200/60 bg-white/80 text-slate-700 hover:bg-white"
                    : "border-white/16 bg-slate-950/42 text-white hover:bg-slate-950/60",
                )}
                title="更换壁纸"
              >
                <Upload className="h-4 w-4" />
              </button>
              {onRemove ? (
                <button
                  type="button"
                  onClick={onRemove}
                  className={cn(
                    "inline-flex h-10 w-10 items-center justify-center rounded-2xl border shadow-lg backdrop-blur-xl transition",
                    themeMode === "light"
                      ? "border-red-200/60 bg-white/80 text-red-600 hover:bg-red-50"
                      : "border-rose-500/30 bg-slate-950/42 text-rose-100 hover:bg-rose-500/18",
                    menuDeleteHover,
                  )}
                  title="移除壁纸"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={onUploadLocal}
            className={cn(
              "inline-flex h-14 w-14 items-center justify-center rounded-full border transition",
              themeMode === "light"
                ? "border-slate-300/60 bg-slate-50 text-slate-500 hover:bg-slate-100"
                : "border-white/18 bg-white/8 text-white/88 hover:bg-white/14",
            )}
            aria-label={`添加${label}`}
          >
            <Plus className="h-6 w-6" />
          </button>
        )}

        {uploading ? (
          <div className={cn(
            "absolute inset-0 z-10 flex items-center justify-center rounded-2xl text-xs backdrop-blur-sm",
            themeMode === "light"
              ? "bg-white/70 text-slate-600"
              : "bg-slate-950/42 text-white/78",
          )}>
            壁纸上传处理中...
          </div>
        ) : null}
      </div>
    </div>
  );
}
