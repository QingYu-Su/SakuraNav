/**
 * 悬浮操作按钮
 * @description 包含回到顶部、悬浮搜索、GitHub Star 按钮
 */

import { ArrowUp, Search, Star } from "lucide-react";

type FloatingActionsProps = {
  showScrollTopButton: boolean;
  onScrollToTop: () => void;
  onOpenFloatingSearch: () => void;
};

export function FloatingActions({
  showScrollTopButton,
  onScrollToTop,
  onOpenFloatingSearch,
}: FloatingActionsProps) {
  return (
    <div className="fixed bottom-6 right-6 z-[45] flex flex-col items-end gap-3">
      {showScrollTopButton ? (
        <button
          type="button"
          onClick={onScrollToTop}
          className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/18 bg-[#0f172ae0] text-white shadow-[0_18px_48px_rgba(15,23,42,0.34)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-[#0f172af0]"
          aria-label="回到顶部"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      ) : null}
      <button
        type="button"
        onClick={onOpenFloatingSearch}
        className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-[rgba(255,255,255,0.18)] bg-[#4f7cff] text-white shadow-[0_18px_52px_rgba(79,124,255,0.38)] transition hover:-translate-y-0.5 hover:bg-[#678cff]"
        aria-label="打开悬浮搜索"
      >
        <Search className="h-5 w-5" />
      </button>
      <a
        href="https://github.com/QingYu-Su/SakuraNav"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-[rgba(255,255,255,0.18)] bg-[#4f7cff] text-white shadow-[0_18px_52px_rgba(79,124,255,0.38)] transition hover:-translate-y-0.5 hover:bg-[#678cff]"
        aria-label="给个 Star"
      >
        <Star className="h-5 w-5 text-white [&_path]:stroke-white" />
      </a>
    </div>
  );
}
