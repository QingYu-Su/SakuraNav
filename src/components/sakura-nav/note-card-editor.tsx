/**
 * 笔记卡片编辑器
 * @description 双 Tab 布局：笔记内容（编辑/预览）+ 附件管理
 * 支持剪贴板粘贴图片/文件、/ 快捷指令插入 Markdown 模板、独立 Ctrl+Z 撤回
 */

"use client";

import { useState, useRef, useCallback, useEffect, useMemo, useLayoutEffect } from "react";
import {
  X, Eye, EyeOff, Paperclip, FileIcon, AlertTriangle,
  ExternalLink, HardDrive,
  ListChecks, Code, Link, Table, Image as ImageIcon, FileUp,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ThemeMode } from "@/lib/base/types";
import type { NoteCardFormState } from "@/hooks/use-note-cards";
import { cn } from "@/lib/utils/utils";
import { requestJson } from "@/lib/base/api";
import {
  getDialogOverlayClass, getDialogPanelClass, getDialogDividerClass,
  getDialogSubtleClass, getDialogCloseBtnClass, getDialogSecondaryBtnClass,
} from "./style-helpers";
import { Tooltip } from "@/components/ui/tooltip";
import { NoteImageLightbox } from "@/components/dialogs/note-image-lightbox";
import { NoteAttachmentTab } from "./note-attachment-tab";
import type { NoteAttachmentTabRef } from "./note-attachment-tab";

/** ReactMarkdown 传入的 img 组件额外携带的 node 属性类型 */
type MarkdownImgProps = React.ImgHTMLAttributes<HTMLImageElement> & { node?: unknown };
/** ReactMarkdown 传入的 a 组件额外携带的 node 属性类型 */
type MarkdownAnchorProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & { node?: unknown };

/** 图片最大 5MB（内联） */
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
/** 文件最大 10MB（内联） */
const MAX_FILE_SIZE = 10 * 1024 * 1024;
/** 附件最大 100MB */
const MAX_ATTACHMENT_SIZE = 100 * 1024 * 1024;

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

// ── / 快捷指令定义 ──

type SlashCommand = {
  key: string;
  label: string;
  icon: React.ReactNode;
  /** 模板文本（为空表示触发文件上传） */
  template?: string;
  /** 文件上传类型 */
  uploadType?: "image" | "file";
};

const SLASH_COMMANDS: SlashCommand[] = [
  { key: "todo", label: "待办列表", icon: <ListChecks className="h-4 w-4" />, template: "- [ ] 待办事项\n" },
  { key: "code", label: "代码块", icon: <Code className="h-4 w-4" />, template: "```\n代码\n```\n" },
  { key: "link", label: "链接", icon: <Link className="h-4 w-4" />, template: "[链接文字](URL)" },
  { key: "table", label: "表格", icon: <Table className="h-4 w-4" />, template: "| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |\n" },
  { key: "image", label: "图片", icon: <ImageIcon className="h-4 w-4" />, uploadType: "image" },
  { key: "file", label: "文件", icon: <FileUp className="h-4 w-4" />, uploadType: "file" },
];

type SlashMenuState = {
  /** "/" 在 content 中的起始位置 */
  startPos: number;
  /** 过滤关键词（不含 "/"） */
  filter: string;
  /** 当前选中项索引 */
  selectedIdx: number;
};

// ── 工具函数 ──

/** 格式化文件大小 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/** 提取文件扩展名（不含点） */
function pathExt(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot + 1).toLowerCase() : "";
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
  while ((match = regex.exec(content)) !== null) urls.push(match[1]);
  return urls;
}

// ══════════════════════════════════════════════════
// 主组件
// ══════════════════════════════════════════════════

