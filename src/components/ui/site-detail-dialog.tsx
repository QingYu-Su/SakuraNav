/**
 * 网站卡片详细信息查看弹窗
 * @description 从右键菜单「查看详细信息」打开，展示只读的网站信息
 */

"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { X, ExternalLink, Globe, Tag, Info } from "lucide-react";
import type { Card, ThemeMode } from "@/lib/base/types";
import { cn } from "@/lib/utils/utils";
import {
  getDialogOverlayClass,
  getDialogPanelClass,
  getDialogCloseBtnClass,
  getDialogSubtleClass,
  getDialogDividerClass,
} from "@/components/sakura-nav/style-helpers";

export function SiteDetailDialog({
  site,
  themeMode,
  onClose,
}: {
  site: Card;
  themeMode: ThemeMode;
  onClose: () => void;
}) {
  const isDark = themeMode === "dark";
  const [iconError, setIconError] = useState(false);

  const showIcon = site.iconUrl && !iconError;
  const iconBg = site.iconBgColor && site.iconBgColor !== "transparent"
    ? { backgroundColor: site.iconBgColor }
    : undefined;

  // 在线状态显示
  const onlineStatus = site.siteSkipOnlineCheck
    ? null
    : site.siteIsOnline === true
      ? { label: "在线", color: "text-emerald-400", dotColor: "bg-emerald-400" }
      : site.siteIsOnline === false
        ? { label: "离线", color: "text-red-400", dotColor: "bg-red-400" }
        : null;

  const tags = site.tags.filter((t) => !t.isHidden);

  return createPortal(
    <div className={cn("animate-drawer-fade fixed inset-0 z-[200] flex items-center justify-center p-4", getDialogOverlayClass(themeMode))}>
      <div className={cn("animate-panel-rise w-full max-w-[420px] overflow-hidden rounded-[28px] border shadow-[0_32px_120px_rgba(0,0,0,0.42)]", getDialogPanelClass(themeMode))}>
        {/* 头部 */}
        <div className={cn("flex items-center justify-between border-b px-5 py-4", isDark ? "border-white/10" : "border-slate-200/50")}>
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Info className="h-4.5 w-4.5" />
            详细信息
          </h3>
          <button
            type="button"
            onClick={onClose}
            className={cn("inline-flex h-9 w-9 items-center justify-center rounded-xl border transition", getDialogCloseBtnClass(themeMode))}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 内容 */}
        <div className="max-h-[60vh] overflow-y-auto p-5 space-y-5">
          {/* 图标 + 名称 + 在线状态 */}
          <div className="flex items-center gap-4">
            <div
              className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl flex items-center justify-center"
              style={iconBg}
            >
              {showIcon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={site.iconUrl!}
                  alt={site.name}
                  className={cn(
                    "h-full w-full object-cover",
                    // 透明背景文字图标：暗黑模式下反转颜色（黑→白）
                    (!site.iconBgColor || site.iconBgColor === "transparent") && isDark && "invert",
                  )}
                  onError={() => setIconError(true)}
                />
              ) : (
                <span className={cn("text-xl font-bold", isDark ? "text-white/80" : "text-slate-700")}>
                  {site.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className={cn("text-xl font-bold truncate", isDark ? "text-white" : "text-slate-900")}>
                {site.name}
              </h4>
              {onlineStatus && (
                <div className="mt-1 flex items-center gap-1.5">
                  <span className={cn("h-2 w-2 rounded-full", onlineStatus.dotColor)} />
                  <span className={cn("text-xs font-medium", onlineStatus.color)}>
                    {onlineStatus.label}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* URL */}
          <div className="space-y-1.5">
            <label className={cn("text-xs font-medium", isDark ? "text-white/40" : "text-slate-400")}>
              网址
            </label>
            <div className={cn(
              "flex items-center gap-2 rounded-xl border px-3 py-2.5",
              isDark ? "border-white/8 bg-white/4" : "border-slate-200/50 bg-slate-50/50",
            )}>
              <Globe className={cn("h-3.5 w-3.5 shrink-0", isDark ? "text-white/35" : "text-slate-400")} />
              <span className={cn("min-w-0 flex-1 truncate text-sm", isDark ? "text-white/85" : "text-slate-700")}>
                {site.siteUrl}
              </span>
              <a
                href={site.siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-lg transition",
                  isDark ? "hover:bg-white/10 text-white/40" : "hover:bg-slate-100 text-slate-400",
                )}
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* 描述 */}
          <div className="space-y-1.5">
            <label className={cn("text-xs font-medium", isDark ? "text-white/40" : "text-slate-400")}>
              描述
            </label>
            <div className={cn(
              "rounded-xl border px-3 py-2.5 min-h-[40px]",
              isDark ? "border-white/8 bg-white/4" : "border-slate-200/50 bg-slate-50/50",
            )}>
              {site.siteDescription ? (
                <p className={cn("text-sm leading-relaxed whitespace-pre-wrap", isDark ? "text-white/85" : "text-slate-700")}>
                  {site.siteDescription}
                </p>
              ) : (
                <p className={cn("text-sm", getDialogSubtleClass(themeMode))}>暂无描述</p>
              )}
            </div>
          </div>

          {/* 标签 */}
          <div className="space-y-1.5">
            <label className={cn("text-xs font-medium flex items-center gap-1", isDark ? "text-white/40" : "text-slate-400")}>
              <Tag className="h-3 w-3" />
              标签
            </label>
            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag.id}
                    className={cn(
                      "inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium",
                      isDark
                        ? "bg-violet-500/15 text-violet-300 border border-violet-500/20"
                        : "bg-violet-50 text-violet-600 border border-violet-200/60",
                    )}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className={cn("text-sm", getDialogSubtleClass(themeMode))}>未关联标签</p>
            )}
          </div>
        </div>

        {/* 底部分隔线 */}
        <div className={cn("border-t", getDialogDividerClass(themeMode))} />
      </div>
    </div>,
    document.body,
  );
}
