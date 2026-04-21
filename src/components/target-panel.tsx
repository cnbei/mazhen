"use client";

import { ReplacementPopover } from "@/components/replacement-popover";
import { APP_LANGUAGES, type AppLanguageCode, getLanguageLabel } from "@/lib/languages";
import { sliceTranslationWithSpans } from "@/lib/translation/mapping";
import { cn } from "@/lib/utils";
import type { GlossaryMatch } from "@/types/glossary";
import type { AppliedReplacement, ReplacementCandidate, SelectableSpan } from "@/types/translation";

type TargetPanelProps = {
  translatedText: string;
  spans: SelectableSpan[];
  selectedSpan: SelectableSpan | null;
  candidates: ReplacementCandidate[];
  appliedReplacements: AppliedReplacement[];
  glossaryMatches: GlossaryMatch[];
  isMatchingGlossary: boolean;
  error: string | null;
  isTranslating: boolean;
  isLoadingSuggestions: boolean;
  isApplying: boolean;
  statusMessage: string | null;
  onSelectSpan: (span: SelectableSpan) => void;
  onApplyCandidate: (candidate: ReplacementCandidate) => void;
  onRestore: () => void;
  targetLang: AppLanguageCode;
  onTargetLangChange: (language: AppLanguageCode) => void;
};

export function TargetPanel({
  translatedText,
  spans,
  selectedSpan,
  candidates,
  appliedReplacements,
  glossaryMatches,
  isMatchingGlossary,
  error,
  isTranslating,
  isLoadingSuggestions,
  isApplying,
  statusMessage,
  onSelectSpan,
  onApplyCandidate,
  onRestore,
  targetLang,
  onTargetLangChange,
}: TargetPanelProps) {
  const parts = translatedText ? sliceTranslationWithSpans(translatedText, spans) : [];
  const exactGlossaryTargets = new Set(
    glossaryMatches
      .filter((item) => item.match_type === "exact")
      .map((item) => item.target.trim().toLowerCase()),
  );

  return (
    <section className="panel target-panel">
      <div className="panel-heading">
        <div className="panel-heading-language">
          <p className="eyebrow">译文语言</p>
          <select
            className="language-select"
            value={targetLang}
            onChange={(event) => onTargetLangChange(event.target.value as AppLanguageCode)}
            disabled={isTranslating || isApplying}
          >
            {APP_LANGUAGES.map((language) => (
              <option key={language.code} value={language.code}>
                {language.label}
              </option>
            ))}
          </select>
        </div>
        <button
          className="ghost-button"
          type="button"
          onClick={onRestore}
          disabled={!translatedText || isTranslating || isApplying}
        >
          恢复初始译文
        </button>
      </div>

      <div className="translation-shell">
        <div className="translation-card">
          {isTranslating ? (
            <div className="translation-state">
              <span className="spinner" />
              <p>正在生成自然{getLanguageLabel(targetLang)}译文...</p>
            </div>
          ) : translatedText ? (
            <>
              <div className="translation-output" aria-live="polite">
                {parts.map((part, index) =>
                  part.type === "text" ? (
                    <span key={`${part.value}-${index}`}>{part.value}</span>
                  ) : (
                    <button
                      key={part.span.id}
                      type="button"
                      className={cn(
                        "span-pill",
                        exactGlossaryTargets.has(part.value.trim().toLowerCase()) && "span-pill--glossary-exact",
                        selectedSpan?.id === part.span.id && "span-pill--active",
                      )}
                      onClick={() => onSelectSpan(part.span)}
                    >
                      {part.value}
                    </button>
                  ),
                )}
              </div>

              {statusMessage ? <p className="status-banner">{statusMessage}</p> : null}

              {error ? <p className="inline-error">{error}</p> : null}

              {appliedReplacements.length > 0 ? (
                <div className="applied-replacements">
                  {appliedReplacements.map((item) => (
                    <span key={`${item.span_id}-${item.replacement_text}`} className="applied-tag">
                      {item.original_text} → {item.replacement_text}
                    </span>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <div className="translation-state translation-state--empty">
              <p className="empty-title">
                {error ? "发生错误" : `${getLanguageLabel(targetLang)}译文将显示在这里`}
              </p>
              <p className="empty-copy">
                {error
                  ? error
                  : "翻译完成后，可点击高亮词组进行替换润色。"}
              </p>
            </div>
          )}
        </div>

        <div className="right-stack">
          <ReplacementPopover
            selectedSpan={selectedSpan}
            candidates={candidates}
            isLoading={isLoadingSuggestions || isApplying}
            onApply={onApplyCandidate}
          />

          <aside className="glossary-match-panel">
            <div className="glossary-match-header">
              <p className="replacement-title">术语库匹配</p>
              {isMatchingGlossary ? <span className="glossary-match-loading">匹配中...</span> : null}
            </div>
            {glossaryMatches.length === 0 ? (
              <p className="replacement-copy">输入文本后，这里会显示术语精确命中和模糊匹配结果。</p>
            ) : (
              <div className="glossary-match-list">
                {glossaryMatches.map((item, index) => (
                  <div key={`${item.source}-${index}`} className="glossary-match-item">
                    <div className="glossary-match-line">
                      <strong>{item.source}</strong>
                      <span className="glossary-match-score">
                        {item.match_type === "exact" ? "精确" : "模糊"} · {(item.score * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="glossary-match-target">{item.target}</div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}
