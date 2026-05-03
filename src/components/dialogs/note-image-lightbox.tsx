/**
 * 笔记图片灯箱组件
 * @description 全屏查看图片，支持左右切换和键盘导航
 * 点击半透明黑色遮罩可退出，左右两侧有切换按钮
 */

"use client";

import { useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

type NoteImageLightboxProps = {
  /** 所有图片 URL 列表 */
  images: string[];
  /** 当前显示的图片索引 */
  currentIndex: number;
  /** 关闭回调 */
  onClose: () => void;
  /** 切换到指定索引 */
  onNavigate: (index: number) => void;
};

export function NoteImageLightbox({ images, currentIndex, onClose, onNavigate }: NoteImageLightboxProps) {
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;

  const handlePrev = useCallback(() => {
    if (hasPrev) onNavigate(currentIndex - 1);
  }, [hasPrev, currentIndex, onNavigate]);

  const handleNext = useCallback(() => {
    if (hasNext) onNavigate(currentIndex + 1);
  }, [hasNext, currentIndex, onNavigate]);

  // 键盘导航：Escape 关闭、左右箭头切换
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") handlePrev();
      else if (e.key === "ArrowRight") handleNext();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, handlePrev, handleNext]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 animate-drawer-fade"
      onClick={onClose}
    >
      {/* 左侧切换按钮 */}
      {hasPrev && (
        <button
          type="button"
          className="absolute left-4 top-1/2 z-10 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white/80 backdrop-blur-sm transition hover:bg-white/20 hover:text-white"
          onClick={(e) => { e.stopPropagation(); handlePrev(); }}
        >
          <ChevronLeft className="h-7 w-7" />
        </button>
      )}

      {/* 图片 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={images[currentIndex]}
        alt={`图片 ${currentIndex + 1}`}
        className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain shadow-2xl select-none"
        onClick={(e) => e.stopPropagation()}
      />

      {/* 右侧切换按钮 */}
      {hasNext && (
        <button
          type="button"
          className="absolute right-4 top-1/2 z-10 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white/80 backdrop-blur-sm transition hover:bg-white/20 hover:text-white"
          onClick={(e) => { e.stopPropagation(); handleNext(); }}
        >
          <ChevronRight className="h-7 w-7" />
        </button>
      )}

      {/* 右上角关闭按钮 */}
      <button
        type="button"
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/80 backdrop-blur-sm transition hover:bg-white/20 hover:text-white"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
      >
        <X className="h-5 w-5" />
      </button>

      {/* 底部计数器 */}
      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white/10 px-4 py-1.5 text-sm text-white/80 backdrop-blur-sm">
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>
  );
}
