# TASKS

## Priority 1

- Create Next.js + TypeScript app structure manually.
- Add project configuration and dependencies.
- Define shared domain types and API schemas.
- Add demo English example sentences.

## Priority 2

- Implement server-side OpenAI client wrapper.
- Add timeout and defensive parsing helpers.
- Create prompt modules for translation, suggestions, and apply flow.
- Implement `/api/translate`.

## Priority 3

- Implement `/api/replacements/suggest`.
- Implement `/api/replacements/apply`.
- Build translation service functions:
  - `translateEnglishToGerman`
  - `suggestReplacementCandidates`
  - `applyReplacementAndRegenerate`

## Priority 4

- Build single-page layout.
- Implement source input panel and example chips.
- Implement target output panel with empty, loading, and error states.
- Render selectable spans with subtle highlights.
- Implement replacement panel and apply action.
- Implement restore original translation.

## Priority 5

- Add minimal tests for rendering helpers and contract validation.
- Add README with setup and project structure.
- Add `.env.example`.
- Perform self-check:
  - code structure review
  - type check
  - local run check
  - core interaction check

## Stretch if time remains

- Better loading skeleton polish
- Keyboard support for span selection
- Retry affordance for transient API failures
