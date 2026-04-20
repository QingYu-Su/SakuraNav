/**
 * 图片裁剪弹窗组件
 * @description 基于 react-easy-crop 的通用裁剪弹窗，支持裁剪、旋转、缩放
 */

"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { Check, RotateCw, X, ZoomIn, ZoomOut } from "lucide-react";
import type { ThemeMode } from "@/lib/base/types";
import { cn } from "@/lib/utils/utils";
import {
  getDialogOverlayClass,
  getDialogPanelClass,
  getDialogPrimaryBtnClass,
  getDialogSubtleClass,
} from "@/components/sakura-nav/style-helpers";
import { getCroppedBlob } from "@/lib/utils/crop-utils";

export interface ImageCropDialogProps {
  /** 图片源（blob URL 或 data URL） */
  imageSrc: string;
  /** 裁剪区域形状：rect=方形 / round=圆形 */
  cropShape?: "rect" | "round";
  /** 锁定宽高比（如 1 表示 1:1，16/9 表示 16:9） */
  aspectRatio?: number;
  /** 弹窗标题 */
  title?: string;
  /** 输出 MIME 类型 */
  outputType?: "image/png" | "image/jpeg";
  /** 输出质量（仅 JPEG 有效） */
  outputQuality?: number;
  /** 是否输出圆形蒙版图片（适用于 Favicon） */
  circular?: boolean;
  /** 确认回调，返回裁剪后的 Blob */
  onConfirm: (blob: Blob) => void;
  /** 取消回调 */
  onCancel: () => void;
  /** 主题模式 */
  themeMode?: ThemeMode;
}

export function ImageCropDialog({
  imageSrc,
  cropShape = "rect",
  aspectRatio = 1,
  title = "裁剪",
  outputType = "image/png",
  outputQuality = 0.92,
  circular = false,
  onConfirm,
  onCancel,
  themeMode = "dark",
}: ImageCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  async function handleConfirm() {
    if (!croppedAreaPixels || processing) return;
    setProcessing(true);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels, rotation, outputType, outputQuality, circular);
      onConfirm(blob);
    } catch (err) {
      console.error("图片裁剪失败:", err);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-[80] flex items-center justify-center p-4 backdrop-blur-sm",
        getDialogOverlayClass(themeMode),
      )}
    >
      <div
        className={cn(
          "animate-panel-rise w-full max-w-[520px] overflow-hidden rounded-[28px] border shadow-[0_32px_120px_rgba(0,0,0,0.42)]",
          getDialogPanelClass(themeMode),
        )}
      >
        {/* 头部 */}
        <div className={cn("flex items-center justify-between border-b px-5 py-4", themeMode === "light" ? "border-slate-200/50" : "border-white/10")}>
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            type="button"
            onClick={onCancel}
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition",
              themeMode === "light"
                ? "border-slate-200/60 bg-white text-slate-500 hover:bg-slate-50"
                : "border-white/16 bg-white/8 text-white/70 hover:bg-white/14",
            )}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 裁剪区域 */}
        <div className="relative h-[320px] w-full bg-black/60">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspectRatio}
            cropShape={cropShape}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
          />
        </div>

        {/* 控制区 */}
        <div className={cn("border-t px-5 py-4", themeMode === "light" ? "border-slate-200/50" : "border-white/10")}>
          {/* 缩放滑块 */}
          <div className="flex items-center gap-3">
            <ZoomOut className={cn("h-4 w-4 shrink-0", getDialogSubtleClass(themeMode))} />
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer"
              style={{ accentColor: themeMode === "light" ? "#0f172a" : "#ffffff" }}
            />
            <ZoomIn className={cn("h-4 w-4 shrink-0", getDialogSubtleClass(themeMode))} />
          </div>

          {/* 操作按钮 */}
          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className={cn(
                "inline-flex h-9 items-center justify-center gap-2 rounded-xl border px-4 text-sm transition",
                themeMode === "light"
                  ? "border-slate-200/60 bg-white text-slate-600 hover:bg-slate-50"
                  : "border-white/16 bg-white/8 text-white/80 hover:bg-white/14",
              )}
            >
              <RotateCw className="h-4 w-4" />
              旋转 90°
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onCancel}
                className={cn(
                  "inline-flex h-9 items-center justify-center rounded-xl px-4 text-sm transition",
                  getDialogSubtleClass(themeMode),
                  themeMode === "light" ? "hover:bg-slate-50" : "hover:bg-white/8",
                )}
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void handleConfirm()}
                disabled={processing}
                className={cn(
                  "inline-flex h-9 items-center justify-center gap-1.5 rounded-xl px-5 text-sm font-semibold transition disabled:opacity-60",
                  getDialogPrimaryBtnClass(themeMode),
                )}
              >
                <Check className="h-4 w-4" />
                {processing ? "处理中..." : "确认"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
