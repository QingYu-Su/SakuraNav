/**
 * 壁纸插槽卡片组件
 * @description 用于显示和管理壁纸的上传、设置和移除，支持桌面端和移动端
 */

"use client";

import { useEffect, useRef } from "react";
import { EllipsisVertical, Plus, Search, Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

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

  return (
    <div ref={slotRef} className="relative">
      <div className="relative flex h-36 items-center justify-center overflow-visible rounded-2xl border border-dashed border-white/12 bg-white/4">
        {hasImage ? (
          <>
            <img src={imageUrl!} alt={label} className="h-full w-full rounded-2xl object-cover" />
            <div className="absolute right-3 top-3 z-20">
              <button
                type="button"
                onClick={onOpenMenu}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/16 bg-slate-950/42 text-white shadow-lg backdrop-blur-xl transition hover:bg-slate-950/60"
              >
                <EllipsisVertical className="h-4 w-4" />
              </button>
              {menuOpen ? (
                <div className="absolute right-0 top-full z-30 mt-2 w-48 overflow-hidden rounded-3xl border border-white/14 bg-[#0f172ae8] p-2 text-white shadow-[0_22px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl">
                  <button
                    type="button"
                    onClick={onUploadLocal}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm transition hover:bg-white/10"
                  >
                    <Upload className="h-4 w-4" />
                    本地上传
                  </button>
                  <button
                    type="button"
                    onClick={onUploadByUrl}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm transition hover:bg-white/10"
                  >
                    <Search className="h-4 w-4" />
                    壁纸 URL
                  </button>
                  <button
                    type="button"
                    onClick={onRemove}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm text-rose-100 transition hover:bg-rose-500/18"
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
              className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/18 bg-white/8 text-white/88 transition hover:bg-white/14"
              aria-label={`添加${label}`}
            >
              <Plus className="h-6 w-6" />
            </button>
            {menuOpen ? (
              <div className="absolute left-1/2 top-full z-30 mt-3 w-48 -translate-x-1/2 overflow-hidden rounded-3xl border border-white/14 bg-[#0f172ae8] p-2 text-white shadow-[0_22px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl">
                <button
                  type="button"
                  onClick={onUploadLocal}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm transition hover:bg-white/10"
                >
                  <Upload className="h-4 w-4" />
                  本地上传
                </button>
                <button
                  type="button"
                  onClick={onUploadByUrl}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm transition hover:bg-white/10"
                >
                  <Search className="h-4 w-4" />
                  壁纸 URL
                </button>
              </div>
            ) : null}
          </div>
        )}

        {uploading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-slate-950/42 text-xs text-white/78 backdrop-blur-sm">
            壁纸上传处理中...
          </div>
        ) : null}
      </div>
    </div>
  );
}
