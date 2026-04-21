# German Translation MVP

A lightweight Next.js web app for translating English into German and refining selected German words or short phrases with GPT-generated alternatives.

## Features

- English to German translation
- Editable highlighted spans in the German output
- 3 to 5 replacement candidates with usage notes
- Regeneration-based replacement flow for better German grammar
- Restore original translation
- Empty, loading, and error states
- 8 demo example sentences

## Installation

1. Install dependencies:

```bash
npm install
```

2. Create your environment file:

```bash
cp .env.example .env.local
```

3. Add your OpenAI API key to `.env.local`.

## Environment variables

```bash
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4.1-mini
OPENAI_BASE_URL=
OPENAI_TIMEOUT_MS=25000
```

If you use an OpenAI-compatible provider such as MiniMax, set `OPENAI_BASE_URL` and a provider-supported model name.

## Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 给朋友的快速配置（不泄露 API Key）

1. 克隆仓库并安装依赖

```bash
git clone https://github.com/cnbei/mazhen.git
cd mazhen
npm install
```

2. 复制环境变量模板并填写他自己的 key（不要用你的 key）

```bash
cp .env.example .env.local
```

3. 编辑 `.env.local`，至少配置以下内容

```bash
OPENAI_API_KEY=他自己的key
OPENAI_BASE_URL=可选，例如 https://ai.novacode.top/v1
OPENAI_MODEL=可选，例如 gpt-4.1-mini
```

4. 本地启动

```bash
npm run dev
```

注意：
- `.env.local` 已在 `.gitignore` 中，不会被提交到 GitHub。
- 不要把任何 key 写入源码文件或提交到仓库。

## Scripts

- `npm run dev` starts the local dev server
- `npm run build` builds the app
- `npm run start` runs the production server
- `npm run typecheck` runs TypeScript checks
- `npm run test` runs the minimal test suite

## Project structure

```text
src/
  app/
    api/
      translate/
      replacements/suggest/
      replacements/apply/
  components/
    translator-app.tsx
    source-panel.tsx
    target-panel.tsx
    replacement-popover.tsx
    example-chips.tsx
  lib/
    openai/
      client.ts
      request.ts
      schemas.ts
    prompts/
      translate.ts
      suggest-replacements.ts
      apply-replacement.ts
    translation/
      examples.ts
      mapping.ts
      service.ts
  tests/
    mapping.test.ts
    route-contracts.test.ts
```

## Architecture notes

- OpenAI calls stay on the server.
- The frontend talks only to Next.js API routes.
- Prompting logic is separated by task so translation and replacement behavior can evolve independently.
- Replacement application uses constrained regeneration rather than naive string substitution.

## Core interaction flow

1. Enter English text and click `Translate`.
2. Review the German output with highlighted editable spans.
3. Click a span to load replacement candidates.
4. Choose a candidate to regenerate the sentence naturally.
5. Use `Restore original translation` to reset to the initial result.

## Limitations

- English to German only
- No persistence or account system
- Model quality depends on prompt adherence and API availability
- The app is optimized for demo-scale paragraphs, not large documents
