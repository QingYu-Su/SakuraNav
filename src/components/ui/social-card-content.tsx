/**
 * 社交卡片内容组件
 * @description 社交卡片的内部内容展示，Logo 在上、标题在下，居中对齐
 */

"use client";

import { cn } from "@/lib/utils/utils";
import type { SocialCard, SocialCardType, ThemeMode } from "@/lib/base/types";
import { PencilLine } from "lucide-react";

/** 获取卡片类型的默认图标 (官方品牌 Logo，无外框) */
function CardTypeIcon({ cardType, size = 32 }: { cardType: SocialCardType; size?: number }) {
  switch (cardType) {
    case "qq":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#12B7F5">
          <path d="M21.395 15.035a40 40 0 0 0-.803-2.264l-1.079-2.695c.001-.032.014-.562.014-.836C19.526 4.632 17.351 0 12 0S4.474 4.632 4.474 9.241c0 .274.013.804.014.836l-1.08 2.695a39 39 0 0 0-.802 2.264c-1.021 3.283-.69 4.643-.438 4.673.54.065 2.103-2.472 2.103-2.472 0 1.469.756 3.387 2.394 4.771-.612.188-1.363.479-1.845.835-.434.32-.379.646-.301.778.343.578 5.883.369 7.482.189 1.6.18 7.14.389 7.483-.189.078-.132.132-.458-.301-.778-.483-.356-1.233-.646-1.846-.836 1.637-1.384 2.393-3.302 2.393-4.771 0 0 1.563 2.537 2.103 2.472.251-.03.581-1.39-.438-4.673" />
        </svg>
      );
    case "email":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#EA4335">
          <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
        </svg>
      );
    case "bilibili":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#00A1D6">
          <path d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.653 4.44c.071.071.134.142.187.213h4.267a.836.836 0 0 1 .16-.213l2.853-2.747c.267-.249.573-.373.92-.373.347 0 .662.151.929.4.267.249.391.551.391.907 0 .355-.124.657-.373.906zM5.333 7.24c-.746.018-1.373.276-1.88.773-.506.498-.769 1.13-.786 1.894v7.52c.017.764.28 1.395.786 1.893.507.498 1.134.756 1.88.773h13.334c.746-.017 1.373-.275 1.88-.773.506-.498.769-1.129.786-1.893v-7.52c-.017-.765-.28-1.396-.786-1.894-.507-.497-1.134-.755-1.88-.773zM8 11.107c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.386-.947.258-.257.574-.386.947-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c.017-.391.15-.711.4-.96.249-.249.56-.373.933-.373Z" />
        </svg>
      );
    case "github":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#181717">
          <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c 0-6.627-5.373-12-12-12" />
        </svg>
      );
  }
}

export function SocialCardContent({
  card,
  editable,
  draggable,
  onEdit,
  enterDelay,
  dragHandleProps,
  themeMode,
  wallpaperAware,
}: {
  card: SocialCard;
  editable: boolean;
  draggable: boolean;
  onEdit?: () => void;
  enterDelay?: string;
  dragHandleProps?: Record<string, unknown>;
  themeMode?: ThemeMode;
  wallpaperAware?: boolean;
}) {
  const isDark = themeMode === "dark";
  const iconContainerStyle = card.iconBgColor && card.iconBgColor !== "transparent"
    ? { backgroundColor: card.iconBgColor }
    : undefined;

  const textShadowClass = wallpaperAware
    ? themeMode === "light"
      ? "drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
      : "drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
    : "";

  const editBtnClass = wallpaperAware
    ? isDark
      ? "border-white/14 bg-white/10 hover:bg-white/16 text-white/80"
      : "border-slate-900/8 bg-white/30 hover:bg-white/42 text-slate-700"
    : isDark
      ? "border-white/12 bg-white/10 hover:bg-white/18 text-white/80"
      : "border-slate-900/8 bg-white/30 hover:bg-white/42 text-slate-700";

  return (
    <div
      className="animate-card-enter relative flex h-full flex-col gap-5"
      style={enterDelay ? { animationDelay: enterDelay } : undefined}
    >
      {/* 拖拽手柄 */}
      <div
        className={cn("flex justify-center rounded-full", draggable && "cursor-grab active:cursor-grabbing")}
        style={{ touchAction: "none" }}
        {...(draggable ? dragHandleProps : {})}
      >
        {draggable ? (
          <div className="h-[3px] w-20 rounded-full bg-current opacity-20" />
        ) : (
          <div className="h-[3px] w-20" aria-hidden="true" />
        )}
      </div>

      {/* 居中布局：Logo 在上，标题在下 */}
      <div className="flex flex-col items-center gap-3">
        {/* Logo + 编辑按钮行，整体居中 */}
        <div className="flex items-center gap-2">
          <div
            className="h-14 w-14 shrink-0 overflow-hidden rounded-[20px] border border-white/18 shadow-lg"
            style={card.iconUrl ? (iconContainerStyle as React.CSSProperties) : { backgroundColor: "rgba(255,255,255,0.18)" }}
          >
            {card.iconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={card.iconUrl} alt={card.label} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <CardTypeIcon cardType={card.cardType} size={32} />
              </div>
            )}
          </div>
          {editable ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onEdit?.(); }}
              className={cn("inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border transition", editBtnClass)}
            >
              <PencilLine className="h-5 w-5 opacity-80" />
            </button>
          ) : null}
        </div>

        {/* 标题 - 居中对齐 */}
        <h3 className={cn(
          "w-full truncate text-center font-semibold tracking-tight text-2xl",
          textShadowClass,
        )}>
          {card.label}
        </h3>
      </div>
    </div>
  );
}
