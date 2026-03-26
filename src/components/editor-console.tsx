"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { ArrowDownAZ, ArrowLeft, ArrowUpAZ, GripVertical, PencilLine, Plus, Search, Tags, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminBootstrap } from "@/lib/types";
import { cn } from "@/lib/utils";

type SiteFormState = {
  id?: string;
  name: string;
  url: string;
  description: string;
  iconUrl: string;
  tagIds: string[];
};

type TagFormState = {
  id?: string;
  name: string;
  isHidden: boolean;
  logoUrl: string;
};

const defaultSiteForm: SiteFormState = {
  name: "",
  url: "",
  description: "",
  iconUrl: "",
  tagIds: [],
};

const defaultTagForm: TagFormState = {
  name: "",
  isHidden: false,
  logoUrl: "",
};

async function requestJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const data = (await response.json().catch(() => null)) as T | { error?: string } | null;

  if (!response.ok) {
    throw new Error((data as { error?: string } | null)?.error ?? "请求失败");
  }

  return data as T;
}

export function EditorConsole({ initialData }: { initialData: AdminBootstrap }) {
  const [tab, setTab] = useState<"sites" | "tags">("sites");
  const [siteForm, setSiteForm] = useState<SiteFormState>(defaultSiteForm);
  const [tagForm, setTagForm] = useState<TagFormState>(defaultTagForm);
  const [data, setData] = useState(initialData);
  const [siteSearch, setSiteSearch] = useState("");
  const [siteTagFilter, setSiteTagFilter] = useState("all");
  const [siteSortField, setSiteSortField] = useState<"manual" | "createdAt" | "updatedAt">(
    "manual",
  );
  const [siteSortDirection, setSiteSortDirection] = useState<"asc" | "desc">("desc");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
  );

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  async function refreshData() {
    const next = await requestJson<AdminBootstrap>("/api/admin/bootstrap");
    setData(next);
  }

  async function saveSite() {
    setMessage("");
    setErrorMessage("");

    try {
      await requestJson("/api/sites", {
        method: siteForm.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...siteForm,
          iconUrl: siteForm.iconUrl.trim() || null,
        }),
      });

      setSiteForm(defaultSiteForm);
      setMessage("网站配置已保存。");
      await refreshData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "保存网站失败");
    }
  }

  async function deleteSite(siteId: string) {
    setMessage("");
    setErrorMessage("");

    try {
      await requestJson(`/api/sites?id=${encodeURIComponent(siteId)}`, {
        method: "DELETE",
      });
      if (siteForm.id === siteId) {
        setSiteForm(defaultSiteForm);
      }
      setMessage("网站已删除。");
      await refreshData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "删除网站失败");
    }
  }

  async function saveTag() {
    setMessage("");
    setErrorMessage("");

    try {
      await requestJson("/api/tags", {
        method: tagForm.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...tagForm,
          logoUrl: tagForm.logoUrl.trim() || null,
        }),
      });

      setTagForm(defaultTagForm);
      setMessage("标签配置已保存。");
      await refreshData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "保存标签失败");
    }
  }

  async function deleteTag(tagId: string) {
    setMessage("");
    setErrorMessage("");

    try {
      await requestJson(`/api/tags?id=${encodeURIComponent(tagId)}`, {
        method: "DELETE",
      });
      if (tagForm.id === tagId) {
        setTagForm(defaultTagForm);
      }
      setMessage("标签已删除。");
      await refreshData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "删除标签失败");
    }
  }

  const manualSites = [...data.sites].sort(
    (left, right) => left.globalSortOrder - right.globalSortOrder,
  );
  const filteredSites = manualSites.filter((site) => {
    const searchNeedle = siteSearch.trim().toLowerCase();
    const matchesSearch =
      !searchNeedle ||
      `${site.name} ${site.url} ${site.description} ${site.tags.map((tag) => tag.name).join(" ")}`
        .toLowerCase()
        .includes(searchNeedle);
    const matchesTag =
      siteTagFilter === "all" || site.tags.some((tag) => tag.id === siteTagFilter);

    return matchesSearch && matchesTag;
  });
  const visibleSites =
    siteSortField === "manual"
      ? filteredSites
      : [...filteredSites].sort((left, right) => {
          const leftTime = new Date(
            siteSortField === "createdAt" ? left.createdAt : left.updatedAt,
          ).getTime();
          const rightTime = new Date(
            siteSortField === "createdAt" ? right.createdAt : right.updatedAt,
          ).getTime();
          return siteSortDirection === "asc" ? leftTime - rightTime : rightTime - leftTime;
        });

  async function reorderSites(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id || siteSortField !== "manual") {
      return;
    }

    const visibleIds = filteredSites.map((site) => site.id);
    const oldIndex = visibleIds.indexOf(String(event.active.id));
    const newIndex = visibleIds.indexOf(String(event.over.id));
    if (oldIndex < 0 || newIndex < 0) return;

    const reorderedVisibleIds = arrayMove(visibleIds, oldIndex, newIndex);
    let visiblePointer = 0;
    const reorderedAllIds = manualSites.map((site) =>
      visibleIds.includes(site.id) ? reorderedVisibleIds[visiblePointer++] : site.id,
    );

    setData((current) => ({
      ...current,
      sites: current.sites.map((site) => ({
        ...site,
        globalSortOrder: reorderedAllIds.indexOf(site.id),
      })),
    }));

    try {
      await requestJson("/api/sites/reorder-global", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: reorderedAllIds }),
      });
      setMessage("网站顺序已更新。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "网站排序保存失败");
      await refreshData();
    }
  }

  return (
    <main className="animate-panel-rise min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(87,65,198,0.22),transparent_26%),linear-gradient(145deg,#08101e_0%,#101726_42%,#182235_100%)] text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-[1480px] flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-[32px] border border-white/10 bg-white/6 px-5 py-4 shadow-[0_24px_80px_rgba(8,15,29,0.22)]">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-white/50">Editor</p>
            <h1 className="mt-1 text-2xl font-semibold">管理网站与标签</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTab("sites")}
              className={cn(
                "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm transition",
                tab === "sites"
                  ? "bg-white text-slate-950"
                  : "border border-white/12 bg-white/6 text-white/80 hover:bg-white/12",
              )}
            >
              <PencilLine className="h-4 w-4" />
              网站
            </button>
            <button
              type="button"
              onClick={() => setTab("tags")}
              className={cn(
                "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm transition",
                tab === "tags"
                  ? "bg-white text-slate-950"
                  : "border border-white/12 bg-white/6 text-white/80 hover:bg-white/12",
              )}
            >
              <Tags className="h-4 w-4" />
              标签
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-white/6 px-4 py-2 text-sm text-white/80 transition hover:bg-white/12"
            >
              <ArrowLeft className="h-4 w-4" />
              返回首页
            </Link>
          </div>
        </header>

        {message ? (
          <div className="mt-5 rounded-2xl border border-emerald-200/35 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-50">
            {message}
          </div>
        ) : null}
        {errorMessage ? (
          <div className="mt-5 rounded-2xl border border-rose-200/35 bg-rose-400/10 px-4 py-3 text-sm text-rose-50">
            {errorMessage}
          </div>
        ) : null}

        {tab === "sites" ? (
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
                  value={siteForm.description}
                  onChange={(event) =>
                    setSiteForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="网站描述"
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
                            tagIds: site.tags.map((tag) => tag.id),
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
        ) : (
          <div className="mt-6 grid gap-6 xl:grid-cols-[430px_minmax(0,1fr)]">
            <section className="rounded-[32px] border border-white/10 bg-white/6 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{tagForm.id ? "修改标签" : "新增标签"}</h2>
                  <p className="mt-1 text-sm text-white/65">支持隐藏标签和自定义标签 Logo。</p>
                </div>
                {tagForm.id ? (
                  <button
                    type="button"
                    className="text-sm text-white/70 hover:text-white"
                    onClick={() => setTagForm(defaultTagForm)}
                  >
                    取消编辑
                  </button>
                ) : null}
              </div>

              <div className="grid gap-3">
                <input
                  value={tagForm.name}
                  onChange={(event) =>
                    setTagForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="标签名"
                  className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm outline-none placeholder:text-white/35"
                />
                <input
                  value={tagForm.logoUrl}
                  onChange={(event) =>
                    setTagForm((current) => ({ ...current, logoUrl: event.target.value }))
                  }
                  placeholder="标签 Logo URL（可空）"
                  className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm outline-none placeholder:text-white/35"
                />
                <label className="flex items-center gap-3 rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm">
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
                <div className="rounded-2xl border border-white/12 bg-white/8 p-4">
                  <p className="mb-3 text-sm font-medium">Logo 预览</p>
                  <div className="flex items-center gap-3">
                    {tagForm.logoUrl ? (
                      <img
                        src={tagForm.logoUrl}
                        alt="Tag logo preview"
                        className="h-12 w-12 rounded-[18px] border border-white/14 bg-white/10 object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/14 bg-white/10 text-sm font-semibold">
                        {(tagForm.name.trim().charAt(0) || "标").toUpperCase()}
                      </div>
                    )}
                    <p className="text-sm text-white/65">
                      未设置 Logo 时，会自动显示标签首字。
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void saveTag()}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                >
                  {tagForm.id ? <PencilLine className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {tagForm.id ? "保存标签" : "创建标签"}
                </button>
              </div>
            </section>

            <section className="rounded-[32px] border border-white/10 bg-white/6 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">标签列表</h2>
                  <p className="mt-1 text-sm text-white/65">点击条目右侧按钮可以编辑或删除标签。</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-sm text-white/70">
                  {data.tags.length} 个标签
                </span>
              </div>

              <div className="grid gap-3">
                {data.tags.map((tag) => (
                  <article
                    key={tag.id}
                    className="flex items-center justify-between rounded-[28px] border border-white/10 bg-white/6 p-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {tag.logoUrl ? (
                        <img
                          src={tag.logoUrl}
                          alt={`${tag.name} logo`}
                          className="h-12 w-12 rounded-[18px] border border-white/14 bg-white/10 object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/14 bg-white/10 text-sm font-semibold">
                          {tag.name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-lg font-semibold">{tag.name}</h3>
                          {tag.isHidden ? (
                            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/65">
                              隐藏
                            </span>
                          ) : null}
                        </div>
                        <p className="text-sm text-white/65">当前可见站点 {tag.siteCount} 个</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/8 hover:bg-white/14"
                        onClick={() =>
                          setTagForm({
                            id: tag.id,
                            name: tag.name,
                            isHidden: tag.isHidden,
                            logoUrl: tag.logoUrl ?? "",
                          })
                        }
                      >
                        <PencilLine className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-rose-200 hover:bg-rose-500/18"
                        onClick={() => void deleteTag(tag.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

function SortableSiteRow({
  site,
  draggable,
  onEdit,
  onDelete,
}: {
  site: AdminBootstrap["sites"][number];
  draggable: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: site.id,
    disabled: !draggable,
  });

  return (
    <article
      ref={setNodeRef}
      className={cn(
        "rounded-[28px] border border-white/10 bg-white/6 p-4 will-change-transform",
        isDragging ? "shadow-[0_22px_80px_rgba(8,15,29,0.28)] ring-1 ring-white/18" : "",
      )}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition ?? "transform 140ms ease",
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-3">
            {site.iconUrl ? (
              <img
                src={site.iconUrl}
                alt={`${site.name} icon`}
                className="h-12 w-12 rounded-[18px] border border-white/14 bg-white/10 object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/14 bg-white/10 text-sm font-semibold">
                {site.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold">{site.name}</h3>
              <p className="truncate text-sm text-white/55">{site.url}</p>
            </div>
          </div>
          <p className="text-sm text-white/70">{site.description}</p>
          <div className="flex flex-wrap gap-2">
            {site.tags.map((tag) => (
              <span
                key={tag.id}
                className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs"
              >
                {tag.name}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-white/45">
            <span>创建于 {new Date(site.createdAt).toLocaleString("zh-CN")}</span>
            <span>更新于 {new Date(site.updatedAt).toLocaleString("zh-CN")}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {draggable ? (
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-white/75 hover:bg-white/14"
              style={{ touchAction: "none" }}
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          ) : null}
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/8 hover:bg-white/14"
            onClick={onEdit}
          >
            <PencilLine className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-rose-200 hover:bg-rose-500/18"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}
