/**
 * 管理抽屉
 */

import { X, PencilLine, PaintBucket, GripVertical, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { SitesAdminPanel, TagsAdminPanel } from "@/components/admin";
import type { Site, Tag } from "@/lib/base/types";
import type { SiteFormState, TagFormState, AdminSection, AdminGroup } from "@/components/admin";
import type { AdminBootstrap } from "@/lib/base/types";
import React from "react";

type AdminDrawerProps = {
  open: boolean;
  isAuthenticated: boolean;
  adminSection: AdminSection;
  setAdminSection: (section: AdminSection) => void;
  adminData: AdminBootstrap | null;
  tags: Tag[];
  siteForm: SiteFormState;
  setSiteForm: React.Dispatch<React.SetStateAction<SiteFormState>>;
  tagForm: TagFormState;
  setTagForm: React.Dispatch<React.SetStateAction<TagFormState>>;
  siteActiveGroup: AdminGroup;
  setSiteActiveGroup: React.Dispatch<React.SetStateAction<AdminGroup>>;
  tagActiveGroup: AdminGroup;
  setTagActiveGroup: React.Dispatch<React.SetStateAction<AdminGroup>>;
  onSubmitSite: () => void;
  onSubmitTag: () => void;
  onError: (msg: string) => void;
  onTagsChange: () => Promise<void>;
  onStartEditSite: (site: Site) => void;
  onStartEditTag: (tag: Tag) => void;
  onDeleteSite: (id: string) => void;
  onDeleteTag: (id: string) => void;
  onClose: () => void;
};

export function AdminDrawer({
  open,
  isAuthenticated,
  adminSection,
  setAdminSection,
  adminData,
  tags,
  siteForm,
  setSiteForm,
  tagForm,
  setTagForm,
  siteActiveGroup,
  setSiteActiveGroup,
  tagActiveGroup,
  setTagActiveGroup,
  onSubmitSite,
  onSubmitTag,
  onError,
  onTagsChange,
  onStartEditSite,
  onStartEditTag,
  onDeleteSite,
  onDeleteTag,
  onClose,
}: AdminDrawerProps) {
  if (!open || !isAuthenticated) return null;

  const tabs = [
    { key: "sites", label: "网站", icon: PencilLine },
    { key: "tags", label: "标签", icon: GripVertical },
    { key: "appearance", label: "外观", icon: PaintBucket },
    { key: "config", label: "配置", icon: Settings2 },
  ] as const;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/42 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-[640px] flex-col border-l border-white/12 bg-[#0f172af0] text-white shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-white/55">Admin Drawer</p>
            <h2 className="mt-1 text-2xl font-semibold">管理导航页</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/6 hover:bg-white/12"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-2 border-b border-white/10 px-6 py-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setAdminSection(tab.key as AdminSection)}
              className={cn(
                "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm transition",
                adminSection === tab.key
                  ? "bg-white text-slate-950"
                  : "border border-white/12 bg-white/6 text-white/80 hover:bg-white/12",
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {adminSection === "sites" ? (
            <SitesAdminPanel
              adminData={adminData}
              tags={tags}
              siteForm={siteForm}
              setSiteForm={setSiteForm}
              activeGroup={siteActiveGroup}
              setActiveGroup={setSiteActiveGroup}
              onSubmit={onSubmitSite}
              onError={onError}
              onTagsChange={onTagsChange}
              onStartEdit={onStartEditSite}
              onDelete={(siteId) => onDeleteSite(siteId)}
            />
          ) : null}
          {adminSection === "tags" ? (
            <TagsAdminPanel
              adminData={adminData}
              tags={tags}
              tagForm={tagForm}
              setTagForm={setTagForm}
              activeGroup={tagActiveGroup}
              setActiveGroup={setTagActiveGroup}
              onSubmit={onSubmitTag}
              onStartEdit={onStartEditTag}
              onDelete={(tagId) => onDeleteTag(tagId)}
            />
          ) : null}
          {/* Note: appearance/config sections in admin drawer are handled
              by dedicated drawers (AppearanceDrawer/ConfigDrawer) */}
        </div>
      </div>
    </div>
  );
}
