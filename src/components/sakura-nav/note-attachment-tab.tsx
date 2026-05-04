/**
 * 笔记附件管理标签页
 * @description 附件列表展示，支持上传、下载、重命名、删除
 * 通过 ref 暴露 uploadSingleFile 方法供父组件的快捷指令调用
 */

"use client";

import {
  useState, useRef, useCallback, useEffect,
  forwardRef, useImperativeHandle,
} from "react";
import {
  Trash2, Upload, Check, FileIcon, AlertTriangle,
  Download, Pencil,
} from "lucide-react";
import type { ThemeMode, NoteAttachment } from "@/lib/base/types";
import type { NoteCardFormState } from "@/hooks/use-note-cards";
import { cn } from "@/lib/utils/utils";
import { requestJson } from "@/lib/base/api";
import { getDialogSecondaryBtnClass, getDialogListItemClass } from "./style-helpers";
import { Tooltip } from "@/components/ui/tooltip";

/** 格式化文件大小 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export type NoteAttachmentTabRef = {
  /** 上传单个文件为附件，返回附件信息或 null */
  uploadSingleFile: (file: File) => Promise<NoteAttachment | null>;
};

type NoteAttachmentTabProps = {
  themeMode: ThemeMode;
  setCardForm: React.Dispatch<React.SetStateAction<NoteCardFormState | null>>;
  noteId?: string;
  open: boolean;
  onError: (msg: string) => void;
};

