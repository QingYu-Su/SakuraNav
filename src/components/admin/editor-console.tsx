/**
 * 编辑器控制台组件
 * @description 后台管理控制台，提供网站和标签的管理界面。状态逻辑由 useEditorConsole 管理，UI 拆分至各标签页组件。
 */

"use client";

import Link from "next/link";
import { ArrowLeft, PencilLine, Tags } from "lucide-react";
import type { AdminBootstrap } from "@/lib/base/types";
import { cn } from "@/lib/utils/utils";
import { useEditorConsole } from "@/hooks/use-editor-console";
import { EditorSitesTab } from "@/components/admin/editor-sites-tab";
import { EditorTagsTab } from "@/components/admin/editor-tags-tab";

/**
 * 编辑器控制台组件
 * @param initialData - 初始管理数据
 */
export function EditorConsole({
  initialData,
}: {
  initialData: AdminBootstrap;
}) {
  const {
    tab, setTab,
    siteForm, setSiteForm,
    tagForm, setTagForm,
    data,
    siteSearch, setSiteSearch,
    siteTagFilter, setSiteTagFilter,
    siteSortField, setSiteSortField,
    siteSortDirection, setSiteSortDirection,
    message, errorMessage,
    sensors,
    saveSite, deleteCard,
    saveTag, deleteTag,
    reorderSites,
    visibleSites,
  } = useEditorConsole(initialData);

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
          <EditorSitesTab
            siteForm={siteForm}
            setSiteForm={setSiteForm}
            data={data}
            siteSearch={siteSearch}
            setSiteSearch={setSiteSearch}
            siteTagFilter={siteTagFilter}
            setSiteTagFilter={setSiteTagFilter}
            siteSortField={siteSortField}
            setSiteSortField={setSiteSortField}
            siteSortDirection={siteSortDirection}
            setSiteSortDirection={setSiteSortDirection}
            sensors={sensors}
            visibleSites={visibleSites}
            saveSite={saveSite}
            deleteCard={deleteCard}
            reorderSites={reorderSites}
          />
        ) : (
          <EditorTagsTab
            tagForm={tagForm}
            setTagForm={setTagForm}
            data={data}
            saveTag={saveTag}
            deleteTag={deleteTag}
          />
        )}
      </div>
    </main>
  );
}
