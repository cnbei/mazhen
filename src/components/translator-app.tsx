"use client";

import { useEffect, useState } from "react";

import { SourcePanel } from "@/components/source-panel";
import { TargetPanel } from "@/components/target-panel";
import { type AppLanguageCode } from "@/lib/languages";
import { demoExamples } from "@/lib/translation/examples";
import type { GlossaryMatch, GlossaryProject, GlossaryProjectDetail, GlossaryTerm } from "@/types/glossary";
import type {
  ApplyReplacementResult,
  ReplacementCandidate,
  SelectableSpan,
  SuggestReplacementResult,
  TranslationResult,
} from "@/types/translation";

export function TranslatorApp() {
  const [sourceText, setSourceText] = useState("");
  const [sourceLang, setSourceLang] = useState<AppLanguageCode>("zh");
  const [targetLang, setTargetLang] = useState<AppLanguageCode>("de");
  const [originalResult, setOriginalResult] = useState<TranslationResult | null>(null);
  const [currentResult, setCurrentResult] = useState<TranslationResult | null>(null);
  const [selectedSpan, setSelectedSpan] = useState<SelectableSpan | null>(null);
  const [candidates, setCandidates] = useState<ReplacementCandidate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [projects, setProjects] = useState<GlossaryProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [loadedGlossary, setLoadedGlossary] = useState<GlossaryTerm[]>([]);
  const [selectedGlossaryFile, setSelectedGlossaryFile] = useState<File | null>(null);
  const [glossaryMatches, setGlossaryMatches] = useState<GlossaryMatch[]>([]);

  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingGlossary, setIsLoadingGlossary] = useState(false);
  const [isUploadingGlossary, setIsUploadingGlossary] = useState(false);
  const [isMatchingGlossary, setIsMatchingGlossary] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    void refreshProjects();
  }, []);

  useEffect(() => {
    const canMatch = Boolean(sourceText.trim() && selectedProjectId && loadedGlossary.length > 0);

    if (!canMatch) {
      setGlossaryMatches([]);
      return;
    }

    const timer = setTimeout(() => {
      void matchGlossary(sourceText);
    }, 320);

    return () => clearTimeout(timer);
  }, [sourceText, selectedProjectId, loadedGlossary.length]);

  useEffect(() => {
    setOriginalResult(null);
    setCurrentResult(null);
    setSelectedSpan(null);
    setCandidates([]);
    setStatusMessage(null);
  }, [sourceLang, targetLang]);

  async function refreshProjects(preferredProjectId?: string) {
    setIsLoadingProjects(true);

    try {
      const response = await fetch("/api/glossary/projects");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "加载术语项目列表失败。");
      }

      const nextProjects = (data.projects ?? []) as GlossaryProject[];
      setProjects(nextProjects);

      if (nextProjects.length === 0) {
        setSelectedProjectId("");
        return "";
      }

      const fallback = nextProjects[0].id;
      const nextSelected =
        preferredProjectId && nextProjects.some((project) => project.id === preferredProjectId)
          ? preferredProjectId
          : fallback;

      setSelectedProjectId(nextSelected);
      return nextSelected;
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "术语项目列表加载失败。",
      );
      return "";
    } finally {
      setIsLoadingProjects(false);
    }
  }

  async function loadGlossaryByProject(projectId: string, silent = false) {
    if (!projectId) {
      return;
    }

    setError(null);
    if (!silent) {
      setStatusMessage(null);
    }
    setIsLoadingGlossary(true);

    try {
      const response = await fetch(`/api/glossary/projects/${projectId}`);
      const data = (await response.json()) as GlossaryProjectDetail | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in data ? data.error || "术语库加载失败。" : "术语库加载失败。",
        );
      }

      if (!("terms" in data)) {
        throw new Error("术语库返回格式无效。");
      }

      setLoadedGlossary(data.terms);
      if (!silent) {
        setStatusMessage(`已加载项目 ${data.project.name} 的 ${data.terms.length} 条术语。`);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "术语库加载失败。");
      setLoadedGlossary([]);
      setGlossaryMatches([]);
    } finally {
      setIsLoadingGlossary(false);
    }
  }

  async function matchGlossary(text: string) {
    if (!selectedProjectId || !text.trim()) {
      setGlossaryMatches([]);
      return;
    }

    setIsMatchingGlossary(true);

    try {
      const response = await fetch("/api/glossary/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: selectedProjectId,
          source_text: text,
          top_k: 12,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "术语匹配失败。");
      }

      setGlossaryMatches((data.matches ?? []) as GlossaryMatch[]);
    } catch {
      setGlossaryMatches([]);
    } finally {
      setIsMatchingGlossary(false);
    }
  }

  async function handleLoadGlossary() {
    await loadGlossaryByProject(selectedProjectId);
  }

  async function handleUploadGlossary() {
    if ((!selectedProjectId && !newProjectName.trim()) || !selectedGlossaryFile) {
      return;
    }

    setError(null);
    setStatusMessage(null);
    setIsUploadingGlossary(true);

    try {
      const formData = new FormData();
      if (selectedProjectId) {
        formData.append("project_id", selectedProjectId);
      }
      if (!selectedProjectId && newProjectName.trim()) {
        formData.append("project_name", newProjectName.trim());
      }
      formData.append("file", selectedGlossaryFile);

      const response = await fetch("/api/glossary/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "术语文件上传失败。");
      }

      const activeProjectId = await refreshProjects(data.project_id);
      await loadGlossaryByProject(activeProjectId, true);
      setSelectedGlossaryFile(null);
      setNewProjectName("");
      setStatusMessage(
        `术语上传成功：项目 ${data.project_name}，导入 ${data.imported_count} 条，去重 ${data.duplicate_count} 条。`,
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "术语文件上传失败。");
    } finally {
      setIsUploadingGlossary(false);
    }
  }

  function handleSelectProject(projectId: string) {
    setSelectedProjectId(projectId);
    if (projectId) {
      setNewProjectName("");
    }
    setLoadedGlossary([]);
    setGlossaryMatches([]);
    setSelectedGlossaryFile(null);
    setStatusMessage(null);
  }

  async function handleTranslate() {
    if (!sourceText.trim() || !selectedProjectId || loadedGlossary.length === 0) {
      return;
    }
    if (sourceLang === targetLang) {
      setError("原文语言和译文语言不能相同。");
      return;
    }

    setError(null);
    setStatusMessage(null);
    setSelectedSpan(null);
    setCandidates([]);
    setIsTranslating(true);

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source_text: sourceText,
          source_lang: sourceLang,
          target_lang: targetLang,
          project_id: selectedProjectId,
          glossary_terms: loadedGlossary.slice(0, 200),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "翻译失败。");
      }

      const result = data as TranslationResult;
      setOriginalResult(result);
      setCurrentResult(result);
      setStatusMessage("翻译完成，可点击高亮词组继续润色。");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "文本翻译失败，请重试。",
      );
    } finally {
      setIsTranslating(false);
    }
  }

  async function handleSelectSpan(span: SelectableSpan) {
    if (!currentResult) {
      return;
    }

    setSelectedSpan(span);
    setError(null);
    setStatusMessage(null);
    setIsLoadingSuggestions(true);

    try {
      const response = await fetch("/api/replacements/suggest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source_text: currentResult.source_text,
          translated_text: currentResult.translated_text,
          source_lang: sourceLang,
          target_lang: targetLang,
          selected_span: span,
          applied_replacements: currentResult.applied_replacements,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "加载替换建议失败。");
      }

      const result = data as SuggestReplacementResult;
      setCandidates(result.replacement_candidates);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "该词组的替换建议加载失败。",
      );
      setCandidates([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }

  async function handleApplyCandidate(candidate: ReplacementCandidate) {
    if (!currentResult || !selectedSpan) {
      return;
    }

    setError(null);
    setStatusMessage(null);
    setIsApplying(true);

    try {
      const response = await fetch("/api/replacements/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source_text: currentResult.source_text,
          current_translation: currentResult.translated_text,
          source_lang: sourceLang,
          target_lang: targetLang,
          selected_span: selectedSpan,
          selected_replacement: candidate,
          applied_replacements: currentResult.applied_replacements,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "应用替换失败。");
      }

      const result = data as ApplyReplacementResult;
      setCurrentResult({
        source_text: currentResult.source_text,
        translated_text: result.translated_text,
        selectable_spans: result.selectable_spans,
        applied_replacements: result.applied_replacements,
      });
      setCandidates([]);
      setSelectedSpan(null);
      setStatusMessage(`已应用替换：${candidate.replacement_text}`);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "替换应用失败，请重试。",
      );
    } finally {
      setIsApplying(false);
    }
  }

  function handleRestore() {
    if (!originalResult) {
      return;
    }

    setCurrentResult(originalResult);
    setSelectedSpan(null);
    setCandidates([]);
    setError(null);
    setStatusMessage("已恢复初始译文。");
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero-copy">
          <h1>马真 AI翻译工作台</h1>
        </div>
      </section>

      <section className="workspace-grid">
        <SourcePanel
          value={sourceText}
          onChange={setSourceText}
          onTranslate={handleTranslate}
          projects={projects}
          selectedProjectId={selectedProjectId}
          newProjectName={newProjectName}
          onSelectProject={handleSelectProject}
          onNewProjectNameChange={setNewProjectName}
          onLoadGlossary={handleLoadGlossary}
          onGlossaryFileChange={setSelectedGlossaryFile}
          onUploadGlossary={handleUploadGlossary}
          isLoadingProjects={isLoadingProjects}
          isLoadingGlossary={isLoadingGlossary}
          isUploadingGlossary={isUploadingGlossary}
          glossaryLoadedCount={loadedGlossary.length}
          selectedGlossaryFileName={selectedGlossaryFile?.name ?? null}
          examples={demoExamples}
          isLoading={isTranslating}
          sourceLang={sourceLang}
          onSourceLangChange={setSourceLang}
        />
        <TargetPanel
          translatedText={currentResult?.translated_text ?? ""}
          spans={currentResult?.selectable_spans ?? []}
          selectedSpan={selectedSpan}
          candidates={candidates}
          appliedReplacements={currentResult?.applied_replacements ?? []}
          glossaryMatches={glossaryMatches}
          isMatchingGlossary={isMatchingGlossary}
          error={error}
          isTranslating={isTranslating}
          isLoadingSuggestions={isLoadingSuggestions}
          isApplying={isApplying}
          statusMessage={statusMessage}
          onSelectSpan={handleSelectSpan}
          onApplyCandidate={handleApplyCandidate}
          onRestore={handleRestore}
          targetLang={targetLang}
          onTargetLangChange={setTargetLang}
        />
      </section>
    </main>
  );
}
