/**
 * 关联推荐子 Tab 组件
 * @description 网站编辑器中的「关联推荐」Tab，包含：
 *   - 推荐上下文（可折叠的卡片，内容为空即未使用）
 *   - 关联网站（可折叠的卡片，含配置 + 网站列表）
 */

"use client";

import { type Dispatch, type SetStateAction, useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  ExternalLink,
  Search,
  Filter,
  Bot,
  Check,
} from "lucide-react";
import type { RelatedSiteItem, Site, ThemeMode } from "@/lib/base/types";
import type { SiteFormState } from "./types";
import { cn } from "@/lib/utils/utils";
import { generateTextIconDataUrl } from "@/lib/utils/icon-utils";
import { Tooltip } from "@/components/ui/tooltip";
import {
  getDialogInputClass,
  getDialogSectionClass,
  getDialogSubtleClass,
  getDialogSecondaryBtnClass,
} from "@/components/sakura-nav/style-helpers";

// ──────────────────────────────────────
// 类型
// ──────────────────────────────────────

/** 筛选模式 */
type FilterMode = "all" | "linked" | "ai" | "manual";

const FILTER_OPTIONS: { value: FilterMode; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "linked", label: "已关联" },
  { value: "ai", label: "AI 关联" },
  { value: "manual", label: "用户关联" },
];

type Props = {
  siteForm: SiteFormState;
  setSiteForm: Dispatch<SetStateAction<SiteFormState>>;
  existingSites: Site[];
  themeMode: ThemeMode;
};

// ──────────────────────────────────────
// 筛选下拉菜单
// ──────────────────────────────────────

function FilterDropdown({
  value,
  onChange,
  themeMode,
}: {
  value: FilterMode;
  onChange: (v: FilterMode) => void;
  themeMode: ThemeMode;
}) {
  const isDark = themeMode === "dark";
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const currentLabel = FILTER_OPTIONS.find((o) => o.value === value)?.label ?? "全部";

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition",
          value !== "all"
            ? isDark
              ? "border-white/40 bg-white text-slate-900 shadow-[0_0_0_1px_rgba(255,255,255,0.3)]"
              : "border-slate-900 bg-slate-900 text-white shadow-sm"
            : cn(getDialogSecondaryBtnClass(themeMode), isDark ? "text-white/60" : "text-slate-500"),
        )}
      >
        <Filter className="h-3.5 w-3.5" />
        {currentLabel}
      </button>
      {open && (
        <div
          className={cn(
            "absolute right-0 top-full z-50 mt-1 min-w-[120px] rounded-xl border py-1 shadow-lg",
            isDark
              ? "border-white/10 bg-slate-900/95 backdrop-blur-sm"
              : "border-slate-200 bg-white",
          )}
        >
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors",
                value === opt.value
                  ? isDark ? "bg-white/10 text-white font-medium" : "bg-slate-100 text-slate-900 font-medium"
                  : isDark ? "text-white/70 hover:bg-white/6" : "text-slate-600 hover:bg-slate-50",
              )}
            >
              {value === opt.value && <Check className="h-3 w-3 shrink-0" />}
              <span className={value !== opt.value ? "ml-5" : ""}>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────
// 关联网站行组件
// ──────────────────────────────────────

