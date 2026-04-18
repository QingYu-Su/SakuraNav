/**
 * 壁纸插槽卡片组件
 * @description 用于显示和管理壁纸的上传、设置和移除，支持桌面端和移动端
 */

"use client";

import { useEffect, useRef } from "react";
import { EllipsisVertical, Plus, Search, Trash2, Upload } from "lucide-react";
import type { ThemeMode } from "@/lib/base/types";
import { cn } from "@/lib/utils/utils";
import { getDialogAddItemClass } from "@/components/sakura-nav/style-helpers";

export function WallpaperSlotCard({
  label,
  imageUrl,
  uploading,
  menuOpen,
  onOpenMenu,
  onCloseMenu,
  onUploadLocal,
  onUploadByUrl,
  onRemove,
  themeMode = "dark",
}: {
  label: string;
  imageUrl: string | null;
  uploading: boolean;
  menuOpen: boolean;
  onOpenMenu: () => void;
  onCloseMenu: () => void;
  onUploadLocal: () => void;
  onUploadByUrl: () => void;
  onRemove: () => void;
  themeMode?: ThemeMode;
}) {
  const hasImage = Boolean(imageUrl);
  const slotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!slotRef.current?.contains(event.target as Node)) {
        onCloseMenu();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [menuOpen, onCloseMenu]);

  const menuPanelClass = themeMode === "light"
    ? "border-slate-200/50 bg-white/96 text-slate-900 shadow-[0_22px_80px_rgba(0,0,0,0.08)] backdrop-blur-2xl"
    : "border-white/14 bg-[#0f172ae8] text-white shadow-[0_22px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl";

  const menuItemHover = themeMode === "light" ? "hover:bg-slate-100" : "hover:bg-white/10";
  const menuDeleteHover = themeMode === "light" ? "text-red-600 hover:bg-red-50" : "text-rose-100 hover:bg-rose-500/18";

  return (
    <div ref={slotRef} className="relative">
      <div className={cn("relative flex h-36 items-center justify-center overflow-visible rounded-2xl border border-dashed", getDialogAddItemClass(themeMode), "bg-transparent")}>
        {hasImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl!} alt={label} className="h-full w-full rounded-2xl object-cover" />
            <div className="absolute right-3 top-3 z-20">
              <button
                type="button"
                onClick={onOpenMenu}
                className={cn(
                  "inline-flex h-10 w-10 items-center justify-center rounded-2xl border shadow-lg backdrop-blur-xl transition",
                  themeMode === "light"
                    ? "border-slate-200/60 bg-white/80 text-slate-700 hover:bg-white"
                    : "border-white/16 bg-slate-950/42 text-white hover:bg-slate-950/60",
                )}
              >
                <EllipsisVertical className="h-4 w-4" />
              </button>
              {menuOpen ? (
                <div className={cn("absolute right-0 top-full z-30 mt-2 w-48 overflow-hidden rounded-3xl border p-2", menuPanelClass)}>
                  <button
                    type="button"
                    onClick={onUploadLocal}
                    className={cn("flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm transition", menuItemHover)}
                  >
                    <Upload className="h-4 w-4" />
                    本地上传
                  </button>
                  <button
                    type="button"
                    onClick={onUploadByUrl}
                    className={cn("flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm transition", menuItemHover)}
                  >
                    <Search className="h-4 w-4" />
                    壁纸 URL
                  </button>
                  <button
                    type="button"
                    onClick={onRemove}
                    className={cn("flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm transition", menuDeleteHover)}
                  >
                    <Trash2 className="h-4 w-4" />
                    移除壁纸
                  </button>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <div className="relative z-20">
            <button
              type="button"
              onClick={onOpenMenu}
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
            {menuOpen ? (
              <div className={cn("absolute left-1/2 top-full z-30 mt-3 w-48 -translate-x-1/2 overflow-hidden rounded-3xl border p-2", menuPanelClass)}>
                <button
                  type="button"
                  onClick={onUploadLocal}
                  className={cn("flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm transition", menuItemHover)}
                >
                  <Upload className="h-4 w-4" />
                  本地上传
                </button>
                <button
                  type="button"
                  onClick={onUploadByUrl}
                  className={cn("flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm transition", menuItemHover)}
                >
                  <Search className="h-4 w-4" />
                  壁纸 URL
                </button>
              </div>
            ) : null}
          </div>
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
