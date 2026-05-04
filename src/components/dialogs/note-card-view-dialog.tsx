/**
 * 笔记卡片查看弹窗
 * @description 以只读形式展示笔记卡片的 Markdown 渲染内容
 * 支持：Todo 复选框交互、图片点击放大灯箱、文件链接点击下载
 */

"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { X, FileText, ExternalLink, HardDrive, AlertTriangle, LocateFixed } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { NoteCard, Site, ThemeMode } from "@/lib/base/types";
import { resolveSiteUrl } from "@/lib/utils/access-rules-resolver";
import { cn } from "@/lib/utils/utils";
import { requestJson } from "@/lib/base/api";
import { getDialogOverlayClass, getDialogPanelClass, getDialogDividerClass, getDialogSubtleClass, getDialogCloseBtnClass, getDialogSecondaryBtnClass } from "@/components/sakura-nav/style-helpers";
import { Tooltip } from "@/components/ui/tooltip";
import { NoteImageLightbox } from "./note-image-lightbox";

type NoteCardViewDialogProps = {
  open: boolean;
  card: NoteCard | null;
  themeMode: ThemeMode;
  onClose: () => void;
  /** 笔记内容更新回调（checkbox 切换后通知父组件同步 cards 数组） */
  onContentUpdate?: (newContent: string) => void;
  /** 可引用的网站卡片列表（普通网站，不含社交/笔记卡片） */
  sites?: Site[];
  /** 定位到指定网站卡片（关闭弹窗并在导航站中显示该网站） */
  onLocateSite?: (siteId: string) => void;
};

/** ReactMarkdown 传入的 input 组件额外携带的 node 属性类型 */
type MarkdownInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  node?: unknown;
};

/** ReactMarkdown 传入的 img 组件额外携带的 node 属性类型 */
type MarkdownImgProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  node?: unknown;
};

/** ReactMarkdown 传入的 a 组件额外携带的 node 属性类型 */
type MarkdownAnchorProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  node?: unknown;
};

