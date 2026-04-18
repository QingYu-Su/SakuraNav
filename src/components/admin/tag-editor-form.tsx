/**
 * 标签编辑表单组件
 * @description 提供标签信息编辑界面，支持标签名称、描述和隐藏标签设置等功能
 */

"use client";

import { type Dispatch, type SetStateAction } from "react";
import { PencilLine, Plus, Trash2 } from "lucide-react";
import type { TagFormState } from "./types";
import type { ThemeMode } from "@/lib/base/types";
import { cn } from "@/lib/utils/utils";
import { getDialogInputClass, getDialogSectionClass, getDialogPrimaryBtnClass, getDialogDangerBtnClass } from "@/components/sakura-nav/style-helpers";

export function TagEditorForm({
  tagForm,
  setTagForm,
  submitLabel,
  onSubmit,
  onDelete,
  themeMode = "dark",
}: {
  tagForm: TagFormState;
  setTagForm: Dispatch<SetStateAction<TagFormState>>;
  submitLabel: string;
  onSubmit: () => void;
  onDelete?: () => void;
  themeMode?: ThemeMode;
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
        className={cn("rounded-xl border px-3 py-2 text-sm outline-none", getDialogInputClass(themeMode))}
      />

      {/* 标签描述 */}
      <input
        value={tagForm.description}
        onChange={(event) =>
          setTagForm((current) => ({ ...current, description: event.target.value }))
        }
        placeholder="标签描述（选填，留空则显示站点数量）"
        className={cn("rounded-xl border px-3 py-2 text-sm outline-none", getDialogInputClass(themeMode))}
      />

      {/* 隐藏标签选项 */}
      <label className={cn("flex items-center gap-3 rounded-xl border px-3 py-2 text-sm", getDialogSectionClass(themeMode))}>
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
    </div>
  );
}
