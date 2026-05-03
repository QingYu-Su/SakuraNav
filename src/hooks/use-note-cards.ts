/**
 * 笔记卡片状态管理 Hook
 * @description 管理笔记卡片的创建、编辑、删除和查看
 * 笔记卡片数据存储在 sites 表（card_type = 'note'），列表由 useSiteList 统一管理
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { NoteCard } from "@/lib/base/types";
import { requestJson } from "@/lib/base/api";
import type { UndoAction } from "@/hooks/use-undo-stack";

/** 笔记卡片表单状态 */
export type NoteCardFormState = {
  id?: string;
  title: string;
  content: string;
  /** 新建笔记时临时上传的附件 ID（保存时传递给后端关联） */
  pendingAttachmentIds?: string[];
  /** 编辑中标记为删除的附件 ID（保存时才真正删除，支持取消/撤回） */
  deletedAttachmentIds?: string[];
};

/** 创建默认表单 */
export function defaultNoteCardForm(): NoteCardFormState {
  return { title: "", content: "" };
}

/** 从已有卡片构造编辑表单 */
export function noteCardToForm(card: NoteCard): NoteCardFormState {
  return { id: card.id, title: card.title, content: card.content };
}

export interface UseNoteCardsOptions {
  isAuthenticated: boolean;
  /** 成功消息回调，可选附带撤销动作 */
  setMessage: (msg: string, undo?: UndoAction) => void;
  setErrorMessage: (msg: string) => void;
  syncNavigationData: () => Promise<void>;
  syncAdminBootstrap: () => Promise<void>;
  /** 获取删除前的全局站点 ID 列表（用于撤销恢复排序位置） */
  getGlobalSiteIds?: () => string[];
}

export interface UseNoteCardsReturn {
  /** 笔记卡片列表（用于编辑器回显） */
  cards: NoteCard[];
  cardForm: NoteCardFormState | null;
  setCardForm: React.Dispatch<React.SetStateAction<NoteCardFormState | null>>;
  /** 查看弹窗中的卡片 */
  viewCard: NoteCard | null;
  setViewCard: React.Dispatch<React.SetStateAction<NoteCard | null>>;
  openCardCreator: () => void;
  openCardEditor: (card: NoteCard) => void;
  closeCardEditor: () => void;
  submitCardForm: () => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  deleteAllCards: () => Promise<void>;
  /** 更新指定卡片的本地内容（用于查看弹窗 checkbox 交互同步 cards 数组） */
  updateCardContent: (id: string, content: string) => void;
  /** 当前笔记表单是否相对打开时有修改 */
  isCardFormModified: () => boolean;
}

