/**
 * 标签管理面板组件
 * @description 提供标签的创建、编辑、删除功能，以及标签列表的展示
 */

"use client";

import { type Dispatch, type SetStateAction } from "react";
import { PencilLine, Trash2 } from "lucide-react";
import { type AdminBootstrap, type Tag } from "@/lib/base/types";
import { AdminSubsection } from "./admin-subsection";
import { TagEditorForm } from "./tag-editor-form";
import { defaultTagForm, type TagFormState } from "./types";

export function TagsAdminPanel({
  adminData,
  tags,
  tagForm,
  setTagForm,
  activeGroup,
  setActiveGroup,
  onSubmit,
  onStartEdit,
  onDelete,
}: {
  adminData: AdminBootstrap | null;
  tags: Tag[];
  tagForm: TagFormState;
  setTagForm: Dispatch<SetStateAction<TagFormState>>;
  activeGroup: "create" | "edit";
  setActiveGroup: Dispatch<SetStateAction<"create" | "edit">>;
  onSubmit: () => void;
  onStartEdit: (tag: Tag) => void;
  onDelete: (tagId: string) => void;
}) {
  const availableTags = adminData?.tags ?? tags;

  return (
    <div className="space-y-6">
      <AdminSubsection
        title="新增标签"
        description="添加一个新的分类标签。"
        open={activeGroup === "create"}
        onToggle={() => {
          setActiveGroup("create");
          setTagForm(defaultTagForm);
        }}
      >
        <TagEditorForm
          submitLabel="创建标签"
          tagForm={tagForm}
          setTagForm={setTagForm}
          onSubmit={onSubmit}
        />
      </AdminSubsection>

      <AdminSubsection
        title="修改标签"
        description="从列表里选择标签进行修改。"
        open={activeGroup === "edit"}
        onToggle={() => setActiveGroup("edit")}
      >
        <div className="space-y-4">
          {tagForm.id ? (
            <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
              <TagEditorForm
                submitLabel="保存标签"
                tagForm={tagForm}
                setTagForm={setTagForm}
                onSubmit={onSubmit}
                onDelete={() => {
                  if (tagForm.id) {
                    onDelete(tagForm.id);
                  }
                  setTagForm(defaultTagForm);
                  setActiveGroup("create");
                }}
              />
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-white/12 bg-white/4 px-4 py-4 text-sm text-white/60">
              从下方列表选择一个标签开始编辑。
            </div>
          )}

          <div className="space-y-3">
            {availableTags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center justify-between rounded-[24px] border border-white/10 bg-white/6 px-4 py-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{tag.name}</h4>
                    {tag.isHidden ? (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/65">
                        隐藏
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-white/68">当前可见站点 {tag.siteCount} 个</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/8 hover:bg-white/14"
                    onClick={() => onStartEdit(tag)}
                  >
                    <PencilLine className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-rose-200 hover:bg-rose-500/18"
                    onClick={() => onDelete(tag.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AdminSubsection>
    </div>
  );
}
