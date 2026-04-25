/**
 * AI 草稿配置全局访问点
 * @description 页面级 AI 配置暂存的 getter/setter。
 * 状态实际存储在 useAppearance hook 中，此模块仅提供跨组件访问能力，
 * 避免 props 层层传递。
 */

let _getter: (() => { aiApiKey: string; aiBaseUrl: string; aiModel: string }) | null = null;

/** 注册 AI 草稿配置的 getter（由 useAppearance 初始化时调用） */
export function registerAiDraftGetter(
  getter: () => { aiApiKey: string; aiBaseUrl: string; aiModel: string },
) {
  _getter = getter;
}

/** 获取当前 AI 草稿配置（未注册时返回空值） */
export function getAiDraftConfig(): { aiApiKey: string; aiBaseUrl: string; aiModel: string } {
  return _getter?.() ?? { aiApiKey: "", aiBaseUrl: "", aiModel: "" };
}
