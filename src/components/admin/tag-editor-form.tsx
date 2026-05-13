/**
 * 标签编辑表单组件
 * @description 提供标签信息编辑界面，双 Tab 布局：
 *   Tab 1：标签名称和描述
 *   Tab 2：关联网站列表，支持勾选绑定/解绑标签
 * 底部固定：保存标签 + 删除标签按钮
 * 社交标签模式下：名称不可编辑、显示删除按钮、隐藏关联网站 Tab
 */

"use client";

import { type Dispatch, type SetStateAction, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, PencilLine, Plus, Trash2, Tag, Globe, Search, Filter } from "lucide-react";
import type { Card, ThemeMode } from "@/lib/base/types";
import type { TagFormState } from "./types";
import { cn } from "@/lib/utils/utils";
import { generateTextIconDataUrl } from "@/lib/utils/icon-utils";
import { getDialogInputClass, getDialogPrimaryBtnClass, getDialogDangerBtnClass, getDialogSubtleClass, getDialogSectionClass, getDialogSecondaryBtnClass } from "@/components/sakura-nav/style-helpers";

/** 被系统保留的标签名，普通标签不可使用 */
const RESERVED_TAG_NAMES = ["社交卡片"];

/** 检查标签名是否为保留名称 */
function isReservedTagName(name: string): boolean {
  return RESERVED_TAG_NAMES.includes(name.trim());
}

/** Tab 类型 */
type TagEditorTab = "info" | "sites";

/** 自定义 Tooltip 组件，通过 createPortal 渲染到 body 避免 transform/overflow 干扰 */
function LinkTooltip({ url, themeMode }: { url: string; themeMode: ThemeMode }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const btnRef = useRef<HTMLAnchorElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function handleMouseEnter() {
    timerRef.current = setTimeout(() => {
      if (!btnRef.current) return;
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ x: rect.left + rect.width / 2, y: rect.top - 8 });
      setShow(true);
    }, 300);
  }

  function handleMouseLeave() {
    clearTimeout(timerRef.current);
    setShow(false);
  }

  const isDark = themeMode === "dark";

  // Tooltip 浮层，通过 Portal 渲染到 body，避免父级 transform/overflow 裁切
  const tooltip = show ? (
    <div
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        transform: "translate(-50%, -100%)",
        zIndex: 99999,
        pointerEvents: "none",
        whiteSpace: "nowrap",
      }}
      className={cn(
        "rounded-lg px-3 py-1.5 text-xs font-medium shadow-xl transition-opacity duration-150",
        isDark
          ? "bg-slate-800 text-white/90 border border-white/10"
          : "bg-white text-slate-700 border border-slate-200 shadow-slate-200/50",
      )}
    >
      跳转到该网站
    </div>
  ) : null;

  return (
    <>
      <a
        ref={btnRef}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-all duration-150",
          isDark
            ? "text-white/35 hover:text-white hover:bg-white/15 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.15)]"
            : "text-slate-400 hover:text-slate-700 hover:bg-slate-300/60 hover:shadow-[0_0_0_1px_rgba(0,0,0,0.08)]",
        )}
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
      {createPortal(tooltip, document.body)}
    </>
  );
}

