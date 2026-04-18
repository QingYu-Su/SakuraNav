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
import { type SearchEngineConfig } from "@/lib/types";
import { cn } from "@/lib/utils";
import { generateSingleCharIconDataUrl, verifyFavicon, uploadIconFile as doUploadIconFile, uploadIconByUrl as doUploadIconByUrl } from "@/lib/icon-utils";

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
}: {
  engines: SearchEngineConfig[];
  onChange: Dispatch<SetStateAction<SearchEngineConfig[]>>;
  onClose: () => void;
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
  const [uploadTab, setUploadTab] = useState<"file" | "url">("file");
  const [iconUrlValue, setIconUrlValue] = useState("");
  const [iconUrlError, setIconUrlError] = useState("");
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
      setUploadTab("file");
      setUploadDialogOpen(true);
      setIconMode("upload");
    }
  }

  async function uploadIconFile(file: File) {
    setIconUploading(true);
    try {
      const asset = await doUploadIconFile(file);
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

  async function uploadIconByUrl(url: string) {
    setIconUploading(true);
    try {
      const asset = await doUploadIconByUrl(url);
      setUploadedIconUrl(asset.url);
      setIconMode("upload");
      setEditForm(cur => cur ? { ...cur, iconUrl: asset.url } : cur);
      setUploadDialogOpen(false);
      setIconUrlValue("");
      setIconUrlError("");
    } catch (error) {
      setIconUrlError(error instanceof Error ? error.message : "上传失败");
    } finally {
      setIconUploading(false);
    }
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
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/56 p-4 backdrop-blur-sm"
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="animate-panel-rise w-full max-w-[560px] overflow-hidden rounded-[34px] border border-white/12 bg-[#0f172ae8] text-white shadow-[0_32px_120px_rgba(0,0,0,0.42)] backdrop-blur-xl">
          {/* 头部 */}
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-white/50">Settings</p>
              <h2 className="mt-1 text-2xl font-semibold">搜索引擎管理</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/12 bg-white/8 transition hover:bg-white/14"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* 引擎列表 */}
          <div className="max-h-[60vh] overflow-y-auto p-6">
            {engines.map((cfg) => (
              <div
                key={cfg.id}
                className="mb-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/4 px-4 py-3 transition hover:bg-white/7"
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
                <span className="min-w-0 flex-1 truncate text-xs text-white/50 font-mono">{cfg.searchUrl}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(cfg)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/6 text-white/50 transition hover:bg-white/12 hover:text-white"
                    title="编辑"
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteEngine(cfg.id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-red-400/20 bg-red-500/6 text-red-300/60 transition hover:bg-red-500/16 hover:text-red-300"
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
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/16 py-3 text-sm text-white/50 transition hover:bg-white/6 hover:text-white/70"
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
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/56 p-4 backdrop-blur-sm"
          onMouseDown={(e) => { if (e.target === e.currentTarget) closeEditDialog(); }}
        >
          <div className="animate-panel-rise relative w-full max-w-[480px] overflow-hidden rounded-[34px] border border-white/12 bg-[#0f172ae8] text-white shadow-[0_32px_120px_rgba(0,0,0,0.42)] backdrop-blur-xl">
            {/* 头部 */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-white/50">
                  {isCreating ? "Create" : "Edit"}
                </p>
                <h2 className="mt-1 text-2xl font-semibold">
                  {isCreating ? "添加搜索引擎" : "编辑搜索引擎"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeEditDialog}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/12 bg-white/8 transition hover:bg-white/14"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 表单内容 */}
            <div className="max-h-[60vh] overflow-y-auto p-6">
              {/* 名称 */}
              <label className="mb-2 block text-xs text-white/60">名称</label>
              <input
                value={editForm.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="搜索引擎名称"
                className="mb-4 w-full rounded-xl border border-white/16 bg-white/8 px-3 py-2.5 text-sm outline-none transition focus:border-white/30"
              />

              {/* 搜索地址 */}
              <label className="mb-2 block text-xs text-white/60">搜索地址（%s 替换关键字）</label>
              <input
                value={editForm.searchUrl}
                onChange={(e) => setEditForm((cur) => cur ? { ...cur, searchUrl: e.target.value } : cur)}
                placeholder="https://www.baidu.com/s?wd=%s"
                className="mb-4 w-full rounded-xl border border-white/16 bg-white/8 px-3 py-2.5 text-sm outline-none transition focus:border-white/30 font-mono"
              />

              {/* 图标选择 */}
              <label className="mb-2 block text-xs text-white/60">图标</label>
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
                          isSelected ? "border-white/50 bg-white/12" : "border-white/12 bg-white/4 hover:bg-white/8",
                        )}
                      >
                        {option.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={option.url} alt={option.label} className="h-10 w-10 rounded-xl object-cover" />
                        ) : (
                          <span className="text-xs text-white/50">{option.label}</span>
                        )}
                      </div>
                      <span
                        className="flex items-center gap-0.5 text-[11px] leading-tight"
                        style={{
                          color: isSelected ? "#ffffff" : "rgba(255,255,255,0.5)",
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
                    onClick={() => { setUploadTab("file"); setUploadDialogOpen(true); setIconMode("upload"); }}
                    className="group relative flex flex-col items-center gap-1.5"
                    title="上传图标"
                  >
                    <div
                      className={cn(
                        "flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed transition",
                        iconMode === "upload" ? "border-white/30 bg-white/8" : "border-white/12 hover:bg-white/6",
                      )}
                    >
                      <Upload className="h-5 w-5 text-white/30" />
                    </div>
                    <span
                      className="flex items-center gap-0.5 text-[11px] leading-tight"
                      style={{
                        color: iconMode === "upload" ? "#ffffff" : "rgba(255,255,255,0.35)",
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
              <label className="mb-2 block text-xs text-white/60">卡片颜色</label>
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
                      ? "bg-white/16 text-white hover:bg-white/22"
                      : "bg-white/8 text-white/40 cursor-default",
                  )}
                >
                  <Check className="h-3.5 w-3.5" />
                  {isCreating ? "创建" : "保存"}
                </button>
                <button
                  type="button"
                  onClick={closeEditDialog}
                  className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm text-white/60 transition hover:bg-white/8"
                >
                  取消
                </button>
              </div>
            </div>

            {/* 上传弹窗（嵌套在编辑弹窗内部） */}
            {uploadDialogOpen ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-[34px]">
                <div className="w-80 overflow-hidden rounded-[22px] border border-white/12 bg-[#101a2eee] p-5 text-white">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">上传图标</h3>
                    <button type="button" onClick={() => setUploadDialogOpen(false)} className="text-white/50 hover:text-white">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mb-3 flex gap-2">
                    <button type="button" onClick={() => setUploadTab("file")}
                      className={cn("flex-1 rounded-xl py-2 text-xs font-semibold transition", uploadTab === "file" ? "bg-white/16 text-white" : "text-white/50 hover:bg-white/6")}>
                      本地文件
                    </button>
                    <button type="button" onClick={() => setUploadTab("url")}
                      className={cn("flex-1 rounded-xl py-2 text-xs font-semibold transition", uploadTab === "url" ? "bg-white/16 text-white" : "text-white/50 hover:bg-white/6")}>
                      远程 URL
                    </button>
                  </div>
                  {uploadTab === "file" ? (
                    <div>
                      <input ref={iconFileInputRef} type="file" accept="image/*" className="hidden"
                        onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadIconFile(file); }} />
                      <button type="button" onClick={() => iconFileInputRef.current?.click()}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 py-6 text-sm text-white/50 transition hover:bg-white/6">
                        {iconUploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {iconUploading ? "上传中..." : "点击选择图片"}
                      </button>
                    </div>
                  ) : (
                    <div>
                      <input value={iconUrlValue} onChange={(e) => { setIconUrlValue(e.target.value); setIconUrlError(""); }}
                        placeholder="https://example.com/icon.png"
                        className="w-full rounded-xl border border-white/16 bg-white/8 px-3 py-2.5 text-xs outline-none transition focus:border-white/30" />
                      {iconUrlError ? <p className="mt-1 text-xs text-red-400">{iconUrlError}</p> : null}
                      <button type="button" onClick={() => { if (iconUrlValue.trim()) uploadIconByUrl(iconUrlValue.trim()); }}
                        disabled={!iconUrlValue.trim() || iconUploading}
                        className={cn("mt-2 w-full rounded-xl py-2 text-xs font-semibold transition",
                          iconUrlValue.trim() ? "bg-white/14 text-white hover:bg-white/20" : "bg-white/6 text-white/40 cursor-default")}>
                        {iconUploading ? "上传中..." : "上传"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
