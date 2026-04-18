/**
 * 网站编辑表单组件
 * @description 提供网站信息编辑界面，支持标签关联、AI 分析等功能
 */

"use client";

import { type Dispatch, type SetStateAction, useRef, useState } from "react";
import { CircleAlert, LoaderCircle, PencilLine, Plus, Sparkles, Trash2, X } from "lucide-react";
import { type Tag } from "@/lib/types";
import type { SiteFormState, TagFormState } from "./types";
import { defaultTagForm } from "./types";
import { TagEditorForm } from "./tag-editor-form";
import { SiteIconSelector, type SiteIconSelectorHandle } from "./site-icon-selector";
import { requestJson } from "@/lib/api";

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
}: {
  siteForm: SiteFormState;
  setSiteForm: Dispatch<SetStateAction<SiteFormState>>;
  tags: Tag[];
  submitLabel: string;
  onSubmit: () => void;
  onDelete?: () => void;
  onError?: (message: string) => void;
  onTagsChange?: () => Promise<void> | void;
}) {
  const iconRef = useRef<SiteIconSelectorHandle>(null);

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

  async function handleSubmit() {
    if (aiSelectedTags.size > 0) {
      for (const tagName of aiSelectedTags) {
        try {
          const result = await requestJson<{ item: { id: string } }>("/api/tags", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: tagName,
              isHidden: false,
              logoUrl: null,
              logoBgColor: null,
              description: null,
            }),
          });
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
    onSubmit();
  }

  // ── 标签编辑弹窗 ──

  function openEditTag(tag: Tag) {
    setTagEditForm({
      id: tag.id,
      name: tag.name,
      isHidden: tag.isHidden,
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
      <SiteIconSelector ref={iconRef} siteForm={siteForm} setSiteForm={setSiteForm} />

      {/* 网站名称 */}
      <input
        value={siteForm.name}
        onChange={(event) =>
          setSiteForm((cur) => ({ ...cur, name: event.target.value }))
        }
        placeholder="网站名称"
        className="rounded-xl border border-white/12 bg-white/8 px-3 py-2 text-sm outline-none placeholder:text-white/35"
      />

      {/* URL 输入框 + AI 分析按钮 */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void handleAiAnalyze()}
          disabled={!siteForm.url.trim() || aiLoading}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-white/12 bg-white/8 px-3 py-2 text-sm font-medium text-white/70 transition hover:bg-white/14 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
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
          className="min-w-0 flex-1 rounded-xl border border-white/12 bg-white/8 px-3 py-2 text-sm outline-none placeholder:text-white/35"
        />
      </div>

      {aiError && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
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
        className="rounded-xl border border-white/12 bg-white/8 px-3 py-2 text-sm outline-none placeholder:text-white/35"
      />

      {/* 推荐新标签 */}
      {aiRecommendedTags.length > 0 && (
        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/8 p-4">
          <p className="mb-3 text-sm font-medium text-violet-200">推荐新标签</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {aiRecommendedTags.map((tagName) => (
              <label
                key={tagName}
                className="flex items-center gap-2 rounded-2xl border border-violet-400/15 bg-violet-500/10 px-3 py-2 text-sm cursor-pointer transition hover:bg-violet-500/16"
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
                <span className="ml-auto text-xs text-white/40">新建</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* 关联标签 */}
      <div className="rounded-2xl border border-white/12 bg-white/8 p-4">
        <p className="mb-3 text-sm font-medium">关联标签</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/6 px-3 py-2 text-sm"
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
                  <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70">隐藏</span>
                ) : null}
              </label>
              <button
                type="button"
                onClick={() => openEditTag(tag)}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/6 transition hover:bg-white/12"
                title="编辑标签"
              >
                <PencilLine className="h-3.5 w-3.5 text-white/50" />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={openNewTag}
            className="flex items-center gap-2 rounded-2xl border border-dashed border-white/12 bg-white/4 px-3 py-2 text-sm text-white/50 transition hover:bg-white/8 hover:text-white/70"
          >
            <Plus className="h-3.5 w-3.5" />
            添加标签
          </button>
        </div>
      </div>

      {/* 标签编辑弹窗 */}
      {tagEditorOpen ? (
        <div className="animate-drawer-fade fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/52 p-4 backdrop-blur-sm sm:items-center">
          <div className="animate-panel-rise w-full max-w-[420px] overflow-hidden rounded-[28px] border border-white/12 bg-[#101a2eee] text-white shadow-[0_32px_120px_rgba(0,0,0,0.42)]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h3 className="text-lg font-semibold">
                {tagEditForm.id ? "编辑标签" : "添加标签"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setTagEditorOpen(false);
                  setTagEditForm(defaultTagForm);
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/12 bg-white/6 transition hover:bg-white/12"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-5">
              {tagEditorError ? (
                <p className="mb-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-200">
                  {tagEditorError}
                </p>
              ) : null}
              <TagEditorForm
                submitLabel={tagEditForm.id ? "保存修改" : "创建标签"}
                tagForm={tagEditForm}
                setTagForm={setTagEditForm}
                onSubmit={() => void submitTagEditForm()}
                onDelete={tagEditForm.id ? () => void deleteTagFromEditor() : undefined}
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
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:opacity-60"
        >
          {submitLabel === "创建网站" ? <Plus className="h-4 w-4" /> : <PencilLine className="h-4 w-4" />}
          {submitLabel}
        </button>
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-5 py-2.5 text-sm font-medium text-rose-200 transition hover:bg-rose-500/20"
          >
            <Trash2 className="h-4 w-4" />
            删除网站
          </button>
        ) : null}
      </div>
    </div>
  );
}
