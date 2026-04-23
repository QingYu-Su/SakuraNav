/**
 * 标签编辑表单组件
 * @description 提供标签信息编辑界面，支持标签名称、描述等功能
 * 社交标签模式下：名称不可编辑、显示删除按钮
 */

"use client";

import { type Dispatch, type SetStateAction } from "react";
import { PencilLine, Plus, Trash2 } from "lucide-react";
import type { TagFormState } from "./types";
import type { ThemeMode } from "@/lib/base/types";
import { cn } from "@/lib/utils/utils";
import { getDialogInputClass, getDialogPrimaryBtnClass, getDialogDangerBtnClass } from "@/components/sakura-nav/style-helpers";

/** 被系统保留的标签名，普通标签不可使用 */
const RESERVED_TAG_NAMES = ["社交卡片"];

/** 检查标签名是否为保留名称 */
function isReservedTagName(name: string): boolean {
  return RESERVED_TAG_NAMES.includes(name.trim());
}

export function TagEditorForm({
  tagForm,
  setTagForm,
  submitLabel,
  onSubmit,
  onDelete,
  themeMode = "dark",
  socialTagMode = false,
}: {
  tagForm: TagFormState;
  setTagForm: Dispatch<SetStateAction<TagFormState>>;
  submitLabel: string;
  onSubmit: () => void;
  onDelete?: () => void;
  themeMode?: ThemeMode;
  /** 社交卡片标签模式：名称不可编辑、显示删除按钮 */
  socialTagMode?: boolean;
}) {
  const nameReserved = !socialTagMode && isReservedTagName(tagForm.name);

  return (
    <div className="grid gap-3">
      {/* 标签名 — 社交标签模式下为只读 */}
      <input
        value={tagForm.name}
        onChange={socialTagMode ? undefined : (event) =>
          setTagForm((current) => ({ ...current, name: event.target.value }))
        }
        readOnly={socialTagMode}
        placeholder="标签名"
        className={cn(
          "rounded-xl border px-3 py-2 text-sm outline-none",
          getDialogInputClass(themeMode),
          socialTagMode && "opacity-60 cursor-not-allowed",
        )}
      />

      {/* 保留名称警告 */}
      {nameReserved ? (
        <p className={cn(
          "rounded-xl border px-3 py-2 text-xs leading-relaxed",
          themeMode === "dark"
            ? "border-amber-500/30 bg-amber-900/20 text-amber-300"
            : "border-amber-400 bg-amber-50 text-amber-800",
        )}>
          该标签名不可使用。如需添加社交信息，请尝试通过新建卡片中的「社交卡片」来创建。
        </p>
      ) : null}

      {/* 标签描述 */}
      <input
        value={tagForm.description}
        onChange={(event) =>
          setTagForm((current) => ({ ...current, description: event.target.value }))
        }
        placeholder="标签描述（选填，留空则显示站点数量）"
        className={cn("rounded-xl border px-3 py-2 text-sm outline-none", getDialogInputClass(themeMode))}
      />

      {/* 提交按钮 */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSubmit}
          disabled={nameReserved}
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
