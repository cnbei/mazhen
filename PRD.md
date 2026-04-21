# PRD

## Product overview

Build a lightweight browser-based English-to-German translation app with a professional, trustworthy feel. The app should translate English input into natural German, expose selected German words or short phrases as editable spans, and let users swap those spans for more suitable alternatives with immediate feedback.

## User story

As a user translating English into German, I want an initial translation that sounds natural and common, and I want to refine certain words or phrases with guided alternatives so I can quickly reach the tone I want without manually rewriting the whole sentence.

## Goals

- Deliver a clean single-page web app for English to German translation.
- Prioritize natural, high-frequency German over literal translation.
- Let users refine selected output spans with 3 to 5 high-quality alternatives.
- Keep the interaction understandable enough for a live demo.

## Non-goals

- Authentication or user accounts
- Translation history sync
- Multi-language support
- Payments
- Collaboration
- Corpus-backed terminology management

## Target users

- Product demos and internal stakeholders
- Learners or professionals who want to compare German wording options
- Users who care about tone and naturalness more than raw throughput

## Core flows

### 1. Translate text

1. User enters or pastes English text.
2. User clicks `Translate`.
3. App sends the source text to the backend.
4. Backend returns:
   - the main German translation
   - selectable German spans
   - metadata for rendering
5. UI shows the translation with subtle editable highlights.

### 2. Explore replacement suggestions

1. User clicks a highlighted German word or short phrase.
2. App requests replacement candidates for that span.
3. Backend returns 3 to 5 natural candidates with short usage notes.
4. UI shows the candidates in a popover or side panel.

### 3. Apply replacement

1. User selects a suggested replacement.
2. App sends the chosen replacement plus context to the backend.
3. Backend regenerates the sentence with grammatical agreement preserved.
4. UI updates the translation immediately and confirms the change.

### 4. Restore original

1. User clicks `Restore original translation`.
2. UI restores the initial translation and initial spans without another model call.

## MVP requirements

- Single-page layout
- Left source panel and right translation panel
- Translation button
- Loading state
- Empty state
- Error state
- Disabled translate button when input is empty
- 8+ demo English examples
- Clickable/editable German spans
- Replacement candidates with usage notes
- Restore original translation action

## UX principles

- Clean and minimal, but not generic
- Obvious source vs target separation
- Fast to understand in under 10 seconds
- Subtle affordances for editable spans
- Clear feedback when a replacement is applied

## Success criteria

- A user can translate English to German in the browser.
- A user can click at least one highlighted word or short phrase in the translation.
- A user can see replacement suggestions with usage notes.
- A user can apply a replacement and observe an updated, fluent German sentence.
- A user can restore the original translation.

## Risks

- Model output may be malformed or inconsistent.
- Naive replacement would break German grammar.
- Over-highlighting too many spans may feel noisy.
- Regeneration latency could make editing feel sluggish.

## MVP quality strategy

- Use structured JSON output contracts from the model.
- Limit selectable spans to the most useful 3 to 7 spans.
- Use constrained regeneration instead of direct text replacement.
- Keep prompts modular for fast iteration after the MVP.

