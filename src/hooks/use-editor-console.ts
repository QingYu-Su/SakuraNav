/**
 * 编辑器控制台状态与逻辑 Hook
 * @description 封装网站/标签 CRUD、排序筛选、拖拽排序等全部状态与操作
 */

import {
  type DragEndEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useEffect, useState } from "react";
import { AdminBootstrap } from "@/lib/base/types";
import { requestJson } from "@/lib/base/api";
import type { SiteFormState } from "@/components/admin/types";
import { defaultSiteForm } from "@/components/admin/types";

/**
 * 编辑器页面专用的标签表单状态（含 logo 字段，与主页内联编辑的 TagFormState 不同）
 */
export type EditorTagFormState = {
  id?: string;
  name: string;
  isHidden: boolean;
  logoUrl: string;
  logoBgColor: string;
};

export const defaultEditorTagForm: EditorTagFormState = {
  name: "",
  isHidden: false,
  logoUrl: "",
  logoBgColor: "transparent",
};

export type SortField = "manual" | "createdAt" | "updatedAt";
export type SortDirection = "asc" | "desc";

export function useEditorConsole(initialData: AdminBootstrap) {
  const [tab, setTab] = useState<"sites" | "tags">("sites");
  const [siteForm, setSiteForm] = useState<SiteFormState>(defaultSiteForm);
  const [tagForm, setTagForm] = useState<EditorTagFormState>(defaultEditorTagForm);
  const [data, setData] = useState(initialData);
  const [siteSearch, setSiteSearch] = useState("");
  const [siteTagFilter, setSiteTagFilter] = useState("all");
  const [siteSortField, setSiteSortField] = useState<SortField>("manual");
  const [siteSortDirection, setSiteSortDirection] = useState<SortDirection>("desc");
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
          iconBgColor: siteForm.iconBgColor || null,
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

      setTagForm(defaultEditorTagForm);
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
        setTagForm(defaultEditorTagForm);
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

  return {
    tab,
    setTab,
    siteForm,
    setSiteForm,
    tagForm,
    setTagForm,
    data,
    siteSearch,
    setSiteSearch,
    siteTagFilter,
    setSiteTagFilter,
    siteSortField,
    setSiteSortField,
    siteSortDirection,
    setSiteSortDirection,
    message,
    errorMessage,
    sensors,
    saveSite,
    deleteSite,
    saveTag,
    deleteTag,
    reorderSites,
    manualSites,
    filteredSites,
    visibleSites,
  };
}