export function useNoteCards(opts: UseNoteCardsOptions): UseNoteCardsReturn {
  const { setMessage, setErrorMessage, syncNavigationData, syncAdminBootstrap, getGlobalSiteIds } = opts;

  const [cards, setCards] = useState<NoteCard[]>([]);
  const [cardForm, setCardForm] = useState<NoteCardFormState | null>(null);
  const [viewCard, setViewCard] = useState<NoteCard | null>(null);
  /** 编辑前原始表单快照，用于更新操作的撤销恢复 */
  const originalFormRef = useRef<NoteCardFormState | null>(null);

  /** 加载笔记卡片列表 */
  const loadCards = useCallback(async () => {
    try {
      const result = await requestJson<{ items: NoteCard[] }>("/api/navigation/notes");
      setCards(result.items);
    } catch {
      // 静默忽略
    }
  }, []);

  // 登录后刷新列表
  useEffect(() => {
    if (!opts.isAuthenticated) return;
    let cancelled = false;
    void (async () => {
      try {
        const result = await requestJson<{ items: NoteCard[] }>("/api/navigation/notes");
        if (!cancelled) setCards(result.items);
      } catch {
        // 静默忽略
      }
    })();
    return () => { cancelled = true; };
  }, [opts.isAuthenticated]);

  /** 打开笔记创建器 */
  function openCardCreator() {
    setCardForm(defaultNoteCardForm());
    originalFormRef.current = null;
  }

  /** 打开笔记编辑器 */
  function openCardEditor(card: NoteCard) {
    const form = noteCardToForm(card);
    originalFormRef.current = { ...form };
    setCardForm(form);
  }

  /** 关闭编辑器 */
  function closeCardEditor() {
    setCardForm(null);
    originalFormRef.current = null;
  }

  /** 提交表单（创建/更新） */
  async function submitCardForm() {
    if (!cardForm) return;
    setErrorMessage("");

    const content = cardForm.content.trim();
    if (!content) {
      setErrorMessage("请输入笔记内容");
      return;
    }

    // 保存提交前快照
    const originalSnapshot = originalFormRef.current;
    const formSnapshot: NoteCardFormState = originalSnapshot ?? { ...cardForm };
    const isUpdate = !!cardForm.id;

    // 计算有效的附件 ID（排除已标记删除的）
    const deletedIds = cardForm.deletedAttachmentIds || [];
    const pendingIds = (cardForm.pendingAttachmentIds || []).filter(
      (pid) => !deletedIds.includes(pid)
    );

    const body = {
      ...(cardForm.id ? { id: cardForm.id } : {}),
      title: cardForm.title.trim(),
      content,
      // 关联新上传的附件（新建和编辑笔记都通过此字段传递）
      ...(pendingIds.length > 0 ? { attachmentIds: pendingIds } : {}),
      // 软删除标记删除的附件（仅编辑模式）
      ...(isUpdate && deletedIds.length > 0 ? { softDeleteAttachmentIds: deletedIds } : {}),
    };

    try {
      const result = await requestJson<{ item: NoteCard }>("/api/cards/note", {
        method: cardForm.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setCardForm(null);

      // 构建撤销动作：恢复内容 + 恢复/清理附件关联
      const undoAction: UndoAction = isUpdate
        ? { label: "撤销", undo: async () => {
            // 撤销编辑：恢复原始内容 + 反向操作附件变更
            await requestJson("/api/cards/note", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: formSnapshot.id,
                title: formSnapshot.title,
                content: formSnapshot.content,
                // 反向：将软删除的附件重新关联，将新增的附件解除关联
                attachmentIds: deletedIds,
                softDeleteAttachmentIds: pendingIds,
              }),
            });
            await syncNavigationData();
            await syncAdminBootstrap();
            await loadCards();
          } }
        : { label: "撤销", undo: async () => {
            const newId = result.item?.id;
            if (!newId) return;
            await requestJson(`/api/cards/note?id=${encodeURIComponent(newId)}`, { method: "DELETE" });
            await syncNavigationData();
            await syncAdminBootstrap();
            await loadCards();
          } };
      setMessage(isUpdate ? "笔记已保存。" : "新笔记已创建。", undoAction);

      await syncNavigationData();
      await syncAdminBootstrap();
      await loadCards();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "保存笔记失败");
    }
  }

  /** 删除单张笔记 */
  async function deleteCard(id: string) {
    setErrorMessage("");
    const cardSnapshot = cardForm?.id === id ? { ...cardForm } : null;
    const prevGlobalIds = getGlobalSiteIds?.();
    try {
      await requestJson(`/api/cards/note?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      setCardForm(null);

      if (cardSnapshot) {
        setMessage("笔记已删除。", {
          label: "撤销",
          undo: async () => {
            const res = await requestJson<{ item: NoteCard }>("/api/cards/note", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title: cardSnapshot.title, content: cardSnapshot.content }),
            });
            // 恢复全局排序位置
            if (res.item?.id && prevGlobalIds) {
              const gIdx = prevGlobalIds.indexOf(id);
              if (gIdx >= 0) {
                const restored = prevGlobalIds.filter((gid) => gid !== id);
                restored.splice(gIdx, 0, res.item.id);
                await requestJson("/api/sites/reorder-global", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ids: restored }),
                });
              }
            }
            await syncNavigationData();
            await syncAdminBootstrap();
            await loadCards();
          },
        });
      } else {
        setMessage("笔记已删除。");
      }

      await syncNavigationData();
      await syncAdminBootstrap();
      await loadCards();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "删除笔记失败");
    }
  }

  /** 删除全部笔记 */
  async function deleteAllCards() {
    setErrorMessage("");
    const cardsSnapshot = cards.map((c) => ({ title: c.title, content: c.content }));
    try {
      await requestJson("/api/cards/note", { method: "DELETE" });
      setCardForm(null);
      setCards([]);
      setMessage("所有笔记已删除。", {
        label: "撤销",
        undo: async () => {
          await Promise.all(cardsSnapshot.map((c) =>
            requestJson("/api/cards/note", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(c),
            })
          ));
          await syncNavigationData();
          await syncAdminBootstrap();
          await loadCards();
        },
      });
      await syncNavigationData();
      await syncAdminBootstrap();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "删除全部笔记失败");
    }
  }

  /** 更新指定卡片在本地 cards 数组中的内容（查看弹窗 checkbox 交互后同步） */
  const updateCardContent = useCallback((id: string, content: string) => {
    setCards(prev => prev.map(c => c.id === id ? { ...c, content } : c));
  }, []);

  /** 比较当前笔记表单与原始快照是否有差异（含附件变更） */
  const isCardFormModified = useCallback((): boolean => {
    const orig = originalFormRef.current;
    if (!orig) return true; // 新建模式
    if (!cardForm) return false;
    // 基本字段
    if (cardForm.title !== orig.title || cardForm.content !== orig.content) return true;
    // 附件变更（上传了新附件 或 标记删除了已有附件）
    const pending = cardForm.pendingAttachmentIds || [];
    const deleted = cardForm.deletedAttachmentIds || [];
    if (pending.length > 0 || deleted.length > 0) return true;
    return false;
  }, [cardForm]);

  return {
    cards, cardForm, setCardForm,
    viewCard, setViewCard,
    openCardCreator, openCardEditor, closeCardEditor,
    submitCardForm, deleteCard, deleteAllCards,
    updateCardContent,
    isCardFormModified,
  };
}
