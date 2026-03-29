"use client";

import { GripVertical, PencilLine } from "lucide-react";
import { type Site, type ThemeMode } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SiteCardContent({
  site,
  editable,
  draggable,
  onEdit,
  onTagSelect,
  enterDelay,
  reserveActionSpace = false,
  dragHandleProps,
  themeMode = "light",
  wallpaperAware = false,
}: {
  site: Site;
  editable: boolean;
  draggable: boolean;
  onEdit?: () => void;
  onTagSelect?: (tagId: string) => void;
  enterDelay?: string;
  reserveActionSpace?: boolean;
  dragHandleProps?: Record<string, unknown>;
  themeMode?: ThemeMode;
  wallpaperAware?: boolean;
}) {
  const textShadowClass = wallpaperAware
    ? themeMode === "light"
      ? "drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
      : "drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
    : "";
  const descStyle = wallpaperAware
    ? themeMode === "light"
      ? "opacity-85 drop-shadow-[0_1px_3px_rgba(0,0,0,0.25)]"
      : "opacity-90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.35)]"
    : themeMode === "light"
      ? "opacity-80"
      : "opacity-75";
  return (
    <div
      className="animate-card-enter relative flex h-full flex-col gap-5"
      style={enterDelay ? { animationDelay: enterDelay } : undefined}
    >
      <div className="flex items-start justify-between gap-4">
        <a
          href={site.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-w-0 items-start gap-4"
        >
          {site.iconUrl ? (
            <img
              src={site.iconUrl}
              alt={`${site.name} icon`}
              className="h-14 w-14 rounded-[20px] border border-white/18 bg-white/18 object-cover shadow-lg"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-white/18 bg-white/18 text-lg font-semibold">
              {site.name.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <h3 className={cn("truncate font-semibold tracking-tight", site.description ? "text-xl" : "text-2xl", textShadowClass)}>{site.name}</h3>
            {site.description ? (
              <p className={cn("mt-2 text-sm leading-7", descStyle)}>{site.description}</p>
            ) : null}
          </div>
        </a>
        {editable || draggable || reserveActionSpace ? (
          <div className="flex shrink-0 items-center gap-2">
            {editable ? (
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/10 transition hover:bg-white/18"
              >
                <PencilLine className="h-4 w-4 opacity-80" />
              </button>
            ) : null}
            {draggable ? (
              <button
                type="button"
                className="cursor-grab inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/10 transition hover:bg-white/18 active:cursor-grabbing"
                style={{ touchAction: "none" }}
                {...dragHandleProps}
              >
                <GripVertical className="h-4 w-4 opacity-70" />
              </button>
            ) : null}
            {!editable && !draggable && reserveActionSpace ? (
              <>
                <span className="inline-flex h-11 w-11 rounded-2xl opacity-0" aria-hidden="true" />
                <span className="inline-flex h-11 w-11 rounded-2xl opacity-0" aria-hidden="true" />
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-auto flex flex-wrap gap-2">
        {site.tags.map((tag) => (
          <button
            key={tag.id}
            type="button"
            onClick={() => onTagSelect?.(tag.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition hover:-translate-y-0.5",
              tag.isHidden
                ? wallpaperAware
                  ? themeMode === "light"
                    ? "border-amber-500/40 bg-amber-400/20 text-amber-900 drop-shadow-[0_1px_1px_rgba(0,0,0,0.08)]"
                    : "border-amber-400/50 bg-amber-500/24 text-amber-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]"
                  : themeMode === "light"
                    ? "border-amber-400/50 bg-amber-300/30 text-amber-800"
                    : "border-amber-200/28 bg-amber-300/16 text-amber-50"
                : wallpaperAware
                  ? themeMode === "light"
                    ? "border-slate-600/24 bg-slate-500/16 text-slate-800 drop-shadow-[0_1px_1px_rgba(0,0,0,0.08)] hover:bg-slate-500/24"
                    : "border-white/28 bg-white/14 text-white/95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)] hover:bg-white/20"
                  : themeMode === "light"
                    ? "border-slate-400/50 bg-slate-300/40 text-slate-700 hover:bg-slate-300/60"
                    : "border-white/12 bg-white/10 hover:bg-white/16",
            )}
          >
            {tag.name}
          </button>
        ))}
      </div>
    </div>
  );
}
