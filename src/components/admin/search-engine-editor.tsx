/**
 * 搜索引擎编辑器组件
 * @description 提供搜索引擎的增删改界面，支持名称、搜索地址、图标（文字/官方/上传）和颜色配置
 * 编辑和新增使用独立弹窗，不展开当前列表
 */

"use client";

import { type Dispatch, type SetStateAction, useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  LoaderCircle,
  PencilLine,
  Plus,
  Trash2,
  Upload,
  X,
  Palette,
} from "lucide-react";
import { type SearchEngineConfig, type ThemeMode } from "@/lib/base/types";
import { cn } from "@/lib/utils/utils";
import { generateSingleCharIconDataUrl, verifyFavicon, uploadIconFile as doUploadIconFile, extractAssetIdFromUrl } from "@/lib/utils/icon-utils";
import {
  getDialogOverlayClass,
  getDialogPanelClass,
  getDialogDividerClass,
  getDialogSubtleClass,
  getDialogCloseBtnClass,
  getDialogInputClass,
  getDialogListItemClass,
  getDialogAddItemClass,
  getDialogSecondaryBtnClass,
  getDialogPrimaryBtnClass,
  getDialogDangerBtnClass,
} from "../sakura-nav/style-helpers";
import { ImageCropDialog } from "@/components/dialogs/image-crop-dialog";

/* ---------- 常量 ---------- */

const ACCENT_COLORS = [
  "#5f86ff", "#6366f1", "#8b5cf6", "#a855f7",
  "#ec4899", "#f43f5e", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4",
];

/* ---------- 引擎编辑表单状态 ---------- */

type EngineFormState = {
  id: string;
  name: string;
  searchUrl: string;
  iconUrl: string | null;
  accent: string;
};

function configToForm(cfg: SearchEngineConfig): EngineFormState {
  return { id: cfg.id, name: cfg.name, searchUrl: cfg.searchUrl, iconUrl: cfg.iconUrl, accent: cfg.accent };
}

function formToConfig(form: EngineFormState): SearchEngineConfig {
  return { id: form.id, name: form.name, searchUrl: form.searchUrl, iconUrl: form.iconUrl, accent: form.accent };
}

/** 图标选择模式 */
type IconMode = "text" | "favicon" | "upload" | null;

/* ---------- 主组件 ---------- */

