/**
 * 网站编辑表单组件
 * @description 双 Tab 布局：
 *   Tab 1：基本信息（图标、名称、URL、描述、关联标签）
 *   Tab 2：访问控制（备选 URL 列表、模式选择、在线检测配置）
 * 底部固定：保存 + 删除按钮
 */

"use client";

import { type Dispatch, type SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import { CircleAlert, ExternalLink, Globe, LoaderCircle, PencilLine, Plus, Shield, Sparkles, Trash2, X, Link2, StickyNote } from "lucide-react";
import { type Site, type Tag, type ThemeMode } from "@/lib/base/types";
import type { SiteFormState, TagFormState } from "./types";
import { defaultTagForm } from "./types";
import { TagEditorForm } from "./tag-editor-form";
import { SiteIconSelector, type SiteIconSelectorHandle } from "./site-icon-selector";
import { AccessRulesTab } from "./access-rules-tab";
import { RelatedSitesTab } from "./related-sites-tab";
import { NotesTab } from "./notes-tab";
import { requestJson } from "@/lib/base/api";
import { cn } from "@/lib/utils/utils";
import { Tooltip } from "@/components/ui/tooltip";
import { getAiDraftConfig } from "@/lib/utils/ai-draft-ref";
import { getDialogInputClass, getDialogSectionClass, getDialogSubtleClass, getDialogListItemClass, getDialogAddItemClass, getDialogPrimaryBtnClass, getDialogDangerBtnClass, getDialogCloseBtnClass, getDialogOverlayClass, getDialogPanelClass, getDialogSecondaryBtnClass } from "@/components/sakura-nav/style-helpers";

/** AI 分析结果类型 */
type AIAnalysisResult = {
  title: string;
  description: string;
  matchedTagIds: string[];
  recommendedTags: string[];
};

/** Tab 类型 */
type SiteEditorTab = "info" | "control" | "related" | "notes";

export function SiteEditorForm({
  siteForm,
  setSiteForm,
  tags,
  submitLabel,
  onSubmit,
  onDelete,
  onError,
  onTagsChange,
  themeMode = "dark",
  initialRecommendedTags,
  autoSelectIcon,
  existingSites,
}: {
  siteForm: SiteFormState;
  setSiteForm: Dispatch<SetStateAction<SiteFormState>>;
  tags: Tag[];
  submitLabel: string;
  onSubmit: (extraTagIds?: string[]) => void;
  onDelete?: () => void;
  onError?: (message: string) => void;
  onTagsChange?: () => Promise<void> | void;
  themeMode?: ThemeMode;
  initialRecommendedTags?: string[];
  autoSelectIcon?: boolean;
  existingSites?: Site[];
}) {
  const iconRef = useRef<SiteIconSelectorHandle>(null);
  const [activeTab, setActiveTab] = useState<SiteEditorTab>("info");

  // 标签编辑弹窗状态
  const [tagEditorOpen, setTagEditorOpen] = useState(false);
  const [tagEditForm, setTagEditForm] = useState<TagFormState>(defaultTagForm);
  const [tagBusy, setTagBusy] = useState(false);
  const [tagEditorError, setTagEditorError] = useState("");

  // AI 分析状态
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRecommendedTags, setAiRecommendedTags] = useState<string[]>([]);
  const [aiSelectedTags, setAiSelectedTags] = useState<Set<string>>(new Set());
  const [aiError, setAiError] = useState("");

  const isDark = themeMode === "dark";

  /** 当外部传入的 initialRecommendedTags 变化时，同步到内部状态 */

  /** 当外部传入的 initialRecommendedTags 变化时，同步到内部状态 */
  useEffect(() => {
    if (initialRecommendedTags && initialRecommendedTags.length > 0) {
      setAiRecommendedTags(initialRecommendedTags);
      setAiSelectedTags(new Set(initialRecommendedTags));
    }
  }, [initialRecommendedTags]);

  /** 书签编辑模式：等 favicon 验证完成后自动选中图标 */
  useEffect(() => {
    if (!autoSelectIcon) return;
    const timer = setTimeout(() => {
      iconRef.current?.autoSelectFromAi(siteForm.name);
    }, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSelectIcon]);

  async function handleSubmit() {
    const newTagIds: string[] = [];
    if (aiSelectedTags.size > 0) {
      for (const tagName of aiSelectedTags) {
        try {
          const result = await requestJson<{ item: { id: string } }>("/api/tags", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: tagName,
              logoUrl: null,
              logoBgColor: null,
              description: null,
            }),
          });
          newTagIds.push(result.item.id);
          setSiteForm((cur) => ({
            ...cur,
            tagIds: [...cur.tagIds, result.item.id],
          }));
        } catch (error) {
          onError?.(error instanceof Error ? error.message : `创建标签「${tagName}」失败`);
          return;
        }
      }
      await onTagsChange?.();
      setAiRecommendedTags([]);
      setAiSelectedTags(new Set());
    }
    onSubmit(newTagIds.length > 0 ? newTagIds : undefined);
  }

  // ── 标签编辑弹窗 ──

  function openEditTag(tag: Tag) {
    setTagEditForm({
      id: tag.id,
      name: tag.name,
      description: tag.description ?? "",
      siteIds: [],
    });
    setTagEditorError("");
    setTagEditorOpen(true);
  }

  function openNewTag() {
    setTagEditForm(defaultTagForm);
    setTagEditorError("");
    setTagEditorOpen(true);
  }

  async function submitTagEditForm() {
    setTagEditorError("");
    setTagBusy(true);
    try {
      if (tagEditForm.id) {
        await requestJson("/api/tags", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...tagEditForm, logoUrl: null, logoBgColor: null }),
        });
      } else {
        const result = await requestJson<{ item: { id: string } }>("/api/tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...tagEditForm, logoUrl: null, logoBgColor: null }),
        });
        setSiteForm((cur) => ({
          ...cur,
          tagIds: [...cur.tagIds, result.item.id],
        }));
      }
      setTagEditorOpen(false);
      setTagEditForm(defaultTagForm);
      await onTagsChange?.();
    } catch (error) {
      onError?.(error instanceof Error ? error.message : "保存标签失败");
    } finally {
      setTagBusy(false);
    }
  }

  async function deleteTagFromEditor() {
    if (!tagEditForm.id) return;
    setTagBusy(true);
    try {
      await requestJson(`/api/tags?id=${encodeURIComponent(tagEditForm.id)}`, {
        method: "DELETE",
      });
      setSiteForm((cur) => ({
        ...cur,
        tagIds: cur.tagIds.filter((id) => id !== tagEditForm.id),
      }));
      setTagEditorOpen(false);
      setTagEditForm(defaultTagForm);
      await onTagsChange?.();
    } catch (error) {
      onError?.(error instanceof Error ? error.message : "删除标签失败");
    } finally {
      setTagBusy(false);
    }
  }

  // ── AI 分析 ──

  async function handleAiAnalyze() {
    const url = siteForm.url.trim();
    if (!url) return;

    setAiError("");
    setAiLoading(true);
    try {
      const draftConfig = getAiDraftConfig();
      const result = await requestJson<AIAnalysisResult>("/api/ai/analyze-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, _draftAiConfig: draftConfig }),
      });

      if (result.title && !siteForm.name.trim()) {
        setSiteForm((cur) => ({ ...cur, name: result.title }));
      }

      if (result.description && !siteForm.description?.trim()) {
        setSiteForm((cur) => ({ ...cur, description: result.description }));
      }

      iconRef.current?.autoSelectFromAi(result.title || siteForm.name);

      if (result.matchedTagIds.length > 0) {
        setSiteForm((cur) => {
          const existingIds = new Set(cur.tagIds);
          const newIds = result.matchedTagIds.filter((id) => !existingIds.has(id));
          return { ...cur, tagIds: [...cur.tagIds, ...newIds] };
        });
      }

      setAiRecommendedTags(result.recommendedTags ?? []);
      setAiSelectedTags(new Set());
    } catch (error) {
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("未配置")) {
        setAiError("AI 功能未配置，或手动补充其他内容。");
      } else {
        setAiError("AI 服务不可用，请稍后重试，或手动补充其他内容。");
      }
    } finally {
      setAiLoading(false);
    }
  }

  const isBusy = tagBusy;

  /** URL 重复检测 */
  const duplicateSites = useMemo(() => {
    const url = siteForm.url.trim();
    if (!url) return [];
    const normalized = url.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();
    if (!normalized) return [];
    return (existingSites ?? [])
      .filter((s) => s.cardType == null)
      .filter((s) => {
        if (siteForm.id && s.id === siteForm.id) return false;
        return s.url.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase() === normalized;
      })
      .slice(0, 3);
  }, [siteForm.url, siteForm.id, existingSites]);

  return (
    <div className="flex flex-col gap-0">
      {/* Tab 切换栏 */}
      <div className={cn("flex gap-2 pb-4 mb-4 border-b", isDark ? "border-white/8" : "border-slate-200/60")}>
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
          <Globe className="h-4 w-4" />
          基本信息
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("control")}
          className={cn(
            "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition",
            activeTab === "control"
              ? isDark ? "bg-white text-slate-950" : "bg-slate-900 text-white"
              : cn(getDialogSecondaryBtnClass(themeMode), isDark ? "text-white/80" : "text-slate-600"),
          )}
        >
          <Shield className="h-4 w-4" />
          访问控制
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("related")}
          className={cn(
            "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition",
            activeTab === "related"
              ? isDark ? "bg-white text-slate-950" : "bg-slate-900 text-white"
              : cn(getDialogSecondaryBtnClass(themeMode), isDark ? "text-white/80" : "text-slate-600"),
          )}
        >
          <Link2 className="h-4 w-4" />
          关联推荐
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("notes")}
          className={cn(
            "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition",
            activeTab === "notes"
              ? isDark ? "bg-white text-slate-950" : "bg-slate-900 text-white"
              : cn(getDialogSecondaryBtnClass(themeMode), isDark ? "text-white/80" : "text-slate-600"),
          )}
        >
          <StickyNote className="h-4 w-4" />
          备忘便签
        </button>
      </div>

      {/* Tab 内容区 */}
      {activeTab === "control" ? (
        <AccessRulesTab key={siteForm.id ?? "new"} siteForm={siteForm} setSiteForm={setSiteForm} themeMode={themeMode} />
      ) : activeTab === "related" ? (
        <RelatedSitesTab key={siteForm.id ?? "new"} siteForm={siteForm} setSiteForm={setSiteForm} existingSites={existingSites ?? []} themeMode={themeMode} />
      ) : activeTab === "notes" ? (
        <NotesTab key={siteForm.id ?? "new"} siteForm={siteForm} setSiteForm={setSiteForm} themeMode={themeMode} />
      ) : activeTab === "info" ? (
        <div className="flex flex-col gap-3 pb-5">
          {/* 图标选择 */}
          <SiteIconSelector ref={iconRef} siteForm={siteForm} setSiteForm={setSiteForm} themeMode={themeMode} />

          {/* 网站名称 */}
          <input
            value={siteForm.name}
            onChange={(event) =>
              setSiteForm((cur) => ({ ...cur, name: event.target.value }))
            }
            placeholder="网站名称"
            className={cn("rounded-xl border px-3 py-2 text-sm outline-none", getDialogInputClass(themeMode))}
          />

          {/* URL 输入框 + AI 分析按钮 */}
          <div className="flex gap-2">
            <Tooltip tip="AI 自动分析网站信息" themeMode={themeMode}>
              <button
                type="button"
                onClick={() => void handleAiAnalyze()}
                disabled={!siteForm.url.trim() || aiLoading}
                className={cn(
                  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40",
                  isDark
                    ? "border-white/12 bg-white/8 text-white/70 hover:bg-white/14 hover:text-white"
                    : "border-slate-200/50 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                {aiLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {aiLoading ? "分析中" : "AI分析"}
              </button>
            </Tooltip>
            <input
              value={siteForm.url}
              onChange={(event) => {
                setSiteForm((cur) => ({ ...cur, url: event.target.value }));
                if (aiError) setAiError("");
              }}
              placeholder="https://example.com"
              className={cn("min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm outline-none", getDialogInputClass(themeMode))}
            />
          </div>

          {/* URL 重复提示 */}
          {duplicateSites.length > 0 && (
            <div className={cn(
              "rounded-xl border p-3",
              isDark
                ? "border-amber-500/20 bg-amber-500/8"
                : "border-amber-200/60 bg-amber-50",
            )}>
              <div className={cn(
                "mb-2 flex items-center gap-1.5 text-xs font-medium",
                isDark ? "text-amber-300" : "text-amber-700",
              )}>
                <CircleAlert className="h-3.5 w-3.5 shrink-0" />
                已存在相同地址的网站卡片
              </div>
              <div className="flex flex-col gap-1">
                {duplicateSites.map((site) => {
                  const iconSrc = site.iconUrl || "";
                  const displayUrl = site.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
                  const truncatedUrl = displayUrl.length > 28 ? displayUrl.slice(0, 28) + "..." : displayUrl;
                  return (
                    <a
                      key={site.id}
                      href={site.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-all duration-150 cursor-pointer",
                        isDark
                          ? "bg-white/6 hover:bg-amber-400/15 hover:shadow-sm"
                          : "bg-white/60 hover:bg-amber-100/80 hover:shadow-sm",
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={iconSrc}
                        alt=""
                        className="h-6 w-6 shrink-0 rounded-md object-cover bg-slate-200/50"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium leading-tight">{site.name}</p>
                        <p className={cn("truncate text-xs leading-tight", getDialogSubtleClass(themeMode))}>
                          {truncatedUrl}
                        </p>
                      </div>
                      <ExternalLink className={cn("h-3.5 w-3.5 shrink-0 transition-colors duration-150", isDark ? "text-white/35 group-hover:text-amber-300" : "text-slate-400 group-hover:text-amber-600")} />
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {aiError && (
            <div className={cn(
              "flex items-start gap-2 rounded-xl border px-3 py-2 text-sm",
              isDark
                ? "border-amber-500/25 bg-amber-500/10 text-amber-200"
                : "border-amber-200/60 bg-amber-50 text-amber-700",
            )}>
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{aiError}</span>
            </div>
          )}

          <textarea
            value={siteForm.description ?? ""}
            onChange={(event) =>
              setSiteForm((cur) => ({ ...cur, description: event.target.value || null }))
            }
            placeholder="网站描述（可空）"
            rows={3}
            className={cn("rounded-xl border px-3 py-2 text-sm outline-none", getDialogInputClass(themeMode))}
          />

          {/* 推荐新标签 */}
          {aiRecommendedTags.length > 0 && (
            <div className={cn(
              "rounded-2xl border p-4",
              isDark
                ? "border-violet-500/20 bg-violet-500/8"
                : "border-violet-200/60 bg-violet-50",
            )}>
              <p className={cn("mb-3 text-sm font-medium", isDark ? "text-violet-200" : "text-violet-700")}>推荐新标签</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {aiRecommendedTags.map((tagName) => (
                  <label
                    key={tagName}
                    className={cn(
                      "flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm cursor-pointer transition",
                      isDark
                        ? "border-violet-400/15 bg-violet-500/10 hover:bg-violet-500/16"
                        : "border-violet-200/50 bg-violet-50 hover:bg-violet-100",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={aiSelectedTags.has(tagName)}
                      onChange={(e) => {
                        setAiSelectedTags((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(tagName);
                          else next.delete(tagName);
                          return next;
                        });
                      }}
                    />
                    <span>{tagName}</span>
                    <span className={cn("ml-auto text-xs", getDialogSubtleClass(themeMode))}>新建</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* 关联标签 */}
          <div className={cn("rounded-2xl border p-4", getDialogSectionClass(themeMode))}>
            <p className="mb-3 text-sm font-medium">关联标签</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className={cn("flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-sm", getDialogListItemClass(themeMode))}
                >
                  <label className="flex min-w-0 flex-1 items-center gap-3">
                    <input
                      type="checkbox"
                      checked={siteForm.tagIds.includes(tag.id)}
                      onChange={(event) =>
                        setSiteForm((cur) => ({
                          ...cur,
                          tagIds: event.target.checked
                            ? [...cur.tagIds, tag.id]
                            : cur.tagIds.filter((id) => id !== tag.id),
                        }))
                      }
                    />
                    <span className="truncate">{tag.name}</span>
                    {tag.isHidden ? (
                      <span className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-xs",
                        isDark ? "bg-white/10 text-white/70" : "bg-slate-100 text-slate-500",
                      )}>隐藏</span>
                    ) : null}
                  </label>
                  <Tooltip tip="编辑标签" themeMode={themeMode}>
                    <button
                      type="button"
                      onClick={() => openEditTag(tag)}
                      className={cn(
                        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition",
                        isDark
                          ? "border-white/10 bg-white/6 hover:bg-white/12"
                          : "border-slate-200/50 bg-slate-50 hover:bg-slate-100",
                      )}
                    >
                      <PencilLine className={cn("h-3.5 w-3.5", isDark ? "text-white/50" : "text-slate-400")} />
                    </button>
                  </Tooltip>
                </div>
              ))}

              <button
                type="button"
                onClick={openNewTag}
                className={cn("flex items-center gap-2 rounded-2xl border border-dashed px-3 py-2 text-sm transition", getDialogAddItemClass(themeMode))}
              >
                <Plus className="h-3.5 w-3.5" />
                添加标签
              </button>
            </div>
          </div>

          {/* 标签编辑弹窗 */}
          {tagEditorOpen ? (
            <div className={cn("animate-drawer-fade fixed inset-0 z-[60] flex items-end justify-center p-4 backdrop-blur-sm sm:items-center", getDialogOverlayClass(themeMode))}>
              <div className={cn("animate-panel-rise w-full max-w-[420px] overflow-hidden rounded-[28px] border shadow-[0_32px_120px_rgba(0,0,0,0.42)]", getDialogPanelClass(themeMode))}>
                <div className={cn("flex items-center justify-between border-b px-5 py-4", isDark ? "border-white/10" : "border-slate-200/50")}>
                  <h3 className="text-lg font-semibold">
                    {tagEditForm.id ? "编辑标签" : "添加标签"}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setTagEditorOpen(false);
                      setTagEditForm(defaultTagForm);
                    }}
                    className={cn("inline-flex h-9 w-9 items-center justify-center rounded-xl border transition", getDialogCloseBtnClass(themeMode))}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="max-h-[70vh] overflow-y-auto p-5">
                  {tagEditorError ? (
                    <p className={cn(
                      "mb-3 rounded-xl border px-4 py-2.5 text-sm",
                      isDark
                        ? "border-rose-500/20 bg-rose-500/10 text-rose-200"
                        : "border-red-200/60 bg-red-50 text-red-600",
                    )}>
                      {tagEditorError}
                    </p>
                  ) : null}
                  <TagEditorForm
                    submitLabel={tagEditForm.id ? "保存修改" : "创建标签"}
                    tagForm={tagEditForm}
                    setTagForm={setTagEditForm}
                    onSubmit={() => void submitTagEditForm()}
                    onDelete={tagEditForm.id ? () => void deleteTagFromEditor() : undefined}
                    themeMode={themeMode}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* 底部固定操作栏 */}
      <div className={cn("flex items-center gap-2 pt-4 border-t", isDark ? "border-white/8" : "border-slate-200/60")}>
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={isBusy || aiLoading}
          className={cn("inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition disabled:opacity-60", getDialogPrimaryBtnClass(themeMode))}
        >
          {submitLabel === "创建网站" ? <Plus className="h-4 w-4" /> : <PencilLine className="h-4 w-4" />}
          {submitLabel}
        </button>
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className={cn("inline-flex flex-1 items-center justify-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-medium transition", getDialogDangerBtnClass(themeMode))}
          >
            <Trash2 className="h-4 w-4" />
            删除网站
          </button>
        ) : null}
      </div>
    </div>
  );
}
