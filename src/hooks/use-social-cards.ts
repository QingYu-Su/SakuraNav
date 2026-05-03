/**
 * 社交卡片状态管理 Hook
 * @description 管理社交卡片的创建、编辑、删除，以及点击处理
 * 卡片数据已合并到 sites 表，列表由 useSiteList 统一管理
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SocialCard, SocialCardType, SocialCardPayload } from "@/lib/base/types";
import { SOCIAL_CARD_TYPE_META } from "@/lib/base/types";
import { requestJson } from "@/lib/base/api";
import type { UndoAction } from "@/hooks/use-undo-stack";

/** 卡片表单状态 */
export type CardFormState = {
  id?: string;
  cardType: SocialCardType;
  fieldValue: string;
  qrCodeUrl?: string;
  /** 自定义提示文字，空则使用默认 */
  hint?: string;
};

/** 创建指定类型的默认表单 */
export function defaultCardForm(cardType: SocialCardType): CardFormState {
  return { cardType, fieldValue: "" };
}

/**
 * 从已有的卡片构造编辑表单（数据驱动，无需按类型 switch）
 * 新增卡片类型时只需更新 SOCIAL_CARD_TYPE_META 即可自动适配
 */
export function cardToForm(card: SocialCard): CardFormState {
  const meta = SOCIAL_CARD_TYPE_META[card.cardType];
  const payload = card.payload as Record<string, unknown>;
  const fieldValue = String(payload[meta.idField] ?? "");
  const qrCodeUrl = meta.hasQrCode ? (payload.qrCodeUrl as string | undefined) : undefined;
  return { id: card.id, cardType: card.cardType, fieldValue, qrCodeUrl, hint: card.hint || "" };
}

/**
 * 从表单构造 payload（数据驱动，无需按类型 switch）
 * 新增卡片类型时只需更新 SOCIAL_CARD_TYPE_META 即可自动适配
 */
function formToPayload(form: CardFormState): SocialCardPayload | null {
  const value = form.fieldValue.trim();
  if (!value) return null;
  const meta = SOCIAL_CARD_TYPE_META[form.cardType];
  const resolvedValue = meta.isUrl && !/^https?:\/\//i.test(value) ? `https://${value}` : value;
  const payload: Record<string, unknown> = { type: form.cardType, [meta.idField]: resolvedValue };
  if (meta.hasQrCode && form.qrCodeUrl) {
    payload.qrCodeUrl = form.qrCodeUrl;
  }
  return payload as SocialCardPayload;
}

export interface UseSocialCardsOptions {
  isAuthenticated: boolean;
  /** 成功消息回调，可选附带撤销动作 */
  setMessage: (msg: string, undo?: UndoAction) => void;
  setErrorMessage: (msg: string) => void;
  syncNavigationData: () => Promise<void>;
  syncAdminBootstrap: () => Promise<void>;
  /** 获取删除前的全局站点 ID 列表（用于撤销恢复排序位置） */
  getGlobalSiteIds?: () => string[];
}

export interface UseSocialCardsReturn {
  /** 当前卡片列表（从 /api/navigation/cards 获取，用于卡片编辑器回显） */
  cards: SocialCard[];
  cardForm: CardFormState | null;
  setCardForm: React.Dispatch<React.SetStateAction<CardFormState | null>>;
  showTypePicker: boolean;
  setShowTypePicker: (v: boolean) => void;
  openCardCreator: () => void;
  openCardEditor: (card: SocialCard) => void;
  closeCardEditor: () => void;
  submitCardForm: () => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  deleteAllCards: () => Promise<void>;
  handleCardClick: (card: SocialCard) => void;
  /** 当前卡片表单是否相对打开时有修改 */
  isCardFormModified: () => boolean;
}

