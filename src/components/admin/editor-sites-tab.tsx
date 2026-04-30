/**
 * 编辑器 - 网站管理标签页
 * @description 网站表单 + 网站列表（含搜索筛选、排序、拖拽）
 */

"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { SensorDescriptor } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ArrowDownAZ, ArrowUpAZ, PencilLine, Plus, Search } from "lucide-react";
import type { AdminBootstrap } from "@/lib/base/types";
import { cn } from "@/lib/utils/utils";
import type { SiteFormState } from "@/components/admin/types";
import { defaultSiteForm } from "@/components/admin/types";
import type { Site } from "@/lib/base/types";
import { SortableSiteRow } from "@/components/admin/sortable-site-row";
import type { SortField, SortDirection } from "@/hooks/use-editor-console";

type EditorSitesTabProps = {
  siteForm: SiteFormState;
  setSiteForm: React.Dispatch<React.SetStateAction<SiteFormState>>;
  data: AdminBootstrap;
  siteSearch: string;
  setSiteSearch: (value: string) => void;
  siteTagFilter: string;
  setSiteTagFilter: (value: string) => void;
  siteSortField: SortField;
  setSiteSortField: (value: SortField) => void;
  siteSortDirection: SortDirection;
  setSiteSortDirection: (value: SortDirection) => void;
  sensors: SensorDescriptor<object>[];
  visibleSites: Site[];
  saveSite: () => Promise<void>;
  deleteSite: (siteId: string) => Promise<void>;
  reorderSites: (event: DragEndEvent) => Promise<void>;
};

