/**
 * 关联推荐子 Tab 组件
 * @description 网站编辑器中的「关联推荐」Tab，包含：
 *   - 推荐上下文（带开关和折叠的卡片，默认关闭/折叠；关闭后仍可展开编辑）
 *   - 关联网站（带总开关和折叠的卡片，默认开启/折叠，内含 AI 配置 + 网站列表；关闭后仍可展开编辑）
 */

"use client";

import { type Dispatch, type SetStateAction, useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Search,
  Filter,
  Sparkles,
  LoaderCircle,
  AlertCircle,
  Bot,
  Eye,
  Lock,
  Unlock,
  Check,
} from "lucide-react";
import type { RelatedSiteItem, Site, ThemeMode } from "@/lib/base/types";
import type { SiteFormState } from "./types";
import { requestJson } from "@/lib/base/api";
import { cn } from "@/lib/utils/utils";
import { generateTextIconDataUrl } from "@/lib/utils/icon-utils";
import { Tooltip } from "@/components/ui/tooltip";
import {
  getDialogInputClass,
  getDialogSectionClass,
  getDialogSubtleClass,
  getDialogSecondaryBtnClass,
  getDialogListItemClass,
} from "@/components/sakura-nav/style-helpers";
import { getAiDraftConfig } from "@/lib/utils/ai-draft-ref";

// ──────────────────────────────────────
// 类型
// ──────────────────────────────────────

type AIRecommendation = {
  siteId: string;
  reason: string;
  score: number;
};

/** 筛选模式 */
type FilterMode = "all" | "linked" | "ai" | "manual" | "locked";

const FILTER_OPTIONS: { value: FilterMode; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "linked", label: "已关联" },
  { value: "ai", label: "AI 关联" },
  { value: "manual", label: "用户关联" },
  { value: "locked", label: "已锁定" },
];

type Props = {
  siteForm: SiteFormState;
  setSiteForm: Dispatch<SetStateAction<SiteFormState>>;
  existingSites: Site[];
  themeMode: ThemeMode;
};

// ──────────────────────────────────────
// Toggle Switch 子组件
// ──────────────────────────────────────

