type CacheEntry<TValue> = {
  expiresAt: number;
  value: TValue;
};

const TRANSLATION_TTL_MS = 10 * 60 * 1000;
const SPANS_TTL_MS = 20 * 60 * 1000;
const MAX_ENTRIES = 150;

const translationCache = new Map<string, CacheEntry<unknown>>();
const spansCache = new Map<string, CacheEntry<unknown>>();

export function getCachedTranslation<TValue>(key: string) {
  return getCacheValue<TValue>(translationCache, key);
}

export function setCachedTranslation<TValue>(key: string, value: TValue) {
  setCacheValue(translationCache, key, value, TRANSLATION_TTL_MS);
}

export function getCachedSpans<TValue>(key: string) {
  return getCacheValue<TValue>(spansCache, key);
}

export function setCachedSpans<TValue>(key: string, value: TValue) {
  setCacheValue(spansCache, key, value, SPANS_TTL_MS);
}

export function buildTranslationCacheKey({
  sourceText,
  sourceLang,
  targetLang,
  projectId,
}: {
  sourceText: string;
  sourceLang: string;
  targetLang: string;
  projectId?: string;
}) {
  return [sourceLang, targetLang, projectId || "no-project", sourceText.trim()].join("::");
}

function getCacheValue<TValue>(cache: Map<string, CacheEntry<unknown>>, key: string) {
  const entry = cache.get(key);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  cache.delete(key);
  cache.set(key, entry);
  return entry.value as TValue;
}

function setCacheValue<TValue>(
  cache: Map<string, CacheEntry<unknown>>,
  key: string,
  value: TValue,
  ttlMs: number,
) {
  if (cache.size >= MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) {
      cache.delete(oldestKey);
    }
  }

  cache.set(key, {
    expiresAt: Date.now() + ttlMs,
    value,
  });
}