export function SearchEngineEditor({
  engines,
  onChange,
  onClose,
  themeMode,
}: {
  engines: SearchEngineConfig[];
  onChange: Dispatch<SetStateAction<SearchEngineConfig[]>>;
  onClose: () => void;
  themeMode: ThemeMode;
}) {
  /* ---- 编辑状态 ---- */
  const [editForm, setEditForm] = useState<EngineFormState | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  /* ---- 图标状态 ---- */
  const [iconMode, setIconMode] = useState<IconMode>(null);
  const [faviconVerifiedUrl, setFaviconVerifiedUrl] = useState<string | null>(null);
  const [uploadedIconUrl, setUploadedIconUrl] = useState("");
  const [iconUploading, setIconUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const iconFileInputRef = useRef<HTMLInputElement>(null);
  const hiddenColorInputRef = useRef<HTMLInputElement>(null);

  const hasUploadedIcon = !!uploadedIconUrl;

  /* ---- 文字图标 URL（仅首字符 + accent 颜色自适应） ---- */
  const textIconUrl = editForm ? generateSingleCharIconDataUrl(editForm.name.charAt(0), editForm.accent) : "";

  /* ---- 初始化图标状态（切换编辑目标时重置） ---- */
  useEffect(() => {
    setIconMode(null);
    setFaviconVerifiedUrl(null);
    setUploadedIconUrl("");
  }, [editForm?.id]);

  /* ---- 搜索 URL 变化时获取 favicon ---- */
  const fetchFavicon = useCallback((url: string) => {
    verifyFavicon(url, setFaviconVerifiedUrl);
  }, []);

  useEffect(() => {
    if (!editForm?.searchUrl) return;
    const timer = setTimeout(() => fetchFavicon(editForm.searchUrl), 500);
    return () => clearTimeout(timer);
  }, [editForm?.searchUrl, fetchFavicon]);

  /* ---- 图标选项列表 ---- */
  type LogoOption = { key: string; type: "text" | "favicon" | "uploaded"; url: string | null; label: string };
  const logoOptions: LogoOption[] = [];
  logoOptions.push({ key: "text", type: "text", url: textIconUrl, label: "文字图标" });
  if (faviconVerifiedUrl) {
    logoOptions.push({ key: "favicon", type: "favicon", url: faviconVerifiedUrl, label: "官方图标" });
  }
  if (hasUploadedIcon) {
    logoOptions.push({ key: "uploaded", type: "uploaded", url: uploadedIconUrl, label: "上传" });
  }

  /* ---- 操作函数 ---- */

  function selectLogoOption(option: LogoOption) {
    if (option.type === "text") {
      setIconMode("text");
      setEditForm(cur => cur ? { ...cur, iconUrl: textIconUrl } : cur);
    } else if (option.type === "favicon" && option.url) {
      setIconMode("favicon");
      setEditForm(cur => cur ? { ...cur, iconUrl: option.url! } : cur);
    } else if (option.type === "uploaded") {
      // 点击已上传图标 → 打开上传弹窗（可更换）
      setUploadDialogOpen(true);
      setIconMode("upload");
    }
  }

  /** 选择文件后先进入裁剪 */
  function uploadIconFile(file: File) {
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
      const oldAssetId = extractAssetIdFromUrl(editForm?.iconUrl);
      const asset = await doUploadIconFile(file, oldAssetId);
      setUploadedIconUrl(asset.url);
      setIconMode("upload");
      setEditForm(cur => cur ? { ...cur, iconUrl: asset.url } : cur);
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

  function startEdit(cfg: SearchEngineConfig) {
    setEditForm(configToForm(cfg));
    setIsCreating(false);
  }

  function startCreate() {
    const newId = `custom-${Date.now()}`;
    setEditForm({ id: newId, name: "", searchUrl: "", iconUrl: null, accent: ACCENT_COLORS[0] });
    setIsCreating(true);
  }

  function closeEditDialog() {
    setEditForm(null);
    setUploadDialogOpen(false);
  }

  function saveForm() {
    if (!editForm || !editForm.name.trim() || !editForm.searchUrl.trim()) return;
    const config = formToConfig(editForm);
    if (isCreating) {
      onChange((prev) => [...prev, config]);
    } else {
      onChange((prev) => prev.map((e) => (e.id === editForm.id ? config : e)));
    }
    closeEditDialog();
  }

  function deleteEngine(id: string) {
    onChange((prev) => prev.filter((e) => e.id !== id));
  }

  /** 名称变化时，若处于文字图标模式则同步更新 iconUrl */
  function handleNameChange(name: string) {
    setEditForm((cur) => {
      if (!cur) return cur;
      const updated = { ...cur, name };
      if (iconMode === "text") {
        updated.iconUrl = generateSingleCharIconDataUrl(name.charAt(0), cur.accent);
      }
      return updated;
    });
  }

  /** accent 变化时，若处于文字图标模式则同步更新 iconUrl */
  function handleAccentChange(accent: string) {
    setEditForm((cur) => {
      if (!cur) return cur;
      const updated = { ...cur, accent };
      if (iconMode === "text") {
        updated.iconUrl = generateSingleCharIconDataUrl(cur.name.charAt(0), accent);
      }
      return updated;
    });
  }

  /* ---- 引擎预览图标 ---- */
  function engineIcon(cfg: SearchEngineConfig, size: string = "h-8 w-8") {
    if (cfg.iconUrl) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cfg.iconUrl} alt={cfg.name} className={cn(size, "rounded-full object-cover")} />
      );
    }
    return (
      <span
        className={cn(size, "inline-flex items-center justify-center rounded-full text-xs font-semibold text-white")}
        style={{ backgroundColor: cfg.accent }}
      >
        {cfg.name.charAt(0)}
      </span>
    );
  }

  /* ---- JSX ---- */
  return (
    <>
      {/* ===== 主列表弹窗 ===== */}
      <div className={cn(getDialogOverlayClass(themeMode), "fixed inset-0 z-[60] flex items-center justify-center p-4")}
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className={cn(getDialogPanelClass(themeMode), "animate-panel-rise w-full max-w-[560px] overflow-hidden rounded-[34px] border backdrop-blur-xl")}>
          {/* 头部 */}
          <div className={cn("flex items-center justify-between border-b px-6 py-5", getDialogDividerClass(themeMode))}>
            <div>
              <p className={cn("text-xs uppercase tracking-[0.28em]", getDialogSubtleClass(themeMode))}>Settings</p>
              <h2 className="mt-1 text-2xl font-semibold">搜索引擎管理</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={cn(getDialogCloseBtnClass(themeMode), "inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition")}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* 引擎列表 */}
          <div className="max-h-[60vh] overflow-y-auto p-6">
            {engines.map((cfg) => (
              <div
                key={cfg.id}
                className={cn(getDialogListItemClass(themeMode), "mb-3 flex items-center gap-3 rounded-2xl border px-4 py-3 transition")}
              >
                <button
                  type="button"
                  onClick={() => startEdit(cfg)}
                  className="inline-flex min-w-[120px] items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-white shadow-md transition hover:opacity-90"
                  style={{ backgroundColor: cfg.accent }}
                >
                  {engineIcon(cfg)}
                  <span className="truncate">{cfg.name}</span>
                </button>
                <span className={cn("min-w-0 flex-1 truncate text-xs font-mono", getDialogSubtleClass(themeMode))}>{cfg.searchUrl}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(cfg)}
                    className={cn(getDialogCloseBtnClass(themeMode), "inline-flex h-8 w-8 items-center justify-center rounded-xl border transition", themeMode === "light" ? "text-slate-400 hover:text-slate-600" : "text-white/50 hover:text-white")}
                    title="编辑"
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteEngine(cfg.id)}
                    className={cn(getDialogDangerBtnClass(themeMode), "inline-flex h-8 w-8 items-center justify-center rounded-xl border transition", themeMode === "light" ? "hover:text-red-500" : "hover:text-red-300")}
                    title="删除"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {/* 添加按钮 */}
            <button
              type="button"
              onClick={startCreate}
              className={cn(getDialogAddItemClass(themeMode), "mt-1 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed py-3 text-sm transition")}
            >
              <Plus className="h-4 w-4" />
              添加搜索引擎
            </button>
          </div>
        </div>
      </div>

      {/* ===== 编辑/新建弹窗（独立覆盖层） ===== */}
      {editForm && (
        <div
          className={cn(getDialogOverlayClass(themeMode), "fixed inset-0 z-[70] flex items-center justify-center p-4")}
          onMouseDown={(e) => { if (e.target === e.currentTarget) closeEditDialog(); }}
        >
          <div className={cn(getDialogPanelClass(themeMode), "animate-panel-rise relative w-full max-w-[480px] overflow-hidden rounded-[34px] border backdrop-blur-xl")}>
            {/* 头部 */}
            <div className={cn("flex items-center justify-between border-b px-6 py-5", getDialogDividerClass(themeMode))}>
              <div>
                <p className={cn("text-xs uppercase tracking-[0.28em]", getDialogSubtleClass(themeMode))}>
                  {isCreating ? "Create" : "Edit"}
                </p>
                <h2 className="mt-1 text-2xl font-semibold">
                  {isCreating ? "添加搜索引擎" : "编辑搜索引擎"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeEditDialog}
                className={cn(getDialogCloseBtnClass(themeMode), "inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 表单内容 */}
            <div className="max-h-[60vh] overflow-y-auto p-6">
              {/* 名称 */}
              <label className={cn("mb-2 block text-xs", getDialogSubtleClass(themeMode))}>名称</label>
              <input
                value={editForm.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="搜索引擎名称"
                className={cn(getDialogInputClass(themeMode), "mb-4 w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:border-sky-300/55")}
              />

              {/* 搜索地址 */}
              <label className={cn("mb-2 block text-xs", getDialogSubtleClass(themeMode))}>搜索地址（%s 替换关键字）</label>
              <input
                value={editForm.searchUrl}
                onChange={(e) => setEditForm((cur) => cur ? { ...cur, searchUrl: e.target.value } : cur)}
                placeholder="https://www.baidu.com/s?wd=%s"
                className={cn(getDialogInputClass(themeMode), "mb-4 w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:border-sky-300/55 font-mono")}
              />

              {/* 图标选择 */}
              <label className={cn("mb-2 block text-xs", getDialogSubtleClass(themeMode))}>图标</label>
              <div className="mb-4 flex flex-wrap items-start gap-3">
                {logoOptions.map((option) => {
                  const isSelected =
                    option.type === "text" ? iconMode === "text"
                      : option.type === "uploaded" ? iconMode === "upload"
                      : option.type === "favicon" ? iconMode === "favicon"
                      : false;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => selectLogoOption(option)}
                      className="group relative flex flex-col items-center gap-1.5"
                      title={option.label}
                    >
                      <div
                        className={cn(
                          "flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border-2 transition",
                          isSelected
                            ? themeMode === "light" ? "border-slate-400 bg-slate-100" : "border-white/50 bg-white/12"
                            : themeMode === "light" ? "border-slate-200 bg-slate-50 hover:bg-slate-100" : "border-white/12 bg-white/4 hover:bg-white/8",
                        )}
                      >
                        {option.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={option.url} alt={option.label} className="h-10 w-10 rounded-xl object-cover" />
                        ) : (
                          <span className={cn("text-xs", getDialogSubtleClass(themeMode))}>{option.label}</span>
                        )}
                      </div>
                      <span
                        className="flex items-center gap-0.5 text-[11px] leading-tight"
                        style={{
                          color: isSelected
                            ? themeMode === "light" ? "#1e293b" : "#ffffff"
                            : themeMode === "light" ? "rgba(100,116,139,0.8)" : "rgba(255,255,255,0.5)",
                          fontWeight: isSelected ? 700 : 400,
                        }}
                      >
                        {isSelected && <Check className="h-3 w-3 shrink-0" />}
                        {option.label}
                      </span>
                    </button>
                  );
                })}

                {/* 上传按钮：未上传时显示，已上传时由 "上传" 选项替代 */}
                {!hasUploadedIcon && (
                  <button
                    type="button"
                    onClick={() => { setUploadDialogOpen(true); setIconMode("upload"); }}
                    className="group relative flex flex-col items-center gap-1.5"
                    title="上传图标"
                  >
                    <div
                      className={cn(
                        "flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed transition",
                        iconMode === "upload"
                          ? themeMode === "light" ? "border-slate-300 bg-slate-50" : "border-white/30 bg-white/8"
                          : themeMode === "light" ? "border-slate-200 hover:bg-slate-50" : "border-white/12 hover:bg-white/6",
                      )}
                    >
                      <Upload className={cn("h-5 w-5", getDialogSubtleClass(themeMode))} />
                    </div>
                    <span
                      className="flex items-center gap-0.5 text-[11px] leading-tight"
                      style={{
                        color: iconMode === "upload"
                          ? themeMode === "light" ? "#1e293b" : "#ffffff"
                          : themeMode === "light" ? "rgba(100,116,139,0.6)" : "rgba(255,255,255,0.35)",
                        fontWeight: iconMode === "upload" ? 700 : 400,
                      }}
                    >
                      {iconMode === "upload" && <Check className="h-3 w-3 shrink-0" />}
                      上传
                    </span>
                  </button>
                )}
              </div>

              {/* 卡片颜色 */}
              <label className={cn("mb-2 block text-xs", getDialogSubtleClass(themeMode))}>卡片颜色</label>
              <div className="mb-4 flex flex-wrap gap-2">
                {ACCENT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleAccentChange(color)}
                    className={cn(
                      "h-8 w-8 rounded-full border-2 transition",
                      editForm.accent === color ? "border-white scale-110" : "border-transparent hover:scale-105",
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
                {/* 自定义颜色按钮（彩虹渐变） */}
                <div className="relative h-8 w-8 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const input = hiddenColorInputRef.current;
                      if (input) {
                        input.value = editForm.accent;
                        input.click();
                      }
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full transition hover:scale-110"
                    style={{
                      background: "conic-gradient(#f43f5e, #eab308, #22c55e, #06b6d4, #6366f1, #ec4899, #f43f5e)",
                      boxShadow: !ACCENT_COLORS.includes(editForm.accent) ? "0 0 0 2px rgba(255,255,255,0.3)" : "none",
                      outline: !ACCENT_COLORS.includes(editForm.accent) ? "2px solid rgba(255,255,255,0.8)" : "none",
                      outlineOffset: "2px",
                    }}
                    title="自定义颜色"
                  >
                    <Palette className="h-4 w-4 text-white drop-shadow-[0_0_2px_rgba(0,0,0,0.6)]" />
                  </button>
                  <input
                    ref={hiddenColorInputRef}
                    type="color"
                    className="absolute left-0 top-0 h-8 w-8 cursor-pointer opacity-0"
                    value={editForm.accent}
                    onChange={(e) => handleAccentChange(e.target.value)}
                  />
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={saveForm}
                  disabled={!editForm.name.trim() || !editForm.searchUrl.trim()}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition",
                    editForm.name.trim() && editForm.searchUrl.trim()
                      ? getDialogPrimaryBtnClass(themeMode)
                      : cn(getDialogSecondaryBtnClass(themeMode), "cursor-default opacity-50"),
                  )}
                >
                  <Check className="h-3.5 w-3.5" />
                  {isCreating ? "创建" : "保存"}
                </button>
                <button
                  type="button"
                  onClick={closeEditDialog}
                  className={cn("inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm transition", getDialogSubtleClass(themeMode), themeMode === "light" ? "hover:bg-slate-50" : "hover:bg-white/8")}
                >
                  取消
                </button>
              </div>
            </div>

            {/* 上传弹窗（嵌套在编辑弹窗内部） */}
            {uploadDialogOpen ? (
              <div className={cn("absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm rounded-[34px]", themeMode === "light" ? "bg-black/20" : "bg-black/50")}>
                <div className={cn(getDialogPanelClass(themeMode), "w-80 overflow-hidden rounded-[22px] border p-5")}>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">上传图标</h3>
                    <button type="button" onClick={() => setUploadDialogOpen(false)} className={cn(getDialogSubtleClass(themeMode), "hover:opacity-80")}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div>
                    <input ref={iconFileInputRef} type="file" accept="image/*" className="hidden"
                      onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadIconFile(file); }} />
                    <button type="button" onClick={() => iconFileInputRef.current?.click()}
                      className={cn(getDialogAddItemClass(themeMode), "flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-6 text-sm transition")}>
                      {iconUploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {iconUploading ? "上传中..." : "点击选择图片"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* 裁剪弹窗 */}
      {cropImageSrc ? (
        <ImageCropDialog
          imageSrc={cropImageSrc}
          cropShape="round"
          aspectRatio={1}
          onConfirm={(blob) => void handleCropConfirm(blob)}
          onCancel={handleCropCancel}
          themeMode={themeMode}
        />
      ) : null}
    </>
  );
}
