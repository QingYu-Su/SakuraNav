/**
 * 笔记卡片编辑器
 * @description 双 Tab 布局：笔记内容（编辑/预览）+ 附件管理
 * 支持剪贴板粘贴图片/文件：自动上传到服务器并插入 Markdown 语法
 * 图片大小限制 5MB，文件大小限制 10MB，超大文件引导至附件管理标签页
 */

"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  X, Trash2, Eye, EyeOff, Paperclip, Upload,
  Check, FileIcon, AlertTriangle,
  Download, ExternalLink, HardDrive, Pencil,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ThemeMode, NoteAttachment } from "@/lib/base/types";
import type { NoteCardFormState } from "@/hooks/use-note-cards";
import { cn } from "@/lib/utils/utils";
import { requestJson } from "@/lib/base/api";
import {
  getDialogOverlayClass, getDialogPanelClass, getDialogDividerClass,
  getDialogSubtleClass, getDialogCloseBtnClass, getDialogSecondaryBtnClass,
  getDialogListItemClass,
} from "./style-helpers";
import { Tooltip } from "@/components/ui/tooltip";
import { NoteImageLightbox } from "@/components/dialogs/note-image-lightbox";

/** ReactMarkdown 传入的 img 组件额外携带的 node 属性类型 */
type MarkdownImgProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  node?: unknown;
};

/** ReactMarkdown 传入的 a 组件额外携带的 node 属性类型 */
type MarkdownAnchorProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  node?: unknown;
};

/** 图片最大 5MB */
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
/** 文件最大 10MB */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** 笔记文件下载 URL 前缀 */
const NOTE_FILE_PREFIX = "/api/cards/note/file/";
/** 笔记附件下载 URL 前缀 */
const NOTE_ATTACH_PREFIX = "/api/cards/note/attach/";

type NoteEditorTab = "content" | "attachment";

type NoteCardEditorProps = {
  open: boolean;
  themeMode: ThemeMode;
  cardForm: NoteCardFormState;
  setCardForm: React.Dispatch<React.SetStateAction<NoteCardFormState | null>>;
  onSubmit: () => void;
  onDelete?: (() => void) | undefined;
  onClose: () => void;
  /** 自动保存并关闭（编辑模式下关闭弹窗时传入，无修改时仅关闭） */
  onAutoSaveClose?: (() => void) | undefined;
};

/** 提取文件扩展名（不含点），用于判断是否为真实文件 */
function pathExt(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot + 1).toLowerCase() : "";
}

/** 格式化文件大小 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/** 从 React 子节点中提取纯文本 */
function extractTextFromChildren(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(extractTextFromChildren).join("");
  if (children && typeof children === "object" && "props" in children) {
    return extractTextFromChildren((children as { props: { children: React.ReactNode } }).props.children);
  }
  return "download";
}

