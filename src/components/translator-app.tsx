"use client";

import { useDeferredValue, useEffect, useRef, useState } from "react";

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

type TranslationProgress = {
  active: boolean;
  stage: "idle" | "preparing" | "waiting-model" | "received" | "analyzing-spans" | "done" | "failed";
  label: string;
  detail: string;
  startedAt: number | null;
  elapsedMs: number;
};

export function TranslatorApp() {
  const [sourceText, setSourceText] = useState("");
  const [sourceLang, setSourceLang] = useState<AppLanguageCode>("zh");
  const [targetLang, setTargetLang] = useState<AppLanguageCode>("de");
  const [autoTranslateEnabled, setAutoTranslateEnabled] = useState(true);
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
  const [isExportingGlossary, setIsExportingGlossary] = useState(false);
  const [isMatchingGlossary, setIsMatchingGlossary] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isLoadingSpans, setIsLoadingSpans] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [uploadMode, setUploadMode] = useState<"merge" | "replace">("merge");
  const [translationProgress, setTranslationProgress] = useState<TranslationProgress>({
    active: false,
    stage: "idle",
    label: "等待翻译",
    detail: "输入文本后会显示请求进度。",
    startedAt: null,
    elapsedMs: 0,
  });
  const [serverStatus, setServerStatus] = useState<{
    level: "ok" | "degraded" | "down";
    summary: string;
    detail: string | null;
  }>({
    level: "ok",
    summary: "服务正常",
    detail: "翻译服务可用。",
  });

  const deferredSourceText = useDeferredValue(sourceText);
  const translateAbortRef = useRef<AbortController | null>(null);
  const spansAbortRef = useRef<AbortController | null>(null);
  const translateRunIdRef = useRef(0);
  const spansRunIdRef = useRef(0);
  const lastAutoTranslateKeyRef = useRef("");
  const progressHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void refreshProjects();
  }, []);

  useEffect(() => {
    if (!translationProgress.active || !translationProgress.startedAt) {
      return;
    }

    const timer = setInterval(() => {
      setTranslationProgress((previous) =>
        previous.active && previous.startedAt
          ? {
              ...previous,
              elapsedMs: Date.now() - previous.startedAt,
            }
          : previous,
      );
    }, 250);

    return () => clearInterval(timer);
  }, [translationProgress.active, translationProgress.startedAt]);

  useEffect(() => {
    let cancelled = false;

    async function refreshServerStatus() {
      try {
        const response = await fetch("/api/status");
        const data = await response.json();

        if (!response.ok || cancelled) {
          return;
        }

        if (data.server) {
          setServerStatus({
            level: data.server.level ?? "ok",
            summary: data.server.summary ?? "服务正常",
            detail: data.server.detail ?? null,
          });
        }
      } catch {
        if (!cancelled) {
          setServerStatus({
            level: "degraded",
            summary: "状态未知",
            detail: "暂时无法获取服务状态。",
          });
        }
      }
    }

    void refreshServerStatus();
    const timer = setInterval(() => {
      void refreshServerStatus();
    }, 12000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (progressHideTimerRef.current) {
        clearTimeout(progressHideTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const canMatch = Boolean(sourceText.trim() && selectedProjectId);

    if (!canMatch) {
      setGlossaryMatches([]);
      return;
    }

    const timer = setTimeout(() => {
      void matchGlossary(sourceText);
    }, 320);

    return () => clearTimeout(timer);
  }, [sourceText, selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) {
      setLoadedGlossary([]);
      setGlossaryMatches([]);
      return;
    }

    void loadGlossaryByProject(selectedProjectId, true);
  }, [selectedProjectId]);

  useEffect(() => {
    setOriginalResult(null);
    setCurrentResult(null);
    setSelectedSpan(null);
    setCandidates([]);
    setStatusMessage(null);
  }, [sourceLang, targetLang]);

  useEffect(() => {
    if (!autoTranslateEnabled) {
      return;
    }

    const nextText = deferredSourceText.trim();
    if (!nextText || !selectedProjectId || sourceLang === targetLang) {
      return;
    }

    const key = [nextText, sourceLang, targetLang, selectedProjectId].join("::");
    const timer = setTimeout(() => {
      if (lastAutoTranslateKeyRef.current === key) {
        return;
      }

      lastAutoTranslateKeyRef.current = key;
      void handleTranslateWithTrigger("auto");
    }, 480);

    return () => clearTimeout(timer);
  }, [autoTranslateEnabled, deferredSourceText, selectedProjectId, sourceLang, targetLang]);

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
      formData.append("mode", uploadMode);
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
        data.mode === "replace"
          ? `术语已覆盖保存到 ${data.project_name}：共 ${data.total_count} 条。`
          : `术语已合并保存到 ${data.project_name}：新增 ${data.imported_count} 条，更新 ${data.updated_count ?? 0} 条。`,
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
    return handleTranslateWithTrigger("manual");
  }

  async function handleTranslateWithTrigger(trigger: "manual" | "auto") {
    if (!sourceText.trim() || !selectedProjectId) {
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
    startTranslationProgress(trigger);
    lastAutoTranslateKeyRef.current = [sourceText.trim(), sourceLang, targetLang, selectedProjectId].join("::");
    translateAbortRef.current?.abort();
    const controller = new AbortController();
    translateAbortRef.current = controller;
    const runId = translateRunIdRef.current + 1;
    translateRunIdRef.current = runId;
    setIsTranslating(true);

    try {
      setTranslationProgressStage(
        "waiting-model",
        "等待模型返回译文",
        "请求已发送到模型服务。如果这里超过 8-10 秒，通常是上游模型或代理较慢。",
      );
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          source_text: sourceText,
          source_lang: sourceLang,
          target_lang: targetLang,
          project_id: selectedProjectId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "翻译失败。");
      }

      const result = data as TranslationResult;
      if (runId !== translateRunIdRef.current) {
        return;
      }

      setTranslationProgressStage(
        "received",
        "已收到主译文",
        "主翻译已返回，正在把结果渲染到页面。",
      );
      setOriginalResult(result);
      setCurrentResult(result);
      setStatusMessage(
        trigger === "auto"
          ? "译文已自动更新，正在补充可编辑词组..."
          : "译文已生成，正在补充可编辑词组...",
      );
      void loadSelectableSpans({
        sourceText,
        translatedText: result.translated_text,
      });
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === "AbortError") {
        return;
      }

      setTranslationProgressStage(
        "failed",
        "翻译请求失败",
        "请求已经结束，错误信息会显示在译文区域。",
      );
      setError(
        requestError instanceof Error
          ? prettifyUiError(requestError.message)
          : "文本翻译失败，请重试。",
      );
    } finally {
      if (runId === translateRunIdRef.current) {
        setIsTranslating(false);
      }
    }
  }

  async function loadSelectableSpans({
    sourceText,
    translatedText,
  }: {
    sourceText: string;
    translatedText: string;
  }) {
    spansAbortRef.current?.abort();
    const controller = new AbortController();
    spansAbortRef.current = controller;
    const runId = spansRunIdRef.current + 1;
    spansRunIdRef.current = runId;
    setIsLoadingSpans(true);
    setTranslationProgressStage(
      "analyzing-spans",
      "分析可编辑词组",
      "主译文已可用，这一步只是在补充高亮词组和后续替换入口。",
    );

    try {
      const response = await fetch("/api/translate/spans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          source_text: sourceText,
          translated_text: translatedText,
          source_lang: sourceLang,
          target_lang: targetLang,
          project_id: selectedProjectId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "可编辑词组加载失败。");
      }
      if (runId !== spansRunIdRef.current) {
        return;
      }

      setOriginalResult((previous) =>
        previous && previous.translated_text === translatedText
          ? {
              ...previous,
              selectable_spans: data.selectable_spans ?? [],
            }
          : previous,
      );

      setCurrentResult((previous) => {
        if (!previous || previous.translated_text !== translatedText) {
          return previous;
        }

        if (previous.applied_replacements.length > 0) {
          return previous;
        }

        return {
          ...previous,
          selectable_spans: data.selectable_spans ?? [],
        };
      });

      finishTranslationProgress("完成", "翻译和可编辑词组已准备好。");
      setStatusMessage("翻译完成，可点击高亮词组继续润色。");
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === "AbortError") {
        return;
      }

      finishTranslationProgress("主译文完成", "可编辑词组分析暂时失败，但主译文已经可用。");
      setStatusMessage("翻译完成。可编辑词组分析稍后再试。");
    } finally {
      if (runId === spansRunIdRef.current) {
        setIsLoadingSpans(false);
      }
    }
  }

  function startTranslationProgress(trigger: "manual" | "auto") {
    if (progressHideTimerRef.current) {
      clearTimeout(progressHideTimerRef.current);
      progressHideTimerRef.current = null;
    }

    setTranslationProgress({
      active: true,
      stage: "preparing",
      label: trigger === "auto" ? "自动翻译已触发" : "准备翻译",
      detail: "正在整理请求参数和术语项目。",
      startedAt: Date.now(),
      elapsedMs: 0,
    });
  }

  function setTranslationProgressStage(
    stage: TranslationProgress["stage"],
    label: string,
    detail: string,
  ) {
    setTranslationProgress((previous) => ({
      ...previous,
      active: true,
      stage,
      label,
      detail,
      startedAt: previous.startedAt ?? Date.now(),
    }));
  }

  function finishTranslationProgress(label: string, detail: string) {
    setTranslationProgress((previous) => ({
      ...previous,
      active: true,
      stage: "done",
      label,
      detail,
      elapsedMs: previous.startedAt ? Date.now() - previous.startedAt : previous.elapsedMs,
    }));

    progressHideTimerRef.current = setTimeout(() => {
      setTranslationProgress((previous) => ({
        ...previous,
        active: false,
      }));
    }, 1800);
  }

  async function handleExportGlossary() {
    if (!selectedProjectId) {
      return;
    }

    setError(null);
    setIsExportingGlossary(true);

    try {
      const response = await fetch(`/api/glossary/projects/${encodeURIComponent(selectedProjectId)}/export`);

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "术语导出失败。" }));
        throw new Error(data.error || "术语导出失败。");
      }

      const blob = await response.blob();
      const project = projects.find((item) => item.id === selectedProjectId);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `${project?.name || selectedProjectId}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      setStatusMessage(`已导出项目 ${project?.name || selectedProjectId} 的术语。`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "术语导出失败。");
    } finally {
      setIsExportingGlossary(false);
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
          ? prettifyUiError(requestError.message)
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
          ? prettifyUiError(requestError.message)
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
          <div className="hero-title-row">
            <h1>马真 AI翻译工作台</h1>
            <div className={`server-status server-status--${serverStatus.level}`} aria-live="polite">
              <span className="server-status-dot" />
              <span>{serverStatus.summary}</span>
            </div>
          </div>
          {serverStatus.detail ? <p className="server-status-note">{serverStatus.detail}</p> : null}
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
          onExportGlossary={handleExportGlossary}
          isLoadingProjects={isLoadingProjects}
          isLoadingGlossary={isLoadingGlossary}
          isUploadingGlossary={isUploadingGlossary}
          isExportingGlossary={isExportingGlossary}
          glossaryLoadedCount={loadedGlossary.length}
          selectedGlossaryFileName={selectedGlossaryFile?.name ?? null}
          examples={demoExamples}
          isLoading={isTranslating}
          sourceLang={sourceLang}
          onSourceLangChange={setSourceLang}
          uploadMode={uploadMode}
          onUploadModeChange={setUploadMode}
          autoTranslateEnabled={autoTranslateEnabled}
          onAutoTranslateChange={setAutoTranslateEnabled}
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
          isLoadingSpans={isLoadingSpans}
          isLoadingSuggestions={isLoadingSuggestions}
          isApplying={isApplying}
          statusMessage={statusMessage}
          progress={translationProgress}
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

function prettifyUiError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("模型响应超时") || normalized.includes("curl: (28)") || normalized.includes("timed out")) {
    return "模型响应较慢，当前请求已超时。请稍后重试，或换一个更快的模型。";
  }

  if (normalized.includes("负载较高") || normalized.includes("overloaded")) {
    return "模型服务当前负载较高，请稍后再试。";
  }

  return message;
}