function ToggleSwitch({
  checked,
  onChange,
  isDark,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  isDark: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors",
        checked
          ? isDark ? "border-emerald-400/30 bg-emerald-500/30" : "border-emerald-300/60 bg-emerald-100"
          : isDark ? "border-white/12 bg-white/10" : "border-slate-200/60 bg-slate-100",
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 rounded-full transition-transform",
          checked
            ? isDark ? "translate-x-6 bg-emerald-400" : "translate-x-6 bg-emerald-500"
            : isDark ? "translate-x-1 bg-white/50" : "translate-x-1 bg-slate-300",
        )}
      />
    </button>
  );
}

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
  isLocked,
  isAiSource,
  reason,
  isLinkDisallowed,
  iconSrc,
  truncatedUrl,
  isDark,
  themeMode,
  onToggle,
  onToggleLock,
}: {
  site: Site;
  checked: boolean;
  isLocked: boolean;
  isAiSource: boolean;
  reason: string;
  isLinkDisallowed: boolean;
  iconSrc: string;
  truncatedUrl: string;
  isDark: boolean;
  themeMode: ThemeMode;
  onToggle: () => void;
  onToggleLock: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors duration-150",
        isLinkDisallowed
          ? "opacity-40"
          : checked && isAiSource
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
        disabled={isLinkDisallowed}
        className={cn(
          "h-4 w-4 shrink-0 rounded border",
          isAiSource && !isLinkDisallowed
            ? "accent-violet-600"
            : "accent-slate-900",
          isDark ? "border-white/20" : "border-slate-300",
          isLinkDisallowed && "cursor-not-allowed",
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
      {/* 锁定按钮 */}
      {!isLinkDisallowed && (
        <Tooltip tip={isLocked ? "已锁定，AI 不可修改" : "未锁定，AI 可修改"} themeMode={themeMode}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleLock(); }}
            className={cn(
              "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition",
              isLocked
                ? isDark ? "text-amber-400 hover:bg-amber-500/15" : "text-amber-500 hover:bg-amber-50"
                : isDark ? "text-white/20 hover:text-white/40 hover:bg-white/8" : "text-slate-200 hover:text-slate-400 hover:bg-slate-100",
            )}
          >
            {isLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
          </button>
        </Tooltip>
      )}
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

  // ── AI 分析状态 ──
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  // ── 折叠状态 ──
  const contextEnabled = siteForm.recommendContextEnabled;
  const setContextEnabled = useCallback((val: boolean) => {
    setSiteForm((cur) => ({ ...cur, recommendContextEnabled: val }));
  }, [setSiteForm]);
  const [contextCollapsed, setContextCollapsed] = useState(!contextEnabled);
  const relatedEnabled = siteForm.relatedSitesEnabled;
  const setRelatedEnabled = useCallback((val: boolean) => {
    setSiteForm((cur) => ({ ...cur, relatedSitesEnabled: val }));
  }, [setSiteForm]);
  const [relatedCollapsed, setRelatedCollapsed] = useState(true);

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
    } else if (filterMode === "locked") {
      result = result.filter((s) => relatedMap.get(s.id)?.locked === true);
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
            // 取消勾选：若未锁定则直接移除
            if (!existing.locked) {
              return {
                ...cur,
                relatedSites: cur.relatedSites
                  .filter((rs) => rs.siteId !== siteId)
                  .map((rs, i) => ({ ...rs, sortOrder: i })),
              };
            }
            return {
              ...cur,
              relatedSites: cur.relatedSites.map((rs) =>
                rs.siteId === siteId ? { ...rs, enabled: false } : rs,
              ),
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
          locked: false,
          sortOrder: cur.relatedSites.length,
          source: "manual",
          reason: "",
        };
        return { ...cur, relatedSites: [...cur.relatedSites, newItem] };
      });
    },
    [setSiteForm, existingSites],
  );

  // ── 切换锁定 ──
  const toggleLocked = useCallback(
    (siteId: string) => {
      setSiteForm((cur) => {
        const existing = cur.relatedSites.find((rs) => rs.siteId === siteId);
        if (existing) {
          const newLocked = !existing.locked;
          if (!newLocked && !existing.enabled) {
            return {
              ...cur,
              relatedSites: cur.relatedSites
                .filter((rs) => rs.siteId !== siteId)
                .map((rs, i) => ({ ...rs, sortOrder: i })),
            };
          }
          return {
            ...cur,
            relatedSites: cur.relatedSites.map((rs) =>
              rs.siteId === siteId ? { ...rs, locked: newLocked } : rs,
            ),
          };
        }
        const site = existingSites.find((s) => s.id === siteId);
        if (!site) return cur;
        const newItem: RelatedSiteItem = {
          siteId,
          siteName: site.name,
          siteIconUrl: site.iconUrl ?? null,
          siteUrl: site.url,
          enabled: false,
          locked: true,
          sortOrder: cur.relatedSites.length,
          source: "manual",
          reason: "",
        };
        return { ...cur, relatedSites: [...cur.relatedSites, newItem] };
      });
    },
    [setSiteForm, existingSites],
  );

  // ── AI 分析（直接应用到关联网站列表） ──
  // AI 推荐 → source:"ai" + reason；非推荐且未锁定 → 移除
  const handleAiAnalyze = useCallback(async () => {
    if (!siteForm.id) {
      setAiError("请先保存网站后再进行 AI 关联分析");
      return;
    }
    setAiError("");
    setAiLoading(true);
    try {
      // 标记已手动触发 AI 分析，保存时不再自动触发
      setSiteForm((cur) => ({ ...cur, aiAnalyzed: true }));
      const draftConfig = getAiDraftConfig();
      const payload: { siteId: string; _draftAiConfig?: { aiApiKey?: string; aiBaseUrl?: string; aiModel?: string } } = {
        siteId: siteForm.id,
        _draftAiConfig: draftConfig,
      };
      const result = await requestJson<{ recommendations: AIRecommendation[] }>(
        "/api/ai/analyze-relations",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const recommendations = result.recommendations ?? [];

      // 标记已手动触发 AI 分析，保存时不再自动触发
      setSiteForm((cur) => ({ ...cur, aiAnalyzed: true }));

      // 直接应用：保留锁定项 + AI 新推荐，移除非锁定的非推荐项
      setSiteForm((cur) => {
        const kept: RelatedSiteItem[] = [];
        // 1. 保留锁定项（不论是否被 AI 推荐）
        for (const item of cur.relatedSites) {
          if (item.locked) {
            kept.push(item);
          }
        }
        // 2. AI 推荐的项（排除已锁定的，避免重复）
        for (const rec of recommendations) {
          if (kept.some((k) => k.siteId === rec.siteId)) continue;
          const site = existingSites.find((s) => s.id === rec.siteId);
          if (!site) continue;
          kept.push({
            siteId: rec.siteId,
            siteName: site.name,
            siteIconUrl: site.iconUrl ?? null,
            siteUrl: site.url,
            enabled: true,
            locked: false,
            source: "ai",
            reason: rec.reason,
            sortOrder: kept.length,
          });
        }
        // 重排 sortOrder
        return { ...cur, relatedSites: kept.map((item, i) => ({ ...item, sortOrder: i })) };
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("未配置")) {
        setAiError("AI 功能未配置。");
      } else {
        setAiError("AI 服务不可用，请稍后重试。");
      }
    } finally {
      setAiLoading(false);
    }
  }, [siteForm.id, existingSites, setSiteForm]);

  // ── 关联网站统计 ──
  const linkedCount = siteForm.relatedSites.filter((rs) => rs.enabled).length;
  const totalCount = siteForm.relatedSites.length;

  return (
    <div className="flex flex-col gap-4 pb-5">

      {/* ════════ 推荐上下文 ════════ */}
      <section className={cn("rounded-2xl border", getDialogSectionClass(themeMode))}>
        <div className="flex items-center justify-between p-4 pb-3">
          <div className="min-w-0 flex-1">
            <h4 className="text-[15px] font-semibold">推荐上下文</h4>
            <p className={cn("mt-0.5 text-xs", getDialogSubtleClass(themeMode))}>
              AI 辅助推荐的额外信息，不会显示在卡片上
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <ToggleSwitch
              checked={contextEnabled}
              onChange={(val) => setContextEnabled(val)}
              isDark={isDark}
            />
            <button
              type="button"
              onClick={() => setContextCollapsed(!contextCollapsed)}
              className={cn(
                "inline-flex h-7 w-7 items-center justify-center rounded-lg border transition",
                isDark
                  ? "border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
                  : "border-slate-200/60 text-slate-400 hover:bg-slate-100 hover:text-slate-700",
              )}
            >
              {contextCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {!contextCollapsed && (
          <div className={cn("px-4 pb-4", !contextEnabled && "opacity-50")}>
            <textarea
              value={siteForm.recommendContext}
              onChange={(e) => setSiteForm((cur) => ({ ...cur, recommendContext: e.target.value }))}
              placeholder="可输入与该网站相关的背景信息、使用场景、关键词等，帮助 AI 更准确地推荐关联网站..."
              rows={3}
              className={cn("w-full rounded-xl border px-3 py-2 text-sm outline-none resize-none", getDialogInputClass(themeMode))}
            />
          </div>
        )}
      </section>

      {/* ════════ 关联网站 ════════ */}
      <section className={cn("rounded-2xl border", getDialogSectionClass(themeMode))}>
        <div className="flex items-center justify-between p-4 pb-3">
          <div className="min-w-0 flex-1">
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
          <div className="flex shrink-0 items-center gap-1.5">
            <ToggleSwitch
              checked={relatedEnabled}
              onChange={(val) => setRelatedEnabled(val)}
              isDark={isDark}
            />
            <button
              type="button"
              onClick={() => setRelatedCollapsed(!relatedCollapsed)}
              className={cn(
                "inline-flex h-7 w-7 items-center justify-center rounded-lg border transition",
                isDark
                  ? "border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
                  : "border-slate-200/60 text-slate-400 hover:bg-slate-100 hover:text-slate-700",
              )}
            >
              {relatedCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {!relatedCollapsed && (
          <div className={cn("px-4 pb-4 space-y-4", !relatedEnabled && "opacity-50 pointer-events-none")}>

            {/* ── AI 配置区 ── */}
            <div className="space-y-3">
              <div className={cn("flex flex-col gap-2.5 rounded-xl border px-3 py-2.5", getDialogListItemClass(themeMode))}>
                {/* AI 智能关联开关 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Bot className={cn("h-4 w-4 shrink-0", isDark ? "text-violet-400" : "text-violet-500")} />
                    <div>
                      <span className="text-sm font-medium">智能关联</span>
                      <p className={cn("text-xs mt-0.5", getDialogSubtleClass(themeMode))}>
                        新建网站或 URL 变更时，自动分析并关联相关网站
                      </p>
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={siteForm.aiRelationEnabled}
                    onChange={(val) => setSiteForm((cur) => ({ ...cur, aiRelationEnabled: val }))}
                    isDark={isDark}
                  />
                </div>

                {/* 允许被关联开关 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Eye className={cn("h-4 w-4 shrink-0", isDark ? "text-blue-400" : "text-blue-500")} />
                    <div>
                      <span className="text-sm font-medium">允许被关联</span>
                      <p className={cn("text-xs mt-0.5", getDialogSubtleClass(themeMode))}>
                        其他网站可将本网站作为关联网站
                      </p>
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={siteForm.allowLinkedByOthers}
                    onChange={(val) => setSiteForm((cur) => ({ ...cur, allowLinkedByOthers: val }))}
                    isDark={isDark}
                  />
                </div>
              </div>

              {/* 立即分析按钮 */}
              {siteForm.id && (
                <Tooltip
                  tip="AI 分析将直接更新关联网站列表，已锁定的关联不受影响"
                  themeMode={themeMode}
                >
                  <button
                    type="button"
                    onClick={() => void handleAiAnalyze()}
                    disabled={aiLoading}
                    className={cn(
                      "inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed",
                      isDark
                        ? "border-violet-500/20 bg-violet-500/10 text-violet-300 hover:bg-violet-500/16"
                        : "border-violet-200/50 bg-violet-50 text-violet-700 hover:bg-violet-100",
                    )}
                  >
                    {aiLoading ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {aiLoading ? "分析中…" : "立即分析关联网站"}
                  </button>
                </Tooltip>
              )}
            </div>

            {/* ── AI 分析错误提示 ── */}
            {aiError && (
              <div className={cn(
                "flex items-start gap-2 rounded-xl border px-3 py-2 text-sm",
                isDark ? "border-amber-500/25 bg-amber-500/10 text-amber-200" : "border-amber-200/60 bg-amber-50 text-amber-700",
              )}>
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{aiError}</span>
              </div>
            )}

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
                  const isLocked = relatedItem?.locked ?? false;
                  const isAiSource = relatedItem?.source === "ai";
                  const reason = relatedItem?.reason ?? "";
                  const isLinkDisallowed = site.allowLinkedByOthers === false;
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
                      isLocked={isLocked}
                      isAiSource={isAiSource}
                      reason={reason}
                      isLinkDisallowed={isLinkDisallowed}
                      iconSrc={iconSrc}
                      truncatedUrl={truncatedUrl}
                      isDark={isDark}
                      themeMode={themeMode}
                      onToggle={() => { if (!isLinkDisallowed) toggleRelated(site.id); }}
                      onToggleLock={() => toggleLocked(site.id)}
                    />
                  );
                })
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
