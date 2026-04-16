/**
 * 标签编辑表单组件
 * @description 提供标签信息编辑界面，支持标签名称、描述和隐藏标签设置等功能
 */

"use client";

import { type Dispatch, type SetStateAction } from "react";
import { PencilLine, Plus, Trash2 } from "lucide-react";
import type { TagFormState } from "./types";

export function TagEditorForm({
  tagForm,
  setTagForm,
  submitLabel,
  onSubmit,
  onDelete,
}: {
  tagForm: TagFormState;
  setTagForm: Dispatch<SetStateAction<TagFormState>>;
  submitLabel: string;
  onSubmit: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="grid gap-3">
      {/* 标签名 */}
      <input
        value={tagForm.name}
        onChange={(event) =>
          setTagForm((current) => ({ ...current, name: event.target.value }))
        }
        placeholder="标签名"
        className="rounded-xl border border-white/12 bg-white/8 px-3 py-2 text-sm outline-none placeholder:text-white/35"
      />

      {/* 标签描述 */}
      <input
        value={tagForm.description}
        onChange={(event) =>
          setTagForm((current) => ({ ...current, description: event.target.value }))
        }
        placeholder="标签描述（选填，留空则显示站点数量）"
        className="rounded-xl border border-white/12 bg-white/8 px-3 py-2 text-sm outline-none placeholder:text-white/35"
      />

      {/* 隐藏标签选项 */}
      <label className="flex items-center gap-3 rounded-xl border border-white/12 bg-white/8 px-3 py-2 text-sm">
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

      {/* 提交按钮 */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSubmit}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:opacity-60"
        >
          {submitLabel === "创建标签" ? <Plus className="h-4 w-4" /> : <PencilLine className="h-4 w-4" />}
          {submitLabel}
        </button>
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-5 py-2.5 text-sm font-medium text-rose-200 transition hover:bg-rose-500/20"
          >
            <Trash2 className="h-4 w-4" />
            删除标签
          </button>
        ) : null}
      </div>
    </div>
  );
}
