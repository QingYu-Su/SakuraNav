/**
 * 网站编辑表单组件
 * @description 提供网站信息编辑界面，支持标签关联、AI 分析等功能
 */

"use client";

import { type Dispatch, type SetStateAction, useEffect, useRef, useState } from "react";
import { CircleAlert, LoaderCircle, PencilLine, Plus, Sparkles, Trash2, X } from "lucide-react";
import { type Tag, type ThemeMode } from "@/lib/base/types";
import type { SiteFormState, TagFormState } from "./types";
import { defaultTagForm } from "./types";
import { TagEditorForm } from "./tag-editor-form";
import { SiteIconSelector, type SiteIconSelectorHandle } from "./site-icon-selector";
import { requestJson } from "@/lib/base/api";
import { cn } from "@/lib/utils/utils";
import { getDialogInputClass, getDialogSectionClass, getDialogSubtleClass, getDialogListItemClass, getDialogAddItemClass, getDialogPrimaryBtnClass, getDialogDangerBtnClass, getDialogCloseBtnClass, getDialogOverlayClass, getDialogPanelClass } from "@/components/sakura-nav/style-helpers";

/** AI 分析结果类型 */
type AIAnalysisResult = {
  title: string;
  description: string;
  matchedTagIds: string[];
  recommendedTags: string[];
};

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
  /** 从外部传入的预选推荐新标签（如 AI 批量导入分析结果），默认全选 */
  initialRecommendedTags,
  autoSelectIcon,
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
  /** 是否在挂载后自动选择图标（书签导入编辑模式使用） */
  autoSelectIcon?: boolean;
}) {
  const iconRef = useRef<SiteIconSelectorHandle>(null);

  // 标签编辑弹窗状态
  const [tagEditorOpen, setTagEditorOpen] = useState(false);
  const [tagEditForm, setTagEditForm] = useState<TagFormState>(defaultTagForm);
  const [tagBusy, setTagBusy] = useState(false);
  const [tagEditorError, setTagEditorError] = useState("");

  // AI 分析状态
  const [aiLoading, setAiLoading] = useState(false);
  /** 外部传入的预选推荐标签（如 AI 批量导入），默认全选 */
  const [aiRecommendedTags, setAiRecommendedTags] = useState<string[]>([]);
  const [aiSelectedTags, setAiSelectedTags] = useState<Set<string>>(new Set());
  const [aiError, setAiError] = useState("");

  /** 当外部传入的 initialRecommendedTags 变化时，同步到内部状态（默认全选） */
  useEffect(() => {
    if (initialRecommendedTags && initialRecommendedTags.length > 0) {
      setAiRecommendedTags(initialRecommendedTags);
      setAiSelectedTags(new Set(initialRecommendedTags));
    }
  }, [initialRecommendedTags]);

  /** 书签编辑模式：等 favicon 验证完成后自动选中图标 */
  useEffect(() => {
    if (!autoSelectIcon) return;
    // 延迟调用，确保 verifyFavicon 有时间完成
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
          // 同步更新表单状态，确保 UI 中关联标签列表即时反映新标签
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
    // 将新建标签的 ID 传递给父级 submitSiteForm，确保关联关系写入数据库
    onSubmit(newTagIds.length > 0 ? newTagIds : undefined);
  }

  // ── 标签编辑弹窗 ──

  function openEditTag(tag: Tag) {
    setTagEditForm({
      id: tag.id,
      name: tag.name,
      description: tag.description ?? "",
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
      const result = await requestJson<AIAnalysisResult>("/api/ai/analyze-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (result.title && !siteForm.name.trim()) {
        setSiteForm((cur) => ({ ...cur, name: result.title }));
      }

      if (result.description && !siteForm.description?.trim()) {
        setSiteForm((cur) => ({ ...cur, description: result.description }));
      }

      // 自动选择图标
      iconRef.current?.autoSelectFromAi(result.title || siteForm.name);

      // 匹配已有标签
      if (result.matchedTagIds.length > 0) {
        setSiteForm((cur) => {
          const existingIds = new Set(cur.tagIds);
          const newIds = result.matchedTagIds.filter((id) => !existingIds.has(id));
          return { ...cur, tagIds: [...cur.tagIds, ...newIds] };
        });
      }

      setAiRecommendedTags(result.recommendedTags ?? []);
      // 用户手动触发 AI 分析，推荐标签不默认勾选
      setAiSelectedTags(new Set());
    } catch (error) {
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("未配置")) {
        setAiError("AI 分析功能未配置，请在 config.yml 中添加 model 相关配置后重启服务，或手动补充其他内容。");
      } else if (msg.includes("格式异常")) {
        setAiError("AI 返回结果异常，请稍后重试，或手动补充其他内容。");
      } else {
        setAiError("AI 分析失败，请检查网络和配置后重试，或手动补充其他内容。");
      }
    } finally {
      setAiLoading(false);
    }
  }

  const isBusy = tagBusy;

  return (
    <div className="grid gap-3">
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
        <button
          type="button"
          onClick={() => void handleAiAnalyze()}
          disabled={!siteForm.url.trim() || aiLoading}
          className={cn(
            "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40",
            themeMode === "light"
              ? "border-slate-200/50 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              : "border-white/12 bg-white/8 text-white/70 hover:bg-white/14 hover:text-white",
          )}
          title="AI 自动分析网站信息"
        >
          {aiLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {aiLoading ? "分析中" : "AI分析"}
        </button>
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

      {aiError && (
        <div className={cn(
          "flex items-start gap-2 rounded-xl border px-3 py-2 text-sm",
          themeMode === "light"
            ? "border-amber-200/60 bg-amber-50 text-amber-700"
            : "border-amber-500/25 bg-amber-500/10 text-amber-200",
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

      {/* 跳过在线检测开关 */}
      <label
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition",
          themeMode === "light"
            ? siteForm.skipOnlineCheck
              ? "border-amber-200/60 bg-amber-50"
              : "border-slate-200/50 bg-slate-50/50 hover:bg-slate-50"
            : siteForm.skipOnlineCheck
              ? "border-amber-500/25 bg-amber-500/10"
              : "border-white/10 bg-white/4 hover:bg-white/6",
        )}
      >
        <input
          type="checkbox"
          checked={siteForm.skipOnlineCheck}
          onChange={(e) =>
            setSiteForm((cur) => ({ ...cur, skipOnlineCheck: e.target.checked }))
          }
          className="h-4 w-4 rounded"
        />
        <span className="flex-1 font-medium">跳过在线检测</span>
        {siteForm.skipOnlineCheck ? (
          <span className={cn("text-xs", getDialogSubtleClass(themeMode))}>已启用</span>
        ) : null}
      </label>

      {/* 推荐新标签 */}
      {aiRecommendedTags.length > 0 && (
        <div className={cn(
          "rounded-2xl border p-4",
          themeMode === "light"
            ? "border-violet-200/60 bg-violet-50"
            : "border-violet-500/20 bg-violet-500/8",
        )}>
          <p className={cn("mb-3 text-sm font-medium", themeMode === "light" ? "text-violet-700" : "text-violet-200")}>推荐新标签</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {aiRecommendedTags.map((tagName) => (
              <label
                key={tagName}
                className={cn(
                  "flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm cursor-pointer transition",
                  themeMode === "light"
                    ? "border-violet-200/50 bg-violet-50 hover:bg-violet-100"
                    : "border-violet-400/15 bg-violet-500/10 hover:bg-violet-500/16",
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
                    themeMode === "light" ? "bg-slate-100 text-slate-500" : "bg-white/10 text-white/70",
                  )}>隐藏</span>
                ) : null}
              </label>
              <button
                type="button"
                onClick={() => openEditTag(tag)}
                className={cn(
                  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition",
                  themeMode === "light"
                    ? "border-slate-200/50 bg-slate-50 hover:bg-slate-100"
                    : "border-white/10 bg-white/6 hover:bg-white/12",
                )}
                title="编辑标签"
              >
                <PencilLine className={cn("h-3.5 w-3.5", themeMode === "light" ? "text-slate-400" : "text-white/50")} />
              </button>
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
            <div className={cn("flex items-center justify-between border-b px-5 py-4", themeMode === "light" ? "border-slate-200/50" : "border-white/10")}>
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
                  themeMode === "light"
                    ? "border-red-200/60 bg-red-50 text-red-600"
                    : "border-rose-500/20 bg-rose-500/10 text-rose-200",
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

      {/* 提交/删除 */}
      <div className="flex items-center gap-2">
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
