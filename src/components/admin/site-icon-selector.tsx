/**
 * 站点图标选择器
 * @description 管理图标选择逻辑：文字图标、上传（本地/URL）、Favicon 自动获取、颜色选择
 */

"use client";

import { type Dispatch, type SetStateAction, forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Check, ImagePlus, LoaderCircle, Palette, Upload, X } from "lucide-react";
import type { SiteFormState } from "./types";
import type { ThemeMode } from "@/lib/base/types";
import { cn } from "@/lib/utils/utils";
import { Tooltip } from "@/components/ui/tooltip";
import { getDialogInputClass, getDialogCloseBtnClass, getDialogOverlayClass, getDialogPanelClass } from "@/components/sakura-nav/style-helpers";
import {
  generateTextIconDataUrl,
  verifyFavicon,
  uploadIconFile as doUploadIconFile,
  extractAssetIdFromUrl,
} from "@/lib/utils/icon-utils";
import { ImageCropDialog } from "@/components/dialogs/image-crop-dialog";

type LogoOption = {
  key: string;
  type: "current" | "text" | "favicon" | "uploaded";
  url: string | null;
  label: string;
};

type IconMode = "current" | "text" | "upload" | "favicon" | null;

const ICON_BG_COLORS = [
  "#5f86ff", "#6366f1", "#8b5cf6", "#a855f7",
  "#ec4899", "#f43f5e", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4",
];

const ACCENT = "#5f86ff";

export interface SiteIconSelectorHandle {
  autoSelectFromAi: (siteName: string) => void;
}

interface SiteIconSelectorProps {
  siteForm: SiteFormState;
  setSiteForm: Dispatch<SetStateAction<SiteFormState>>;
  themeMode?: ThemeMode;
}

