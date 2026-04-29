/**
 * 关联推荐子 Tab 组件
 * @description 网站编辑器中的「关联推荐」Tab，包含：
 *   - 推荐上下文（带开关和折叠的卡片，默认关闭/折叠；关闭后仍可展开编辑）
 *   - 关联网站（带总开关和折叠的卡片，默认开启/折叠，内含 AI 配置 + 网站列表；关闭后仍可展开编辑）
 */

"use client";

import { type Dispatch, type SetStateAction, useState, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
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
// 跳转按钮 Tooltip（Portal 渲染，避免 transform 裁切）
// ──────────────────────────────────────

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

// ──────────────────────────────────────
// 主组件
// ──────────────────────────────────────

export function RelatedSitesTab({ siteForm, setSiteForm, existingSites, themeMode }: Props) {
  const isDark = themeMode === "dark";

  // ── AI 分析状态 ──
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiRecommendations, setAiRecommendations] = useState<AIRecommendation[]>([]);

  // ── 折叠状态 ──
  // 推荐上下文：根据 siteForm.recommendContextEnabled 判断开关状态
  const contextEnabled = siteForm.recommendContextEnabled;
  const setContextEnabled = useCallback((val: boolean) => {
    setSiteForm((cur) => ({ ...cur, recommendContextEnabled: val }));
  }, [setSiteForm]);
  const [contextCollapsed, setContextCollapsed] = useState(!contextEnabled);
  // 关联网站：根据 siteForm.relatedSitesEnabled 判断开关状态
  const relatedEnabled = siteForm.relatedSitesEnabled;
  const setRelatedEnabled = useCallback((val: boolean) => {
    setSiteForm((cur) => ({ ...cur, relatedSitesEnabled: val }));
  }, [setSiteForm]);
  const [relatedCollapsed, setRelatedCollapsed] = useState(true);

  // ── 搜索与过滤 ──
  const [siteSearch, setSiteSearch] = useState("");
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

  // 仅显示普通网站（排除社交卡片和自身），按名称排序
  const normalSites = useMemo(
    () => existingSites
      .filter((s) => s.cardType == null && s.id !== siteForm.id)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
    [existingSites, siteForm.id],
  );

  // 已关联的 siteId 集合（用于"已选"过滤，含 enabled=false 的条目）
  const relatedSiteIds = useMemo(
    () => new Set(siteForm.relatedSites.map((rs) => rs.siteId)),
    [siteForm.relatedSites],
  );

  // 搜索 + 过滤
  const filteredSites = useMemo(() => {
    let result = normalSites;
    if (showSelectedOnly) {
      result = result.filter((s) => relatedSiteIds.has(s.id));
    }
    const needle = siteSearch.trim().toLowerCase();
    if (needle) {
      result = result.filter((s) =>
        `${s.name} ${s.url}`.toLowerCase().includes(needle)
      );
    }
    return result;
  }, [normalSites, relatedSiteIds, showSelectedOnly, siteSearch]);

  // ── 切换关联（勾选框） ──
  // 勾选 = enabled:true（关联），取消 = enabled:false（不关联但保留锁定信息）
  const toggleRelated = useCallback(
    (siteId: string) => {
      setSiteForm((cur) => {
        const existing = cur.relatedSites.find((rs) => rs.siteId === siteId);
        if (existing) {
          if (existing.enabled) {
            // 当前已勾选 → 取消勾选：设 enabled=false
            // 若无锁定则直接移除（减少无用数据）
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
          // 当前未勾选 → 勾选：设 enabled=true
          return {
            ...cur,
            relatedSites: cur.relatedSites.map((rs) =>
              rs.siteId === siteId ? { ...rs, enabled: true } : rs,
            ),
          };
        }
        // 不在列表中 → 新增关联
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
        };
        return { ...cur, relatedSites: [...cur.relatedSites, newItem] };
      });
    },
    [setSiteForm, existingSites],
  );

  // ── 切换锁定（锁定按钮，与勾选独立） ──
  // 锁定 = AI 不可修改该网站的关联状态
  const toggleLocked = useCallback(
    (siteId: string) => {
      setSiteForm((cur) => {
        const existing = cur.relatedSites.find((rs) => rs.siteId === siteId);
        if (existing) {
          // 已在列表中：切换锁定状态
          const newLocked = !existing.locked;
          // 若解锁且未勾选，移除条目（减少无用数据）
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
        // 不在列表中 → 添加为 enabled:false, locked:true（锁定但不关联）
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
        };
        return { ...cur, relatedSites: [...cur.relatedSites, newItem] };
      });
    },
    [setSiteForm, existingSites],
  );

  // ── AI 分析 ──
  const handleAiAnalyze = useCallback(async () => {
    if (!siteForm.id) {
      setAiError("请先保存网站后再进行 AI 关联分析");
      return;
    }
    setAiError("");
    setAiLoading(true);
    try {
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
      setAiRecommendations(result.recommendations ?? []);
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
  }, [siteForm.id]);

  // ── 接受 AI 推荐 ──
  const acceptAiRecommendations = useCallback(() => {
    setSiteForm((cur) => {
      const existingIds = new Set(cur.relatedSites.map((rs) => rs.siteId));
      const newItems: RelatedSiteItem[] = aiRecommendations
        .filter((rec) => !existingIds.has(rec.siteId))
        .map((rec, i) => {
          const site = existingSites.find((s) => s.id === rec.siteId);
          return {
            siteId: rec.siteId,
            siteName: site?.name ?? "未知",
            siteIconUrl: site?.iconUrl ?? null,
            siteUrl: site?.url ?? "",
            enabled: true,
            locked: false,
            sortOrder: cur.relatedSites.length + i,
          };
        });
      return { ...cur, relatedSites: [...cur.relatedSites, ...newItems] };
    });
    setAiRecommendations([]);
  }, [aiRecommendations, existingSites, setSiteForm]);

  // ── AI 推荐单项接受/移除 ──
  const toggleAiRec = useCallback(
    (rec: AIRecommendation) => {
      if (relatedSiteIds.has(rec.siteId)) {
        toggleRelated(rec.siteId);
      } else {
        const site = existingSites.find((s) => s.id === rec.siteId);
        if (!site) return;
        setSiteForm((cur) => {
          const newItem: RelatedSiteItem = {
            siteId: rec.siteId,
            siteName: site.name,
            siteIconUrl: site.iconUrl ?? null,
            siteUrl: site.url,
            enabled: true,
            locked: false,
            sortOrder: cur.relatedSites.length,
          };
          return { ...cur, relatedSites: [...cur.relatedSites, newItem] };
        });
      }
    },
    [relatedSiteIds, toggleRelated, existingSites, setSiteForm],
  );

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

        {/* 开启/关闭均可展开编辑，关闭时内容不生效 */}
        {!contextCollapsed && (
          <div className={cn("px-4 pb-4", !contextEnabled && "opacity-50")}>
            <textarea
              value={siteForm.recommendContext}
              onChange={(e) => setSiteForm((cur) => ({ ...cur, recommendContext: e.target.value }))}
              placeholder="可输入与该网站相关的背景信息、使用场景、关键词等，帮助 AI 更准确地推荐关联网站..."
              rows={3}
              disabled={!contextEnabled}
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
              {siteForm.relatedSites.length > 0 && (
                <span className={cn("ml-1.5 text-xs font-normal", getDialogSubtleClass(themeMode))}>
                  ({siteForm.relatedSites.filter((rs) => rs.enabled).length}/{siteForm.relatedSites.length})
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

        {/* 开启/关闭均可展开编辑，关闭时内容不生效 */}
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
                      <span className="text-sm font-medium">AI 智能关联</span>
                      <p className={cn("text-xs mt-0.5", getDialogSubtleClass(themeMode))}>
                        允许 AI 定时自动分析并更新关联网站
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
                        其他网站 AI 分析时可将本网站作为推荐
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
                  tip="立即触发一次 AI 分析，与「AI 智能关联」定时分析独立"
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

            {/* ── AI 推荐结果 ── */}
            {aiRecommendations.length > 0 && (
              <div className={cn(
                "rounded-xl border p-3",
                isDark ? "border-violet-500/20 bg-violet-500/8" : "border-violet-200/60 bg-violet-50",
              )}>
                <div className="flex items-center justify-between mb-2">
                  <p className={cn("text-sm font-medium", isDark ? "text-violet-200" : "text-violet-700")}>
                    AI 推荐关联
                  </p>
                  <button
                    type="button"
                    onClick={acceptAiRecommendations}
                    className={cn(
                      "text-xs font-medium rounded-lg px-3 py-1.5 transition",
                      isDark ? "bg-violet-500/20 text-violet-200 hover:bg-violet-500/30" : "bg-violet-100 text-violet-700 hover:bg-violet-200",
                    )}
                  >
                    全部添加
                  </button>
                </div>
                <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto">
                  {aiRecommendations.map((rec) => {
                    const site = existingSites.find((s) => s.id === rec.siteId);
                    if (!site) return null;
                    const accepted = relatedSiteIds.has(rec.siteId);
                    return (
                      <div
                        key={rec.siteId}
                        className={cn("flex items-center gap-2.5 rounded-xl border px-3 py-2", getDialogListItemClass(themeMode))}
                      >
                        <input
                          type="checkbox"
                          checked={accepted}
                          onChange={() => toggleAiRec(rec)}
                          className="shrink-0"
                        />
                        <span className="truncate text-sm flex-1">{site.name}</span>
                        <span className={cn("text-xs truncate max-w-[120px]", getDialogSubtleClass(themeMode))}>
                          {rec.reason}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── 统计行 ── */}
            <div className="flex items-center justify-between">
              <span className={cn("text-xs tabular-nums", getDialogSubtleClass(themeMode))}>
                已选 {siteForm.relatedSites.length} / {normalSites.length}
              </span>
            </div>

            {/* ── 搜索框 + 已选过滤按钮 ── */}
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
                  const relatedItem = siteForm.relatedSites.find((rs) => rs.siteId === site.id);
                  const checked = relatedItem?.enabled ?? false;
                  const isLocked = relatedItem?.locked ?? false;
                  const iconSrc = site.iconUrl || generateTextIconDataUrl(
                    site.name.charAt(0),
                    site.iconBgColor || "transparent",
                  );
                  const displayUrl = site.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
                  const truncatedUrl = displayUrl.length > 28 ? displayUrl.slice(0, 28) + "..." : displayUrl;

                  return (
                    <div
                      key={site.id}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors duration-150",
                        checked
                          ? isDark ? "bg-white/18" : "bg-slate-200/80"
                          : isDark ? "hover:bg-white/6" : "hover:bg-slate-50",
                      )}
                    >
                      {/* 勾选框 */}
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRelated(site.id)}
                        className={cn(
                          "h-4 w-4 shrink-0 rounded border accent-slate-900",
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
                        <p className="truncate text-sm font-medium leading-tight">{site.name}</p>
                        <p className={cn("truncate text-xs leading-tight", getDialogSubtleClass(themeMode))}>
                          {truncatedUrl}
                        </p>
                      </div>
                      {/* 锁定按钮（常驻显示） */}
                      <Tooltip tip={isLocked ? "已锁定，AI 不可修改" : "未锁定，AI 可修改"} themeMode={themeMode}>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleLocked(site.id); }}
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
                      {/* 跳转按钮 */}
                      <LinkTooltip url={site.url} themeMode={themeMode} />
                    </div>
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
