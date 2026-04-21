"use client";

import { ExampleChips } from "@/components/example-chips";
import { APP_LANGUAGES, type AppLanguageCode, getLanguageLabel } from "@/lib/languages";
import type { GlossaryProject } from "@/types/glossary";

type SourcePanelProps = {
  value: string;
  onChange: (value: string) => void;
  onTranslate: () => void;
  projects: GlossaryProject[];
  selectedProjectId: string;
  newProjectName: string;
  onSelectProject: (projectId: string) => void;
  onNewProjectNameChange: (name: string) => void;
  onLoadGlossary: () => void;
  onGlossaryFileChange: (file: File | null) => void;
  onUploadGlossary: () => void;
  isLoadingProjects: boolean;
  isLoadingGlossary: boolean;
  isUploadingGlossary: boolean;
  glossaryLoadedCount: number;
  selectedGlossaryFileName: string | null;
  examples: string[];
  isLoading: boolean;
  sourceLang: AppLanguageCode;
  onSourceLangChange: (language: AppLanguageCode) => void;
};

export function SourcePanel({
  value,
  onChange,
  onTranslate,
  projects,
  selectedProjectId,
  newProjectName,
  onSelectProject,
  onNewProjectNameChange,
  onLoadGlossary,
  onGlossaryFileChange,
  onUploadGlossary,
  isLoadingProjects,
  isLoadingGlossary,
  isUploadingGlossary,
  glossaryLoadedCount,
  selectedGlossaryFileName,
  examples,
  isLoading,
  sourceLang,
  onSourceLangChange,
}: SourcePanelProps) {
  const disabled =
    value.trim().length === 0 || isLoading || !selectedProjectId || glossaryLoadedCount === 0;

  return (
    <section className="panel source-panel">
      <div className="panel-heading">
        <div className="panel-heading-language">
          <p className="eyebrow">原文语言</p>
          <select
            className="language-select"
            value={sourceLang}
            onChange={(event) => onSourceLangChange(event.target.value as AppLanguageCode)}
            disabled={isLoading}
          >
            {APP_LANGUAGES.map((language) => (
              <option key={language.code} value={language.code}>
                {language.label}
              </option>
            ))}
          </select>
        </div>
        <span className="panel-hint">粘贴文本或使用示例句测试</span>
      </div>

      <label className="sr-only" htmlFor="source-text">
        原文文本
      </label>
      <div className="glossary-controls">
        <div className="glossary-row">
          <label className="glossary-label" htmlFor="project-id">
            已有项目
          </label>
          <select
            id="project-id"
            className="project-select"
            value={selectedProjectId}
            onChange={(event) => onSelectProject(event.target.value)}
            disabled={isLoadingProjects || isLoading || isLoadingGlossary}
          >
            <option value="">请选择项目</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name} ({project.term_count})
              </option>
            ))}
          </select>
        </div>
        <div className="glossary-row">
          <label className="glossary-label" htmlFor="project-name">
            新项目名
          </label>
          <input
            id="project-name"
            className="project-select"
            placeholder="不选已有项目时，输入新项目名称"
            value={newProjectName}
            onChange={(event) => onNewProjectNameChange(event.target.value)}
            disabled={isLoading || isUploadingGlossary}
          />
        </div>
        <div className="glossary-row glossary-row--action">
          <button
            className="ghost-button glossary-load-button"
            type="button"
            onClick={onLoadGlossary}
            disabled={!selectedProjectId || isLoadingGlossary || isLoading}
          >
            {isLoadingGlossary ? "术语库加载中..." : "加载术语库"}
          </button>
          <span className="glossary-meta">
            {glossaryLoadedCount > 0 ? `已加载 ${glossaryLoadedCount} 条术语` : "未加载术语库"}
          </span>
        </div>
        <div className="glossary-row glossary-row--upload">
          <input
            className="glossary-file-input"
            type="file"
            accept=".txt,.tsv,.csv,text/plain,text/tab-separated-values,text/csv"
            onChange={(event) => onGlossaryFileChange(event.target.files?.[0] ?? null)}
            disabled={isLoading || isUploadingGlossary}
          />
          <button
            className="ghost-button glossary-upload-button"
            type="button"
            onClick={onUploadGlossary}
            disabled={
              (!selectedProjectId && !newProjectName.trim()) ||
              !selectedGlossaryFileName ||
              isUploadingGlossary ||
              isLoading
            }
          >
            {isUploadingGlossary ? "上传中..." : "上传术语文件"}
          </button>
        </div>
        <div className="glossary-row">
          <span className="glossary-meta">
            {selectedGlossaryFileName
              ? `文件: ${selectedGlossaryFileName}`
              : "支持 TXT / CSV / TSV（source,target 或 source=target）"}
          </span>
        </div>
      </div>

      <textarea
        id="source-text"
        className="source-textarea"
        placeholder={`输入${getLanguageLabel(sourceLang)}文本...`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />

      <div className="panel-footer">
        <p className="panel-footnote">
          默认优先自然、常用表达，而非逐字直译。
        </p>
        <button className="translate-button" type="button" onClick={onTranslate} disabled={disabled}>
          {isLoading ? "翻译中..." : "开始翻译"}
        </button>
      </div>

      <div className="examples-block">
        <p className="examples-title">示例句</p>
        <ExampleChips examples={examples} onSelect={onChange} />
      </div>
    </section>
  );
}