/** 从 markdown 内容中提取所有图片 URL（用于灯箱导航） */
function extractImageUrls(content: string): string[] {
  const urls: string[] = [];
  const regex = /!\[.*?\]\(([^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    urls.push(match[1]);
  }
  return urls;
}

export function NoteCardEditor({
  open,
  themeMode,
  cardForm,
  setCardForm,
  onSubmit,
  onClose,
  onAutoSaveClose,
}: NoteCardEditorProps) {
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<NoteEditorTab>("content");
  const [preview, setPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── 附件管理状态 ──
  const [attachments, setAttachments] = useState<NoteAttachment[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  // ── 删除附件确认弹窗 ──
  const [deleteConfirm, setDeleteConfirm] = useState<{
    item: NoteAttachment;
  } | null>(null);

  // ── 无效文件提示弹窗 ──
  const [invalidFileDialog, setInvalidFileDialog] = useState<string | null>(null);

  // ── 超大文件提示弹窗 ──
  const [oversizeDialog, setOversizeDialog] = useState<{
    type: "image" | "file";
    size: string;
  } | null>(null);

  // ── 预览模式灯箱 ──
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const previewImageUrls = useMemo(() => extractImageUrls(cardForm?.content ?? ""), [cardForm?.content]);

  const isDarkTheme = themeMode === "dark";
  const isEdit = !!cardForm?.id;

  // 加载已有笔记的附件列表
  useEffect(() => {
    if (!open || !cardForm?.id) {
      setAttachments([]);
      return;
    }
    void (async () => {
      try {
        const result = await requestJson<{ items: NoteAttachment[] }>(
          `/api/cards/note/attachment?noteId=${encodeURIComponent(cardForm.id!)}`
        );
        setAttachments(result.items);
      } catch { /* 静默 */ }
    })();
  }, [open, cardForm?.id]);

  // 自动清除上传错误提示
  useEffect(() => {
    if (!uploadError) return;
    const timer = setTimeout(() => setUploadError(null), 4000);
    return () => clearTimeout(timer);
  }, [uploadError]);

  // 重置状态
  useEffect(() => {
    if (open) {
      setActiveTab("content");
      setPreview(false);
      setUploadError(null);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await onSubmit();
    } finally {
      setBusy(false);
    }
  }

  // ─── 内容 Tab：粘贴上传 ───

  /** 上传文件/图片并插入 Markdown 语法 */
  const uploadAndInsert = useCallback(async (file: File, mode: "image" | "file") => {
    const ta = textareaRef.current;
    if (!ta) return;

    const cursorPos = ta.selectionStart;
    const isImage = mode === "image";

    const placeholder = isImage ? `![上传中...]()
` : `[上传中: ${file.name}...]()
`;

    setCardForm((prev) => {
      if (!prev) return prev;
      const before = prev.content.slice(0, cursorPos);
      const after = prev.content.slice(cursorPos);
      return { ...prev, content: before + placeholder + after };
    });

    const newCursorPos = cursorPos + placeholder.length;
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = newCursorPos;
    });

    try {
      setUploading(true);
      setUploadError(null);
      const formData = new FormData();
      formData.append("file", file);

      const endpoint = isImage ? "/api/cards/note/upload-image" : "/api/cards/note/upload-file";
      const result = await requestJson<{ url: string; assetId: string; filename?: string }>(endpoint, {
        method: "POST",
        body: formData,
      });

      const md = isImage
        ? `![图片](${result.url})
`
        : `[${(result.filename ?? file.name)}](${result.url})
`;
      setCardForm((prev) => {
        if (!prev) return prev;
        return { ...prev, content: prev.content.replace(placeholder, md) };
      });

      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = cursorPos + md.length;
      });
    } catch (err) {
      setCardForm((prev) => {
        if (!prev) return prev;
        return { ...prev, content: prev.content.replace(placeholder, "") };
      });
      setUploadError(err instanceof Error ? err.message : `${isImage ? "图片" : "文件"}上传失败`);
    } finally {
      setUploading(false);
    }
  }, [setCardForm]);

  /** 处理剪贴板粘贴 */
  const handlePaste = useCallback(async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    let imageFile: File | null = null;
    let otherFile: File | null = null;

    for (const item of items) {
      if (item.kind !== "file") continue;
      const file = item.getAsFile();
      if (!file) continue;

      if (file.type.startsWith("image/") && !imageFile) {
        imageFile = file;
      } else if (!file.type.startsWith("image/") && !otherFile) {
        const hasRealName = file.name && file.name !== "" && pathExt(file.name);
        if (hasRealName) {
          otherFile = file;
        }
      }
    }

    if (imageFile) {
      e.preventDefault();
      if (imageFile.size > MAX_IMAGE_SIZE) {
        setOversizeDialog({ type: "image", size: formatFileSize(imageFile.size) });
        return;
      }
      await uploadAndInsert(imageFile, "image");
    } else if (otherFile) {
      e.preventDefault();
      if (otherFile.size > MAX_FILE_SIZE) {
        setOversizeDialog({ type: "file", size: formatFileSize(otherFile.size) });
        return;
      }
      await uploadAndInsert(otherFile, "file");
    }
  }, [uploadAndInsert]);

  // ─── Markdown 自动续行 ───

  function handleAutoContinue(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter" || e.shiftKey || e.ctrlKey || e.metaKey) return;
    const ta = e.currentTarget;
    const value = ta.value;
    const cursorPos = ta.selectionStart;
    const lineStart = value.lastIndexOf("\n", cursorPos - 1) + 1;
    const currentLine = value.slice(lineStart, cursorPos);

    const olMatch = currentLine.match(/^(\s*)(\d+)([.)])\s(.*)/);
    const ulMatch = currentLine.match(/^(\s*)[-*+]\s(\[[ xX]\]\s)?(.*)/);

    let insertion = "";
    let clearLine = false;

    if (olMatch) {
      const [, indent, numStr, sep, rest] = olMatch;
      if (rest.trim() === "") { clearLine = true; }
      else { const nextNum = parseInt(numStr, 10) + 1; insertion = `\n${indent}${nextNum}${sep} `; }
    } else if (ulMatch) {
      const [, indent, checkbox] = ulMatch;
      const rest = ulMatch[3];
      if (rest.trim() === "") { clearLine = true; }
      else { insertion = checkbox ? `\n${indent}- [ ] ` : `\n${indent}- `; }
    }

    if (!insertion && !clearLine) return;
    e.preventDefault();

    if (clearLine) {
      const before = value.slice(0, lineStart);
      const after = value.slice(cursorPos);
      setCardForm((prev) => prev ? { ...prev, content: before + "\n" + after } : prev);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = lineStart + 1; });
    } else {
      const before = value.slice(0, cursorPos);
      const after = value.slice(cursorPos);
      setCardForm((prev) => prev ? { ...prev, content: before + insertion + after } : prev);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = cursorPos + insertion.length; });
    }
  }

  // ─── 附件管理 Tab 操作 ──

  /** 文件下载：通过 fetch 获取 blob 并触发浏览器下载 */
  const handleFileDownload = useCallback(async (url: string, filename: string) => {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (response.status === 404) {
        setInvalidFileDialog(filename);
        return;
      }
      if (!response.ok) throw new Error("下载失败");
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    }
  }, []);

  const handleAttachmentUpload = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.onchange = async () => {
      if (!input.files || input.files.length === 0) return;
      setUploadingAttachment(true);
      try {
        for (const file of Array.from(input.files)) {
          const formData = new FormData();
          formData.append("file", file);
          // 始终不关联 noteId — 保存时统一关联，支持取消/撤回

          const result = await requestJson<{ item: NoteAttachment }>("/api/cards/note/attachment", {
            method: "POST",
            body: formData,
          });
          setAttachments((prev) => [...prev, result.item]);
          // 统一通过 pendingAttachmentIds 跟踪（新建和编辑笔记都一样）
          setCardForm((prevForm) => {
            if (!prevForm) return prevForm;
            const updated = [...(prevForm.pendingAttachmentIds || []), result.item.id];
            return { ...prevForm, pendingAttachmentIds: updated };
          });
        }
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "附件上传失败");
      } finally {
        setUploadingAttachment(false);
      }
    };
    input.click();
  }, [setCardForm]);

  /** 点击附件 item 时复制引用到剪贴板并显示提示 */
  const handleItemClickCopy = useCallback(async (item: NoteAttachment) => {
    // 正在重命名中不触发复制
    if (renamingId === item.id) return;
    const ref = `[${item.filename}](${item.url})`;
    await navigator.clipboard.writeText(ref);
    // 清除之前的计时器
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    setCopiedId(item.id);
    copiedTimerRef.current = setTimeout(() => setCopiedId(null), 1500);
  }, [renamingId]);

  const handleRename = useCallback(async (id: string) => {
    if (!renameValue.trim()) { setRenamingId(null); return; }
    try {
      await requestJson("/api/cards/note/attachment", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, filename: renameValue.trim() }),
      });
      setAttachments((prev) => prev.map((a) => a.id === id ? { ...a, filename: renameValue.trim() } : a));
    } catch { /* 静默 */ }
    setRenamingId(null);
  }, [renameValue]);

  /** 确认删除附件（延迟到保存时才真正删除，支持取消编辑时撤回） */
  const handleConfirmDelete = useCallback(async () => {
    if (!deleteConfirm) return;
    const id = deleteConfirm.item.id;
    // 标记为删除，不调用 API（保存时统一处理）
    setCardForm((prev) => {
      if (!prev) return prev;
      const newDeleted = [...(prev.deletedAttachmentIds || []), id];
      // 同时从 pendingAttachmentIds 中移除（新建笔记场景）
      const newPending = (prev.pendingAttachmentIds || []).filter((pid) => pid !== id);
      return {
        ...prev,
        deletedAttachmentIds: newDeleted,
        pendingAttachmentIds: newPending.length > 0 ? newPending : undefined,
      };
    });
    // 从本地展示列表中移除
    setAttachments((prev) => prev.filter((a) => a.id !== id));
    setDeleteConfirm(null);
  }, [deleteConfirm, setCardForm]);

  // ─── 渲染 ───

  if (!open || !cardForm) return null;

  const inputClass = cn(
    "w-full rounded-2xl border px-4 py-3 text-sm outline-none transition",
    isDarkTheme
      ? "border-white/12 bg-white/6 focus:border-white/30"
      : "border-slate-200 bg-white focus:border-slate-400",
  );
  const btnPrimary = cn(
    "inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold transition",
    "bg-slate-900 text-white hover:bg-slate-800",
    isDarkTheme && "bg-white/16 hover:bg-white/24",
    busy && "opacity-60 pointer-events-none",
  );
  const tabBtnClass = (active: boolean) => cn(
    "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition",
    active
      ? isDarkTheme ? "bg-white text-slate-950" : "bg-slate-900 text-white"
      : cn(getDialogSecondaryBtnClass(themeMode), isDarkTheme ? "text-white/80" : "text-slate-600"),
  );

  return (
    <div className={cn(getDialogOverlayClass(themeMode), "animate-drawer-fade fixed inset-0 z-40 flex items-end justify-center p-4 sm:items-center")}>
      <div className={cn(getDialogPanelClass(themeMode), "animate-panel-rise w-full max-w-[600px] overflow-hidden rounded-[34px] border")}>
        {/* 头部 */}
        <div className={cn("flex items-center justify-between border-b px-6 py-5", getDialogDividerClass(themeMode))}>
          <div>
            <p className={cn("text-xs uppercase tracking-[0.28em]", getDialogSubtleClass(themeMode))}>Edit Mode</p>
            <h2 className="mt-1 text-2xl font-semibold">
              {isEdit ? "编辑笔记" : "新建笔记"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onAutoSaveClose ?? onClose}
            className={cn(getDialogCloseBtnClass(themeMode), "inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab 切换栏 */}
        <div className={cn("flex gap-2 px-6 pt-4 pb-0")}>
          <button type="button" onClick={() => setActiveTab("content")} className={tabBtnClass(activeTab === "content")}>
            <FileIcon className="h-4 w-4" />
            笔记内容
          </button>
          <button type="button" onClick={() => setActiveTab("attachment")} className={tabBtnClass(activeTab === "attachment")}>
            <Paperclip className="h-4 w-4" />
            附件管理
            {attachments.length > 0 && (
              <span className={cn(
                "ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold",
                activeTab === "attachment"
                  ? isDarkTheme ? "bg-slate-900/20 text-slate-900" : "bg-white/20 text-white"
                  : isDarkTheme ? "bg-white/12 text-white/80" : "bg-slate-100 text-slate-600",
              )}>
                {attachments.length}
              </span>
            )}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[72vh] overflow-y-auto px-6 py-5">
          {activeTab === "content" ? (
            /* ===== 笔记内容 Tab ===== */
            <div className="flex flex-col gap-4">
              {/* 标题 */}
              <div>
                <label className={cn("mb-2 block text-sm font-medium", isDarkTheme ? "text-white/70" : "text-slate-600")}>
                  标题（选填）
                </label>
                <input
                  type="text"
                  value={cardForm.title}
                  onChange={(e) => setCardForm((prev) => prev ? { ...prev, title: e.target.value } : prev)}
                  placeholder="不填写时将使用内容前几个字作为标题"
                  maxLength={100}
                  className={inputClass}
                />
              </div>

              {/* 笔记内容 — 编辑/预览切换 */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className={cn("text-sm font-medium", isDarkTheme ? "text-white/70" : "text-slate-600")}>
                    笔记内容 <span className="text-red-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setPreview(!preview)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition",
                      isDarkTheme
                        ? "bg-white/8 text-white/70 hover:bg-white/14"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200",
                    )}
                  >
                    {preview ? <><EyeOff className="h-3.5 w-3.5" /> 编辑</> : <><Eye className="h-3.5 w-3.5" /> 预览</>}
                  </button>
                </div>

                {preview ? (
                  /* 预览模式：与查看弹窗完全一致的 Markdown 渲染 */
                  <div className={cn(
                    "md-prose max-w-none rounded-2xl border p-4 min-h-[200px]",
                    isDarkTheme ? "border-white/10 bg-white/4" : "border-slate-200 bg-slate-50",
                  )}>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        img: ({ node: _node, src, ...rest }: MarkdownImgProps) => {
                          const srcStr = typeof src === "string" ? src : "";
                          const imgIndex = srcStr ? previewImageUrls.indexOf(srcStr) : -1;
                          return (
                            <Tooltip tip="点击查看大图" themeMode={themeMode}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={srcStr}
                                alt={rest.alt || ""}
                                {...rest}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setLightboxIndex(imgIndex >= 0 ? imgIndex : 0);
                                }}
                                style={{ cursor: "pointer", ...rest.style }}
                              />
                            </Tooltip>
                          );
                        },
                        a: ({ node: _node, href, children, ...rest }: MarkdownAnchorProps) => {
                          const childNodes = children;
                          // 笔记附件链接（大文件）：特殊样式 + 硬盘图标
                          if (href && href.startsWith(NOTE_ATTACH_PREFIX)) {
                            const filename = extractTextFromChildren(childNodes);
                            return (
                              <Tooltip tip={`下载附件: ${filename}`} themeMode={themeMode}>
                                <a
                                  href={href}
                                  {...rest}
                                  className={cn(
                                    "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-medium no-underline transition",
                                    themeMode === "light"
                                      ? "bg-indigo-100 text-indigo-800 hover:bg-indigo-200"
                                      : "bg-indigo-500/12 text-indigo-300 hover:bg-indigo-500/20",
                                  )}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleFileDownload(href, filename);
                                  }}
                                >
                                  <HardDrive className="h-3.5 w-3.5 shrink-0" />
                                  <span>{childNodes}</span>
                                </a>
                              </Tooltip>
                            );
                          }
                          // 笔记文件链接：特殊样式 + 回形针图标
                          if (href && href.startsWith(NOTE_FILE_PREFIX)) {
                            const filename = extractTextFromChildren(childNodes);
                            return (
                              <Tooltip tip={`下载文件: ${filename}`} themeMode={themeMode}>
                                <a
                                  href={href}
                                  {...rest}
                                  className={cn(
                                    "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-medium no-underline transition",
                                    themeMode === "light"
                                      ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                                      : "bg-amber-500/12 text-amber-300 hover:bg-amber-500/20",
                                  )}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleFileDownload(href, filename);
                                  }}
                                >
                                  <Paperclip className="h-3.5 w-3.5 shrink-0" />
                                  <span>{childNodes}</span>
                                </a>
                              </Tooltip>
                            );
                          }
                          // 外部网络链接
                          const displayUrl = href || "";
                          return (
                            <Tooltip tip={displayUrl} themeMode={themeMode} disabled={!displayUrl}>
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                {...rest}
                                className={cn(rest.className, "inline-flex items-center gap-1")}
                              >
                                {childNodes}
                                <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                              </a>
                            </Tooltip>
                          );
                        },
                      }}
                    >
                      {cardForm.content || "*(暂无内容)*"}
                    </ReactMarkdown>
                  </div>
                ) : (
                  /* 编辑模式 */
                  <>
                    <textarea
                      ref={textareaRef}
                      value={cardForm.content}
                      onChange={(e) => setCardForm((prev) => prev ? { ...prev, content: e.target.value } : prev)}
                      onKeyDown={handleAutoContinue}
                      onPaste={handlePaste}
                      placeholder="使用 Markdown 格式编写笔记内容..."
                      rows={10}
                      className={cn(inputClass, "min-h-[200px] resize-y font-mono text-sm")}
                    />
                    <div className="mt-1 flex items-center gap-3">
                      <p className={cn("text-xs", isDarkTheme ? "text-white/40" : "text-slate-400")}>
                        可粘贴图片(&le;5MB)或文件(&le;10MB) · ![](url) 插入图片 · [文件名](url) 插入文件链接
                      </p>
                      {uploading && <span className="text-xs text-indigo-500">上传中...</span>}
                    </div>
                    {uploadError && <p className="mt-1 text-xs text-red-500">{uploadError}</p>}
                  </>
                )}
              </div>
            </div>
          ) : (
            /* ===== 附件管理 Tab ===== */
            <div className="flex flex-col gap-4">
              {/* 上传按钮 */}
              <button
                type="button"
                onClick={handleAttachmentUpload}
                disabled={uploadingAttachment}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-sm font-medium transition",
                  uploadingAttachment && "opacity-50 pointer-events-none",
                  isDarkTheme
                    ? "border-white/16 text-white/60 hover:bg-white/6 hover:text-white/80"
                    : "border-slate-300 text-slate-400 hover:bg-slate-50 hover:text-slate-600",
                )}
              >
                <Upload className="h-5 w-5" />
                {uploadingAttachment ? "上传中..." : "点击上传附件文件（最大 100MB）"}
              </button>

              {/* 附件列表 */}
              {attachments.length === 0 ? (
                <div className={cn(
                  "flex items-center justify-center rounded-2xl border border-dashed px-4 py-8 text-sm",
                  isDarkTheme ? "border-white/12 text-white/40" : "border-slate-200 text-slate-400",
                )}>
                  暂无附件，点击上方按钮上传
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {attachments.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleItemClickCopy(item)}
                      className={cn(
                        getDialogListItemClass(themeMode),
                        "group flex items-center gap-3 rounded-2xl border px-4 py-3 cursor-pointer select-none transition",
                        copiedId === item.id
                          ? isDarkTheme ? "ring-1 ring-emerald-400/40" : "ring-1 ring-emerald-400/50"
                          : isDarkTheme ? "hover:bg-white/6" : "hover:bg-slate-50",
                      )}
                    >
                      {/* 文件图标 */}
                      <FileIcon className={cn("h-5 w-5 shrink-0", isDarkTheme ? "text-indigo-400" : "text-indigo-500")} />

                      {/* 文件名 + 大小 */}
                      <div className="min-w-0 flex-1">
                        {renamingId === item.id ? (
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleRename(item.id);
                                if (e.key === "Escape") setRenamingId(null);
                              }}
                              autoFocus
                              className={cn(
                                "w-full rounded-lg border px-2 py-1 text-sm outline-none",
                                isDarkTheme ? "border-white/20 bg-white/8 text-white" : "border-slate-300 bg-white text-slate-900",
                              )}
                            />
                            <button type="button" onClick={() => handleRename(item.id)} className="text-emerald-500 hover:text-emerald-600 shrink-0">
                              <Check className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <p className="truncate text-sm font-medium">
                                {item.filename}
                              </p>
                              <Tooltip tip="重命名" themeMode={themeMode}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRenamingId(item.id);
                                    setRenameValue(item.filename);
                                  }}
                                  className={cn(
                                    "shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-md transition opacity-0 group-hover:opacity-100",
                                    isDarkTheme ? "text-white/40 hover:bg-white/10 hover:text-white/70" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600",
                                  )}
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                              </Tooltip>
                            </div>
                            <p className={cn("text-xs", isDarkTheme ? "text-white/45" : "text-slate-400")}>
                              {formatFileSize(item.size)}
                            </p>
                          </>
                        )}
                      </div>

                      {/* 复制成功提示 */}
                      {copiedId === item.id && (
                        <span className={cn(
                          "shrink-0 text-xs font-medium animate-pulse",
                          isDarkTheme ? "text-emerald-400" : "text-emerald-600",
                        )}>
                          已复制引用
                        </span>
                      )}

                      {/* 操作按钮（下载、删除） */}
                      {renamingId !== item.id && (
                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          {/* 下载 */}
                          <Tooltip tip="下载附件" themeMode={themeMode}>
                            <button
                              type="button"
                              onClick={() => handleFileDownload(item.url, item.filename)}
                              className={cn(
                                "inline-flex h-8 w-8 items-center justify-center rounded-xl transition",
                                isDarkTheme ? "text-white/50 hover:bg-white/10 hover:text-white/80" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600",
                              )}
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                          </Tooltip>
                          {/* 删除 */}
                          <Tooltip tip="删除附件" themeMode={themeMode}>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirm({ item })}
                              className={cn(
                                "inline-flex h-8 w-8 items-center justify-center rounded-xl transition",
                                "text-red-400 hover:bg-red-50 hover:text-red-500",
                                isDarkTheme && "hover:bg-red-500/12",
                              )}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </Tooltip>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 附件使用提示 */}
              <p className={cn("text-xs", isDarkTheme ? "text-white/35" : "text-slate-400")}>
                点击附件可复制引用到剪贴板 · 粘贴到笔记内容即可引用
              </p>
            </div>
          )}

          {/* 操作按钮 */}
          {isEdit ? null : (
            /* 新建模式：仅显示创建按钮 */
            <div className="flex items-center justify-end pt-4 mt-2">
              <button type="submit" className={btnPrimary}>
                创建笔记
              </button>
            </div>
          )}
        </form>

        {/* ── 超大文件提示弹窗 ── */}
        {oversizeDialog && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm rounded-[34px]">
            <div className={cn(
              "mx-8 max-w-sm rounded-[22px] border p-6 shadow-xl",
              isDarkTheme ? "border-white/12 bg-[#101a2eee] text-white" : "border-slate-200/50 bg-white text-slate-900",
            )}>
              <div className="mb-4 flex items-center gap-3">
                <div className={cn(
                  "inline-flex h-10 w-10 items-center justify-center rounded-2xl",
                  isDarkTheme ? "bg-amber-500/16 text-amber-300" : "bg-amber-50 text-amber-600",
                )}>
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">文件过大</h3>
              </div>
              <p className={cn("text-sm leading-relaxed", isDarkTheme ? "text-white/75" : "text-slate-600")}>
                当前{oversizeDialog.type === "image" ? "图片" : "文件"}大小为 {oversizeDialog.size}，
                超出内容编辑区的直接粘贴限制。请前往
                <strong className={isDarkTheme ? "text-white" : "text-slate-900"}>「附件管理」</strong>
                标签页上传大文件。
              </p>
              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setOversizeDialog(null)}
                  className={cn(
                    "rounded-2xl px-4 py-2.5 text-sm font-medium transition",
                    getDialogSecondaryBtnClass(themeMode),
                  )}
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => { setOversizeDialog(null); setActiveTab("attachment"); }}
                  className={cn(
                    "rounded-2xl px-4 py-2.5 text-sm font-semibold transition",
                    isDarkTheme ? "bg-white text-slate-950 hover:bg-slate-200" : "bg-slate-900 text-white hover:bg-slate-800",
                  )}
                >
                  前往上传
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── 删除附件确认弹窗 ── */}
        {deleteConfirm && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm rounded-[34px]">
            <div className={cn(
              "mx-8 max-w-sm rounded-[22px] border p-6 shadow-xl",
              isDarkTheme ? "border-white/12 bg-[#101a2eee] text-white" : "border-slate-200/50 bg-white text-slate-900",
            )}>
              <div className="mb-4 flex items-center gap-3">
                <div className={cn(
                  "inline-flex h-10 w-10 items-center justify-center rounded-2xl",
                  isDarkTheme ? "bg-red-500/16 text-red-300" : "bg-red-50 text-red-600",
                )}>
                  <Trash2 className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">删除附件</h3>
              </div>
              <p className={cn("text-sm leading-relaxed", isDarkTheme ? "text-white/75" : "text-slate-600")}>
                确定要删除附件 <strong className={isDarkTheme ? "text-white" : "text-slate-900"}>{deleteConfirm.item.filename}</strong> 吗？
                删除后，笔记内容中所有指向该附件的引用将失效。
              </p>
              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className={cn(
                    "rounded-2xl px-4 py-2.5 text-sm font-medium transition",
                    getDialogSecondaryBtnClass(themeMode),
                  )}
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmDelete()}
                  className={cn(
                    "rounded-2xl px-4 py-2.5 text-sm font-semibold transition",
                    isDarkTheme ? "bg-red-500/20 text-red-300 hover:bg-red-500/30" : "bg-red-500 text-white hover:bg-red-600",
                  )}
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── 无效文件提示弹窗 ── */}
        {invalidFileDialog && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm rounded-[34px]">
            <div className={cn(
              "mx-8 max-w-sm rounded-[22px] border p-6 shadow-xl",
              isDarkTheme ? "border-white/12 bg-[#101a2eee] text-white" : "border-slate-200/50 bg-white text-slate-900",
            )}>
              <div className="mb-4 flex items-center gap-3">
                <div className={cn(
                  "inline-flex h-10 w-10 items-center justify-center rounded-2xl",
                  isDarkTheme ? "bg-red-500/16 text-red-300" : "bg-red-50 text-red-600",
                )}>
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">文件已失效</h3>
              </div>
              <p className={cn("text-sm leading-relaxed", isDarkTheme ? "text-white/75" : "text-slate-600")}>
                附件 <strong className={isDarkTheme ? "text-white" : "text-slate-900"}>{invalidFileDialog}</strong> 已失效，该文件可能已被删除。请重新上传该文件。
              </p>
              <div className="mt-5 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setInvalidFileDialog(null)}
                  className={cn(
                    "rounded-2xl px-4 py-2.5 text-sm font-medium transition",
                    getDialogSecondaryBtnClass(themeMode),
                  )}
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 预览模式图片灯箱 */}
      {lightboxIndex >= 0 && previewImageUrls.length > 0 && (
        <NoteImageLightbox
          images={previewImageUrls}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(-1)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  );
}