/** 笔记文件下载 URL 前缀 */
const NOTE_FILE_PREFIX = "/api/cards/note/file/";
/** 笔记附件下载 URL 前缀（大文件附件，视觉上与普通文件区分） */
const NOTE_ATTACH_PREFIX = "/api/cards/note/attach/";
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
// 笔记内嵌网站卡片
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
      className={cn(
        "my-2 flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition hover:-translate-y-0.5",
        isDark
          ? "border-white/10 bg-white/6 hover:bg-white/10"
          : "border-slate-200 bg-white hover:bg-slate-50 shadow-sm",
      )}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === "Enter") handleClick(); }}
      role="button"
      tabIndex={0}
    >
      <div
        className="h-10 w-10 shrink-0 rounded-[14px] overflow-hidden border border-white/18 shadow-lg"
        style={iconBg}
      >
        {showIcon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={site.iconUrl!} alt={site.name} className="!m-0 !h-full !w-full !max-w-none !rounded-none object-cover" onError={() => setIconError(true)} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-semibold">
            {site.name.charAt(0)}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className={cn("truncate text-sm font-semibold", isDark ? "text-white" : "text-slate-900")}>{site.name}</div>
      </div>
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

export function NoteCardViewDialog({ open, card, themeMode, onClose, onContentUpdate, sites = [], onLocateSite }: NoteCardViewDialogProps) {
  // 本地内容状态：支持 checkbox 切换时即时更新渲染
  const [localContent, setLocalContent] = useState("");

  // 灯箱状态
  const [lightboxIndex, setLightboxIndex] = useState(-1); // -1 = 关闭

  // ── 无效文件提示弹窗 ──
  const [invalidFileDialog, setInvalidFileDialog] = useState<string | null>(null); // 文件名

  // 同步 card.content → localContent
  useEffect(() => {
    if (card) setLocalContent(card.content);
  }, [card]);

  // 内容引用：确保快速连续点击 checkbox 时始终基于最新内容计算
  const contentRef = useRef(card?.content ?? "");
  useEffect(() => {
    contentRef.current = card?.content ?? "";
  }, [card?.content]);

  // checkbox 渲染计数器（每轮 ReactMarkdown 渲染从 0 递增，用于匹配 checkbox 索引）
  const checkboxCounter = useRef(0);
  checkboxCounter.current = 0;

  // 提取当前内容中的所有图片 URL（用于灯箱导航）
  const imageUrls = useMemo(() => extractImageUrls(localContent), [localContent]);

  /** 切换指定索引位置的 checkbox（- [ ] ↔ - [x]）并直接持久化 */
  const handleCheckboxToggle = useCallback((index: number) => {
    if (!card) return;

    const prev = contentRef.current;
    let currentIdx = 0;
    const newContent = prev.replace(
      /^(\s*[-*]) \[([ xX])\]/gm,
      (match, prefix: string, checked: string) => {
        if (currentIdx === index) {
          currentIdx++;
          const newChecked = checked.trim().toLowerCase() === "x" ? " " : "x";
          return `${prefix} [${newChecked}]`;
        }
        currentIdx++;
        return match;
      },
    );

    if (newContent === prev) return;

    // 即时更新 UI
    contentRef.current = newContent;
    setLocalContent(newContent);
    onContentUpdate?.(newContent);

    // 直接持久化到服务端（无需撤回）
    requestJson("/api/cards/note", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: card.id, title: card.title, content: newContent }),
    });
  }, [card, onContentUpdate]);

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
      // 降级：在新标签页中打开
      window.open(url, "_blank");
    }
  }, []);

  if (!open || !card) return null;

  return (
    <>
      <div className={cn(getDialogOverlayClass(themeMode), "animate-drawer-fade fixed inset-0 z-40 flex items-end justify-center p-4 sm:items-center")} onClick={onClose}>
        <div
          className={cn(getDialogPanelClass(themeMode), "animate-panel-rise relative w-full max-w-[680px] overflow-hidden rounded-[34px] border")}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 头部 */}
          <div className={cn("flex items-center justify-between border-b px-6 py-5", getDialogDividerClass(themeMode))}>
            <div className="min-w-0 flex-1 pr-4">
              <p className={cn("text-xs uppercase tracking-[0.28em]", getDialogSubtleClass(themeMode))}>Note</p>
              <h2 className="mt-1 truncate text-2xl font-semibold">{card.title}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={cn(getDialogCloseBtnClass(themeMode), "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition")}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Markdown 渲染内容（支持 checkbox 交互、图片灯箱、文件下载、网站卡片引用） */}
          <div className="max-h-[70vh] overflow-y-auto px-6 py-6">
            <div className="md-prose max-w-none">
              {parseSiteLinkSegments(localContent).map((seg, i) => {
                if (seg.type === "site") {
                  const site = sites.find((s) => s.id === seg.siteId);
                  if (site) return <NoteSiteMiniCard key={i} site={site} themeMode={themeMode} onLocateSite={onLocateSite} />;
                  const isDark = themeMode === "dark";
                  return <span key={i} className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs line-through", isDark ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-500")}>{seg.name} (已失效)</span>;
                }
                return (
                  <ReactMarkdown
                    key={i}
                    remarkPlugins={[remarkGfm]}
                    components={{
                      input: ({ node: _node, disabled: _disabled, readOnly: _readOnly, ...rest }: MarkdownInputProps) => {
                        const idx = checkboxCounter.current;
                        checkboxCounter.current++;
                        return (
                          <input
                            {...rest}
                            disabled={false}
                            readOnly={false}
                            onChange={() => handleCheckboxToggle(idx)}
                            style={{ cursor: "pointer" }}
                          />
                        );
                      },
                      img: ({ node: _node, src, ...rest }: MarkdownImgProps) => {
                        const srcStr = typeof src === "string" ? src : "";
                        const imgIndex = srcStr ? imageUrls.indexOf(srcStr) : -1;
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
                        // 笔记附件链接（大文件）：特殊样式 + 硬盘图标 + 点击下载
                        if (href && href.startsWith(NOTE_ATTACH_PREFIX)) {
                          const filename = extractTextFromChildren(children);
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
                                <span>{children}</span>
                              </a>
                            </Tooltip>
                          );
                        }
                        // 笔记文件链接：特殊样式 + 文件图标 + 点击下载
                        if (href && href.startsWith(NOTE_FILE_PREFIX)) {
                          const filename = extractTextFromChildren(children);
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
                                <FileText className="h-3.5 w-3.5 shrink-0" />
                                <span>{children}</span>
                              </a>
                            </Tooltip>
                          );
                        }
                        // 外部网络链接：新标签页打开 + URL 提示
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
                              <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                              {children}
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
          </div>

          {/* ── 无效文件提示弹窗 ── */}
          {invalidFileDialog && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm rounded-[34px]">
              <div className={cn(
                "mx-8 max-w-sm rounded-[22px] border p-6 shadow-xl",
                themeMode === "dark" ? "border-white/12 bg-[#101a2eee] text-white" : "border-slate-200/50 bg-white text-slate-900",
              )}>
                <div className="mb-4 flex items-center gap-3">
                  <div className={cn(
                    "inline-flex h-10 w-10 items-center justify-center rounded-2xl",
                    themeMode === "dark" ? "bg-red-500/16 text-red-300" : "bg-red-50 text-red-600",
                  )}>
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold">文件已失效</h3>
                </div>
                <p className={cn("text-sm leading-relaxed", themeMode === "dark" ? "text-white/75" : "text-slate-600")}>
                  附件 <strong className={themeMode === "dark" ? "text-white" : "text-slate-900"}>{invalidFileDialog}</strong> 已失效，该文件可能已被删除。请前往编辑模式重新上传。
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
      </div>

      {/* 图片灯箱 */}
      {lightboxIndex >= 0 && imageUrls.length > 0 && (
        <NoteImageLightbox
          images={imageUrls}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(-1)}
          onNavigate={setLightboxIndex}
        />
      )}
    </>
  );
}