function RelatedSiteRow({
  site,
  checked,
  isAiSource,
  reason,
  iconSrc,
  truncatedUrl,
  isDark,
  themeMode,
  onToggle,
}: {
  site: Site;
  checked: boolean;
  isAiSource: boolean;
  reason: string;
  iconSrc: string;
  truncatedUrl: string;
  isDark: boolean;
  themeMode: ThemeMode;
  onToggle: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors duration-150",
        checked && isAiSource
          ? isDark ? "bg-violet-500/12" : "bg-violet-50"
          : checked
            ? isDark ? "bg-white/18" : "bg-slate-200/80"
            : isDark ? "hover:bg-white/6" : "hover:bg-slate-50",
      )}
    >
      {/* 勾选框 */}
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className={cn(
          "h-4 w-4 shrink-0 rounded border",
          isAiSource
            ? "accent-violet-600"
            : "accent-slate-900",
          isDark ? "border-white/20" : "border-slate-300",
        )}
      />
      {/* 图标 */}
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
        <div className="truncate text-sm font-medium leading-tight">
          {site.name}
          {checked && isAiSource && (
            <Tooltip tip={reason ? `AI 关联：${reason}` : "AI 智能关联"} themeMode={themeMode}>
              <span className={cn(
                "ml-1.5 inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-medium",
                isDark ? "bg-violet-500/20 text-violet-300" : "bg-violet-100 text-violet-600",
              )}>
                <Bot className="h-2.5 w-2.5" />AI
              </span>
            </Tooltip>
          )}
          {checked && !isAiSource && (
            <Tooltip tip="用户手动关联" themeMode={themeMode}>
              <span className={cn(
                "ml-1.5 inline-flex items-center rounded px-1 py-0.5 text-[10px] font-medium",
                isDark ? "bg-emerald-500/20 text-emerald-300" : "bg-emerald-100 text-emerald-600",
              )}>
                用户
              </span>
            </Tooltip>
          )}
        </div>
        <p className={cn("truncate text-xs leading-tight", getDialogSubtleClass(themeMode))}>
          {truncatedUrl}
        </p>
      </div>
      {/* 跳转按钮 */}
      <Tooltip tip="跳转到该网站" themeMode={themeMode}>
        <a
          href={site.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-all duration-150",
            isDark
              ? "text-white/35 hover:text-white hover:bg-white/15 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.15)]"
              : "text-slate-400 hover:text-slate-700 hover:bg-slate-300/60 hover:shadow-[0_0_0_1px_rgba(0,0,0,0.08)]",
          )}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </Tooltip>
    </div>
  );
}

// ──────────────────────────────────────
// 主组件
// ──────────────────────────────────────