export function TagEditorForm({
  tagForm,
  setTagForm,
  submitLabel,
  onSubmit,
  onDelete,
  themeMode = "dark",
  socialTagMode = false,
  /** 所有网站卡片列表（仅普通网站，排除社交卡片） */
  sites = [],
  hideBottomBar = false,
  hideSitesTab = false,
}: {
  tagForm: TagFormState;
  setTagForm: Dispatch<SetStateAction<TagFormState>>;
  submitLabel: string;
  onSubmit: () => void;
  onDelete?: () => void;
  themeMode?: ThemeMode;
  /** 社交卡片标签模式：名称不可编辑、显示删除按钮 */
  socialTagMode?: boolean;
  /** 所有网站卡片列表（仅普通网站，排除社交卡片） */
  sites?: Card[];
  /** 隐藏底部保存/删除按钮（由关闭弹窗触发自动保存） */
  hideBottomBar?: boolean;
  /** 隐藏关联网站 Tab（网站编辑器内快速创建标签时不需关联） */
  hideSitesTab?: boolean;
}) {
  const nameReserved = !socialTagMode && isReservedTagName(tagForm.name);
  const [activeTab, setActiveTab] = useState<TagEditorTab>("info");
  const [siteSearch, setSiteSearch] = useState("");
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

  // 仅显示普通网站卡片（排除社交卡片），按名称排序
  const normalSites = useMemo(
    () => sites
      .filter((s) => s.cardType == null)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
    [sites],
  );

  // 搜索 + 已选过滤后的网站列表
  const filteredSites = useMemo(() => {
    let result = normalSites;
    // 仅显示已勾选
    if (showSelectedOnly) {
      const selectedIds = new Set(tagForm.siteIds);
      result = result.filter((s) => selectedIds.has(s.id));
    }
    // 搜索关键字过滤
    const needle = siteSearch.trim().toLowerCase();
    if (needle) {
      result = result.filter((s) =>
        `${s.name} ${s.siteUrl}`.toLowerCase().includes(needle)
      );
    }
    return result;
  }, [normalSites, tagForm.siteIds, showSelectedOnly, siteSearch]);

  const selectedSiteIds = new Set(tagForm.siteIds);

  /** 切换某个站点的选中状态 */
  function toggleSite(siteId: string) {
    setTagForm((current) => {
      const ids = new Set(current.siteIds);
      if (ids.has(siteId)) {
        ids.delete(siteId);
      } else {
        ids.add(siteId);
      }
      return { ...current, siteIds: [...ids] };
    });
  }

  const isDark = themeMode === "dark";

  return (
    <div className="flex flex-col gap-0">
      {/* Tab 切换栏 */}
      <div className={cn("flex gap-2 pb-4", socialTagMode ? "" : "mb-4 border-b", socialTagMode ? "" : isDark ? "border-white/8" : "border-slate-200/60")}>
        <button
          type="button"
          onClick={() => setActiveTab("info")}
          className={cn(
            "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition",
            activeTab === "info"
              ? isDark ? "bg-white text-slate-950" : "bg-slate-900 text-white"
              : cn(getDialogSecondaryBtnClass(themeMode), isDark ? "text-white/80" : "text-slate-600"),
          )}
        >
          <Tag className="h-4 w-4" />
          标签信息
        </button>
        {!socialTagMode && !hideSitesTab ? (
          <button
            type="button"
            onClick={() => setActiveTab("sites")}
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition",
              activeTab === "sites"
                ? isDark ? "bg-white text-slate-950" : "bg-slate-900 text-white"
                : cn(getDialogSecondaryBtnClass(themeMode), isDark ? "text-white/80" : "text-slate-600"),
            )}
          >
            <Globe className="h-4 w-4" />
            关联网站
            {tagForm.siteIds.length > 0 ? (
              <span className={cn(
                "ml-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                activeTab === "sites"
                  ? isDark ? "bg-slate-950/20 text-slate-950" : "bg-white/20 text-white"
                  : isDark ? "bg-white/15 text-white/80" : "bg-slate-200 text-slate-600",
              )}>
                {tagForm.siteIds.length}
              </span>
            ) : null}
          </button>
        ) : null}
      </div>

      {/* Tab 内容区 */}
      {activeTab === "info" ? (
        <div className="flex flex-col gap-3 pb-5">
          {/* 标签名 — 社交标签模式下为只读 */}
          <input
            value={tagForm.name}
            onChange={socialTagMode ? undefined : (event) =>
              setTagForm((current) => ({ ...current, name: event.target.value }))
            }
            readOnly={socialTagMode}
            placeholder="标签名"
            className={cn(
              "rounded-xl border px-3 py-2 text-sm outline-none",
              getDialogInputClass(themeMode),
              socialTagMode && "opacity-60 cursor-not-allowed",
            )}
          />

          {/* 保留名称警告 */}
          {nameReserved ? (
            <p className={cn(
              "rounded-xl border px-3 py-2 text-xs leading-relaxed",
              isDark
                ? "border-amber-500/30 bg-amber-900/20 text-amber-300"
                : "border-amber-400 bg-amber-50 text-amber-800",
            )}>
              该标签名不可使用。如需添加社交信息，请尝试通过新建卡片中的「社交卡片」来创建。
            </p>
          ) : null}

          {/* 标签描述 */}
          <input
            value={tagForm.description}
            onChange={(event) =>
              setTagForm((current) => ({ ...current, description: event.target.value }))
            }
            placeholder="标签描述（选填，留空则显示站点数量）"
            className={cn("rounded-xl border px-3 py-2 text-sm outline-none", getDialogInputClass(themeMode))}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2 pb-5">
          <div className="flex items-center justify-between">
            <span className={cn("text-xs tabular-nums", getDialogSubtleClass(themeMode))}>
              已选 {tagForm.siteIds.length} / {normalSites.length}
            </span>
          </div>

          {/* 搜索框 + 已选过滤按钮 */}
          {normalSites.length > 0 ? (
            <div className="flex gap-2">
              <label className="relative flex-1">
                <Search className={cn("pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2", isDark ? "text-white/35" : "text-slate-400")} />
                <input
                  value={siteSearch}
                  onChange={(e) => setSiteSearch(e.target.value)}
                  placeholder="搜索网站名或地址"
                  className={cn("w-full rounded-xl border px-3 py-2 pl-9 text-xs outline-none", getDialogInputClass(themeMode))}
                />
              </label>
              <button
                type="button"
                onClick={() => setShowSelectedOnly((v) => !v)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition",
                  showSelectedOnly
                    ? isDark
                      ? "border-white/40 bg-white text-slate-900 shadow-[0_0_0_1px_rgba(255,255,255,0.3)]"
                      : "border-slate-900 bg-slate-900 text-white shadow-sm"
                    : cn(getDialogSecondaryBtnClass(themeMode), isDark ? "text-white/60" : "text-slate-500"),
                )}
              >
                <Filter className="h-3.5 w-3.5" />
                已选
              </button>
            </div>
          ) : null}

          {/* 网站卡片列表 */}
          <div className={cn(
            "flex flex-col gap-0.5 overflow-y-auto rounded-xl border p-1.5",
            "max-h-[360px] min-h-[200px]",
            getDialogSectionClass(themeMode),
          )}>
            {normalSites.length === 0 ? (
              <p className={cn("px-3 py-6 text-center text-xs", getDialogSubtleClass(themeMode))}>
                暂无可关联的网站卡片
              </p>
            ) : filteredSites.length === 0 ? (
              <p className={cn("px-3 py-6 text-center text-xs", getDialogSubtleClass(themeMode))}>
                未找到匹配的网站
              </p>
            ) : (
              filteredSites.map((site) => {
                const checked = selectedSiteIds.has(site.id);
                const iconSrc = site.iconUrl || generateTextIconDataUrl(
                  site.name.charAt(0),
                  site.iconBgColor || "transparent",
                );
                // 截断过长的 URL 用于显示
                const displayUrl = site.siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
                const truncatedUrl = displayUrl.length > 28 ? displayUrl.slice(0, 28) + "..." : displayUrl;

                return (
                  <label
                    key={site.id}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 cursor-pointer transition-colors duration-150",
                      checked
                        ? isDark
                          ? "bg-white/18"
                          : "bg-slate-200/80"
                        : isDark
                          ? "hover:bg-white/6"
                          : "hover:bg-slate-50",
                    )}
                  >
                    {/* 勾选框 */}
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSite(site.id)}
                      className={cn(
                        "h-4 w-4 shrink-0 rounded border accent-slate-900",
                        isDark ? "border-white/20" : "border-slate-300",
                      )}
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={iconSrc}
                      alt=""
                      className="h-7 w-7 shrink-0 rounded-lg object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = generateTextIconDataUrl(
                          site.name.charAt(0),
                          site.iconBgColor || "#64748b",
                        );
                      }}
                    />
                    {/* 网站名称和 URL */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium leading-tight">
                        {site.name}
                      </p>
                      <p className={cn("truncate text-xs leading-tight", getDialogSubtleClass(themeMode))}>
                        {truncatedUrl}
                      </p>
                    </div>
                    {/* 跳转按钮（带自定义 Tooltip） */}
                    <LinkTooltip url={site.siteUrl} themeMode={themeMode} />
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 底部固定操作栏 */}
      {!hideBottomBar ? (
        <div className={cn("flex items-center gap-2 pt-4 border-t", isDark ? "border-white/8" : "border-slate-200/60")}>
          <button
            type="button"
            onClick={onSubmit}
            disabled={nameReserved}
            className={cn("inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition disabled:opacity-60", getDialogPrimaryBtnClass(themeMode))}
          >
            {submitLabel === "创建标签" ? <Plus className="h-4 w-4" /> : <PencilLine className="h-4 w-4" />}
            {submitLabel}
          </button>
          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className={cn("inline-flex flex-1 items-center justify-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-medium transition", getDialogDangerBtnClass(themeMode))}
            >
              <Trash2 className="h-4 w-4" />
              删除标签
            </button>
          ) : null}
        </div>
      ) : !tagForm.id ? (
        /* 新建模式：仅显示创建按钮 */
        <div className={cn("flex items-center gap-2 pt-4 border-t", isDark ? "border-white/8" : "border-slate-200/60")}>
          <button
            type="button"
            onClick={onSubmit}
            disabled={nameReserved}
            className={cn("inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition disabled:opacity-60", getDialogPrimaryBtnClass(themeMode))}
          >
            <Plus className="h-4 w-4" />
            创建标签
          </button>
        </div>
      ) : null}
    </div>
  );
}
