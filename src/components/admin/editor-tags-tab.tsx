/**
 * 编辑器 - 标签管理标签页
 * @description 标签表单 + 标签列表（含 Logo 预览）
 */

"use client";

import { PencilLine, Plus, Trash2 } from "lucide-react";
import type { AdminBootstrap } from "@/lib/base/types";
import type { EditorTagFormState } from "@/hooks/use-editor-console";
import { defaultEditorTagForm } from "@/hooks/use-editor-console";

type EditorTagsTabProps = {
  tagForm: EditorTagFormState;
  setTagForm: React.Dispatch<React.SetStateAction<EditorTagFormState>>;
  data: AdminBootstrap;
  saveTag: () => Promise<void>;
  deleteTag: (tagId: string) => Promise<void>;
};

export function EditorTagsTab({
  tagForm,
  setTagForm,
  data,
  saveTag,
  deleteTag,
}: EditorTagsTabProps) {
  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-[430px_minmax(0,1fr)]">
      <section className="rounded-[32px] border border-white/10 bg-white/6 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">{tagForm.id ? "修改标签" : "新增标签"}</h2>
            <p className="mt-1 text-sm text-white/65">支持隐藏标签和自定义标签 Logo。</p>
          </div>
          {tagForm.id ? (
            <button
              type="button"
              className="text-sm text-white/70 hover:text-white"
              onClick={() => setTagForm(defaultEditorTagForm)}
            >
              取消编辑
            </button>
          ) : null}
        </div>

        <div className="grid gap-3">
          <input
            value={tagForm.name}
            onChange={(event) =>
              setTagForm((current) => ({ ...current, name: event.target.value }))
            }
            placeholder="标签名"
            className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm outline-none placeholder:text-white/35"
          />
          <input
            value={tagForm.logoUrl}
            onChange={(event) =>
              setTagForm((current) => ({ ...current, logoUrl: event.target.value }))
            }
            placeholder="标签 Logo URL（可空）"
            className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm outline-none placeholder:text-white/35"
          />
          <label className="flex items-center gap-3 rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm">
            <input
              type="checkbox"
              checked={tagForm.isHidden}
              onChange={(event) =>
                setTagForm((current) => ({
                  ...current,
                  isHidden: event.target.checked,
                }))
              }
            />
            设为隐藏标签（仅登录后可见）
          </label>
          <div className="rounded-2xl border border-white/12 bg-white/8 p-4">
            <p className="mb-3 text-sm font-medium">Logo 预览</p>
            <div className="flex items-center gap-3">
              {tagForm.logoUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={tagForm.logoUrl}
                    alt="Tag logo preview"
                    className="h-12 w-12 rounded-[18px] border border-white/14 bg-white/10 object-cover"
                  />
                </>
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/14 bg-white/10 text-sm font-semibold">
                  {(tagForm.name.trim().charAt(0) || "标").toUpperCase()}
                </div>
              )}
              <p className="text-sm text-white/65">
                未设置 Logo 时，会自动显示标签首字。
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void saveTag()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
          >
            {tagForm.id ? <PencilLine className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {tagForm.id ? "保存标签" : "创建标签"}
          </button>
        </div>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-white/6 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">标签列表</h2>
            <p className="mt-1 text-sm text-white/65">点击条目右侧按钮可以编辑或删除标签。</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-sm text-white/70">
            {data.tags.length} 个标签
          </span>
        </div>

        <div className="grid gap-3">
          {data.tags.map((tag) => (
            <article
              key={tag.id}
              className="flex items-center justify-between rounded-[28px] border border-white/10 bg-white/6 p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                {tag.logoUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={tag.logoUrl}
                      alt={`${tag.name} logo`}
                      className="h-12 w-12 rounded-[18px] border border-white/14 bg-white/10 object-cover"
                    />
                  </>
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/14 bg-white/10 text-sm font-semibold">
                    {tag.name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-lg font-semibold">{tag.name}</h3>
                    {tag.isHidden ? (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/65">
                        隐藏
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-white/65">当前可见站点 {tag.siteCount} 个</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/8 hover:bg-white/14"
                  onClick={() =>
                    setTagForm({
                      id: tag.id,
                      name: tag.name,
                      isHidden: tag.isHidden,
                      logoUrl: tag.logoUrl ?? "",
                      logoBgColor: tag.logoBgColor ?? "transparent",
                    })
                  }
                >
                  <PencilLine className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-rose-200 hover:bg-rose-500/18"
                  onClick={() => void deleteTag(tag.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
