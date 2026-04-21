import { translateEnglishToGerman } from '../src/lib/translation/service.ts';
import { getGlossaryProject } from '../src/lib/glossary/catalog.ts';

const detail = getGlossaryProject('space-event');

try {
  const result = await translateEnglishToGerman({
    sourceText: '你好，欢迎来到活动页面',
    projectId: 'space-event',
    projectTone: detail?.project.tone,
    glossaryTerms: detail?.terms,
    tmCandidates: [],
  });
  console.log(JSON.stringify(result).slice(0, 500));
} catch (e) {
  console.error('err', e.message);
}
