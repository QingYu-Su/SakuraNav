"use client";

import { type Dispatch, type SetStateAction, useEffect, useRef, useState } from "react";
import { EllipsisVertical, LoaderCircle, PencilLine, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TagFormState } from "./types";

async function requestJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const data = (await response.json().catch(() => null)) as T | { error?: string } | null;

  if (!response.ok) {
    throw new Error((data as { error?: string } | null)?.error ?? "请求失败");
  }

  return data as T;
}

export function TagEditorForm({
  tagForm,
  setTagForm,
  submitLabel,
  onSubmit,
  onDelete,
}: {
  tagForm: TagFormState;
  setTagForm: Dispatch<SetStateAction<TagFormState>>;
  submitLabel: string;
  onSubmit: () => void;
  onDelete?: () => void;
}) {
  const [logoMenuOpen, setLogoMenuOpen] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUrlDialogOpen, setLogoUrlDialogOpen] = useState(false);
  const [logoUrlValue, setLogoUrlValue] = useState("");
  const [logoUrlError, setLogoUrlError] = useState("");
  const logoSlotRef = useRef<HTMLDivElement | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);

  const hasLogo = Boolean(tagForm.logoUrl);

  useEffect(() => {
    if (!logoMenuOpen) return;
    function handlePointerDown(event: MouseEvent) {
      if (!logoSlotRef.current?.contains(event.target as Node)) {
        setLogoMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [logoMenuOpen]);

  async function uploadLogoFile(file: File) {
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", "icon");
      const asset = await requestJson<{ id: string; url: string }>("/api/assets/wallpaper", {
        method: "POST",
        body: formData,
      });
      setTagForm((current) => ({ ...current, logoUrl: asset.url }));
      setLogoMenuOpen(false);
    } catch (error) {
      console.error("Upload logo failed:", error);
    } finally {
      setLogoUploading(false);
    }
  }

  async function uploadLogoByUrl(url: string) {
    setLogoUploading(true);
    try {
      const asset = await requestJson<{ id: string; url: string }>("/api/assets/wallpaper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceUrl: url, kind: "icon" }),
      });
      setTagForm((current) => ({ ...current, logoUrl: asset.url }));
      setLogoUrlDialogOpen(false);
      setLogoUrlValue("");
      setLogoMenuOpen(false);
    } catch (error) {
      setLogoUrlError(error instanceof Error ? error.message : "上传失败");
    } finally {
      setLogoUploading(false);
    }
  }

  return (
    <div className="grid gap-3">
      {/* Logo框 */}
      <div ref={logoSlotRef} className="relative mx-auto">
        <div className="relative flex h-20 w-20 items-center justify-center overflow-visible rounded-xl border border-dashed border-white/12 bg-white/4">
          {hasLogo ? (
            <>
              <img src={tagForm.logoUrl!} alt="标签图标" className="h-full w-full rounded-xl object-contain p-2" />
              <div className="absolute -right-1 -top-1 z-20">
                <button
                  type="button"
                  onClick={() => setLogoMenuOpen(!logoMenuOpen)}
                  className="inline-flex h-5 w-5 items-center justify-center rounded border border-white/16 bg-slate-950/60 text-white shadow-lg backdrop-blur-xl transition hover:bg-slate-950/80"
                >
                  <EllipsisVertical className="h-2.5 w-2.5" />
                </button>
                {logoMenuOpen ? (
                  <div className="absolute right-0 top-full z-30 mt-1 w-32 overflow-hidden rounded-xl border border-white/14 bg-[#0f172ae8] p-1 text-white shadow-[0_22px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setLogoMenuOpen(false);
                        logoFileInputRef.current?.click();
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition hover:bg-white/10"
                    >
                      <Upload className="h-3 w-3" />
                      本地上传
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLogoMenuOpen(false);
                        setLogoUrlDialogOpen(true);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition hover:bg-white/10"
                    >
                      <Search className="h-3 w-3" />
                      图片 URL
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTagForm((current) => ({ ...current, logoUrl: "" }));
                        setLogoMenuOpen(false);
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
                onClick={() => setLogoMenuOpen(!logoMenuOpen)}
                className="inline-flex h-8 w-8 items-center justify-center rounded border border-white/18 bg-white/8 text-white/88 transition hover:bg-white/14"
                aria-label="添加图标"
              >
                <Plus className="h-4 w-4" />
              </button>
              {logoMenuOpen ? (
                <div className="absolute left-1/2 top-full z-30 mt-1.5 w-32 -translate-x-1/2 overflow-hidden rounded-xl border border-white/14 bg-[#0f172ae8] p-1 text-white shadow-[0_22px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setLogoMenuOpen(false);
                      logoFileInputRef.current?.click();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition hover:bg-white/10"
                  >
                    <Upload className="h-3 w-3" />
                    本地上传
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLogoMenuOpen(false);
                      setLogoUrlDialogOpen(true);
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
          {logoUploading ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-slate-950/42 text-xs text-white/78 backdrop-blur-sm">
              <LoaderCircle className="h-4 w-4 animate-spin" />
            </div>
          ) : null}
        </div>
        <input
          ref={logoFileInputRef}
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void uploadLogoFile(file);
            }
            event.currentTarget.value = "";
          }}
          className="hidden"
        />
      </div>

      {/* 标签名 */}
      <input
        value={tagForm.name}
        onChange={(event) =>
          setTagForm((current) => ({ ...current, name: event.target.value }))
        }
        placeholder="标签名"
        className="rounded-xl border border-white/12 bg-white/8 px-3 py-2 text-sm outline-none placeholder:text-white/35"
      />

      {/* 隐藏标签选项 */}
      <label className="flex items-center gap-3 rounded-xl border border-white/12 bg-white/8 px-3 py-2 text-sm">
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

      {/* 提交按钮 */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSubmit}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
        >
          {submitLabel === "创建标签" ? <Plus className="h-4 w-4" /> : <PencilLine className="h-4 w-4" />}
          {submitLabel}
        </button>
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-5 py-2.5 text-sm font-medium text-rose-200 transition hover:bg-rose-500/20"
          >
            <Trash2 className="h-4 w-4" />
            删除标签
          </button>
        ) : null}
      </div>

      {/* 图片 URL 对话框 */}
      {logoUrlDialogOpen ? (
        <div className="animate-drawer-fade fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/52 p-4 backdrop-blur-sm sm:items-center">
          <div className="animate-panel-rise w-full max-w-[420px] overflow-hidden rounded-[28px] border border-white/12 bg-[#101a2eee] text-white shadow-[0_32px_120px_rgba(0,0,0,0.42)]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h3 className="text-lg font-semibold">图片 URL</h3>
              <button
                type="button"
                onClick={() => {
                  setLogoUrlDialogOpen(false);
                  setLogoUrlValue("");
                  setLogoUrlError("");
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/12 bg-white/6 transition hover:bg-white/12"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5">
              <input
                value={logoUrlValue}
                onChange={(event) => {
                  setLogoUrlValue(event.target.value);
                  if (logoUrlError) setLogoUrlError("");
                }}
                placeholder="https://example.com/icon.png"
                className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm outline-none placeholder:text-white/35"
              />
              {logoUrlError ? (
                <p className="mt-2 text-sm text-rose-300">{logoUrlError}</p>
              ) : null}
              <button
                type="button"
                onClick={() => void uploadLogoByUrl(logoUrlValue.trim())}
                disabled={!logoUrlValue.trim() || logoUploading}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {logoUploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                确认上传
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
