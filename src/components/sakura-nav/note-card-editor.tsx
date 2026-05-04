/**
 * 笔记卡片编辑器
 * @description 笔记内容编辑/预览，支持剪贴板粘贴图片/文件、/ 快捷指令插入 Markdown 模板、独立 Ctrl+Z 撤回
 */

"use client";

import { useState, useRef, useCallback, useEffect, useMemo, useLayoutEffect } from "react";
import {
  X, Eye, EyeOff, FileText, AlertTriangle,
  ExternalLink, HardDrive, Globe, LocateFixed,
  ListChecks, Code, Link, Table, Image as ImageIcon, FileUp,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Site, ThemeMode } from "@/lib/base/types";
import { resolveSiteUrl } from "@/lib/utils/access-rules-resolver";
import type { NoteCardFormState } from "@/hooks/use-note-cards";
import { cn } from "@/lib/utils/utils";
import { requestJson } from "@/lib/base/api";
import {
  getDialogOverlayClass, getDialogPanelClass, getDialogDividerClass,
  getDialogSubtleClass, getDialogCloseBtnClass, getDialogSecondaryBtnClass,
} from "./style-helpers";
import { Tooltip } from "@/components/ui/tooltip";
import { NoteImageLightbox } from "@/components/dialogs/note-image-lightbox";

/** ReactMarkdown 传入的 img 组件额外携带的 node 属性类型 */
type MarkdownImgProps = React.ImgHTMLAttributes<HTMLImageElement> & { node?: unknown };
/** ReactMarkdown 传入的 a 组件额外携带的 node 属性类型 */
type MarkdownAnchorProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & { node?: unknown };

/** 图片最大 10MB */
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
/** 文件最大 100MB */
const MAX_FILE_SIZE = 100 * 1024 * 1024;

/** 笔记文件下载 URL 前缀 */
const NOTE_FILE_PREFIX = "/api/cards/note/file/";
/** 笔记附件下载 URL 前缀（兼容旧数据） */
const NOTE_ATTACH_PREFIX = "/api/cards/note/attach/";
/** 网站卡片引用链接前缀 */
const SITE_LINK_PREFIX = "sakura-site://";

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
  /** 可引用的网站卡片列表（普通网站，不含社交/笔记卡片） */
  sites?: Site[];
  /** 定位到指定网站卡片（关闭弹窗并在导航站中显示该网站） */
  onLocateSite?: (siteId: string) => void;
};

// ── / 快捷指令定义 ──

type SlashCommand = {
  key: string;
  label: string;
  icon: React.ReactNode;
  /** 模板文本（为空表示触发文件上传或网站选择） */
  template?: string;
  /** 文件上传类型 */
  uploadType?: "image" | "file";
  /** 网站卡片选择 */
  selectType?: "site";
};

const SLASH_COMMANDS: SlashCommand[] = [
  { key: "todo", label: "待办列表", icon: <ListChecks className="h-4 w-4" />, template: "- [ ] 待办事项\n" },
  { key: "code", label: "代码块", icon: <Code className="h-4 w-4" />, template: "```\n代码\n```\n" },
  { key: "link", label: "链接", icon: <Link className="h-4 w-4" />, template: "[链接文字](URL)" },
  { key: "table", label: "表格", icon: <Table className="h-4 w-4" />, template: "| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |\n" },
  { key: "site", label: "网站卡片", icon: <Globe className="h-4 w-4" />, selectType: "site" },
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

/** 将笔记内容按网站卡片引用拆分为段落（绕过 markdown 行内渲染限制） */
type ContentSegment =
  | { type: "md"; content: string }
  | { type: "site"; name: string; siteId: string };

function parseSiteLinkSegments(content: string): ContentSegment[] {
  const regex = /\[([^\]]*)\]\(sakura-site:\/\/([^)]*)\)/g;
  const segments: ContentSegment[] = [];
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "md", content: content.slice(lastIndex, match.index) });
    }
    segments.push({ type: "site", name: match[1], siteId: match[2] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    segments.push({ type: "md", content: content.slice(lastIndex) });
  }
  return segments.length > 0 ? segments : [{ type: "md", content }];
}

// ══════════════════════════════════════════════════
// 笔记内嵌网站卡片（编辑器预览用）
// ══════════════════════════════════════════════════