export function useSocialCards(opts: UseSocialCardsOptions): UseSocialCardsReturn {
  const { setMessage, setErrorMessage, syncNavigationData, syncAdminBootstrap, getGlobalSiteIds } = opts;

  const [cards, setCards] = useState<SocialCard[]>([]);
  const [cardForm, setCardForm] = useState<CardFormState | null>(null);
  const [showTypePicker, setShowTypePicker] = useState(false);
  /** 编辑前原始的卡片表单快照，用于更新操作的撤销恢复 */
  const originalCardFormRef = useRef<CardFormState | null>(null);

  /** 加载卡片列表（仅用于编辑器回显） */
  const loadCards = useCallback(async () => {
    try {
      const result = await requestJson<{ items: SocialCard[] }>("/api/navigation/cards");
      setCards(result.items);
    } catch {
      // 静默忽略
    }
  }, []);

  // 登录后刷新卡片列表
  useEffect(() => {
    if (!opts.isAuthenticated) return;
    let cancelled = false;
    void (async () => {
      try {
        const result = await requestJson<{ items: SocialCard[] }>("/api/navigation/cards");
        if (!cancelled) setCards(result.items);
      } catch {
        // 静默忽略
      }
    })();
    return () => { cancelled = true; };
  }, [opts.isAuthenticated]);

  /** 打开卡片类型选择器 */
  function openCardCreator() {
    setShowTypePicker(true);
  }

  /** 打开卡片编辑器（从类型选择器选择后，或编辑已有卡片） */
  function openCardEditor(card: SocialCard) {
    const form = cardToForm(card);
    originalCardFormRef.current = { ...form };
    setCardForm(form);
  }

  /** 关闭卡片编辑器 */
  function closeCardEditor() {
    setCardForm(null);
    originalCardFormRef.current = null;
  }

  /** 提交卡片表单（创建/更新） */
  async function submitCardForm() {
    if (!cardForm) return;
    setErrorMessage("");

    const payload = formToPayload(cardForm);
    if (!payload) {
      const meta = SOCIAL_CARD_TYPE_META[cardForm.cardType];
      setErrorMessage(`请填写${meta.label}的必要信息`);
      return;
    }

    // 保存提交前快照（用于撤销）
    // 对于更新操作，使用 openCardEditor 时保存的原始数据
    // 对于创建操作，使用当前表单数据（新建撤销=删除该卡片）
    const originalSnapshot = originalCardFormRef.current;
    const formSnapshot: CardFormState = originalSnapshot ?? { ...cardForm };
    const isUpdate = !!cardForm.id;

    const meta = SOCIAL_CARD_TYPE_META[cardForm.cardType];
    const body = {
      ...(cardForm.id ? { id: cardForm.id } : {}),
      cardType: cardForm.cardType,
      label: meta.label,
      iconUrl: null,
      iconBgColor: meta.color,
      hint: cardForm.hint?.trim() || null,
      payload,
    };

    try {
      const result = await requestJson<{ item: SocialCard }>("/api/cards", {
        method: cardForm.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setCardForm(null);

      // 构建撤销动作
      const undoAction: UndoAction = isUpdate
        ? { label: "撤销", undo: async () => {
            const oldPayload = formToPayload(formSnapshot);
            if (!oldPayload) return;
            const oldMeta = SOCIAL_CARD_TYPE_META[formSnapshot.cardType];
            await requestJson("/api/cards", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: formSnapshot.id,
                cardType: formSnapshot.cardType,
                label: oldMeta.label,
                iconUrl: null,
                iconBgColor: oldMeta.color,
                hint: formSnapshot.hint?.trim() || null,
                payload: oldPayload,
              }),
            });
            await syncNavigationData();
            await syncAdminBootstrap();
            await loadCards();
          } }
        : { label: "撤销", undo: async () => {
            const newId = result.item?.id;
            if (!newId) return;
            await requestJson(`/api/cards?id=${encodeURIComponent(newId)}`, { method: "DELETE" });
            await syncNavigationData();
            await syncAdminBootstrap();
            await loadCards();
          } };
      setMessage(isUpdate ? "卡片修改已保存。" : "新卡片已创建。", undoAction);

      // ── 轻量刷新策略 ──
      if (isUpdate && result.item) {
        // 编辑卡片：就地更新本地 cards 数组，避免全量刷新导致所有卡片闪烁
        setCards((prev) => prev.map((c) => (c.id === result.item!.id ? result.item! : c)));
      } else {
        // 新建卡片：需要全量刷新以获取正确的排序和导航数据
        await syncNavigationData();
        await syncAdminBootstrap();
        await loadCards();
      }
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "保存卡片失败");
    }
  }

  /** 删除卡片 */
  async function deleteCard(id: string) {
    setErrorMessage("");
    // 从当前表单或卡片列表中获取快照（用于撤销）
    const cardSnapshot = cardForm?.id === id ? { ...cardForm } : null;
    // 保存删除前的全局排序（用于撤销恢复位置）
    const prevGlobalIds = getGlobalSiteIds?.();
    try {
      await requestJson(`/api/cards?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      setCardForm(null);

      if (cardSnapshot) {
        const oldPayload = formToPayload(cardSnapshot);
        if (oldPayload) {
          const oldMeta = SOCIAL_CARD_TYPE_META[cardSnapshot.cardType];
          setMessage("卡片已删除。", {
            label: "撤销",
            undo: async () => {
              const result = await requestJson<{ item: SocialCard }>("/api/cards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  cardType: cardSnapshot.cardType,
                  label: oldMeta.label,
                  iconUrl: null,
                  iconBgColor: oldMeta.color,
                  hint: cardSnapshot.hint?.trim() || null,
                  payload: oldPayload,
                }),
              });
              // 恢复全局排序位置
              if (result.item?.id && prevGlobalIds) {
                const gIdx = prevGlobalIds.indexOf(id);
                if (gIdx >= 0) {
                  const restored = prevGlobalIds.filter((gid) => gid !== id);
                  restored.splice(gIdx, 0, result.item.id);
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
          setMessage("卡片已删除。");
        }
      } else {
        setMessage("卡片已删除。");
      }

      await syncNavigationData();
      await syncAdminBootstrap();
      await loadCards();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "删除卡片失败");
    }
  }

  /** 删除全部社交卡片 */
  async function deleteAllCards() {
    setErrorMessage("");
    // 保存全部卡片快照（用于撤销）
    const cardsSnapshot = cards.map((c) => ({
      cardType: c.cardType,
      payload: c.payload,
      hint: c.hint,
    }));
    try {
      await requestJson("/api/cards", { method: "DELETE" });
      setCardForm(null);
      setCards([]);
      setMessage("所有社交卡片已删除。", {
        label: "撤销",
        undo: async () => {
          // 逐个重建所有卡片
          await Promise.all(cardsSnapshot.map((c) => {
            const meta = SOCIAL_CARD_TYPE_META[c.cardType];
            return requestJson("/api/cards", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                cardType: c.cardType,
                label: meta.label,
                iconUrl: null,
                iconBgColor: meta.color,
                hint: c.hint || null,
                payload: c.payload,
              }),
            });
          }));
          await syncNavigationData();
          await syncAdminBootstrap();
          await loadCards();
        },
      });
      await syncNavigationData();
      await syncAdminBootstrap();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "删除全部卡片失败");
    }
  }

  /**
   * 处理卡片点击（数据驱动，无需按类型 switch）
   * 新增卡片类型时只需更新 SOCIAL_CARD_TYPE_META.clickAction 即可自动适配
   */
  const handleCardClick = useCallback((card: SocialCard) => {
    const meta = SOCIAL_CARD_TYPE_META[card.cardType];
    if (meta.clickAction === "detail") {
      window.open(`/card/${card.id}`, "_blank", "noopener,noreferrer");
    } else {
      // URL 类型：从 payload 中提取主字段值作为跳转地址
      const payload = card.payload as Record<string, unknown>;
      const url = String(payload[meta.idField] ?? "");
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    }
  }, []);

  /** 比较当前卡片表单与原始快照是否有差异 */
  const isCardFormModified = useCallback((): boolean => {
    const orig = originalCardFormRef.current;
    if (!orig) return true; // 新建模式
    if (!cardForm) return false;
    return (
      cardForm.fieldValue !== orig.fieldValue ||
      cardForm.qrCodeUrl !== orig.qrCodeUrl ||
      (cardForm.hint ?? "") !== (orig.hint ?? "")
    );
  }, [cardForm]);

  return {
    cards,
    cardForm,
    setCardForm,
    showTypePicker,
    setShowTypePicker,
    openCardCreator,
    openCardEditor,
    closeCardEditor,
    submitCardForm,
    deleteCard,
    deleteAllCards,
    handleCardClick,
    isCardFormModified,
  };
}
