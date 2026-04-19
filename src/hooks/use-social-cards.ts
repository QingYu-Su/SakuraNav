/**
 * 社交卡片状态管理 Hook
 * @description 管理社交卡片的加载、创建、编辑、删除和拖拽排序
 */

"use client";

import { useCallback, useEffect, useEffectEvent, useState } from "react";
import type { SocialCard, SocialCardType, SocialCardPayload } from "@/lib/base/types";
import { SOCIAL_CARD_TYPE_META } from "@/lib/base/types";
import { requestJson } from "@/lib/base/api";

/** 卡片表单状态 */
export type CardFormState = {
  id?: string;
  cardType: SocialCardType;
  fieldValue: string;
  qrCodeUrl?: string;
};

/** 创建指定类型的默认表单 */
export function defaultCardForm(cardType: SocialCardType): CardFormState {
  return { cardType, fieldValue: "" };
}

/** 从已有的卡片构造编辑表单 */
export function cardToForm(card: SocialCard): CardFormState {
  let fieldValue = "";
  switch (card.payload.type) {
    case "qq": fieldValue = card.payload.qqNumber; break;
    case "email": fieldValue = card.payload.email; break;
    case "bilibili": fieldValue = card.payload.url; break;
    case "github": fieldValue = card.payload.url; break;
  }
  return { id: card.id, cardType: card.cardType, fieldValue, qrCodeUrl: card.payload.type === "qq" ? card.payload.qrCodeUrl : undefined };
}

/** 从表单构造 payload */
function formToPayload(form: CardFormState): SocialCardPayload | null {
  const value = form.fieldValue.trim();
  if (!value) return null;
  switch (form.cardType) {
    case "qq": return { type: "qq", qqNumber: value, ...(form.qrCodeUrl ? { qrCodeUrl: form.qrCodeUrl } : {}) };
    case "email": return { type: "email", email: value };
    case "bilibili": return { type: "bilibili", url: /^https?:\/\//i.test(value) ? value : `https://${value}` };
    case "github": return { type: "github", url: /^https?:\/\//i.test(value) ? value : `https://${value}` };
  }
}

export interface UseSocialCardsOptions {
  isAuthenticated: boolean;
  activeTagId: string | null;
  refreshNonce: number;
  setMessage: (msg: string) => void;
  setErrorMessage: (msg: string) => void;
  syncNavigationData: () => Promise<void>;
  syncAdminBootstrap: () => Promise<void>;
}

export interface UseSocialCardsReturn {
  cards: SocialCard[];
  setCards: React.Dispatch<React.SetStateAction<SocialCard[]>>;
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
}

export function useSocialCards(opts: UseSocialCardsOptions): UseSocialCardsReturn {
  const { isAuthenticated, setMessage, setErrorMessage, syncNavigationData, syncAdminBootstrap } = opts;

  const [cards, setCards] = useState<SocialCard[]>([]);
  const [cardForm, setCardForm] = useState<CardFormState | null>(null);
  const [showTypePicker, setShowTypePicker] = useState(false);

  /** 加载卡片列表（仅在管理端 bootstrap 时） */
  const loadCards = useEffectEvent(async () => {
    if (!isAuthenticated) {
      setCards([]);
      return;
    }
    try {
      const result = await requestJson<{ items: SocialCard[] }>("/api/cards");
      setCards(result.items);
    } catch {
      // 静默忽略
    }
  });

  useEffect(() => {
    void loadCards();
  }, [isAuthenticated, opts.refreshNonce]);

  /** 打开卡片类型选择器 */
  function openCardCreator() {
    setShowTypePicker(true);
  }

  /** 打开卡片编辑器（从类型选择器选择后，或编辑已有卡片） */
  function openCardEditor(card: SocialCard) {
    setCardForm(cardToForm(card));
  }

  /** 关闭卡片编辑器 */
  function closeCardEditor() {
    setCardForm(null);
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

    const meta = SOCIAL_CARD_TYPE_META[cardForm.cardType];
    const body = {
      ...(cardForm.id ? { id: cardForm.id } : {}),
      cardType: cardForm.cardType,
      label: meta.label,
      iconUrl: null,
      iconBgColor: meta.color,
      payload,
    };

    try {
      await requestJson<{ item: SocialCard }>("/api/cards", {
        method: cardForm.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setCardForm(null);
      setMessage(cardForm.id ? "卡片修改已保存。" : "新卡片已创建。");
      await syncNavigationData();
      await syncAdminBootstrap();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "保存卡片失败");
    }
  }

  /** 删除卡片 */
  async function deleteCard(id: string) {
    setErrorMessage("");
    try {
      await requestJson(`/api/cards?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      setCardForm(null);
      setMessage("卡片已删除。");
      await syncNavigationData();
      await syncAdminBootstrap();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "删除卡片失败");
    }
  }

  /** 删除全部社交卡片 */
  async function deleteAllCards() {
    setErrorMessage("");
    try {
      await requestJson("/api/cards", { method: "DELETE" });
      setCardForm(null);
      setCards([]);
      setMessage("所有社交卡片已删除。");
      await syncNavigationData();
      await syncAdminBootstrap();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "删除全部卡片失败");
    }
  }

  /** 处理卡片点击（复制+跳转） */
  const handleCardClick = useCallback((card: SocialCard) => {
    switch (card.payload.type) {
      case "qq": {
        window.location.href = `/card/${card.id}`;
        break;
      }
      case "email": {
        navigator.clipboard.writeText(card.payload.email).catch(() => {});
        setMessage("邮箱地址已复制到剪贴板");
        window.location.href = `mailto:${card.payload.email}`;
        break;
      }
      case "bilibili": {
        window.open(card.payload.url, "_blank", "noopener,noreferrer");
        break;
      }
      case "github": {
        window.open(card.payload.url, "_blank", "noopener,noreferrer");
        break;
      }
    }
  }, [setMessage]);

  return {
    cards,
    setCards,
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
  };
}