function NoteSiteMiniCard({ site, themeMode, onLocateSite }: { site: Site; themeMode: ThemeMode; onLocateSite?: (siteId: string) => void }) {
  const isDark = themeMode === "dark";
  const [iconError, setIconError] = useState(false);
  const showIcon = site.iconUrl && !iconError;
  const iconBg = site.iconBgColor && site.iconBgColor !== "transparent"
    ? { backgroundColor: site.iconBgColor }
    : { backgroundColor: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.06)" };

  const handleClick = useCallback(() => {
    const targetUrl = resolveSiteUrl(site);
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  }, [site]);

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        "my-2 flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition hover:-translate-y-0.5",
        isDark
          ? "border-white/10 bg-white/6 hover:bg-white/10"
          : "border-slate-200 bg-white hover:bg-slate-50 shadow-sm",
      )}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === "Enter") handleClick(); }}
    >
      {/* 图标 */}
      <div className="h-10 w-10 shrink-0 rounded-[14px] overflow-hidden border border-white/18 shadow-lg" style={iconBg}>
        {showIcon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={site.iconUrl!} alt={site.name} className="!m-0 !h-full !w-full !max-w-none !rounded-none object-cover" onError={() => setIconError(true)} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-semibold">
            {site.name.charAt(0)}
          </div>
        )}
      </div>
      {/* 标题 */}
      <div className="min-w-0 flex-1">
        <div className={cn("truncate text-sm font-semibold", isDark ? "text-white" : "text-slate-900")}>{site.name}</div>
      </div>
      {/* 定位按钮 */}
      {onLocateSite && (
        <Tooltip tip="在导航站中定位" themeMode={themeMode}>
          <button
            type="button"
            className={cn(
              "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition",
              isDark
                ? "border-indigo-500/25 bg-indigo-500/12 text-indigo-400 hover:bg-indigo-500/22 hover:text-indigo-300"
                : "border-indigo-200 bg-indigo-50 text-indigo-500 hover:bg-indigo-100 hover:text-indigo-700",
            )}
            onClick={(e) => {
              e.stopPropagation();
              onLocateSite(site.id);
            }}
          >
            <LocateFixed className="h-4 w-4" />
          </button>
        </Tooltip>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════
// 主组件
// ══════════════════════════════════════════════════

export function NoteCardEditor({
  open, themeMode, cardForm, setCardForm, onSubmit, onClose, onAutoSaveClose,
  sites = [], onLocateSite,
}: NoteCardEditorProps) {
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── / 快捷指令菜单状态 ──
  const [slashMenu, setSlashMenu] = useState<SlashMenuState | null>(null);
  const slashMenuRef = useRef<HTMLDivElement>(null);
  /** 菜单相对于 textarea 的定位坐标 */
  const [slashMenuPos, setSlashMenuPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const editorWrapRef = useRef<HTMLDivElement>(null);

  // ── 网站卡片选择器状态 ──
  const [sitePickerActive, setSitePickerActive] = useState(false);
  const [sitePickerQuery, setSitePickerQuery] = useState("");
  const [sitePickerSelectedIdx, setSitePickerSelectedIdx] = useState(0);
  const sitePickerListRef = useRef<HTMLDivElement>(null);

  // ── 超大文件提示弹窗 ──
  const [oversizeDialog, setOversizeDialog] = useState<{
    type: "image" | "file";
    size: string;
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
    if (open) { setPreview(false); setUploadError(null); setSlashMenu(null); setSitePickerActive(false); setSitePickerSelectedIdx(0); }
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

  // 滚动网站选择器选中项到可见区
  useEffect(() => {
    if (sitePickerActive && sitePickerListRef.current) {
      const selected = sitePickerListRef.current.querySelector("[data-site-selected='true']");
      selected?.scrollIntoView({ block: "nearest" });
    }
  }, [sitePickerActive, sitePickerSelectedIdx, sitePickerQuery]);

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

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    onSubmit();
    setBusy(false);
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

  /** 快捷指令触发的文件上传（直接内联上传） */
  const triggerSlashFileUpload = useCallback((uploadType: "image" | "file") => {
    const input = document.createElement("input");
    input.type = "file";
    if (uploadType === "image") input.accept = "image/*";
    input.onchange = async () => {
      if (!input.files || input.files.length === 0) return;
      const file = input.files[0];
      const maxLimit = uploadType === "image" ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;

      if (file.size > maxLimit) {
        setOversizeDialog({ type: uploadType, size: formatFileSize(file.size) });
        return;
      }

      await uploadAndInsert(file, uploadType);
    };
    input.click();
  }, [uploadAndInsert]);

  /** 选择快捷指令项 */
  const handleSlashSelect = useCallback((item: SlashCommand) => {
    if (!slashMenu || !cardForm) return;
    const content = cardForm.content;
    snapshotForUndo(content); // 推入撤回快照

    const before = content.slice(0, slashMenu.startPos);
    const after = content.slice(slashMenu.startPos + 1 + slashMenu.filter.length);
    setSlashMenu(null);

    // 网站卡片选择 → 显示网站选择器
    if (item.selectType === "site") {
      // 先清除 "/" 字符
      setCardForm((prev) => prev ? { ...prev, content: before + after } : prev);
      requestAnimationFrame(() => {
        if (textareaRef.current) textareaRef.current.selectionStart = textareaRef.current.selectionEnd = before.length;
      });
      setSitePickerActive(true);
      setSitePickerQuery("");
      return;
    }

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

  // ── 网站卡片选择器（hooks 必须在 early return 之前） ──

  const filteredSites = useMemo(() => {
    if (!sitePickerQuery) return sites.slice(0, 20);
    const lower = sitePickerQuery.toLowerCase();
    return sites.filter((s) =>
      s.name.toLowerCase().includes(lower)
      || (s.description ?? "").toLowerCase().includes(lower)
      || s.url.toLowerCase().includes(lower),
    ).slice(0, 20);
  }, [sites, sitePickerQuery]);

  const handleSitePick = useCallback((site: Site) => {
    if (!cardForm) return;
    const insertion = `[${site.name}](${SITE_LINK_PREFIX}${site.id})`;
    const ta = textareaRef.current;
    const cursorPos = ta?.selectionStart ?? cardForm.content.length;
    const content = cardForm.content;
    // 避免多余空行：光标在行首时不加前导 \n
    const needLeadingNL = cursorPos > 0 && content[cursorPos - 1] !== "\n";
    const trailingNL = "\n";
    const wrapped = (needLeadingNL ? "\n" : "") + insertion + trailingNL;
    setCardForm((prev) => prev ? { ...prev, content: content.slice(0, cursorPos) + wrapped + content.slice(cursorPos) } : prev);
    setSitePickerActive(false);
    setSitePickerQuery("");
    setSitePickerSelectedIdx(0);
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        const newPos = cursorPos + wrapped.length;
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = newPos;
        textareaRef.current.focus();
      }
    });
  }, [cardForm, setCardForm]);

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
    (busy || uploading) && "opacity-60 pointer-events-none",
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
          <button
            type="button"
            onClick={uploading ? undefined : (onAutoSaveClose ?? onClose)}
            className={cn(getDialogCloseBtnClass(themeMode), "inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition", uploading && "opacity-40 cursor-not-allowed")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[72vh] overflow-y-auto px-6 py-5">
          <div className="flex flex-col gap-4">
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
                  {parseSiteLinkSegments(cardForm.content || "*(暂无内容)*").map((seg, i) => {
                    if (seg.type === "site") {
                      const site = sites.find((s) => s.id === seg.siteId);
                      if (site) return <NoteSiteMiniCard key={i} site={site} themeMode={themeMode} onLocateSite={onLocateSite} />;
                      return <span key={i} className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs line-through", isDarkTheme ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-500")}>{seg.name} (已失效)</span>;
                    }
                    return (
                      <ReactMarkdown
                        key={i}
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
                          a: ({ node: _node, href, children: childNodes, ...rest }: MarkdownAnchorProps) => {
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
                                    <FileText className="h-3.5 w-3.5 shrink-0" /><span>{childNodes}</span>
                                  </a>
                                </Tooltip>
                              );
                            }
                            return (
                              <Tooltip tip={href || ""} themeMode={themeMode} disabled={!href}>
                                <a href={href} target="_blank" rel="noopener noreferrer" {...rest} className={cn(rest.className, "inline-flex items-center gap-1")}>
                                  <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />{childNodes}
                                </a>
                              </Tooltip>
                            );
                          },
                        }}
                      >
                        {seg.content}
                      </ReactMarkdown>
                    );
                  })}
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

                    {/* 网站卡片选择器 */}
                    {sitePickerActive && (
                      <div className={cn(
                        "absolute z-50 left-0 right-0 top-0 bottom-0 overflow-hidden rounded-2xl border shadow-2xl flex flex-col",
                        isDarkTheme
                          ? "border-white/12 bg-[#101a2eee] backdrop-blur-xl"
                          : "border-slate-200/80 bg-white/98 backdrop-blur-2xl",
                      )}>
                        <div className="flex items-center gap-2 border-b px-3 py-2" style={{ borderColor: isDarkTheme ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)" }}>
                          <input
                            autoFocus
                            type="text"
                            value={sitePickerQuery}
                            onChange={(e) => { setSitePickerQuery(e.target.value); setSitePickerSelectedIdx(0); }}
                            onKeyDown={(e) => {
                              if (filteredSites.length === 0) return;
                              if (e.key === "ArrowDown") {
                                e.preventDefault();
                                setSitePickerSelectedIdx((prev) => (prev + 1) % filteredSites.length);
                              } else if (e.key === "ArrowUp") {
                                e.preventDefault();
                                setSitePickerSelectedIdx((prev) => (prev - 1 + filteredSites.length) % filteredSites.length);
                              } else if (e.key === "Enter") {
                                e.preventDefault();
                                handleSitePick(filteredSites[sitePickerSelectedIdx]);
                              } else if (e.key === "Escape") {
                                e.preventDefault();
                                setSitePickerActive(false);
                                setSitePickerQuery("");
                                setSitePickerSelectedIdx(0);
                                textareaRef.current?.focus();
                              }
                            }}
                            placeholder="搜索网站..."
                            className={cn("flex-1 bg-transparent text-sm outline-none", isDarkTheme ? "text-white placeholder:text-white/40" : "text-slate-900 placeholder:text-slate-400")}
                          />
                          <button type="button" onClick={() => { setSitePickerActive(false); setSitePickerQuery(""); setSitePickerSelectedIdx(0); textareaRef.current?.focus(); }} className={cn("text-xs", isDarkTheme ? "text-white/50 hover:text-white" : "text-slate-400 hover:text-slate-600")}>取消</button>
                        </div>
                        <div ref={sitePickerListRef} className="flex-1 overflow-y-auto">
                          {filteredSites.length > 0 ? filteredSites.map((s, idx) => (
                            <button
                              key={s.id} type="button"
                              data-site-selected={idx === sitePickerSelectedIdx}
                              onMouseDown={(e) => { e.preventDefault(); handleSitePick(s); }}
                              onMouseEnter={() => setSitePickerSelectedIdx(idx)}
                              className={cn(
                                "flex w-full items-center gap-3 px-3 py-2 text-left transition",
                                idx === sitePickerSelectedIdx
                                  ? isDarkTheme ? "bg-white/10" : "bg-slate-100"
                                  : isDarkTheme ? "hover:bg-white/8" : "hover:bg-slate-50",
                              )}
                            >
                              <div className="h-7 w-7 shrink-0 rounded-lg overflow-hidden border border-white/18" style={s.iconBgColor && s.iconBgColor !== "transparent" ? { backgroundColor: s.iconBgColor } : undefined}>
                                {s.iconUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={s.iconUrl} alt={s.name} className="h-full w-full object-contain" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-xs font-semibold" style={{ backgroundColor: isDarkTheme ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }}>{s.name.charAt(0)}</div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className={cn("truncate text-xs font-medium", isDarkTheme ? "text-white" : "text-slate-900")}>{s.name}</div>
                                {s.description && <div className={cn("truncate text-[10px]", isDarkTheme ? "text-white/50" : "text-slate-400")}>{s.description}</div>}
                              </div>
                            </button>
                          )) : (
                            <div className={cn("px-3 py-4 text-center text-xs", isDarkTheme ? "text-white/40" : "text-slate-400")}>未找到匹配的网站</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-1 flex items-center gap-3">
                    <p className={cn("text-xs", isDarkTheme ? "text-white/40" : "text-slate-400")}>
                      可粘贴图片(&le;10MB)或文件(&le;100MB)
                    </p>
                  </div>
                  {uploading && (
                    <div className={cn("mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium animate-pulse", isDarkTheme ? "bg-indigo-500/10 text-indigo-400" : "bg-indigo-50 text-indigo-600")}>
                      <FileUp className="h-3.5 w-3.5" /> 文件上传中，请勿关闭...
                    </div>
                  )}
                  {uploadError && (
                    <div className={cn("mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-xs", isDarkTheme ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-600")}>
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  )}
                </>
              )}
            </div>
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
                <h3 className="text-lg font-semibold">文件过大</h3>
              </div>
              <p className={cn("text-sm leading-relaxed", isDarkTheme ? "text-white/75" : "text-slate-600")}>
                当前{oversizeDialog.type === "image" ? "图片" : "文件"}大小为 <strong className={isDarkTheme ? "text-white" : "text-slate-900"}>{oversizeDialog.size}</strong>，超过了大小限制（{oversizeDialog.type === "image" ? "10MB" : "100MB"}），无法上传。
              </p>
              <div className="mt-5 flex items-center justify-end">
                <button type="button" onClick={() => setOversizeDialog(null)} className={cn("rounded-2xl px-4 py-2.5 text-sm font-medium transition", getDialogSecondaryBtnClass(themeMode))}>
                  关闭
                </button>
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
