/**
 * 网站编辑表单组件
 * @description 提供网站信息编辑界面，支持文字图标、图标上传（本地/URL）、Favicon 自动获取、标签关联等功能
 */

"use client";

import { type Dispatch, type SetStateAction, useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, LoaderCircle, PencilLine, Plus, Trash2, Upload, X, Palette, Check } from "lucide-react";
import { type Tag } from "@/lib/types";
import type { SiteFormState } from "./types";
import { requestJson } from "@/lib/api";

/** Logo 选项类型 */
type LogoOption = {
  /** 唯一标识 */
  key: string;
  /** 显示类型 */
  type: "current" | "text" | "favicon" | "uploaded";
  /** 显示 URL */
  url: string | null;
  /** 提示文字 */
  label: string;
};

/** 图标选择模式 */
type IconMode = "current" | "text" | "upload" | "favicon" | null;

/** 预设图标背景色 */
const ICON_BG_COLORS = [
  "#5f86ff", "#6366f1", "#8b5cf6", "#a855f7",
  "#ec4899", "#f43f5e", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4",
];

/** 强调色 */
const ACCENT = "#5f86ff";

function extractDomain(url: string): string {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return parsed.hostname;
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  }
}

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
  const display = text.trim() || "文";
  const escaped = escapeXml(display);
  const fontSize = textIconFontSize(display.length);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">`
    + `<rect width="120" height="120" rx="28" fill="${color}"/>`
    + `<text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" `
    + `fill="white" font-size="${fontSize}" font-family="Arial,'PingFang SC','Microsoft YaHei',sans-serif">`
    + `${escaped}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function SiteEditorForm({
  siteForm,
  setSiteForm,
  tags,
  submitLabel,
  onSubmit,
  onDelete,
  onError,
}: {
  siteForm: SiteFormState;
  setSiteForm: Dispatch<SetStateAction<SiteFormState>>;
  tags: Tag[];
  submitLabel: string;
  onSubmit: () => void;
  onDelete?: () => void;
  onError?: (message: string) => void;
}) {
  const [iconUploading, setIconUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadTab, setUploadTab] = useState<"file" | "url">("file");
  const [iconUrlValue, setIconUrlValue] = useState("");
  const [iconUrlError, setIconUrlError] = useState("");
  const iconFileInputRef = useRef<HTMLInputElement | null>(null);
  const currentIconUrl = siteForm.iconUrl;

  // 图标选择状态
  const [iconMode, setIconMode] = useState<IconMode>(null);
  const [textIconText, setTextIconText] = useState("");
  // 已上传图片的 URL
  const [uploadedIconUrl, setUploadedIconUrl] = useState("");
  // 官方图标验证后可用的 URL
  const [faviconVerifiedUrl, setFaviconVerifiedUrl] = useState<string | null>(null);
  // 编辑模式：原始图标 URL
  const [originalIconUrl, setOriginalIconUrl] = useState("");
  // 图标背景色（新建默认透明，编辑时从 siteForm 读取）
  const [iconBgColor, setIconBgColor] = useState(siteForm.iconBgColor || "transparent");
  // 隐藏的原生颜色选择器 ref
  const hiddenColorInputRef = useRef<HTMLInputElement>(null);

  // 用 ref 追踪最新 iconMode，防止异步回调覆盖用户后续选择
  const iconModeRef = useRef<IconMode>(null);
  iconModeRef.current = iconMode;

  // 是否已上传了自定义图标
  const hasUploadedIcon = !!uploadedIconUrl;

  // ── 编辑模式初始化（siteForm.id 变化时触发） ──
  const prevIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const id = siteForm.id;
    if (id === prevIdRef.current) return;
    prevIdRef.current = id;

    if (id) {
      // 编辑现有网站
      setOriginalIconUrl(siteForm.iconUrl || "");
      setTextIconText(siteForm.name.trim().slice(0, 3));
      setIconMode(siteForm.iconUrl ? "current" : null);
      setUploadedIconUrl("");
      setIconBgColor(siteForm.iconBgColor || "transparent");
    } else {
      // 新建网站 → 重置
      setOriginalIconUrl("");
      setIconMode(null);
      setTextIconText("");
      setUploadedIconUrl("");
      setFaviconVerifiedUrl(null);
      setIconBgColor("transparent");
    }
    // 仅在 id 变化时执行，忽略其它依赖
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteForm.id]);

  // 文字图标 URL（使用用户选择的背景色）
  const textIconUrl = generateTextIconDataUrl(textIconText, iconBgColor);

  // 当背景色变化且当前为文字图标模式时，同步更新 siteForm.iconUrl
  // 同时同步 siteForm.iconBgColor
  useEffect(() => {
    setSiteForm((cur) => ({ ...cur, iconBgColor: iconBgColor }));
    if (iconMode === "text") {
      setSiteForm((cur) => ({ ...cur, iconUrl: textIconUrl }));
    }
  }, [iconBgColor]); // eslint-disable-line react-hooks/exhaustive-deps


  // ── 构建 Logo 选项列表 ──
  const logoOptions: LogoOption[] = [];

  // 1. 当前图标（编辑模式 + 有原始图标时显示，排在最前）
  if (siteForm.id && originalIconUrl) {
    logoOptions.push({
      key: "current",
      type: "current",
      url: originalIconUrl,
      label: "当前图标",
    });
  }

  // 2. 文字图标（始终显示）
  logoOptions.push({
    key: "text",
    type: "text",
    url: textIconUrl,
    label: "文字图标",
  });

  // 3. 官方图标（URL 非空且验证可加载时显示）
  if (faviconVerifiedUrl) {
    logoOptions.push({
      key: "favicon",
      type: "favicon",
      url: faviconVerifiedUrl,
      label: "官方图标",
    });
  }

  // 4. 已上传的图标
  if (hasUploadedIcon) {
    logoOptions.push({
      key: "uploaded",
      type: "uploaded",
      url: uploadedIconUrl,
      label: "上传",
    });
  }

  // URL 输入变化时自动获取 Favicon（0.5s 防抖），并验证图片可加载
  const fetchFavicon = useCallback((url: string) => {
    const trimmed = url.trim();
    if (!trimmed) { setFaviconVerifiedUrl(null); return; }
    const domain = extractDomain(trimmed);
    if (!domain) { setFaviconVerifiedUrl(null); return; }

    const previewUrl = `https://favicon.im/${domain}?larger=true`;
    const img = new Image();
    img.onload = () => setFaviconVerifiedUrl(previewUrl);
    img.onerror = () => setFaviconVerifiedUrl(null);
    img.src = previewUrl;
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchFavicon(siteForm.url), 500);
    return () => clearTimeout(timer);
  }, [siteForm.url, fetchFavicon]);

  // 选择 Logo 选项
  function selectLogoOption(option: LogoOption) {
    if (option.type === "current") {
      setIconMode("current");
      setSiteForm((cur) => ({ ...cur, iconUrl: originalIconUrl }));
    } else if (option.type === "text") {
      setIconMode("text");
      setSiteForm((cur) => ({ ...cur, iconUrl: textIconUrl }));
    } else if (option.type === "favicon" && option.url) {
      setIconMode("favicon");
      // 直接使用 favicon.im 的动态 URL，不下载到本地
      setSiteForm((cur) => ({ ...cur, iconUrl: option.url! }));
    } else if (option.type === "uploaded") {
      // 点击已上传的图标 → 打开上传弹窗（可更换）
      setUploadTab("file");
      setUploadDialogOpen(true);
      setIconMode("upload");
    }
  }

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
      setUploadedIconUrl(asset.url);
      setIconMode("upload");
      setSiteForm((cur) => ({ ...cur, iconUrl: asset.url }));
      setUploadDialogOpen(false);
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
      setUploadedIconUrl(asset.url);
      setIconMode("upload");
      setSiteForm((cur) => ({ ...cur, iconUrl: asset.url }));
      setUploadDialogOpen(false);
      setIconUrlValue("");
      setIconUrlError("");
    } catch (error) {
      setIconUrlError(error instanceof Error ? error.message : "上传失败");
    } finally {
      setIconUploading(false);
    }
  }

  function handleTextIconChange(value: string) {
    const sliced = value.slice(0, 6);
    setTextIconText(sliced);
    setSiteForm((cur) => ({ ...cur, iconUrl: generateTextIconDataUrl(sliced, iconBgColor) }));
  }

  function handleSubmit() {
    onSubmit();
  }

  const isBusy = iconUploading;

  return (
    <div className="grid gap-3">
      {/* ── 图标选择区域（始终显示、居中） ── */}
      <div>
        <p className="mb-2.5 text-center text-[13px] font-medium text-white/50">选择图标</p>
        <div className="flex flex-wrap items-start justify-center gap-3">
          {logoOptions.map((option) => {
            const isSelected =
              option.type === "current" ? iconMode === "current"
                : option.type === "text" ? iconMode === "text"
                : option.type === "uploaded" ? iconMode === "upload"
                : option.type === "favicon" ? iconMode === "favicon"
                : currentIconUrl === option.url;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => selectLogoOption(option)}
                className="group relative flex flex-col items-center gap-2"
                title={option.label}
              >
                <div
                  className="flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-2xl transition"
                  style={{
                    border: "2px solid rgba(255,255,255,0.12)",
                  }}
                >
                  <div
                    className="flex h-full w-full items-center justify-center overflow-hidden rounded-xl transition"
                    style={{
                      background: iconBgColor === "transparent" ? "rgba(255,255,255,0.04)" : iconBgColor,
                    }}
                  >
                  {option.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={option.url}
                      alt={option.label}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                  </div>
                </div>
                <span
                  className="flex max-w-[80px] items-center gap-1 truncate leading-tight"
                  style={{
                    color: isSelected ? "#ffffff" : "rgba(255,255,255,0.5)",
                    fontWeight: isSelected ? 700 : 400,
                    fontSize: isSelected ? "14px" : "13px",
                  }}
                >
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0" style={{ color: ACCENT }} />}
                  {option.label}
                </span>
              </button>
            );
          })}

          {/* 上传按钮：未上传时显示，已上传时由"上传"item 替代 */}
          {!hasUploadedIcon && (
            <button
              type="button"
              onClick={() => {
                setUploadTab("file");
                setUploadDialogOpen(true);
                setIconMode("upload");
                // 没有已上传图片时清空 iconUrl，确保提交校验能捕获
                setSiteForm((cur) => ({ ...cur, iconUrl: "" }));
              }}
              className="group relative flex flex-col items-center gap-2"
              title="上传图片"
            >
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
              <span
                className="flex max-w-[80px] items-center gap-1 truncate leading-tight"
                style={{
                  color: iconMode === "upload" ? "#ffffff" : "rgba(255,255,255,0.35)",
                  fontWeight: iconMode === "upload" ? 700 : 400,
                  fontSize: iconMode === "upload" ? "14px" : "13px",
                }}
              >
                {iconMode === "upload" && <Check className="h-3.5 w-3.5 shrink-0" style={{ color: ACCENT }} />}
                上传
              </span>
            </button>
          )}

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
              className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 transition hover:scale-110 hover:bg-white/20"
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
        ref={iconFileInputRef}
        type="file"
        accept="image/*"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void uploadIconFile(file);
          event.currentTarget.value = "";
        }}
        className="hidden"
      />

      {/* 文字图标输入（选中"文字图标"时显示，在网站名称上方） */}
      {iconMode === "text" && (
        <input
          value={textIconText}
          onChange={(event) => handleTextIconChange(event.target.value)}
          maxLength={6}
          placeholder="输入图标文字（最多 6 个字符）"
          className="rounded-xl border border-white/12 bg-white/8 px-3 py-2 text-sm outline-none placeholder:text-white/35"
        />
      )}

      {/* 网站名称 */}
      <input
        value={siteForm.name}
        onChange={(event) =>
          setSiteForm((cur) => ({ ...cur, name: event.target.value }))
        }
        placeholder="网站名称"
        className="rounded-xl border border-white/12 bg-white/8 px-3 py-2 text-sm outline-none placeholder:text-white/35"
      />

      {/* URL 输入框 */}
      <input
        value={siteForm.url}
        onChange={(event) =>
          setSiteForm((cur) => ({ ...cur, url: event.target.value }))
        }
        placeholder="https://example.com"
        className="rounded-xl border border-white/12 bg-white/8 px-3 py-2 text-sm outline-none placeholder:text-white/35"
      />

      {/* ── 上传图标弹窗（本地 / URL 二选一） ── */}
      {uploadDialogOpen ? (
        <div className="animate-drawer-fade fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/52 p-4 backdrop-blur-sm sm:items-center">
          <div className="animate-panel-rise w-full max-w-[420px] overflow-hidden rounded-[28px] border border-white/12 bg-[#101a2eee] text-white shadow-[0_32px_120px_rgba(0,0,0,0.42)]">
            {/* 头部 */}
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
                    setSiteForm((cur) => ({ ...cur, iconUrl: "" }));
                  }
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/12 bg-white/6 transition hover:bg-white/12"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5">
              {/* Tab 切换 */}
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

              {/* 本地上传 */}
              {uploadTab === "file" ? (
                <button
                  type="button"
                  onClick={() => iconFileInputRef.current?.click()}
                  disabled={iconUploading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/12 bg-white/4 px-4 py-8 text-sm text-white/50 transition hover:border-white/20 hover:bg-white/8 hover:text-white/70 disabled:opacity-60"
                >
                  {iconUploading ? (
                    <LoaderCircle className="h-5 w-5 animate-spin" />
                  ) : (
                    <ImagePlus className="h-5 w-5" />
                  )}
                  {iconUploading ? "上传中..." : "点击选择图片文件"}
                </button>
              ) : (
                /* URL 上传 */
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
                    disabled={!iconUrlValue.trim() || iconUploading}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {iconUploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                    确认上传
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <textarea
        value={siteForm.description ?? ""}
        onChange={(event) =>
          setSiteForm((cur) => ({ ...cur, description: event.target.value || null }))
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
                  setSiteForm((cur) => ({
                    ...cur,
                    tagIds: event.target.checked
                      ? [...cur.tagIds, tag.id]
                      : cur.tagIds.filter((id) => id !== tag.id),
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
          onClick={handleSubmit}
          disabled={isBusy}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:opacity-60"
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