export function EditorSitesTab({
  siteForm,
  setSiteForm,
  data,
  siteSearch,
  setSiteSearch,
  siteTagFilter,
  setSiteTagFilter,
  siteSortField,
  setSiteSortField,
  siteSortDirection,
  setSiteSortDirection,
  sensors,
  visibleSites,
  saveSite,
  deleteSite,
  reorderSites,
}: EditorSitesTabProps) {
  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-[430px_minmax(0,1fr)]">
      <section className="rounded-[32px] border border-white/10 bg-white/6 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">{siteForm.id ? "修改网站" : "新增网站"}</h2>
            <p className="mt-1 text-sm text-white/65">集中维护网站信息和关联标签。</p>
          </div>
          {siteForm.id ? (
            <button
              type="button"
              className="text-sm text-white/70 hover:text-white"
              onClick={() => setSiteForm(defaultSiteForm)}
            >
              取消编辑
            </button>
          ) : null}
        </div>

        <div className="grid gap-3">
          <input
            value={siteForm.name}
            onChange={(event) =>
              setSiteForm((current) => ({ ...current, name: event.target.value }))
            }
            placeholder="网站名称"
            className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm outline-none placeholder:text-white/35"
          />
          <input
            value={siteForm.url}
            onChange={(event) =>
              setSiteForm((current) => ({ ...current, url: event.target.value }))
            }
            placeholder="https://example.com"
            className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm outline-none placeholder:text-white/35"
          />
          <input
            value={siteForm.iconUrl}
            onChange={(event) =>
              setSiteForm((current) => ({ ...current, iconUrl: event.target.value }))
            }
            placeholder="图标 URL（可空）"
            className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm outline-none placeholder:text-white/35"
          />
          <textarea
            value={siteForm.description ?? ""}
            onChange={(event) =>
              setSiteForm((current) => ({
                ...current,
                description: event.target.value || null,
              }))
            }
            placeholder="网站描述（可空）"
            rows={3}
            className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm outline-none placeholder:text-white/35"
          />
          <div className="rounded-2xl border border-white/12 bg-white/8 p-4">
            <p className="mb-3 text-sm font-medium">关联标签</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {data.tags.map((tag) => (
                <label
                  key={tag.id}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/6 px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={siteForm.tagIds.includes(tag.id)}
                    onChange={(event) =>
                      setSiteForm((current) => ({
                        ...current,
                        tagIds: event.target.checked
                          ? [...current.tagIds, tag.id]
                          : current.tagIds.filter((id) => id !== tag.id),
                      }))
                    }
                  />
                  <span>{tag.name}</span>
                  {tag.isHidden ? (
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70">
                      隐藏
                    </span>
                  ) : null}
                </label>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void saveSite()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
          >
            {siteForm.id ? <PencilLine className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {siteForm.id ? "保存网站" : "创建网站"}
          </button>
        </div>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-white/6 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">网站列表</h2>
            <p className="mt-1 text-sm text-white/65">
              支持搜索、标签筛选、按时间排序，自定义顺序下可直接拖拽。
            </p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-sm text-white/70">
            {visibleSites.length} / {data.sites.length} 个网站
          </span>
        </div>

        <div className="mb-5 grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_220px_220px_auto]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
            <input
              value={siteSearch}
              onChange={(event) => setSiteSearch(event.target.value)}
              placeholder="搜索网站名、地址、描述或标签"
              className="w-full rounded-2xl border border-white/12 bg-white/8 py-3 pr-4 pl-11 text-sm outline-none placeholder:text-white/35"
            />
          </label>
          <select
            value={siteTagFilter}
            onChange={(event) => setSiteTagFilter(event.target.value)}
            className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm outline-none"
          >
            <option value="all">全部标签</option>
            {data.tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
          <select
            value={siteSortField}
            onChange={(event) =>
              setSiteSortField(event.target.value as "manual" | "createdAt" | "updatedAt")
            }
            className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm outline-none"
          >
            <option value="manual">自定义顺序</option>
            <option value="createdAt">创建时间</option>
            <option value="updatedAt">修改时间</option>
          </select>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSiteSortDirection("asc")}
              disabled={siteSortField === "manual"}
              className={cn(
                "inline-flex h-12 items-center justify-center gap-2 rounded-2xl border px-4 text-sm transition disabled:cursor-not-allowed disabled:opacity-45",
                siteSortDirection === "asc"
                  ? "border-white/18 bg-white text-slate-950"
                  : "border-white/12 bg-white/8 text-white/80 hover:bg-white/14",
              )}
            >
              <ArrowUpAZ className="h-4 w-4" />
              升序
            </button>
            <button
              type="button"
              onClick={() => setSiteSortDirection("desc")}
              disabled={siteSortField === "manual"}
              className={cn(
                "inline-flex h-12 items-center justify-center gap-2 rounded-2xl border px-4 text-sm transition disabled:cursor-not-allowed disabled:opacity-45",
                siteSortDirection === "desc"
                  ? "border-white/18 bg-white text-slate-950"
                  : "border-white/12 bg-white/8 text-white/80 hover:bg-white/14",
              )}
            >
              <ArrowDownAZ className="h-4 w-4" />
              降序
            </button>
          </div>
        </div>

        {siteSortField === "manual" ? (
          <p className="mb-4 text-sm text-white/60">当前为自定义顺序，可通过拖拽手柄调整网站顺序。</p>
        ) : (
          <p className="mb-4 text-sm text-white/60">当前为时间排序模式，拖拽已自动停用。</p>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(event) => void reorderSites(event)}
        >
          <SortableContext
            items={visibleSites.map((site) => site.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid gap-3">
              {visibleSites.map((site) => (
                <SortableSiteRow
                  key={site.id}
                  site={site}
                  draggable={siteSortField === "manual"}
                  onEdit={() =>
                    setSiteForm({
                      id: site.id,
                      name: site.name,
                      url: site.url,
                      description: site.description,
                      iconUrl: site.iconUrl ?? "",
                      iconBgColor: site.iconBgColor ?? "transparent",
                      skipOnlineCheck: site.skipOnlineCheck ?? false,
                      onlineCheckFrequency: site.onlineCheckFrequency ?? "1d",
                      onlineCheckTimeout: site.onlineCheckTimeout ?? 3,
                      onlineCheckMatchMode: site.onlineCheckMatchMode ?? "status",
                      onlineCheckKeyword: site.onlineCheckKeyword ?? "",
                      onlineCheckFailThreshold: site.onlineCheckFailThreshold ?? 3,
                      tagIds: site.tags.map((tag) => tag.id),
                      accessRules: site.accessRules ?? null,
                      recommendContext: site.recommendContext ?? "",
                      recommendContextEnabled: site.recommendContextEnabled ?? false,
                      aiRelationEnabled: site.aiRelationEnabled ?? true,
                      allowLinkedByOthers: site.allowLinkedByOthers ?? true,
                      relatedSites: site.relatedSites ?? [],
                      relatedSitesEnabled: site.relatedSitesEnabled ?? true,
                      notes: site.notes ?? "",
                      notesAiEnabled: site.notesAiEnabled ?? true,
                      todos: site.todos ?? [],
                      todosAiEnabled: site.todosAiEnabled ?? true,
                    })
                  }
                  onDelete={() => void deleteSite(site.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </section>
    </div>
  );
}
