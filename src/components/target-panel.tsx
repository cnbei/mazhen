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
  isLoadingSpans: boolean;
  isLoadingSuggestions: boolean;
  isApplying: boolean;
  statusMessage: string | null;
  progress: {
    active: boolean;
    stage: "idle" | "preparing" | "waiting-model" | "received" | "analyzing-spans" | "done" | "failed";
    label: string;
    detail: string;
    elapsedMs: number;
  };
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
  isLoadingSpans,
  isLoadingSuggestions,
  isApplying,
  statusMessage,
  progress,
  onSelectSpan,
  onApplyCandidate,
  onRestore,
  targetLang,
  onTargetLangChange,
}: TargetPanelProps) {
  const parts = translatedText ? sliceTranslationWithSpans(translatedText, spans) : [];
  const progressPercent = getProgressPercent(progress.stage, progress.elapsedMs);
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
            <div className="translation-state translation-state--progress">
              <TranslationProgressCard
                label={progress.label || `正在生成自然${getLanguageLabel(targetLang)}译文`}
                detail={progress.detail}
                elapsedMs={progress.elapsedMs}
                percent={progressPercent}
              />
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

              {progress.active ? (
                <TranslationProgressCard
                  label={progress.label}
                  detail={progress.detail}
                  elapsedMs={progress.elapsedMs}
                  percent={progressPercent}
                  compact
                />
              ) : null}

              {isLoadingSpans && translatedText ? (
                <p className="status-banner status-banner--secondary">
                  译文已生成，正在分析可编辑词组...
                </p>
              ) : null}

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

function TranslationProgressCard({
  label,
  detail,
  elapsedMs,
  percent,
  compact = false,
}: {
  label: string;
  detail: string;
  elapsedMs: number;
  percent: number;
  compact?: boolean;
}) {
  return (
    <div className={cn("debug-progress", compact && "debug-progress--compact")} aria-live="polite">
      <div className="debug-progress-header">
        <span>{label}</span>
        <strong>{formatElapsed(elapsedMs)}</strong>
      </div>
      <div className="debug-progress-track">
        <div className="debug-progress-bar" style={{ width: `${percent}%` }} />
      </div>
      <p className="debug-progress-detail">{detail}</p>
    </div>
  );
}

function getProgressPercent(stage: TargetPanelProps["progress"]["stage"], elapsedMs: number) {
  if (stage === "done") {
    return 100;
  }

  if (stage === "failed") {
    return 100;
  }

  if (stage === "analyzing-spans") {
    return Math.min(96, 76 + elapsedMs / 1200);
  }

  if (stage === "received") {
    return 72;
  }

  if (stage === "waiting-model") {
    return Math.min(68, 18 + elapsedMs / 420);
  }

  if (stage === "preparing") {
    return Math.min(16, 6 + elapsedMs / 250);
  }

  return 0;
}

function formatElapsed(elapsedMs: number) {
  return `${Math.max(0, elapsedMs / 1000).toFixed(1)}s`;
}
