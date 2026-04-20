/**
 * 社交卡片状态管理 Hook
 * @description 管理社交卡片的创建、编辑、删除，以及点击处理
 * 卡片数据已合并到 sites 表，列表由 useSiteList 统一管理
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import type { SocialCard, SocialCardType, SocialCardPayload } from "@/lib/base/types";
import { SOCIAL_CARD_TYPE_META } from "@/lib/base/types";
import { requestJson } from "@/lib/base/api";

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

/** 从已有的卡片构造编辑表单 */
export function cardToForm(card: SocialCard): CardFormState {
  let fieldValue = "";
  let qrCodeUrl: string | undefined;
  switch (card.payload.type) {
    case "qq": fieldValue = card.payload.qqNumber; qrCodeUrl = card.payload.qrCodeUrl; break;
    case "wechat": fieldValue = card.payload.wechatId; qrCodeUrl = card.payload.qrCodeUrl; break;
    case "email": fieldValue = card.payload.email; break;
    case "bilibili": fieldValue = card.payload.url; break;
    case "github": fieldValue = card.payload.url; break;
    case "blog": fieldValue = card.payload.url; break;
    case "wechat-official": fieldValue = card.payload.accountName; qrCodeUrl = card.payload.qrCodeUrl; break;
    case "telegram": fieldValue = card.payload.url; break;
    case "xiaohongshu": fieldValue = card.payload.xhsId; qrCodeUrl = card.payload.qrCodeUrl; break;
    case "douyin": fieldValue = card.payload.douyinId; qrCodeUrl = card.payload.qrCodeUrl; break;
    case "qq-group": fieldValue = card.payload.groupNumber; qrCodeUrl = card.payload.qrCodeUrl; break;
    case "enterprise-wechat": fieldValue = card.payload.ewcId; qrCodeUrl = card.payload.qrCodeUrl; break;
  }
  return { id: card.id, cardType: card.cardType, fieldValue, qrCodeUrl, hint: card.hint || "" };
}

/** 从表单构造 payload */
function formToPayload(form: CardFormState): SocialCardPayload | null {
  const value = form.fieldValue.trim();
  if (!value) return null;
  const qr = form.qrCodeUrl ? { qrCodeUrl: form.qrCodeUrl } : {};
  switch (form.cardType) {
    case "qq": return { type: "qq", qqNumber: value, ...qr };
    case "wechat": return { type: "wechat", wechatId: value, ...qr };
    case "email": return { type: "email", email: value };
    case "bilibili": return { type: "bilibili", url: /^https?:\/\//i.test(value) ? value : `https://${value}` };
    case "github": return { type: "github", url: /^https?:\/\//i.test(value) ? value : `https://${value}` };
    case "blog": return { type: "blog", url: /^https?:\/\//i.test(value) ? value : `https://${value}` };
    case "wechat-official": return { type: "wechat-official", accountName: value, ...qr };
    case "telegram": return { type: "telegram", url: /^https?:\/\//i.test(value) ? value : `https://${value}` };
    case "xiaohongshu": return { type: "xiaohongshu", xhsId: value, ...qr };
    case "douyin": return { type: "douyin", douyinId: value, ...qr };
    case "qq-group": return { type: "qq-group", groupNumber: value, ...qr };
    case "enterprise-wechat": return { type: "enterprise-wechat", ewcId: value, ...qr };
  }
}

export interface UseSocialCardsOptions {
  isAuthenticated: boolean;
  setMessage: (msg: string) => void;
  setErrorMessage: (msg: string) => void;
  syncNavigationData: () => Promise<void>;
  syncAdminBootstrap: () => Promise<void>;
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
}

export function useSocialCards(opts: UseSocialCardsOptions): UseSocialCardsReturn {
  const { setMessage, setErrorMessage, syncNavigationData, syncAdminBootstrap } = opts;

  const [cards, setCards] = useState<SocialCard[]>([]);
  const [cardForm, setCardForm] = useState<CardFormState | null>(null);
  const [showTypePicker, setShowTypePicker] = useState(false);

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
      hint: cardForm.hint?.trim() || null,
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
      await loadCards();
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
      await loadCards();
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
      // 带 ID + 二维码的类型 → 打开详情页
      case "qq":
      case "wechat":
      case "email":
      case "wechat-official":
      case "xiaohongshu":
      case "douyin":
      case "qq-group":
      case "enterprise-wechat": {
        window.open(`/card/${card.id}`, "_blank", "noopener,noreferrer");
        break;
      }
      // URL 跳转类型
      case "bilibili":
      case "github":
      case "blog":
      case "telegram": {
        window.open(card.payload.url, "_blank", "noopener,noreferrer");
        break;
      }
    }
  }, []);

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
  };
}
