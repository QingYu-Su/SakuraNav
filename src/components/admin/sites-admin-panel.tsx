/**
 * 网站管理面板组件
 * @description 提供网站的创建、编辑、删除功能，以及网站列表的展示
 */

"use client";

import { type Dispatch, type SetStateAction } from "react";
import { PencilLine, Trash2 } from "lucide-react";
import { type AdminBootstrap, type Card, type Tag, type ThemeMode } from "@/lib/base/types";
import { cn } from "@/lib/utils/utils";
import { AdminSubsection } from "./admin-subsection";
import { SiteEditorForm } from "./site-editor-form";
import { defaultSiteForm, type SiteFormState } from "./types";
import { getDialogSectionClass, getDialogAddItemClass, getDialogListItemClass } from "@/components/sakura-nav/style-helpers";

export function SitesAdminPanel({
  adminData,
  tags,
  siteForm,
  setSiteForm,
  activeGroup,
  setActiveGroup,
  onSubmit,
  onStartEdit,
  onDelete,
  onError,
  onTagsChange,
  themeMode = "dark",
}: {
  adminData: AdminBootstrap | null;
  tags: Tag[];
  siteForm: SiteFormState;
  setSiteForm: Dispatch<SetStateAction<SiteFormState>>;
  activeGroup: "create" | "edit";
  setActiveGroup: Dispatch<SetStateAction<"create" | "edit">>;
  onSubmit: (extraTagIds?: string[]) => void;
  onStartEdit: (site: Card) => void;
  onDelete: (siteId: string) => void;
  onError?: (message: string) => void;
  onTagsChange?: () => Promise<void> | void;
  themeMode?: ThemeMode;
}) {
  const availableTags = adminData?.tags ?? tags;
  const availableSites = adminData?.cards ?? [];

  return (
    <div className="space-y-6">
      <AdminSubsection
        title="新增网站"
        description="填写信息后，就能把网站加到导航页里。"
        open={activeGroup === "create"}
        onToggle={() => {
          setActiveGroup("create");
          setSiteForm(defaultSiteForm);
        }}
        themeMode={themeMode}
      >
        <SiteEditorForm
          submitLabel="创建网站"
          siteForm={siteForm}
          setSiteForm={setSiteForm}
          tags={availableTags}
          onSubmit={onSubmit}
          onError={onError}
          onTagsChange={onTagsChange}
          themeMode={themeMode}
          existingSites={availableSites}
        />
      </AdminSubsection>

      <AdminSubsection
        title="修改网站"
        description="从列表里选一个网站进行修改。"
        open={activeGroup === "edit"}
        onToggle={() => setActiveGroup("edit")}
        themeMode={themeMode}
      >
        <div className="space-y-4">
          {siteForm.id ? (
            <div className={cn("rounded-[24px] border p-4", getDialogSectionClass(themeMode))}>
              <SiteEditorForm
                submitLabel="保存修改"
                siteForm={siteForm}
                setSiteForm={setSiteForm}
                tags={availableTags}
                onSubmit={onSubmit}
                onError={onError}
                onTagsChange={onTagsChange}
                existingSites={availableSites}
                onDelete={() => {
                  if (siteForm.id) {
                    onDelete(siteForm.id);
                  }
                  setSiteForm(defaultSiteForm);
                  setActiveGroup("create");
                }}
                themeMode={themeMode}
              />
            </div>
          ) : (
            <div className={cn("rounded-[24px] border border-dashed px-4 py-4 text-sm", getDialogAddItemClass(themeMode))}>
              从下方列表选择一个网站开始编辑。
            </div>
          )}

          <div className="space-y-3">
            {availableSites.map((site) => (
              <div
                key={site.id}
                className={cn("rounded-[26px] border p-4", getDialogSectionClass(themeMode))}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-lg font-semibold">{site.name}</h4>
                    <p className={cn("text-sm", themeMode === "light" ? "text-slate-500" : "text-white/70")}>{site.siteDescription}</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {site.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className={cn("rounded-full border px-3 py-1 text-xs", getDialogListItemClass(themeMode))}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className={cn("inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition", getDialogListItemClass(themeMode))}
                      onClick={() => onStartEdit(site)}
                    >
                      <PencilLine className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition",
                        themeMode === "light"
                          ? "border-slate-200/50 bg-slate-50/60 text-red-500 hover:bg-red-50"
                          : "border-white/10 bg-white/8 text-rose-200 hover:bg-rose-500/18",
                      )}
                      onClick={() => onDelete(site.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AdminSubsection>
    </div>
  );
}
