"use client";

import type { ReplacementCandidate, SelectableSpan } from "@/types/translation";

type ReplacementPopoverProps = {
  selectedSpan: SelectableSpan | null;
  candidates: ReplacementCandidate[];
  isLoading: boolean;
  onApply: (candidate: ReplacementCandidate) => void;
};

export function ReplacementPopover({
  selectedSpan,
  candidates,
  isLoading,
  onApply,
}: ReplacementPopoverProps) {
  if (!selectedSpan) {
    return (
      <aside className="replacement-panel replacement-panel--empty">
        <p className="replacement-title">润色译文</p>
        <p className="replacement-copy">
          点击译文中的高亮词组，可查看替代表达。
        </p>
      </aside>
    );
  }

  return (
    <aside className="replacement-panel">
      <div className="replacement-header">
        <p className="replacement-title">可替换词组</p>
        <strong className="replacement-selected">“{selectedSpan.text}”</strong>
      </div>

      {isLoading ? (
        <div className="replacement-loading">
          <span className="spinner" />
          <p>正在生成替代建议...</p>
        </div>
      ) : candidates.length === 0 ? (
        <p className="replacement-copy">暂无建议，请重新点击该词组重试。</p>
      ) : (
        <div className="candidate-list">
          {candidates.map((candidate) => (
            <button
              key={candidate.id}
              className="candidate-card"
              type="button"
              onClick={() => onApply(candidate)}
            >
              <span className="candidate-text">{candidate.replacement_text}</span>
              <span className="candidate-note">{candidate.usage_note}</span>
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}