export const SiteIconSelector = forwardRef<SiteIconSelectorHandle, SiteIconSelectorProps>(
  function SiteIconSelector({ siteForm, setSiteForm, themeMode = "dark" }, ref) {
    const currentIconUrl = siteForm.iconUrl;

    const [iconMode, setIconMode] = useState<IconMode>(
      siteForm.id && siteForm.iconUrl ? "current" : null,
    );
    const [textIconText, setTextIconText] = useState(siteForm.name.trim().slice(0, 3));
    const [uploadedIconUrl, setUploadedIconUrl] = useState("");
    const [faviconVerifiedUrl, setFaviconVerifiedUrl] = useState<string | null>(null);
    const [originalIconUrl, setOriginalIconUrl] = useState(
      siteForm.id ? siteForm.iconUrl || "" : "",
    );
    const [iconBgColor, setIconBgColor] = useState(siteForm.iconBgColor || "transparent");
    const [iconUploading, setIconUploading] = useState(false);
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);

    const iconFileInputRef = useRef<HTMLInputElement>(null);
    const hiddenColorInputRef = useRef<HTMLInputElement>(null);
    const hasUploadedIcon = !!uploadedIconUrl;

    // 编辑模式初始化（siteForm.id 变化时触发）
    const prevIdRef = useRef<string | undefined>(siteForm.id);
    useEffect(() => {
      const id = siteForm.id;
      if (id === prevIdRef.current) return;
      prevIdRef.current = id;
      if (id) {
        setOriginalIconUrl(siteForm.iconUrl || "");
        setTextIconText(siteForm.name.trim().slice(0, 3));
        setIconMode(siteForm.iconUrl ? "current" : null);
        setUploadedIconUrl("");
        setIconBgColor(siteForm.iconBgColor || "transparent");
      } else {
        setOriginalIconUrl("");
        setIconMode(null);
        setTextIconText("");
        setUploadedIconUrl("");
        setFaviconVerifiedUrl(null);
        setIconBgColor("transparent");
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [siteForm.id]);

    const textIconUrl = generateTextIconDataUrl(textIconText, iconBgColor);

    useEffect(() => {
      setSiteForm((cur) => ({ ...cur, iconBgColor }));
      if (iconMode === "text") {
        setSiteForm((cur) => ({ ...cur, iconUrl: textIconUrl }));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [iconBgColor]);

    useEffect(() => {
      const timer = setTimeout(() => verifyFavicon(siteForm.url, setFaviconVerifiedUrl), 500);
      return () => clearTimeout(timer);
    }, [siteForm.url]);

    // Logo 选项列表
    const logoOptions: LogoOption[] = [];
    if (siteForm.id && originalIconUrl) {
      logoOptions.push({ key: "current", type: "current", url: originalIconUrl, label: "当前图标" });
    }
    logoOptions.push({ key: "text", type: "text", url: textIconUrl, label: "文字图标" });
    if (faviconVerifiedUrl) {
      logoOptions.push({ key: "favicon", type: "favicon", url: faviconVerifiedUrl, label: "官方图标" });
    }
    if (hasUploadedIcon) {
      logoOptions.push({ key: "uploaded", type: "uploaded", url: uploadedIconUrl, label: "上传" });
    }

    // 暴露给父组件
    useImperativeHandle(ref, () => ({
      autoSelectFromAi(siteName: string) {
        if (faviconVerifiedUrl) {
          setIconMode("favicon");
          setSiteForm((cur) => ({ ...cur, iconUrl: faviconVerifiedUrl }));
        } else {
          const text = siteName.trim().slice(0, 3);
          if (text) setTextIconText(text);
          setIconMode("text");
          setSiteForm((cur) => ({
            ...cur,
            iconUrl: generateTextIconDataUrl(text || "文", iconBgColor),
          }));
        }
      },
    }), [faviconVerifiedUrl, iconBgColor, setSiteForm]);

    function selectLogoOption(option: LogoOption) {
      if (option.type === "current") {
        setIconMode("current");
        setSiteForm((cur) => ({ ...cur, iconUrl: originalIconUrl }));
      } else if (option.type === "text") {
        setIconMode("text");
        setSiteForm((cur) => ({ ...cur, iconUrl: textIconUrl }));
      } else if (option.type === "favicon" && option.url) {
        setIconMode("favicon");
        setSiteForm((cur) => ({ ...cur, iconUrl: option.url! }));
      } else if (option.type === "uploaded") {
        setUploadDialogOpen(true);
        setIconMode("upload");
      }
    }

    /** 选择文件后先进入裁剪 */
    function handleUploadIconFile(file: File) {
      setCropImageSrc(URL.createObjectURL(file));
    }

    /** 裁剪确认后上传 */
    async function handleCropConfirm(blob: Blob) {
      const src = cropImageSrc;
      setCropImageSrc(null);
      if (src) URL.revokeObjectURL(src);
      setIconUploading(true);
      try {
        const file = new File([blob], "icon.png", { type: "image/png" });
        // 提取旧图标资产 ID，以便上传新图标时自动删除旧文件
        const oldAssetId = extractAssetIdFromUrl(currentIconUrl);
        const asset = await doUploadIconFile(file, oldAssetId);
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

    /** 取消裁剪 */
    function handleCropCancel() {
      const src = cropImageSrc;
      setCropImageSrc(null);
      if (src) URL.revokeObjectURL(src);
    }

    function handleTextIconChange(value: string) {
      const sliced = value.slice(0, 6);
      setTextIconText(sliced);
      setSiteForm((cur) => ({ ...cur, iconUrl: generateTextIconDataUrl(sliced, iconBgColor) }));
    }

    const iconBorderColor = themeMode === "light" ? "rgba(148,163,184,0.4)" : "rgba(255,255,255,0.12)";
    const iconSelColor = themeMode === "light" ? "#0f172a" : "#ffffff";
    const iconUnselColor = themeMode === "light" ? "rgba(100,116,139,0.8)" : "rgba(255,255,255,0.5)";
    const iconEmptyBg = themeMode === "light" ? "rgba(241,245,249,0.6)" : "rgba(255,255,255,0.04)";

    return (
      <div>
        <p className={cn("mb-2.5 text-center text-[13px] font-medium", themeMode === "light" ? "text-slate-400" : "text-white/50")}>选择图标</p>
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
                  className="flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-[20px] transition"
                  style={{ border: `2px solid ${iconBorderColor}` }}
                >
                  <div
                    className="flex h-full w-full items-center justify-center"
                    style={{
                      background: iconBgColor === "transparent" ? iconEmptyBg : iconBgColor,
                    }}
                  >
                    {option.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={option.url} alt={option.label} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                </div>
                <span
                  className="flex max-w-[80px] items-center gap-1 truncate leading-tight"
                  style={{
                    color: isSelected ? iconSelColor : iconUnselColor,
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

          {!hasUploadedIcon && (
            <Tooltip tip="上传图片" themeMode={themeMode}>
            <button
              type="button"
              onClick={() => {
                setUploadDialogOpen(true);
                setIconMode("upload");
                setSiteForm((cur) => ({ ...cur, iconUrl: "" }));
              }}
              className="group relative flex flex-col items-center gap-2"
            >
              <div
                className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl border-2 border-dashed transition"
                style={{ borderColor: iconBorderColor, background: "transparent" }}
              >
                <Upload
                  className="h-6 w-6 transition"
                  style={{ color: themeMode === "light" ? "rgba(100,116,139,0.5)" : "rgba(255,255,255,0.3)" }}
                />
              </div>
              <span
                className="flex max-w-[80px] items-center gap-1 truncate leading-tight"
                style={{
                  color: iconMode === "upload" ? iconSelColor : (themeMode === "light" ? "rgba(100,116,139,0.6)" : "rgba(255,255,255,0.35)"),
                  fontWeight: iconMode === "upload" ? 700 : 400,
                  fontSize: iconMode === "upload" ? "14px" : "13px",
                }}
              >
                {iconMode === "upload" && <Check className="h-3.5 w-3.5 shrink-0" style={{ color: ACCENT }} />}
                上传
              </span>
            </button>
            </Tooltip>
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
            <span className={cn("absolute inset-0 flex items-center justify-center text-[8px] font-bold", themeMode === "light" ? "text-slate-400" : "text-white/70")}>∅</span>
          </button>

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
              className="flex h-5 w-5 items-center justify-center rounded-full transition hover:scale-110"
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
              onChange={(e) => setIconBgColor(e.target.value)}
            />
          </div>
        </div>

        {iconMode === "text" && (
          <input
            value={textIconText}
            onChange={(event) => handleTextIconChange(event.target.value)}
            maxLength={6}
            placeholder="输入图标文字（最多 6 个字符）"
            className={cn("mt-3 w-full rounded-xl border px-3 py-2 text-sm outline-none", getDialogInputClass(themeMode))}
          />
        )}

        <input
          ref={iconFileInputRef}
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleUploadIconFile(file);
            event.currentTarget.value = "";
          }}
          className="hidden"
        />

        {/* 上传图标弹窗 */}
        {uploadDialogOpen ? (
          <div className={cn("animate-drawer-fade fixed inset-0 z-[60] flex items-end justify-center p-4 backdrop-blur-sm sm:items-center", getDialogOverlayClass(themeMode))}>
            <div className={cn("animate-panel-rise w-full max-w-[420px] overflow-hidden rounded-[28px] border shadow-[0_32px_120px_rgba(0,0,0,0.42)]", getDialogPanelClass(themeMode))}>
              <div className={cn("flex items-center justify-between border-b px-5 py-4", themeMode === "light" ? "border-slate-200/50" : "border-white/10")}>
                <h3 className="text-lg font-semibold">
                  {hasUploadedIcon ? "更换图标" : "上传图标"}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setUploadDialogOpen(false);
                    if (!hasUploadedIcon) {
                      setIconMode("upload");
                      setSiteForm((cur) => ({ ...cur, iconUrl: "" }));
                    }
                  }}
                  className={cn("inline-flex h-9 w-9 items-center justify-center rounded-xl border transition", getDialogCloseBtnClass(themeMode))}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5">
                <button
                  type="button"
                  onClick={() => iconFileInputRef.current?.click()}
                  disabled={iconUploading}
                  className={cn(
                    "inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-sm transition disabled:opacity-60",
                    themeMode === "light"
                      ? "border-slate-300/60 bg-slate-50 text-slate-400 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-500"
                      : "border-white/12 bg-white/4 text-white/50 hover:border-white/20 hover:bg-white/8 hover:text-white/70",
                  )}
                >
                  {iconUploading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                  {iconUploading ? "上传中..." : "点击选择图片文件"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* 裁剪弹窗 */}
        {cropImageSrc ? (
          <ImageCropDialog
            imageSrc={cropImageSrc}
            cropShape="rect"
            aspectRatio={1}
            onConfirm={(blob) => void handleCropConfirm(blob)}
            onCancel={handleCropCancel}
            themeMode={themeMode}
          />
        ) : null}
      </div>
    );
  },
);