export const NoteAttachmentTab = forwardRef<NoteAttachmentTabRef, NoteAttachmentTabProps>(
  function NoteAttachmentTab({ themeMode, setCardForm, noteId, open, onError }, ref) {
    const [attachments, setAttachments] = useState<NoteAttachment[]>([]);
    const [uploading, setUploading] = useState(false);
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState("");
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ item: NoteAttachment } | null>(null);
    const [invalidFileDialog, setInvalidFileDialog] = useState<string | null>(null);
    const copiedTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

    const isDark = themeMode === "dark";

    // 加载已有笔记的附件列表
    useEffect(() => {
      if (!open || !noteId) { setAttachments([]); return; }
      void (async () => {
        try {
          const result = await requestJson<{ items: NoteAttachment[] }>(
            `/api/cards/note/attachment?noteId=${encodeURIComponent(noteId)}`,
          );
          setAttachments(result.items);
        } catch { /* 静默 */ }
      })();
    }, [open, noteId]);

    // ── 内部上传逻辑 ──

    const doUpload = useCallback(async (file: File): Promise<NoteAttachment> => {
      const formData = new FormData();
      formData.append("file", file);
      // 始终不关联 noteId — 保存时统一关联，支持取消/撤回
      const result = await requestJson<{ item: NoteAttachment }>("/api/cards/note/attachment", {
        method: "POST",
        body: formData,
      });
      setAttachments((prev) => [...prev, result.item]);
      setCardForm((prev) => {
        if (!prev) return prev;
        return { ...prev, pendingAttachmentIds: [...(prev.pendingAttachmentIds || []), result.item.id] };
      });
      return result.item;
    }, [setCardForm]);

    // 暴露 uploadSingleFile 给父组件（快捷指令文件上传使用）
    useImperativeHandle(ref, () => ({
      uploadSingleFile: async (file: File) => {
        setUploading(true);
        try {
          return await doUpload(file);
        } catch (err) {
          onError(err instanceof Error ? err.message : "附件上传失败");
          return null;
        } finally {
          setUploading(false);
        }
      },
    }), [doUpload, onError]);

    // ── 操作回调 ──

    /** 文件下载 */
    const handleDownload = useCallback(async (url: string, filename: string) => {
      try {
        const response = await fetch(url, { cache: "no-store" });
        if (response.status === 404) { setInvalidFileDialog(filename); return; }
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

    /** 上传按钮（多文件） */
    const handleUpload = useCallback(async () => {
      const input = document.createElement("input");
      input.type = "file";
      input.multiple = true;
      input.onchange = async () => {
        if (!input.files || input.files.length === 0) return;
        setUploading(true);
        try {
          for (const file of Array.from(input.files)) await doUpload(file);
        } catch (err) {
          onError(err instanceof Error ? err.message : "附件上传失败");
        } finally { setUploading(false); }
      };
      input.click();
    }, [doUpload, onError]);

    /** 点击附件 → 复制引用 */
    const handleItemClickCopy = useCallback(async (item: NoteAttachment) => {
      if (renamingId === item.id) return;
      const ref = `[${item.filename}](${item.url})`;
      await navigator.clipboard.writeText(ref);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      setCopiedId(item.id);
      copiedTimerRef.current = setTimeout(() => setCopiedId(null), 1500);
    }, [renamingId]);

    /** 重命名 */
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

    /** 确认删除附件（延迟到保存时才真正删除） */
    const handleConfirmDelete = useCallback(() => {
      if (!deleteConfirm) return;
      const id = deleteConfirm.item.id;
      setCardForm((prev) => {
        if (!prev) return prev;
        const newDeleted = [...(prev.deletedAttachmentIds || []), id];
        const newPending = (prev.pendingAttachmentIds || []).filter((pid) => pid !== id);
        return {
          ...prev,
          deletedAttachmentIds: newDeleted,
          pendingAttachmentIds: newPending.length > 0 ? newPending : undefined,
        };
      });
      setAttachments((prev) => prev.filter((a) => a.id !== id));
      setDeleteConfirm(null);
    }, [deleteConfirm, setCardForm]);

    // ── 渲染 ──

    return (
      <div className="flex flex-col gap-4">
        {/* 上传按钮 */}
        <button
          type="button" onClick={handleUpload} disabled={uploading}
          className={cn(
            "flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-sm font-medium transition",
            uploading && "opacity-50 pointer-events-none",
            isDark
              ? "border-white/16 text-white/60 hover:bg-white/6 hover:text-white/80"
              : "border-slate-300 text-slate-400 hover:bg-slate-50 hover:text-slate-600",
          )}
        >
          <Upload className="h-5 w-5" />
          {uploading ? "上传中..." : "点击上传附件文件（最大 100MB）"}
        </button>

        {/* 附件列表 */}
        {attachments.length === 0 ? (
          <div className={cn(
            "flex items-center justify-center rounded-2xl border border-dashed px-4 py-8 text-sm",
            isDark ? "border-white/12 text-white/40" : "border-slate-200 text-slate-400",
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
                    ? isDark ? "ring-1 ring-emerald-400/40" : "ring-1 ring-emerald-400/50"
                    : isDark ? "hover:bg-white/6" : "hover:bg-slate-50",
                )}
              >
                <FileIcon className={cn("h-5 w-5 shrink-0", isDark ? "text-indigo-400" : "text-indigo-500")} />

                <div className="min-w-0 flex-1">
                  {renamingId === item.id ? (
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text" value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRename(item.id);
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        autoFocus
                        className={cn(
                          "w-full rounded-lg border px-2 py-1 text-sm outline-none",
                          isDark ? "border-white/20 bg-white/8 text-white" : "border-slate-300 bg-white text-slate-900",
                        )}
                      />
                      <button type="button" onClick={() => handleRename(item.id)} className="text-emerald-500 hover:text-emerald-600 shrink-0">
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="truncate text-sm font-medium">{item.filename}</p>
                        <Tooltip tip="重命名" themeMode={themeMode}>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setRenamingId(item.id); setRenameValue(item.filename); }}
                            className={cn(
                              "shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-md transition opacity-0 group-hover:opacity-100",
                              isDark ? "text-white/40 hover:bg-white/10 hover:text-white/70" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600",
                            )}
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        </Tooltip>
                      </div>
                      <p className={cn("text-xs", isDark ? "text-white/45" : "text-slate-400")}>{formatFileSize(item.size)}</p>
                    </>
                  )}
                </div>

                {copiedId === item.id && (
                  <span className={cn("shrink-0 text-xs font-medium animate-pulse", isDark ? "text-emerald-400" : "text-emerald-600")}>已复制引用</span>
                )}

                {renamingId !== item.id && (
                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Tooltip tip="下载附件" themeMode={themeMode}>
                      <button
                        type="button" onClick={() => handleDownload(item.url, item.filename)}
                        className={cn(
                          "inline-flex h-8 w-8 items-center justify-center rounded-xl transition",
                          isDark ? "text-white/50 hover:bg-white/10 hover:text-white/80" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600",
                        )}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    </Tooltip>
                    <Tooltip tip="删除附件" themeMode={themeMode}>
                      <button
                        type="button" onClick={() => setDeleteConfirm({ item })}
                        className={cn(
                          "inline-flex h-8 w-8 items-center justify-center rounded-xl transition",
                          "text-red-400 hover:bg-red-50 hover:text-red-500",
                          isDark && "hover:bg-red-500/12",
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

        <p className={cn("text-xs", isDark ? "text-white/35" : "text-slate-400")}>
          点击附件可复制引用到剪贴板 · 粘贴到笔记内容即可引用
        </p>

        {/* ── 删除附件确认弹窗 ── */}
        {deleteConfirm && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm rounded-[34px]">
            <div className={cn(
              "mx-8 max-w-sm rounded-[22px] border p-6 shadow-xl",
              isDark ? "border-white/12 bg-[#101a2eee] text-white" : "border-slate-200/50 bg-white text-slate-900",
            )}>
              <div className="mb-4 flex items-center gap-3">
                <div className={cn("inline-flex h-10 w-10 items-center justify-center rounded-2xl", isDark ? "bg-red-500/16 text-red-300" : "bg-red-50 text-red-600")}>
                  <Trash2 className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">删除附件</h3>
              </div>
              <p className={cn("text-sm leading-relaxed", isDark ? "text-white/75" : "text-slate-600")}>
                确定要删除附件 <strong className={isDark ? "text-white" : "text-slate-900"}>{deleteConfirm.item.filename}</strong> 吗？
                删除后，笔记内容中所有指向该附件的引用将失效。
              </p>
              <div className="mt-5 flex items-center justify-end gap-3">
                <button type="button" onClick={() => setDeleteConfirm(null)} className={cn("rounded-2xl px-4 py-2.5 text-sm font-medium transition", getDialogSecondaryBtnClass(themeMode))}>取消</button>
                <button type="button" onClick={handleConfirmDelete} className={cn("rounded-2xl px-4 py-2.5 text-sm font-semibold transition", isDark ? "bg-red-500/20 text-red-300 hover:bg-red-500/30" : "bg-red-500 text-white hover:bg-red-600")}>删除</button>
              </div>
            </div>
          </div>
        )}

        {/* ── 无效文件提示弹窗 ── */}
        {invalidFileDialog && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm rounded-[34px]">
            <div className={cn(
              "mx-8 max-w-sm rounded-[22px] border p-6 shadow-xl",
              isDark ? "border-white/12 bg-[#101a2eee] text-white" : "border-slate-200/50 bg-white text-slate-900",
            )}>
              <div className="mb-4 flex items-center gap-3">
                <div className={cn("inline-flex h-10 w-10 items-center justify-center rounded-2xl", isDark ? "bg-red-500/16 text-red-300" : "bg-red-50 text-red-600")}>
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">文件已失效</h3>
              </div>
              <p className={cn("text-sm leading-relaxed", isDark ? "text-white/75" : "text-slate-600")}>
                附件 <strong className={isDark ? "text-white" : "text-slate-900"}>{invalidFileDialog}</strong> 已失效，该文件可能已被删除。请重新上传该文件。
              </p>
              <div className="mt-5 flex items-center justify-end">
                <button type="button" onClick={() => setInvalidFileDialog(null)} className={cn("rounded-2xl px-4 py-2.5 text-sm font-medium transition", getDialogSecondaryBtnClass(themeMode))}>关闭</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  },
);
