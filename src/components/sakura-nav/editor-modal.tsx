/**
 * 编辑器面板
 */

import { X } from "lucide-react";
import { SiteEditorForm, TagEditorForm } from "@/components/admin";
import type { Tag, ThemeMode } from "@/lib/base/types";
import type { SiteFormState, TagFormState } from "@/components/admin";
import { cn } from "@/lib/utils/utils";
import { getDialogOverlayClass, getDialogPanelClass, getDialogDividerClass, getDialogSubtleClass, getDialogCloseBtnClass } from "./style-helpers";
import React from "react";

type EditorModalProps = {
  open: boolean;
  isAuthenticated: boolean;
  editorPanel: "site" | "tag" | null;
  siteForm: SiteFormState;
  setSiteForm: React.Dispatch<React.SetStateAction<SiteFormState>>;
  tagForm: TagFormState;
  setTagForm: React.Dispatch<React.SetStateAction<TagFormState>>;
  tags: Tag[];
  adminDataTags: Tag[] | undefined;
  onSubmitSite: () => void;
  onSubmitTag: () => void;
  onDeleteSite: (() => void) | undefined;
  onDeleteTag: (() => void) | undefined;
  onTagsChange: () => Promise<void>;
  onClose: () => void;
  themeMode: ThemeMode;
};

export function EditorModal({
  open,
  isAuthenticated,
  editorPanel,
  siteForm,
  setSiteForm,
  tagForm,
  setTagForm,
  tags,
  adminDataTags,
  onSubmitSite,
  onSubmitTag,
  onDeleteSite,
  onDeleteTag,
  onTagsChange,
  onClose,
  themeMode,
}: EditorModalProps) {
  if (!open || !isAuthenticated || !editorPanel) return null;

  return (
    <div className={cn(getDialogOverlayClass(themeMode), "animate-drawer-fade fixed inset-0 z-40 flex items-end justify-center p-4 sm:items-center")}>
      <div className={cn(getDialogPanelClass(themeMode), "animate-panel-rise w-full max-w-[760px] overflow-hidden rounded-[34px] border")}>
        <div className={cn("flex items-center justify-between border-b px-6 py-5", getDialogDividerClass(themeMode))}>
          <div>
            <p className={cn("text-xs uppercase tracking-[0.28em]", getDialogSubtleClass(themeMode))}>Edit Mode</p>
            <h2 className="mt-1 text-2xl font-semibold">
              {editorPanel === "site"
                ? siteForm.id ? "修改网站" : "新建网站"
                : tagForm.id ? "修改标签" : "新建标签"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(getDialogCloseBtnClass(themeMode), "inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[82vh] overflow-y-auto px-6 py-6">
          {editorPanel === "site" ? (
            <SiteEditorForm
              submitLabel={siteForm.id ? "保存网站" : "创建网站"}
              siteForm={siteForm}
              setSiteForm={setSiteForm}
              tags={adminDataTags ?? tags}
              onSubmit={onSubmitSite}
              onDelete={onDeleteSite}
              onTagsChange={onTagsChange}
              themeMode={themeMode}
            />
          ) : (
            <TagEditorForm
              submitLabel={tagForm.id ? "保存标签" : "创建标签"}
              tagForm={tagForm}
              setTagForm={setTagForm}
              onSubmit={onSubmitTag}
              onDelete={onDeleteTag}
              themeMode={themeMode}
            />
          )}
        </div>
      </div>
    </div>
  );
}
