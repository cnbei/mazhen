import type { SelectableSpan } from "@/types/translation";

export function normalizeSpans(
  translatedText: string,
  spans: SelectableSpan[],
): SelectableSpan[] {
  const safeText = translatedText ?? "";
  const filtered = spans
    .filter((span) => {
      if (!span.text || span.start < 0 || span.end <= span.start || span.end > safeText.length) {
        return false;
      }

      return safeText.slice(span.start, span.end) === span.text;
    })
    .sort((a, b) => a.start - b.start);

  const nonOverlapping: SelectableSpan[] = [];

  for (const span of filtered) {
    const previous = nonOverlapping[nonOverlapping.length - 1];
    if (previous && span.start < previous.end) {
      continue;
    }

    nonOverlapping.push(span);
  }

  return nonOverlapping;
}

export function sliceTranslationWithSpans(
  translatedText: string,
  spans: SelectableSpan[],
) {
  const normalized = normalizeSpans(translatedText, spans);
  const parts: Array<
    | { type: "text"; value: string }
    | { type: "span"; value: string; span: SelectableSpan }
  > = [];

  let cursor = 0;

  for (const span of normalized) {
    if (cursor < span.start) {
      parts.push({ type: "text", value: translatedText.slice(cursor, span.start) });
    }

    parts.push({ type: "span", value: span.text, span });
    cursor = span.end;
  }

  if (cursor < translatedText.length) {
    parts.push({ type: "text", value: translatedText.slice(cursor) });
  }

  return parts;
}
