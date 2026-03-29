/**
 * 网站编辑表单组件
 * @description 提供网站信息编辑界面，支持图标上传、Favicon获取、标签关联等功能
 */

"use client";

import { type Dispatch, type SetStateAction, useEffect, useRef, useState } from "react";
import { EllipsisVertical, LoaderCircle, PencilLine, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { type Tag } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { SiteFormState } from "./types";
import { requestJson } from "@/lib/api";

export function SiteEditorForm({
  siteForm,
  setSiteForm,
  tags,
  submitLabel,
  onSubmit,
  onDelete,
}: {
  siteForm: SiteFormState;
  setSiteForm: Dispatch<SetStateAction<SiteFormState>>;
  tags: Tag[];
  submitLabel: string;
  onSubmit: () => void;
  onDelete?: () => void;
}) {
  const [iconMenuOpen, setIconMenuOpen] = useState(false);
  const [iconUploading, setIconUploading] = useState(false);
  const [iconUrlDialogOpen, setIconUrlDialogOpen] = useState(false);
  const [iconUrlValue, setIconUrlValue] = useState("");
  const [iconUrlError, setIconUrlError] = useState("");
  const iconSlotRef = useRef<HTMLDivElement | null>(null);
  const iconFileInputRef = useRef<HTMLInputElement | null>(null);

  const hasIcon = Boolean(siteForm.iconUrl);

  useEffect(() => {
    if (!iconMenuOpen) return;
    function handlePointerDown(event: MouseEvent) {
      if (!iconSlotRef.current?.contains(event.target as Node)) {
        setIconMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [iconMenuOpen]);

  async function uploadIconFile(file: File) {
    setIconUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", "icon");
      const asset = await requestJson<{ id: string; url: string }>("/api/assets/wallpaper", {
        method: "POST",
        body: formData,
      });
      setSiteForm((current) => ({ ...current, iconUrl: asset.url }));
      setIconMenuOpen(false);
    } catch (error) {
      console.error("Upload icon failed:", error);
    } finally {
      setIconUploading(false);
    }
  }

  async function uploadIconByUrl(url: string) {
    setIconUploading(true);
    try {
      const asset = await requestJson<{ id: string; url: string }>("/api/assets/wallpaper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceUrl: url, kind: "icon" }),
      });
      setSiteForm((current) => ({ ...current, iconUrl: asset.url }));
      setIconUrlDialogOpen(false);
      setIconUrlValue("");
      setIconMenuOpen(false);
    } catch (error) {
      setIconUrlError(error instanceof Error ? error.message : "上传失败");
    } finally {
      setIconUploading(false);
    }
  }

  async function fetchFaviconFromUrl() {
    const url = siteForm.url.trim();
    if (!url) return;

    setIconUploading(true);
    try {
      // 从 URL 中提取域名
      let domain = url;
      try {
        const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
        domain = parsed.hostname;
      } catch {
        // 如果不是完整URL，尝试直接使用
        domain = url.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
      }

      const faviconUrl = `https://favicon.im/${domain}?larger=true`;
      const asset = await requestJson<{ id: string; url: string }>("/api/assets/wallpaper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceUrl: faviconUrl, kind: "icon" }),
      });
      setSiteForm((current) => ({ ...current, iconUrl: asset.url }));
    } catch {
      // 获取失败时不做任何操作
    } finally {
      setIconUploading(false);
    }
  }

  return (
    <div className="grid gap-3">
      {/* 第一行：Logo框 */}
      <div ref={iconSlotRef} className="relative mx-auto">
        <div className="relative flex h-20 w-20 items-center justify-center overflow-visible rounded-xl border border-dashed border-white/12 bg-white/4">
          {hasIcon ? (
            <>
              <img src={siteForm.iconUrl} alt="网站图标" className="h-full w-full rounded-xl object-contain p-2" />
              <div className="absolute -right-1 -top-1 z-20">
                <button
                  type="button"
                  onClick={() => setIconMenuOpen(!iconMenuOpen)}
                  className="inline-flex h-5 w-5 items-center justify-center rounded border border-white/16 bg-slate-950/60 text-white shadow-lg backdrop-blur-xl transition hover:bg-slate-950/80"
                >
                  <EllipsisVertical className="h-2.5 w-2.5" />
                </button>
                {iconMenuOpen ? (
                  <div className="absolute right-0 top-full z-30 mt-1 w-32 overflow-hidden rounded-xl border border-white/14 bg-[#0f172ae8] p-1 text-white shadow-[0_22px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setIconMenuOpen(false);
                        iconFileInputRef.current?.click();
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition hover:bg-white/10"
                    >
                      <Upload className="h-3 w-3" />
                      本地上传
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIconMenuOpen(false);
                        setIconUrlDialogOpen(true);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition hover:bg-white/10"
                    >
                      <Search className="h-3 w-3" />
                      图片 URL
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSiteForm((current) => ({ ...current, iconUrl: "" }));
                        setIconMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-rose-100 transition hover:bg-rose-500/18"
                    >
                      <Trash2 className="h-3 w-3" />
                      移除
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div className="relative z-20">
              <button
                type="button"
                onClick={() => setIconMenuOpen(!iconMenuOpen)}
                className="inline-flex h-8 w-8 items-center justify-center rounded border border-white/18 bg-white/8 text-white/88 transition hover:bg-white/14"
                aria-label="添加图标"
              >
                <Plus className="h-4 w-4" />
              </button>
              {iconMenuOpen ? (
                <div className="absolute left-1/2 top-full z-30 mt-1.5 w-32 -translate-x-1/2 overflow-hidden rounded-xl border border-white/14 bg-[#0f172ae8] p-1 text-white shadow-[0_22px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setIconMenuOpen(false);
                      iconFileInputRef.current?.click();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition hover:bg-white/10"
                  >
                    <Upload className="h-3 w-3" />
                    本地上传
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIconMenuOpen(false);
                      setIconUrlDialogOpen(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition hover:bg-white/10"
                  >
                    <Search className="h-3 w-3" />
                    图片 URL
                  </button>
                </div>
              ) : null}
            </div>
          )}
          {iconUploading ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-slate-950/42 text-xs text-white/78 backdrop-blur-sm">
              <LoaderCircle className="h-4 w-4 animate-spin" />
            </div>
          ) : null}
        </div>
        <input
          ref={iconFileInputRef}
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void uploadIconFile(file);
            }
            event.currentTarget.value = "";
          }}
          className="hidden"
        />
      </div>

      {/* 第二行：网站名称 */}
      <input
        value={siteForm.name}
        onChange={(event) =>
          setSiteForm((current) => ({ ...current, name: event.target.value }))
        }
        placeholder="网站名称"
        className="rounded-xl border border-white/12 bg-white/8 px-3 py-2 text-sm outline-none placeholder:text-white/35"
      />

      {/* 第三行：获取Logo按钮 + URL输入框 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void fetchFaviconFromUrl()}
          disabled={!siteForm.url.trim() || iconUploading}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/12 bg-white/8 px-3 py-2 text-xs font-medium text-white/80 transition hover:bg-white/14 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {iconUploading ? <LoaderCircle className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
          获取Logo
        </button>
        <input
          value={siteForm.url}
          onChange={(event) =>
            setSiteForm((current) => ({ ...current, url: event.target.value }))
          }
          placeholder="https://example.com"
          className="flex-1 rounded-xl border border-white/12 bg-white/8 px-3 py-2 text-sm outline-none placeholder:text-white/35"
        />
      </div>

      {/* 图标 URL 对话框 */}
      {iconUrlDialogOpen ? (
        <div className="animate-drawer-fade fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/52 p-4 backdrop-blur-sm sm:items-center">
          <div className="animate-panel-rise w-full max-w-[420px] overflow-hidden rounded-[28px] border border-white/12 bg-[#101a2eee] text-white shadow-[0_32px_120px_rgba(0,0,0,0.42)]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h3 className="text-lg font-semibold">图片 URL</h3>
              <button
                type="button"
                onClick={() => {
                  setIconUrlDialogOpen(false);
                  setIconUrlValue("");
                  setIconUrlError("");
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/12 bg-white/6 transition hover:bg-white/12"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5">
              <input
                value={iconUrlValue}
                onChange={(event) => {
                  setIconUrlValue(event.target.value);
                  if (iconUrlError) setIconUrlError("");
                }}
                placeholder="https://example.com/icon.png"
                className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm outline-none placeholder:text-white/35"
              />
              {iconUrlError ? (
                <p className="mt-2 text-sm text-rose-300">{iconUrlError}</p>
              ) : null}
              <button
                type="button"
                onClick={() => void uploadIconByUrl(iconUrlValue.trim())}
                disabled={!iconUrlValue.trim() || iconUploading}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {iconUploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                确认上传
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <textarea
        value={siteForm.description ?? ""}
        onChange={(event) =>
          setSiteForm((current) => ({ ...current, description: event.target.value || null }))
        }
        placeholder="网站描述（可空）"
        rows={3}
        className="rounded-xl border border-white/12 bg-white/8 px-3 py-2 text-sm outline-none placeholder:text-white/35"
      />
      <div className="rounded-2xl border border-white/12 bg-white/8 p-4">
        <p className="mb-3 text-sm font-medium">关联标签</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {tags.map((tag) => (
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
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSubmit}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
        >
          {submitLabel === "创建网站" ? <Plus className="h-4 w-4" /> : <PencilLine className="h-4 w-4" />}
          {submitLabel}
        </button>
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-5 py-2.5 text-sm font-medium text-rose-200 transition hover:bg-rose-500/20"
          >
            <Trash2 className="h-4 w-4" />
            删除网站
          </button>
        ) : null}
      </div>
    </div>
  );
}