export function NoteCardEditor({
  open, themeMode, cardForm, setCardForm, onSubmit, onClose, onAutoSaveClose,
}: NoteCardEditorProps) {
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<NoteEditorTab>("content");
  const [preview, setPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const attachmentTabRef = useRef<NoteAttachmentTabRef>(null);

  // ── / 快捷指令菜单状态 ──
  const [slashMenu, setSlashMenu] = useState<SlashMenuState | null>(null);
  const slashMenuRef = useRef<HTMLDivElement>(null);
  /** 菜单相对于 textarea 的定位坐标 */
  const [slashMenuPos, setSlashMenuPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const editorWrapRef = useRef<HTMLDivElement>(null);

  // ── 超大文件提示弹窗 ──
  const [oversizeDialog, setOversizeDialog] = useState<{
    type: "image" | "file";
    size: string;
    /** 超过附件管理最大限制 */
    tooLarge?: boolean;
  } | null>(null);

  // ── 预览模式灯箱 ──
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const previewImageUrls = useMemo(() => extractImageUrls(cardForm?.content ?? ""), [cardForm?.content]);

  // ── 编辑器独立撤回栈（与全局撤回系统无关） ──
  const undoStackRef = useRef<string[]>([]);
  const undoTimerRef = useRef(0);
  const UNDO_MAX = 30;
  const UNDO_DEBOUNCE_MS = 500;

  const isDarkTheme = themeMode === "dark";
  const isEdit = !!cardForm?.id;

  // 自动清除上传错误
  useEffect(() => {
    if (!uploadError) return;
    const timer = setTimeout(() => setUploadError(null), 4000);
    return () => clearTimeout(timer);
  }, [uploadError]);

  // 重置状态
  useEffect(() => {
    if (open) { setActiveTab("content"); setPreview(false); setUploadError(null); setSlashMenu(null); }
  }, [open]);

  // 撤回快照自动清理
  useEffect(() => { if (!open) undoStackRef.current = []; }, [open]);

  // 滚动快捷菜单选中项到可见区
  useEffect(() => {
    if (slashMenu && slashMenuRef.current) {
      const selected = slashMenuRef.current.querySelector("[data-slash-selected='true']");
      selected?.scrollIntoView({ block: "nearest" });
    }
  }, [slashMenu]);

  // ── 计算 "/" 字符在 textarea 中的像素坐标 ──

  /** 利用隐藏镜像 div 计算 textarea 内光标的像素偏移 */
  const computeSlashMenuPosition = useCallback((slashStartPos: number) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const wrap = editorWrapRef.current;
    if (!wrap) return;

    // 创建镜像 div，复制 textarea 的文本样式
    const mirror = document.createElement("div");
    const cs = getComputedStyle(ta);
    const copyStyles = [
      "fontFamily", "fontSize", "fontWeight", "fontStyle", "letterSpacing",
      "lineHeight", "wordSpacing", "textIndent", "whiteSpace", "wordWrap",
      "wordBreak", "tabSize", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
      "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
      "boxSizing", "width",
    ] as const;
    mirror.style.position = "absolute";
    mirror.style.visibility = "hidden";
    mirror.style.top = "0";
    mirror.style.left = "0";
    mirror.style.overflow = "hidden";
    mirror.style.height = "auto";
    for (const prop of copyStyles) mirror.style[prop] = cs[prop];

    // 将 "/" 之前的文本放入镜像，末尾加 span 标记位置
    const textBeforeSlash = ta.value.slice(0, slashStartPos);
    mirror.textContent = textBeforeSlash;
    const marker = document.createElement("span");
    marker.textContent = "|";
    mirror.appendChild(marker);
    wrap.appendChild(mirror);

    const markerRect = marker.getBoundingClientRect();
    const taRect = ta.getBoundingClientRect();
    // 减去 textarea 相对于 wrap 的偏移，再减去 scrollTop
    const left = markerRect.left - taRect.left;
    const top = markerRect.top - taRect.top + ta.scrollTop + parseFloat(cs.lineHeight || "20");

    wrap.removeChild(mirror);
    setSlashMenuPos({ left, top });
  }, []);

  /** 菜单出现或过滤词变化时重新计算坐标 */
  useLayoutEffect(() => {
    if (slashMenu) computeSlashMenuPosition(slashMenu.startPos);
  }, [slashMenu, computeSlashMenuPosition]);

  // ── 撤回机制 ──

  /** 内容变更前推入快照（防抖） */
  const snapshotForUndo = useCallback((content: string) => {
    const now = Date.now();
    if (now - undoTimerRef.current < UNDO_DEBOUNCE_MS) return;
    undoTimerRef.current = now;
    undoStackRef.current.push(content);
    if (undoStackRef.current.length > UNDO_MAX) undoStackRef.current.shift();
  }, []);

  /** 撤回：弹出上一个快照 */
  const popUndo = useCallback((): string | null => {
    return undoStackRef.current.pop() ?? null;
  }, []);

  // ── 表单提交 ──

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try { await onSubmit(); } finally { setBusy(false); }
  }

  // ── 内联上传 ──

  /** 上传文件/图片并插入 Markdown 语法 */
  const uploadAndInsert = useCallback(async (file: File, mode: "image" | "file") => {
    const ta = textareaRef.current;
    if (!ta) return;
    const cursorPos = ta.selectionStart;
    const isImage = mode === "image";

    const placeholder = isImage ? `![上传中...]()\n` : `[上传中: ${file.name}]()\n`;

    setCardForm((prev) => {
      if (!prev) return prev;
      return { ...prev, content: prev.content.slice(0, cursorPos) + placeholder + prev.content.slice(cursorPos) };
    });
    requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = cursorPos + placeholder.length; });

    try {
      setUploading(true);
      setUploadError(null);
      const formData = new FormData();
      formData.append("file", file);
      const endpoint = isImage ? "/api/cards/note/upload-image" : "/api/cards/note/upload-file";
      const result = await requestJson<{ url: string; assetId: string; filename?: string }>(endpoint, {
        method: "POST", body: formData,
      });
      const md = isImage ? `![图片](${result.url})\n` : `[${(result.filename ?? file.name)}](${result.url})\n`;
      setCardForm((prev) => {
        if (!prev) return prev;
        return { ...prev, content: prev.content.replace(placeholder, md) };
      });
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = cursorPos + md.length; });
    } catch (err) {
      setCardForm((prev) => {
        if (!prev) return prev;
        return { ...prev, content: prev.content.replace(placeholder, "") };
      });
      setUploadError(err instanceof Error ? err.message : `${isImage ? "图片" : "文件"}上传失败`);
    } finally { setUploading(false); }
  }, [setCardForm]);

  // ── / 快捷指令逻辑 ──

  /** 获取过滤后的指令列表 */
  const getFilteredSlashItems = useCallback((filter: string): SlashCommand[] => {
    if (!filter) return SLASH_COMMANDS;
    const lower = filter.toLowerCase();
    return SLASH_COMMANDS.filter((c) => c.label.toLowerCase().includes(lower) || c.key.includes(lower));
  }, []);

  /** 快捷指令触发的文件上传（自动路由：内联 / 附件 / 错误提示） */
  const triggerSlashFileUpload = useCallback((uploadType: "image" | "file") => {
    const input = document.createElement("input");
    input.type = "file";
    if (uploadType === "image") input.accept = "image/*";
    input.onchange = async () => {
      if (!input.files || input.files.length === 0) return;
      const file = input.files[0];
      const isImage = uploadType === "image";
      const inlineLimit = isImage ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;

      // 超过附件管理最大限制 → 弹出错误提示
      if (file.size > MAX_ATTACHMENT_SIZE) {
        setOversizeDialog({ type: uploadType, size: formatFileSize(file.size), tooLarge: true });
        return;
      }

      // 超过内联限制但未超过附件限制 → 自动走附件管理
      if (file.size > inlineLimit) {
        setUploading(true);
        try {
          const result = await attachmentTabRef.current?.uploadSingleFile(file);
          if (result) {
            const ta = textareaRef.current;
            const cursorPos = ta?.selectionStart ?? (cardForm?.content.length ?? 0);
            const ref = `[${result.filename}](${result.url})\n`;
            setCardForm((prev) => {
              if (!prev) return prev;
              return { ...prev, content: prev.content.slice(0, cursorPos) + ref + prev.content.slice(cursorPos) };
            });
            requestAnimationFrame(() => { if (ta) ta.selectionStart = ta.selectionEnd = cursorPos + ref.length; });
          }
        } catch (err) {
          setUploadError(err instanceof Error ? err.message : "附件上传失败");
        } finally { setUploading(false); }
        return;
      }

      // 内联上传
      await uploadAndInsert(file, uploadType);
    };
    input.click();
  }, [cardForm, setCardForm, uploadAndInsert]);

  /** 选择快捷指令项 */
  const handleSlashSelect = useCallback((item: SlashCommand) => {
    if (!slashMenu || !cardForm) return;
    const content = cardForm.content;
    snapshotForUndo(content); // 推入撤回快照

    const before = content.slice(0, slashMenu.startPos);
    const after = content.slice(slashMenu.startPos + 1 + slashMenu.filter.length);
    setSlashMenu(null);

    // 文件上传类型 → 打开文件选择器
    if (item.uploadType) {
      setCardForm((prev) => prev ? { ...prev, content: before + after } : prev);
      requestAnimationFrame(() => {
        if (textareaRef.current) textareaRef.current.selectionStart = textareaRef.current.selectionEnd = before.length;
      });
      triggerSlashFileUpload(item.uploadType);
      return;
    }

    // 模板插入
    if (item.template) {
      const newContent = before + item.template + after;
      setCardForm((prev) => prev ? { ...prev, content: newContent } : prev);
      const newCursor = before.length + item.template.length;
      requestAnimationFrame(() => {
        if (textareaRef.current) textareaRef.current.selectionStart = textareaRef.current.selectionEnd = newCursor;
      });
    }
  }, [slashMenu, cardForm, setCardForm, snapshotForUndo, triggerSlashFileUpload]);

  // ── 剪贴板粘贴 ──

  const handlePaste = useCallback(async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    let imageFile: File | null = null;
    let otherFile: File | null = null;
    for (const item of items) {
      if (item.kind !== "file") continue;
      const file = item.getAsFile();
      if (!file) continue;
      if (file.type.startsWith("image/") && !imageFile) { imageFile = file; }
      else if (!file.type.startsWith("image/") && !otherFile) {
        if (file.name && file.name !== "" && pathExt(file.name)) otherFile = file;
      }
    }
    if (imageFile) {
      e.preventDefault();
      if (imageFile.size > MAX_IMAGE_SIZE) { setOversizeDialog({ type: "image", size: formatFileSize(imageFile.size) }); return; }
      await uploadAndInsert(imageFile, "image");
    } else if (otherFile) {
      e.preventDefault();
      if (otherFile.size > MAX_FILE_SIZE) { setOversizeDialog({ type: "file", size: formatFileSize(otherFile.size) }); return; }
      await uploadAndInsert(otherFile, "file");
    }
  }, [uploadAndInsert]);

  // ── 内容变更（撤回 + 快捷指令检测） ──

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const cursorPos = e.target.selectionStart ?? newContent.length;

    // 推入撤回快照
    if (cardForm) snapshotForUndo(cardForm.content);
    setCardForm((prev) => prev ? { ...prev, content: newContent } : prev);

    // 快捷指令菜单检测
    setSlashMenu((prev) => {
      // 已激活：更新 filter 或关闭
      if (prev) {
        if (cursorPos <= prev.startPos || newContent[prev.startPos] !== "/") return null;
        const filterText = newContent.slice(prev.startPos + 1, cursorPos);
        if (filterText.includes("\n") || filterText.includes(" ")) return null;
        return { ...prev, filter: filterText, selectedIdx: 0 };
      }
      // 未激活：检测是否刚输入了 "/"
      if (cursorPos > 0 && newContent[cursorPos - 1] === "/") {
        const prevChar = cursorPos >= 2 ? newContent[cursorPos - 2] : "\n";
        if (prevChar === "\n" || cursorPos === 1) {
          return { startPos: cursorPos - 1, filter: "", selectedIdx: 0 };
        }
      }
      return null;
    });
  }, [cardForm, setCardForm, snapshotForUndo]);

  // ── 键盘事件 ──

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Z 独立撤回
    if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      setSlashMenu(null);
      const prev = popUndo();
      if (prev !== null) setCardForm((form) => form ? { ...form, content: prev } : form);
      return;
    }

    // 快捷指令菜单键盘导航
    if (slashMenu) {
      const filtered = getFilteredSlashItems(slashMenu.filter);
      if (filtered.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSlashMenu({ ...slashMenu, selectedIdx: (slashMenu.selectedIdx + 1) % filtered.length });
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSlashMenu({ ...slashMenu, selectedIdx: (slashMenu.selectedIdx - 1 + filtered.length) % filtered.length });
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          handleSlashSelect(filtered[slashMenu.selectedIdx]);
          return;
        }
      }
      if (e.key === "Escape") { e.preventDefault(); setSlashMenu(null); return; }
    }

    // Markdown 自动续行
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
      if (rest.trim() === "") { clearLine = true; } else { insertion = `\n${indent}${parseInt(numStr, 10) + 1}${sep} `; }
    } else if (ulMatch) {
      const [, indent, checkbox] = ulMatch;
      if (ulMatch[3].trim() === "") { clearLine = true; } else { insertion = checkbox ? `\n${indent}- [ ] ` : `\n${indent}- `; }
    }

    if (!insertion && !clearLine) return;
    e.preventDefault();

    if (clearLine) {
      setCardForm((prev) => prev ? { ...prev, content: value.slice(0, lineStart) + "\n" + value.slice(cursorPos) } : prev);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = lineStart + 1; });
    } else {
      setCardForm((prev) => prev ? { ...prev, content: value.slice(0, cursorPos) + insertion + value.slice(cursorPos) } : prev);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = cursorPos + insertion.length; });
    }
  }, [slashMenu, getFilteredSlashItems, handleSlashSelect, setCardForm, popUndo]);

  // ── 文件下载（预览模式用） ──

  const handleFileDownload = useCallback(async (url: string, filename: string) => {
    try {
      const response = await fetch(url, { cache: "no-store" });
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
    } catch { window.open(url, "_blank"); }
  }, []);

  // ── 渲染 ──

  if (!open || !cardForm) return null;

  const inputClass = cn(
    "w-full rounded-2xl border px-4 py-3 text-sm outline-none transition",
    isDarkTheme ? "border-white/12 bg-white/6 focus:border-white/30" : "border-slate-200 bg-white focus:border-slate-400",
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

  const filteredSlashItems = slashMenu ? getFilteredSlashItems(slashMenu.filter) : [];

  return (
    <div className={cn(getDialogOverlayClass(themeMode), "animate-drawer-fade fixed inset-0 z-40 flex items-end justify-center p-4 sm:items-center")}>
      <div className={cn(getDialogPanelClass(themeMode), "animate-panel-rise w-full max-w-[600px] overflow-hidden rounded-[34px] border")}>
        {/* 头部 */}
        <div className={cn("flex items-center justify-between border-b px-6 py-5", getDialogDividerClass(themeMode))}>
          <div>
            <p className={cn("text-xs uppercase tracking-[0.28em]", getDialogSubtleClass(themeMode))}>Edit Mode</p>
            <h2 className="mt-1 text-2xl font-semibold">{isEdit ? "编辑笔记" : "新建笔记"}</h2>
          </div>
          <button type="button" onClick={onAutoSaveClose ?? onClose} className={cn(getDialogCloseBtnClass(themeMode), "inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition")}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab 切换栏 */}
        <div className="flex gap-2 px-6 pt-4 pb-0">
          <button type="button" onClick={() => setActiveTab("content")} className={tabBtnClass(activeTab === "content")}>
            <FileIcon className="h-4 w-4" /> 笔记内容
          </button>
          <button type="button" onClick={() => setActiveTab("attachment")} className={tabBtnClass(activeTab === "attachment")}>
            <Paperclip className="h-4 w-4" /> 附件管理
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[72vh] overflow-y-auto px-6 py-5">
          {/* ── 笔记内容 Tab ── */}
          <div className={cn("flex flex-col gap-4", activeTab !== "content" && "hidden")}>
            {/* 标题 */}
            <div>
              <label className={cn("mb-2 block text-sm font-medium", isDarkTheme ? "text-white/70" : "text-slate-600")}>
                标题（选填）
              </label>
              <input
                type="text" value={cardForm.title}
                onChange={(e) => setCardForm((prev) => prev ? { ...prev, title: e.target.value } : prev)}
                placeholder="不填写时将使用内容前几个字作为标题" maxLength={100} className={inputClass}
              />
            </div>

            {/* 笔记内容 — 编辑/预览切换 */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className={cn("text-sm font-medium", isDarkTheme ? "text-white/70" : "text-slate-600")}>
                  笔记内容 <span className="text-red-400">*</span>
                </label>
                <button
                  type="button" onClick={() => setPreview(!preview)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition",
                    isDarkTheme ? "bg-white/8 text-white/70 hover:bg-white/14" : "bg-slate-100 text-slate-500 hover:bg-slate-200",
                  )}
                >
                  {preview ? <><EyeOff className="h-3.5 w-3.5" /> 编辑</> : <><Eye className="h-3.5 w-3.5" /> 预览</>}
                </button>
              </div>

              {preview ? (
                /* 预览模式 */
                <div className={cn("md-prose max-w-none rounded-2xl border p-4 min-h-[200px]", isDarkTheme ? "border-white/10 bg-white/4" : "border-slate-200 bg-slate-50")}>
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
                              src={srcStr} alt={rest.alt || ""} {...rest}
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLightboxIndex(imgIndex >= 0 ? imgIndex : 0); }}
                              style={{ cursor: "pointer", ...rest.style }}
                            />
                          </Tooltip>
                        );
                      },
                      a: ({ node: _node, href, children, ...rest }: MarkdownAnchorProps) => {
                        const childNodes = children;
                        if (href && href.startsWith(NOTE_ATTACH_PREFIX)) {
                          const filename = extractTextFromChildren(childNodes);
                          return (
                            <Tooltip tip={`下载附件: ${filename}`} themeMode={themeMode}>
                              <a
                                href={href} {...rest}
                                className={cn("inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-medium no-underline transition", themeMode === "light" ? "bg-indigo-100 text-indigo-800 hover:bg-indigo-200" : "bg-indigo-500/12 text-indigo-300 hover:bg-indigo-500/20")}
                                onClick={(e) => { e.preventDefault(); handleFileDownload(href, filename); }}
                              >
                                <HardDrive className="h-3.5 w-3.5 shrink-0" /><span>{childNodes}</span>
                              </a>
                            </Tooltip>
                          );
                        }
                        if (href && href.startsWith(NOTE_FILE_PREFIX)) {
                          const filename = extractTextFromChildren(childNodes);
                          return (
                            <Tooltip tip={`下载文件: ${filename}`} themeMode={themeMode}>
                              <a
                                href={href} {...rest}
                                className={cn("inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-medium no-underline transition", themeMode === "light" ? "bg-amber-100 text-amber-800 hover:bg-amber-200" : "bg-amber-500/12 text-amber-300 hover:bg-amber-500/20")}
                                onClick={(e) => { e.preventDefault(); handleFileDownload(href, filename); }}
                              >
                                <Paperclip className="h-3.5 w-3.5 shrink-0" /><span>{childNodes}</span>
                              </a>
                            </Tooltip>
                          );
                        }
                        return (
                          <Tooltip tip={href || ""} themeMode={themeMode} disabled={!href}>
                            <a href={href} target="_blank" rel="noopener noreferrer" {...rest} className={cn(rest.className, "inline-flex items-center gap-1")}>
                              {childNodes}<ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
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
                  <div ref={editorWrapRef} className="relative">
                    <textarea
                      ref={textareaRef}
                      value={cardForm.content}
                      onChange={handleContentChange}
                      onKeyDown={handleKeyDown}
                      onPaste={handlePaste}
                      onBlur={() => setSlashMenu(null)}
                      placeholder="使用 Markdown 格式编写笔记内容，输入 / 插入模板..."
                      rows={10}
                      className={cn(inputClass, "min-h-[200px] resize-y font-mono text-sm")}
                    />

                    {/* / 快捷指令悬浮菜单 — 在 textarea 内部、"/" 正下方 */}
                    {slashMenu && filteredSlashItems.length > 0 && (
                      <div
                        ref={slashMenuRef}
                        style={{ left: slashMenuPos.left, top: slashMenuPos.top }}
                        className={cn(
                          "absolute z-50 max-h-[200px] min-w-[200px] max-w-[280px] overflow-y-auto rounded-xl border shadow-2xl",
                          isDarkTheme
                            ? "border-white/12 bg-[#101a2eee] backdrop-blur-xl"
                            : "border-slate-200/80 bg-white/98 backdrop-blur-2xl",
                        )}
                      >
                        {filteredSlashItems.map((item, idx) => (
                          <button
                            key={item.key} type="button"
                            onMouseDown={(e) => { e.preventDefault(); handleSlashSelect(item); }}
                            data-slash-selected={idx === slashMenu.selectedIdx}
                            className={cn(
                              "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition",
                              idx === slashMenu.selectedIdx
                                ? isDarkTheme ? "bg-white/10 text-white" : "bg-slate-100 text-slate-900"
                                : isDarkTheme ? "text-white/80 hover:bg-white/6" : "text-slate-600 hover:bg-slate-50",
                              idx === 0 && "rounded-t-xl",
                              idx === filteredSlashItems.length - 1 && "rounded-b-xl",
                            )}
                          >
                            <span className={cn("inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg", isDarkTheme ? "bg-white/8" : "bg-slate-100")}>
                              {item.icon}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-xs">{item.label}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-1 flex items-center gap-3">
                    <p className={cn("text-xs", isDarkTheme ? "text-white/40" : "text-slate-400")}>
                      输入 / 插入模板 · 可粘贴图片(&le;5MB)或文件(&le;10MB)
                    </p>
                    {uploading && <span className="text-xs text-indigo-500">上传中...</span>}
                  </div>
                  {uploadError && <p className="mt-1 text-xs text-red-500">{uploadError}</p>}
                </>
              )}
            </div>
          </div>

          {/* ── 附件管理 Tab（始终渲染以确保 ref 可用） ── */}
          <div className={activeTab !== "attachment" ? "hidden" : undefined}>
            <NoteAttachmentTab
              ref={attachmentTabRef}
              themeMode={themeMode}
              setCardForm={setCardForm}
              noteId={cardForm.id}
              open={open}
              onError={(msg) => setUploadError(msg)}
            />
          </div>

          {/* 操作按钮 */}
          {isEdit ? null : (
            <div className="flex items-center justify-end pt-4 mt-2">
              <button type="submit" className={btnPrimary}>创建笔记</button>
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
                <div className={cn("inline-flex h-10 w-10 items-center justify-center rounded-2xl", isDarkTheme ? "bg-amber-500/16 text-amber-300" : "bg-amber-50 text-amber-600")}>
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">{oversizeDialog.tooLarge ? "文件过大" : "文件较大"}</h3>
              </div>
              <p className={cn("text-sm leading-relaxed", isDarkTheme ? "text-white/75" : "text-slate-600")}>
                {oversizeDialog.tooLarge
                  ? <>当前{oversizeDialog.type === "image" ? "图片" : "文件"}大小为 <strong className={isDarkTheme ? "text-white" : "text-slate-900"}>{oversizeDialog.size}</strong>，超过了附件管理的最大限制（100MB），无法上传。</>
                  : <>当前{oversizeDialog.type === "image" ? "图片" : "文件"}大小为 <strong className={isDarkTheme ? "text-white" : "text-slate-900"}>{oversizeDialog.size}</strong>，超出内容编辑区的直接粘贴限制。请前往<strong className={isDarkTheme ? "text-white" : "text-slate-900"}>「附件管理」</strong>标签页上传大文件。</>
                }
              </p>
              <div className="mt-5 flex items-center justify-end gap-3">
                <button type="button" onClick={() => setOversizeDialog(null)} className={cn("rounded-2xl px-4 py-2.5 text-sm font-medium transition", getDialogSecondaryBtnClass(themeMode))}>
                  {oversizeDialog.tooLarge ? "关闭" : "取消"}
                </button>
                {!oversizeDialog.tooLarge && (
                  <button type="button" onClick={() => { setOversizeDialog(null); setActiveTab("attachment"); }} className={cn("rounded-2xl px-4 py-2.5 text-sm font-semibold transition", isDarkTheme ? "bg-white text-slate-950 hover:bg-slate-200" : "bg-slate-900 text-white hover:bg-slate-800")}>
                    前往上传
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 预览模式图片灯箱 */}
      {lightboxIndex >= 0 && previewImageUrls.length > 0 && (
        <NoteImageLightbox images={previewImageUrls} currentIndex={lightboxIndex} onClose={() => setLightboxIndex(-1)} onNavigate={setLightboxIndex} />
      )}
    </div>
  );
}
