/**
 * 网站管理面板组件
 * @description 提供网站的创建、编辑、删除功能，以及网站列表的展示
 */

"use client";

import { type Dispatch, type SetStateAction } from "react";
import { PencilLine, Trash2 } from "lucide-react";
import { type AdminBootstrap, type Site, type Tag } from "@/lib/types";
import { AdminSubsection } from "./admin-subsection";
import { SiteEditorForm } from "./site-editor-form";
import { defaultSiteForm, type SiteFormState } from "./types";

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
}: {
  adminData: AdminBootstrap | null;
  tags: Tag[];
  siteForm: SiteFormState;
  setSiteForm: Dispatch<SetStateAction<SiteFormState>>;
  activeGroup: "create" | "edit";
  setActiveGroup: Dispatch<SetStateAction<"create" | "edit">>;
  onSubmit: () => void;
  onStartEdit: (site: Site) => void;
  onDelete: (siteId: string) => void;
}) {
  const availableTags = adminData?.tags ?? tags;
  const availableSites = adminData?.sites ?? [];

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
      >
        <SiteEditorForm
          submitLabel="创建网站"
          siteForm={siteForm}
          setSiteForm={setSiteForm}
          tags={availableTags}
          onSubmit={onSubmit}
        />
      </AdminSubsection>

      <AdminSubsection
        title="修改网站"
        description="从列表里选一个网站进行修改。"
        open={activeGroup === "edit"}
        onToggle={() => setActiveGroup("edit")}
      >
        <div className="space-y-4">
          {siteForm.id ? (
            <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
              <SiteEditorForm
                submitLabel="保存修改"
                siteForm={siteForm}
                setSiteForm={setSiteForm}
                tags={availableTags}
                onSubmit={onSubmit}
                onDelete={() => {
                  if (siteForm.id) {
                    onDelete(siteForm.id);
                  }
                  setSiteForm(defaultSiteForm);
                  setActiveGroup("create");
                }}
              />
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-white/12 bg-white/4 px-4 py-4 text-sm text-white/60">
              从下方列表选择一个网站开始编辑。
            </div>
          )}

          <div className="space-y-3">
            {availableSites.map((site) => (
              <div
                key={site.id}
                className="rounded-[26px] border border-white/10 bg-white/6 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-lg font-semibold">{site.name}</h4>
                    <p className="text-sm text-white/70">{site.description}</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {site.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/8 hover:bg-white/14"
                      onClick={() => onStartEdit(site)}
                    >
                      <PencilLine className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-rose-200 hover:bg-rose-500/18"
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