export function RelatedSitesTab({ siteForm, setSiteForm, existingSites, themeMode }: Props) {
  const isDark = themeMode === "dark";

  // ── 搜索与筛选 ──
  const [siteSearch, setSiteSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  // 可选网站：排除社交卡片和自身，按名称排序
  const normalSites = useMemo(
    () => existingSites
      .filter((s) => s.cardType == null && s.id !== siteForm.id)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
    [existingSites, siteForm.id],
  );

  // 已关联的 siteId → RelatedSiteItem 映射
  const relatedMap = useMemo(() => {
    const map = new Map<string, RelatedSiteItem>();
    for (const rs of siteForm.relatedSites) map.set(rs.siteId, rs);
    return map;
  }, [siteForm.relatedSites]);

  // 搜索 + 筛选
  const filteredSites = useMemo(() => {
    let result = normalSites;
    // 按筛选模式过滤
    if (filterMode === "linked") {
      result = result.filter((s) => relatedMap.has(s.id));
    } else if (filterMode === "ai") {
      result = result.filter((s) => relatedMap.get(s.id)?.source === "ai");
    } else if (filterMode === "manual") {
      result = result.filter((s) => {
        const item = relatedMap.get(s.id);
        return item && item.source !== "ai";
      });
    }
    // 按搜索词过滤
    const needle = siteSearch.trim().toLowerCase();
    if (needle) {
      result = result.filter((s) =>
        `${s.name} ${s.url}`.toLowerCase().includes(needle)
      );
    }
    return result;
  }, [normalSites, relatedMap, filterMode, siteSearch]);

  // ── 切换关联（用户手动勾选/取消） ──
  const toggleRelated = useCallback(
    (siteId: string) => {
      setSiteForm((cur) => {
        const existing = cur.relatedSites.find((rs) => rs.siteId === siteId);
        if (existing) {
          if (existing.enabled) {
            // 取消勾选：直接移除
            return {
              ...cur,
              relatedSites: cur.relatedSites
                .filter((rs) => rs.siteId !== siteId)
                .map((rs, i) => ({ ...rs, sortOrder: i })),
            };
          }
          // 重新勾选
          return {
            ...cur,
            relatedSites: cur.relatedSites.map((rs) =>
              rs.siteId === siteId ? { ...rs, enabled: true, source: "manual" as const, reason: "" } : rs,
            ),
          };
        }
        // 新增手动关联
        const site = existingSites.find((s) => s.id === siteId);
        if (!site) return cur;
        const newItem: RelatedSiteItem = {
          siteId,
          siteName: site.name,
          siteIconUrl: site.iconUrl ?? null,
          siteUrl: site.url,
          enabled: true,
          sortOrder: cur.relatedSites.length,
          source: "manual",
          reason: "",
        };
        return { ...cur, relatedSites: [...cur.relatedSites, newItem] };
      });
    },
    [setSiteForm, existingSites],
  );

  // ── 关联网站统计 ──
  const linkedCount = siteForm.relatedSites.filter((rs) => rs.enabled).length;
  const totalCount = siteForm.relatedSites.length;

  return (
    <div className="flex flex-col gap-4 pb-5">

      {/* ════════ 推荐上下文 ════════ */}
      <section className={cn("rounded-2xl border", getDialogSectionClass(themeMode))}>
        <div className="p-4 pb-3">
          <h4 className="text-[15px] font-semibold">推荐上下文</h4>
          <p className={cn("mt-0.5 text-xs", getDialogSubtleClass(themeMode))}>
            所有 AI 功能可读取的补充信息，不会显示在卡片上
          </p>
        </div>

        <div className="px-4 pb-4">
          <textarea
            value={siteForm.recommendContext}
            onChange={(e) => setSiteForm((cur) => ({ ...cur, recommendContext: e.target.value }))}
            placeholder="补充网站的使用场景、用途等细节信息，帮助所有 AI 功能更准确地理解和分析该网站。也可通过基本信息 Tab 的「全部分析」由 AI 自动生成..."
            rows={3}
            className={cn(
              "w-full rounded-xl border px-3 py-2 text-sm outline-none resize-none transition-colors",
              getDialogInputClass(themeMode),
            )}
          />
        </div>
      </section>

      {/* ════════ 关联网站 ════════ */}
      <section className={cn("rounded-2xl border", getDialogSectionClass(themeMode))}>
        <div className="p-4 pb-3">
          <h4 className="text-[15px] font-semibold">
            关联网站
            {totalCount > 0 && (
              <span className={cn("ml-1.5 text-xs font-normal", getDialogSubtleClass(themeMode))}>
                ({linkedCount}/{totalCount})
              </span>
            )}
          </h4>
          <p className={cn("mt-0.5 text-xs", getDialogSubtleClass(themeMode))}>
            设置与本网站相关联的其他网站
          </p>
        </div>

        <div className="px-4 pb-4 space-y-4">

            {/* ── 统计行 ── */}
            <div className="flex items-center justify-between">
              <span className={cn("text-xs tabular-nums", getDialogSubtleClass(themeMode))}>
                已选 {totalCount} / {normalSites.length}
              </span>
            </div>

            {/* ── 搜索框 + 筛选下拉 ── */}
            {normalSites.length > 0 && (
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
                <FilterDropdown value={filterMode} onChange={setFilterMode} themeMode={themeMode} />
              </div>
            )}

            {/* ── 网站卡片列表 ── */}
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
                  const relatedItem = relatedMap.get(site.id);
                  const checked = relatedItem?.enabled ?? false;
                  const isAiSource = relatedItem?.source === "ai";
                  const reason = relatedItem?.reason ?? "";
                  const iconSrc = site.iconUrl || generateTextIconDataUrl(
                    site.name.charAt(0),
                    site.iconBgColor || "transparent",
                  );
                  const displayUrl = site.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
                  const truncatedUrl = displayUrl.length > 28 ? displayUrl.slice(0, 28) + "..." : displayUrl;

                  return (
                    <RelatedSiteRow
                      key={site.id}
                      site={site}
                      checked={checked}
                      isAiSource={isAiSource}
                      reason={reason}
                      iconSrc={iconSrc}
                      truncatedUrl={truncatedUrl}
                      isDark={isDark}
                      themeMode={themeMode}
                      onToggle={() => toggleRelated(site.id)}
                    />
                  );
                })
              )}
            </div>
          </div>
      </section>
    </div>
  );
}
