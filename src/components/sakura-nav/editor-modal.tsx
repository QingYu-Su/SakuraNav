/**
 * 编辑器面板
 */

import { X } from "lucide-react";
import { SiteEditorForm, TagEditorForm } from "@/components/admin";
import type { Site, Tag, ThemeMode } from "@/lib/base/types";
import { SOCIAL_TAG_ID } from "@/lib/base/types";
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
  /** 所有站点数据（标签编辑时用于关联网站列表） */
  adminDataSites: Site[] | undefined;
  onSubmitSite: (extraTagIds?: string[]) => void;
  onSubmitTag: () => void;
  onTagsChange: () => Promise<void>;
  onClose: () => void;
  themeMode: ThemeMode;
  /** 是否为书签导入编辑模式（影响标题和按钮文案） */
  bookmarkEdit?: boolean;
  /** 书签编辑模式下预选的推荐新标签 */
  bookmarkRecommendedTags?: string[];
  /** 书签编辑模式下是否自动选中图标 */
  bookmarkAutoSelectIcon?: boolean;
  /** 点击重复项的编辑按钮时触发 */
  onEditDuplicateSite?: (site: Site) => void;
  /** 点击重复项的删除按钮时触发 */
  onDeleteDuplicateSite?: (site: Site) => void;
  /** 自动保存并关闭（编辑模式下关闭弹窗时传入） */
  onAutoSaveClose?: () => void;
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
  adminDataSites,
  onSubmitSite,
  onSubmitTag,
  onTagsChange,
  onClose,
  themeMode,
  bookmarkEdit,
  bookmarkRecommendedTags,
  bookmarkAutoSelectIcon,
  onEditDuplicateSite,
  onDeleteDuplicateSite,
  onAutoSaveClose,
}: EditorModalProps) {
  if (!open || !isAuthenticated || !editorPanel) return null;

  /** 根据 bookmarkEdit 模式计算标题和提交按钮文案 */
  const siteTitle = bookmarkEdit
    ? "编辑网站"
    : siteForm.id ? "编辑网站卡片" : "新建网站卡片";
  const siteSubmitLabel = bookmarkEdit
    ? "保存修改"
    : siteForm.id ? "保存网站卡片" : "创建网站卡片";

  const isTagEditor = editorPanel === "tag";

  return (
    <div className={cn(getDialogOverlayClass(themeMode), "animate-drawer-fade fixed inset-0 flex items-end justify-center p-4 sm:items-center", bookmarkEdit ? "z-[70]" : "z-40")}>
      <div className={cn(
        getDialogPanelClass(themeMode),
        "animate-panel-rise w-full overflow-hidden rounded-[34px] border",
        isTagEditor ? "max-w-[620px]" : "max-w-[760px]",
      )}>
        <div className={cn("flex items-center justify-between border-b px-6 py-5", getDialogDividerClass(themeMode))}>
          <div>
            <p className={cn("text-xs uppercase tracking-[0.28em]", getDialogSubtleClass(themeMode))}>Edit Mode</p>
            <h2 className="mt-1 text-2xl font-semibold">
              {editorPanel === "site"
                ? siteTitle
                : tagForm.id ? "修改标签" : "新建标签"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onAutoSaveClose ?? onClose}
            className={cn(getDialogCloseBtnClass(themeMode), "inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[82vh] overflow-y-auto px-6 py-6">
          {editorPanel === "site" ? (
            <SiteEditorForm
              submitLabel={siteSubmitLabel}
              siteForm={siteForm}
              setSiteForm={setSiteForm}
              tags={adminDataTags ?? tags}
              onSubmit={onSubmitSite}
              onTagsChange={onTagsChange}
              themeMode={themeMode}
              initialRecommendedTags={bookmarkEdit ? bookmarkRecommendedTags : undefined}
              autoSelectIcon={bookmarkEdit ? bookmarkAutoSelectIcon : undefined}
              existingSites={adminDataSites ?? []}
              onEditDuplicateSite={onEditDuplicateSite}
              onDeleteDuplicateSite={onDeleteDuplicateSite}
              hideBottomBar
            />
          ) : (
            <TagEditorForm
              submitLabel={tagForm.id ? "保存标签" : "创建标签"}
              tagForm={tagForm}
              setTagForm={setTagForm}
              onSubmit={onSubmitTag}
              themeMode={themeMode}
              socialTagMode={tagForm.id === SOCIAL_TAG_ID}
              sites={adminDataSites ?? []}
              hideBottomBar
            />
          )}
        </div>
      </div>
    </div>
  );
}
