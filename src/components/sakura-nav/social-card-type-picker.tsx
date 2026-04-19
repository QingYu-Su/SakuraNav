/**
 * 社交卡片类型选择器
 * @description 弹窗让用户选择要创建的卡片类型（当前可创建的类型归类为"社交卡片"）
 */

"use client";

import { X } from "lucide-react";
import type { SocialCardType, ThemeMode } from "@/lib/base/types";
import { SOCIAL_CARD_TYPE_META } from "@/lib/base/types";
import { cn } from "@/lib/utils/utils";
import { getDialogOverlayClass, getDialogPanelClass, getDialogDividerClass, getDialogSubtleClass, getDialogCloseBtnClass } from "../sakura-nav/style-helpers";

type SocialCardTypePickerProps = {
  open: boolean;
  themeMode: ThemeMode;
  onSelect: (type: SocialCardType) => void;
  onClose: () => void;
};

/** 社交卡片类型列表 */
const CARD_TYPES: SocialCardType[] = ["qq", "wechat", "email", "bilibili", "github", "blog"];

/** 内联 SVG 图标（官方品牌 Logo，无外框） */
function CardTypeMiniIcon({ cardType }: { cardType: SocialCardType }) {
  const size = 36;
  switch (cardType) {
    case "qq":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#12B7F5">
          <path d="M21.395 15.035a40 40 0 0 0-.803-2.264l-1.079-2.695c.001-.032.014-.562.014-.836C19.526 4.632 17.351 0 12 0S4.474 4.632 4.474 9.241c0 .274.013.804.014.836l-1.08 2.695a39 39 0 0 0-.802 2.264c-1.021 3.283-.69 4.643-.438 4.673.54.065 2.103-2.472 2.103-2.472 0 1.469.756 3.387 2.394 4.771-.612.188-1.363.479-1.845.835-.434.32-.379.646-.301.778.343.578 5.883.369 7.482.189 1.6.18 7.14.389 7.483-.189.078-.132.132-.458-.301-.778-.483-.356-1.233-.646-1.846-.836 1.637-1.384 2.393-3.302 2.393-4.771 0 0 1.563 2.537 2.103 2.472.251-.03.581-1.39-.438-4.673" />
        </svg>
      );
    case "wechat":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#07C160">
          <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05a6.127 6.127 0 0 1-.248-1.744c0-3.678 3.292-6.66 7.352-6.66.324 0 .642.023.956.06C16.646 4.821 13.003 2.188 8.691 2.188zm-2.87 4.401a.994.994 0 1 1 0 1.988.994.994 0 0 1 0-1.988zm5.742 0a.994.994 0 1 1 0 1.988.994.994 0 0 1 0-1.988zM16.88 9.188c-3.868 0-7.005 2.666-7.005 5.953 0 3.286 3.137 5.952 7.005 5.952.78 0 1.54-.113 2.27-.316a.717.717 0 0 1 .574.078l1.521.89a.262.262 0 0 0 .133.044.236.236 0 0 0 .232-.236c0-.058-.023-.114-.039-.17l-.312-1.186a.472.472 0 0 1 .17-.533C22.968 18.578 23.88 16.805 23.88 15.14c0-3.287-3.136-5.953-7-5.953zm-2.8 3.431a.795.795 0 1 1 0 1.59.795.795 0 0 1 0-1.59zm5.602 0a.795.795 0 1 1 0 1.59.795.795 0 0 1 0-1.59z" />
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
          <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
        </svg>
      );
    case "blog":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#FF6B35">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
        </svg>
      );
  }
}

export function SocialCardTypePicker({ open, themeMode, onSelect, onClose }: SocialCardTypePickerProps) {
  if (!open) return null;

  return (
    <div className={cn(getDialogOverlayClass(themeMode), "animate-drawer-fade fixed inset-0 z-40 flex items-end justify-center p-4 sm:items-center")}>
      <div className={cn(getDialogPanelClass(themeMode), "animate-panel-rise w-full max-w-[520px] overflow-hidden rounded-[34px] border")}>
        <div className={cn("flex items-center justify-between border-b px-6 py-5", getDialogDividerClass(themeMode))}>
          <div>
            <p className={cn("text-xs uppercase tracking-[0.28em]", getDialogSubtleClass(themeMode))}>Edit Mode</p>
            <h2 className="mt-1 text-2xl font-semibold">新建卡片</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(getDialogCloseBtnClass(themeMode), "inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-6">
          {/* 社交卡片分类 */}
          <p className={cn("mb-3 text-xs font-semibold uppercase tracking-[0.2em]", themeMode === "light" ? "text-slate-400" : "text-white/40")}>
            社交卡片
          </p>
          <p className={cn("mb-5 text-sm", themeMode === "light" ? "text-slate-500" : "text-white/60")}>
            选择要创建的社交卡片类型：
          </p>
          <div className="grid grid-cols-2 gap-3">
            {CARD_TYPES.map((ct) => {
              const meta = SOCIAL_CARD_TYPE_META[ct];
              return (
                <button
                  key={ct}
                  type="button"
                  onClick={() => onSelect(ct)}
                  className={cn(
                    "flex flex-col items-center gap-3 rounded-[22px] border p-5 transition hover:-translate-y-0.5 hover:shadow-md",
                    themeMode === "light"
                      ? "border-slate-200 bg-white hover:bg-slate-50"
                      : "border-white/12 bg-white/6 hover:bg-white/10",
                  )}
                >
                  <CardTypeMiniIcon cardType={ct} />
                  <div className="text-center">
                    <p className="font-semibold">{meta.label}</p>
                    <p className={cn("mt-1 text-xs", themeMode === "light" ? "text-slate-400" : "text-white/45")}>
                      {meta.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
