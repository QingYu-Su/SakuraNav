/**
 * 标签编辑表单组件
 * @description 提供标签信息编辑界面，支持文字图标、图标上传、背景色选择、隐藏标签设置等功能
 */

"use client";

import { type Dispatch, type SetStateAction, useEffect, useRef, useState } from "react";
import { Check, LoaderCircle, PencilLine, Plus, Trash2, Upload, X, Palette } from "lucide-react";
import type { TagFormState } from "./types";
import { requestJson } from "@/lib/api";

/** 预设图标背景色 */
const ICON_BG_COLORS = [
  "#5f86ff", "#6366f1", "#8b5cf6", "#a855f7",
  "#ec4899", "#f43f5e", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4",
];

/** 强调色 */
const ACCENT = "#5f86ff";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 根据字符数量自适应字体大小 */
function textIconFontSize(len: number): number {
  if (len <= 1) return 54;
  if (len <= 2) return 40;
  if (len <= 3) return 32;
  if (len <= 4) return 26;
  if (len <= 5) return 22;
  return 18;
}

/** 生成文字图标 SVG data URL（支持多字符） */
function generateTextIconDataUrl(text: string, color: string): string {
  const display = text.trim() || "标";
  const escaped = escapeXml(display);
  const fontSize = textIconFontSize(display.length);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">`
    + `<rect width="120" height="120" rx="28" fill="${color}"/>`
    + `<text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" `
    + `fill="white" font-size="${fontSize}" font-family="Arial,'PingFang SC','Microsoft YaHei',sans-serif">`
    + `${escaped}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
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
  const [logoUploading, setLogoUploading] = useState(false);
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);
  const hiddenColorInputRef = useRef<HTMLInputElement>(null);

  // 图标选择状态
  const [iconMode, setIconMode] = useState<"current" | "text" | "upload" | null>(null);
  const [textIconText, setTextIconText] = useState("");
  const [uploadedIconUrl, setUploadedIconUrl] = useState("");
  const [iconBgColor, setIconBgColor] = useState(tagForm.logoBgColor || "transparent");
  // 上传弹窗
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadTab, setUploadTab] = useState<"file" | "url">("file");
  const [iconUrlValue, setIconUrlValue] = useState("");
  const [iconUrlError, setIconUrlError] = useState("");

  // 编辑模式：原始图标 URL
  const [originalIconUrl, setOriginalIconUrl] = useState("");

  // 用 ref 追踪最新 iconMode
  const iconModeRef = useRef<"current" | "text" | "upload" | null>(null);
  iconModeRef.current = iconMode;

  const hasUploadedIcon = !!uploadedIconUrl;

  // ── 编辑模式初始化（tagForm.id 变化时触发） ──
  const prevIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const id = tagForm.id;
    if (id === prevIdRef.current) return;
    prevIdRef.current = id;

    if (id) {
      setOriginalIconUrl(tagForm.logoUrl || "");
      setTextIconText(tagForm.name.trim().slice(0, 6));
      setIconMode(tagForm.logoUrl ? "current" : null);
      setUploadedIconUrl("");
      setIconBgColor(tagForm.logoBgColor || "transparent");
    } else {
      setOriginalIconUrl("");
      setIconMode(null);
      setTextIconText("");
      setUploadedIconUrl("");
      setIconBgColor("transparent");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagForm.id]);

  // 文字图标 URL
  const textIconUrl = generateTextIconDataUrl(textIconText, iconBgColor);

  // 当背景色变化且当前为文字图标模式时，同步更新 tagForm
  useEffect(() => {
    setTagForm((cur) => ({ ...cur, logoBgColor: iconBgColor }));
    if (iconMode === "text") {
      setTagForm((cur) => ({ ...cur, logoUrl: textIconUrl }));
    }
  }, [iconBgColor]); // eslint-disable-line react-hooks/exhaustive-deps

  // 当标签名变化且为文字图标模式时，更新文字图标
  useEffect(() => {
    const sliced = tagForm.name.trim().slice(0, 6);
    setTextIconText(sliced);
    if (iconMode === "text") {
      setTagForm((cur) => ({ ...cur, logoUrl: generateTextIconDataUrl(sliced, iconBgColor) }));
    }
  }, [tagForm.name]); // eslint-disable-line react-hooks/exhaustive-deps

  async function uploadIconFile(file: File) {
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", "icon");
      const asset = await requestJson<{ id: string; url: string }>("/api/assets/wallpaper", {
        method: "POST",
        body: formData,
      });
      setUploadedIconUrl(asset.url);
      setIconMode("upload");
      setTagForm((cur) => ({ ...cur, logoUrl: asset.url }));
      setUploadDialogOpen(false);
    } catch (error) {
      console.error("Upload icon failed:", error);
    } finally {
      setLogoUploading(false);
    }
  }

  async function uploadIconByUrl(url: string) {
    setLogoUploading(true);
    try {
      const asset = await requestJson<{ id: string; url: string }>("/api/assets/wallpaper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceUrl: url, kind: "icon" }),
      });
      setUploadedIconUrl(asset.url);
      setIconMode("upload");
      setTagForm((cur) => ({ ...cur, logoUrl: asset.url }));
      setUploadDialogOpen(false);
      setIconUrlValue("");
      setIconUrlError("");
    } catch (error) {
      setIconUrlError(error instanceof Error ? error.message : "上传失败");
    } finally {
      setLogoUploading(false);
    }
  }

  // 判断是否选中文字图标
  const isTextSelected = iconMode === "text";
  // 判断是否选中上传图标
  const isUploadSelected = iconMode === "upload";
  // 判断是否选中当前图标
  const isCurrentSelected = iconMode === "current";

  // 是否显示"当前图标"选项（编辑模式 + 有原始图标时）
  const showCurrentIcon = !!tagForm.id && !!originalIconUrl;

  return (
    <div className="grid gap-3">
      {/* ── 图标选择区域 ── */}
      <div>
        <p className="mb-2.5 text-center text-[13px] font-medium text-white/50">选择图标</p>
        <div className="flex flex-wrap items-start justify-center gap-3">
          {/* 当前图标选项（编辑模式 + 有原始图标时显示，排在最前） */}
          {showCurrentIcon ? (
            <button
              type="button"
              onClick={() => {
                setIconMode("current");
                setTagForm((cur) => ({ ...cur, logoUrl: originalIconUrl }));
              }}
              className="group relative flex flex-col items-center gap-2"
              title="当前图标"
            >
              <div
                className="flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-2xl transition"
                style={{ border: "2px solid rgba(255,255,255,0.12)" }}
              >
                <div
                  className="flex h-full w-full items-center justify-center overflow-hidden rounded-xl transition"
                  style={{ background: iconBgColor === "transparent" ? "rgba(255,255,255,0.04)" : iconBgColor }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={originalIconUrl}
                    alt="当前图标"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
              <span
                className="flex max-w-[80px] items-center gap-1 truncate leading-tight"
                style={{
                  color: isCurrentSelected ? "#ffffff" : "rgba(255,255,255,0.5)",
                  fontWeight: isCurrentSelected ? 700 : 400,
                  fontSize: isCurrentSelected ? "14px" : "13px",
                }}
              >
                {isCurrentSelected && <Check className="h-3.5 w-3.5 shrink-0" style={{ color: ACCENT }} />}
                当前图标
              </span>
            </button>
          ) : null}

          {/* 文字图标选项 */}
          <button
            type="button"
            onClick={() => {
              setIconMode("text");
              const sliced = tagForm.name.trim().slice(0, 6);
              setTextIconText(sliced);
              setTagForm((cur) => ({ ...cur, logoUrl: generateTextIconDataUrl(sliced, iconBgColor) }));
            }}
            className="group relative flex flex-col items-center gap-2"
            title="文字图标"
          >
            <div
              className="flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-2xl transition"
              style={{ border: "2px solid rgba(255,255,255,0.12)" }}
            >
              <div
                className="flex h-full w-full items-center justify-center overflow-hidden rounded-xl transition"
                style={{ background: iconBgColor === "transparent" ? "rgba(255,255,255,0.04)" : iconBgColor }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={textIconUrl}
                  alt="文字图标"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
            <span
              className="flex max-w-[80px] items-center gap-1 truncate leading-tight"
              style={{
                color: isTextSelected ? "#ffffff" : "rgba(255,255,255,0.5)",
                fontWeight: isTextSelected ? 700 : 400,
                fontSize: isTextSelected ? "14px" : "13px",
              }}
            >
              {isTextSelected && <Check className="h-3.5 w-3.5 shrink-0" style={{ color: ACCENT }} />}
              文字图标
            </span>
          </button>

          {/* 上传图标选项 */}
          <button
            type="button"
            onClick={() => {
              if (hasUploadedIcon) {
                setUploadTab("file");
                setUploadDialogOpen(true);
                setIconMode("upload");
              } else {
                setUploadTab("file");
                setUploadDialogOpen(true);
                setIconMode("upload");
                setTagForm((cur) => ({ ...cur, logoUrl: "" }));
              }
            }}
            className="group relative flex flex-col items-center gap-2"
            title="上传图片"
          >
            {hasUploadedIcon ? (
              <div
                className="flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-2xl transition"
                style={{ border: "2px solid rgba(255,255,255,0.12)" }}
              >
                <div
                  className="flex h-full w-full items-center justify-center overflow-hidden rounded-xl transition"
                  style={{ background: iconBgColor === "transparent" ? "rgba(255,255,255,0.04)" : iconBgColor }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={uploadedIconUrl}
                    alt="上传图标"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            ) : (
              <div
                className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl border-2 border-dashed transition"
                style={{
                  borderColor: "rgba(255,255,255,0.12)",
                  background: "transparent",
                }}
              >
                <Upload
                  className="h-6 w-6 transition group-hover:text-white/50"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                />
              </div>
            )}
            <span
              className="flex max-w-[80px] items-center gap-1 truncate leading-tight"
              style={{
                color: isUploadSelected ? "#ffffff" : "rgba(255,255,255,0.35)",
                fontWeight: isUploadSelected ? 700 : 400,
                fontSize: isUploadSelected ? "14px" : "13px",
              }}
            >
              {isUploadSelected && <Check className="h-3.5 w-3.5 shrink-0" style={{ color: ACCENT }} />}
              上传
            </span>
          </button>
        </div>

        {/* 颜色选择器 */}
        <div className="mt-3 flex items-center justify-center gap-1.5 flex-wrap">
          {ICON_BG_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setIconBgColor(color)}
              className="h-5 w-5 rounded-full transition hover:scale-110 shrink-0"
              style={{
                background: color,
                boxShadow: iconBgColor === color ? `0 0 0 2px ${color}80` : "none",
                outline: iconBgColor === color ? "2px solid rgba(255,255,255,0.8)" : "none",
                outlineOffset: "1px",
              }}
              title={color}
            />
          ))}

          {/* 透明色 */}
          <button
            type="button"
            onClick={() => setIconBgColor("transparent")}
            className="relative h-5 w-5 shrink-0 rounded-full transition hover:scale-110"
            style={{
              background: "linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%)",
              backgroundSize: "6px 6px",
              backgroundPosition: "0 0, 3px 3px",
              boxShadow: iconBgColor === "transparent" ? "0 0 0 2px rgba(255,255,255,0.3)" : "none",
              outline: iconBgColor === "transparent" ? "2px solid rgba(255,255,255,0.8)" : "none",
              outlineOffset: "1px",
            }}
            title="透明"
          >
            <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white/70">∅</span>
          </button>

          {/* 颜色编辑器 */}
          <div className="relative h-5 w-5 shrink-0">
            <button
              type="button"
              onClick={() => {
                const input = hiddenColorInputRef.current;
                if (input) {
                  input.value = iconBgColor.startsWith("#") ? iconBgColor : "#5f86ff";
                  input.click();
                }
              }}
              className="flex h-5 w-5 items-center justify-center rounded-full transition hover:scale-110 hover:bg-white/20"
              style={{
                background: "conic-gradient(#f43f5e, #eab308, #22c55e, #06b6d4, #6366f1, #ec4899, #f43f5e)",
                boxShadow: iconBgColor.startsWith("#") && !ICON_BG_COLORS.includes(iconBgColor) ? "0 0 0 2px rgba(255,255,255,0.3)" : "none",
                outline: iconBgColor.startsWith("#") && !ICON_BG_COLORS.includes(iconBgColor) ? "2px solid rgba(255,255,255,0.8)" : "none",
                outlineOffset: "1px",
              }}
              title="自定义颜色"
            >
              <Palette className="h-3 w-3 text-white drop-shadow-[0_0_2px_rgba(0,0,0,0.6)]" />
            </button>
            <input
              ref={hiddenColorInputRef}
              type="color"
              className="absolute left-0 top-0 h-5 w-5 cursor-pointer opacity-0"
              value={iconBgColor.startsWith("#") ? iconBgColor : "#5f86ff"}
              onChange={(e) => {
                setIconBgColor(e.target.value);
              }}
            />
          </div>
        </div>
      </div>

      <input
        ref={logoFileInputRef}
        type="file"
        accept="image/*"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void uploadIconFile(file);
          event.currentTarget.value = "";
        }}
        className="hidden"
      />

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

      {/* ── 上传图标弹窗 ── */}
      {uploadDialogOpen ? (
        <div className="animate-drawer-fade fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/52 p-4 backdrop-blur-sm sm:items-center">
          <div className="animate-panel-rise w-full max-w-[420px] overflow-hidden rounded-[28px] border border-white/12 bg-[#101a2eee] text-white shadow-[0_32px_120px_rgba(0,0,0,0.42)]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h3 className="text-lg font-semibold">
                {hasUploadedIcon ? "更换图标" : "上传图标"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setUploadDialogOpen(false);
                  setIconUrlValue("");
                  setIconUrlError("");
                  if (!hasUploadedIcon) {
                    setIconMode("upload");
                    setTagForm((cur) => ({ ...cur, logoUrl: "" }));
                  }
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/12 bg-white/6 transition hover:bg-white/12"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5">
              <div className="mb-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setUploadTab("file")}
                  className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition ${
                    uploadTab === "file"
                      ? "bg-white/12 text-white"
                      : "bg-white/4 text-white/50 hover:bg-white/8"
                  }`}
                >
                  本地上传
                </button>
                <button
                  type="button"
                  onClick={() => setUploadTab("url")}
                  className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition ${
                    uploadTab === "url"
                      ? "bg-white/12 text-white"
                      : "bg-white/4 text-white/50 hover:bg-white/8"
                  }`}
                >
                  指定 URL
                </button>
              </div>
              {uploadTab === "file" ? (
                <button
                  type="button"
                  onClick={() => logoFileInputRef.current?.click()}
                  disabled={logoUploading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/12 bg-white/4 px-4 py-8 text-sm text-white/50 transition hover:border-white/20 hover:bg-white/8 hover:text-white/70 disabled:opacity-60"
                >
                  {logoUploading ? (
                    <LoaderCircle className="h-5 w-5 animate-spin" />
                  ) : (
                    <Upload className="h-5 w-5" />
                  )}
                  {logoUploading ? "上传中..." : "点击选择图片文件"}
                </button>
              ) : (
                <div>
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
                    disabled={!iconUrlValue.trim() || logoUploading}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {logoUploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                    确认上传
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* 提交按钮 */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSubmit}
          disabled={logoUploading}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:opacity-60"
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
    </div>
  );
}
