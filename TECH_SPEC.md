# TECH_SPEC

## 1. Product breakdown

- Browser-based single-page translator
- Input: English source text
- Output: natural German translation
- Editable unit: selected German words or short phrases
- Interaction loop: translate, inspect span, request alternatives, apply candidate, restore original

## 2. Technical architecture

### Frontend

- Next.js App Router
- React + TypeScript
- Client component orchestrating app state
- Presentational components for source panel, target panel, example chips, span rendering, and replacement panel

### Backend

- Next.js route handlers
- Server-only OpenAI client wrapper
- Prompt modules separated by use case
- Zod validation for request and response contracts

### Shared domain layer

- Shared TypeScript types for translation, spans, candidates, and replacement history
- Rendering helpers to display translated text using span offsets

## 3. Data flow

### Translate flow

1. Frontend posts `source_text` to `/api/translate`.
2. Route validates input and calls `translateEnglishToGerman`.
3. Service calls OpenAI with the translation prompt and structured schema.
4. Backend normalizes spans and returns JSON.
5. Frontend stores:
   - `sourceText`
   - `originalTranslation`
   - `currentTranslation`
   - `selectableSpans`
   - `appliedReplacements = []`

### Suggest flow

1. Frontend posts `source_text`, `translated_text`, `selected_span`, and `applied_replacements` to `/api/replacements/suggest`.
2. Service calls OpenAI with the suggestion prompt and structured schema.
3. Backend returns candidate replacements with notes.
4. Frontend displays candidates in the replacement panel.

### Apply flow

1. Frontend posts `source_text`, `current_translation`, `selected_span`, `selected_replacement`, and `applied_replacements` to `/api/replacements/apply`.
2. Service calls OpenAI with the constrained regeneration prompt.
3. Backend returns a regenerated translation plus refreshed selectable spans.
4. Frontend updates `currentTranslation`, `selectableSpans`, and `appliedReplacements`.

## 4. Page structure

- Top header with product title and trust-building helper copy
- Main two-column layout
- Left column:
  - label
  - English textarea
  - example sentence chips
  - translate button
- Right column:
  - translation card
  - empty state before translation
  - loading skeleton while translating
  - interactive translated text with highlighted spans
  - restore action
  - applied replacement badges or change summary
- Floating or anchored replacement panel:
  - selected span label
  - candidate list
  - usage notes
  - apply action

## 5. API design

### Shared structures

```ts
type SelectableSpan = {
  id: string;
  text: string;
  start: number;
  end: number;
  rationale?: string;
};

type ReplacementCandidate = {
  id: string;
  replacement_text: string;
  usage_note: string;
};

type AppliedReplacement = {
  span_id: string;
  original_text: string;
  replacement_text: string;
  usage_note: string;
};
```

### POST /api/translate

Request:

```json
{
  "source_text": "We need a more practical solution for this problem."
}
```

Response:

```json
{
  "source_text": "We need a more practical solution for this problem.",
  "translated_text": "Wir brauchen eine praktischere Loesung fuer dieses Problem.",
  "selectable_spans": [
    {
      "id": "span_1",
      "text": "praktischere",
      "start": 20,
      "end": 33,
      "rationale": "adjective tone can be adjusted"
    }
  ],
  "applied_replacements": []
}
```

### POST /api/replacements/suggest

Request:

```json
{
  "source_text": "We need a more practical solution for this problem.",
  "translated_text": "Wir brauchen eine praktischere Loesung fuer dieses Problem.",
  "selected_span": {
    "id": "span_1",
    "text": "praktischere",
    "start": 20,
    "end": 33
  },
  "applied_replacements": []
}
```

Response:

```json
{
  "selected_span_id": "span_1",
  "replacement_candidates": [
    {
      "id": "candidate_1",
      "replacement_text": "alltagstauglichere",
      "usage_note": "more idiomatic for real-world usability"
    }
  ]
}
```

### POST /api/replacements/apply

Request:

```json
{
  "source_text": "We need a more practical solution for this problem.",
  "current_translation": "Wir brauchen eine praktischere Loesung fuer dieses Problem.",
  "selected_span": {
    "id": "span_1",
    "text": "praktischere",
    "start": 20,
    "end": 33
  },
  "selected_replacement": {
    "id": "candidate_1",
    "replacement_text": "alltagstauglichere",
    "usage_note": "more idiomatic for real-world usability"
  },
  "applied_replacements": []
}
```

Response:

```json
{
  "translated_text": "Wir brauchen fuer dieses Problem eine alltagstauglichere Loesung.",
  "selectable_spans": [
    {
      "id": "span_1",
      "text": "alltagstauglichere",
      "start": 40,
      "end": 60
    }
  ],
  "applied_replacements": [
    {
      "span_id": "span_1",
      "original_text": "praktischere",
      "replacement_text": "alltagstauglichere",
      "usage_note": "more idiomatic for real-world usability"
    }
  ]
}
```

## 6. Replacement mechanism design

### Option A: local replacement plus rule correction

- Replace the selected substring in the existing German sentence.
- Run rule-based or model-based correction afterward.
- Benefit: lower latency.
- Drawback: German agreement and collocations are too brittle for a reliable MVP.

### Option B: constrained sentence regeneration

- Treat the current translation as context, not as immutable text.
- Instruct the model to regenerate a fluent German sentence that preserves meaning while using the selected replacement naturally.
- Require the chosen replacement to appear exactly once unless grammar requires an inflected close variant.
- Ask the model to refresh selectable spans for the new sentence.

### Chosen approach

Use Option B. It is the more robust strategy for German morphology and produces better demo quality. The app can still restore the original translation instantly on the client without another API call.

## 7. Milestone plan for MVP

### Milestone 1

- Create PRD, technical spec, tasks list
- Scaffold project and shared types

### Milestone 2

- Implement server OpenAI wrapper and prompts
- Implement `/api/translate`

### Milestone 3

- Implement suggestion and apply routes
- Implement constrained regeneration path

### Milestone 4

- Build polished single-page UI
- Connect example chips, loading, empty, and error states

### Milestone 5

- Add tests and validation
- Add README and environment setup
- Run self-checks

## Prompting strategy

### Translation prompt

- Translate English into natural, common German.
- Return one translation only.
- Mark 3 to 7 useful editable spans.
- Prefer spans whose alternatives can meaningfully change tone or register.

### Suggestion prompt

- Given source text, current translation, and selected span, produce 3 to 5 high-frequency alternatives.
- Each option must be natural in the sentence context.
- Each option includes a concise usage note.

### Apply prompt

- Given source text, current translation, selected span, chosen replacement, and replacement history, regenerate a fluent German sentence.
- Preserve meaning.
- Use the chosen replacement naturally.
- Return fresh selectable spans and updated text.

## Error handling

- Validate all inbound requests with Zod.
- Guard against empty model output.
- Guard against invalid span offsets.
- Apply timeout to model calls.
- Return stable error payloads to the frontend.

