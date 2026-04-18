/**
 * 可排序网站行组件
 * @description 编辑器控制台中支持拖拽排序的网站列表行
 */

import { GripVertical, PencilLine, Trash2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import type { Site } from "@/lib/types";

function SortableSiteRow({
  site,
  draggable,
  onEdit,
  onDelete,
}: {
  site: Site;
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
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={site.iconUrl}
                  alt={`${site.name} icon`}
                  className="h-12 w-12 rounded-[18px] border border-white/14 bg-white/10 object-cover"
                />
              </>
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

export { SortableSiteRow };
