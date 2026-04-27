/**
 * 资源插槽卡片组件
 * @description 用于显示和管理 Logo、Favicon 等资源图片的上传和移除，点击直接打开文件选择器
 */

"use client";

import { Plus, Trash2, Upload } from "lucide-react";
import type { ThemeMode } from "@/lib/base/types";
import { cn } from "@/lib/utils/utils";
import { getDialogAddItemClass } from "@/components/sakura-nav/style-helpers";
import { Tooltip } from "@/components/ui/tooltip";

export function AssetSlotCard({
  label,
  imageUrl,
  uploading,
  onUploadLocal,
  onRemove,
  themeMode = "dark",
  rounded = false,
}: {
  label: string;
  imageUrl: string | null;
  uploading: boolean;
  onUploadLocal: () => void;
  onRemove?: () => void;
  themeMode?: ThemeMode;
  /** 是否使用圆形裁剪预览（适用于 Favicon） */
  rounded?: boolean;
}) {
  const menuDeleteHover = themeMode === "light" ? "text-red-600 hover:bg-red-50" : "text-rose-100 hover:bg-rose-500/18";

  return (
    <div className="relative">
      <div className={cn("relative flex h-36 items-center justify-center overflow-visible rounded-2xl border border-dashed", getDialogAddItemClass(themeMode), "bg-transparent")}>
        {Boolean(imageUrl) ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl!} alt={label} className={cn("h-full w-full object-contain p-4", rounded ? "rounded-full" : "rounded-2xl")} />
            <div className="absolute right-3 top-3 z-20 flex gap-2">
              <Tooltip tip="更换图片" themeMode={themeMode}>
                <button
                  type="button"
                  onClick={onUploadLocal}
                  className={cn(
                    "inline-flex h-10 w-10 items-center justify-center rounded-2xl border shadow-lg backdrop-blur-xl transition",
                    themeMode === "light"
                      ? "border-slate-200/60 bg-white/80 text-slate-700 hover:bg-white"
                      : "border-white/16 bg-slate-950/42 text-white hover:bg-slate-950/60",
                  )}
                >
                  <Upload className="h-4 w-4" />
                </button>
              </Tooltip>
              {onRemove ? (
                <Tooltip tip="移除" themeMode={themeMode}>
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
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </Tooltip>
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
            "absolute inset-0 z-10 flex items-center justify-center text-xs backdrop-blur-sm",
            rounded ? "rounded-full" : "rounded-2xl",
            themeMode === "light"
              ? "bg-white/70 text-slate-600"
              : "bg-slate-950/42 text-white/78",
          )}>
            上传处理中...
          </div>
        ) : null}
      </div>
    </div>
  );
}
