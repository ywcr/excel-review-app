"use client";

import Link from "next/link";
import { useState } from "react";
import { Play, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { HistoryPanel } from "@/features/persona-flow/components/HistoryPanel";
import { ImportStep } from "@/features/persona-flow/components/ImportStep";
import { MappingStep } from "@/features/persona-flow/components/MappingStep";
import { ResultsStep } from "@/features/persona-flow/components/ResultsStep";
import { StepNav } from "@/features/persona-flow/components/StepNav";
import { Button } from "@/features/persona-flow/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/features/persona-flow/components/ui/card";
import { Toaster } from "@/features/persona-flow/components/ui/sonner";
import { runAudit } from "@/features/persona-flow/lib/audit";
import { addHistory, allHistory } from "@/features/persona-flow/lib/db";
import { buildPersons } from "@/features/persona-flow/lib/persons";
import {
  DEFAULT_RULES,
  type AuditResult,
  type ParsedFile,
  type RuleConfig,
} from "@/features/persona-flow/lib/types";

export default function PersonaFlowApp() {
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const [rules, setRules] = useState<RuleConfig>(DEFAULT_RULES);
  const [results, setResults] = useState<AuditResult[]>([]);
  const [running, setRunning] = useState(false);
  const [historyVersion, setHistoryVersion] = useState(0);

  const go = (nextStep: number) => {
    setStep(nextStep);
    setMaxStep((current) => Math.max(current, nextStep));
  };

  const persons = buildPersons(files);

  const runAll = async () => {
    setRunning(true);
    try {
      const history = await allHistory();
      const auditResults = runAudit(persons, history, rules);
      setResults(auditResults);
      go(3);
      toast.success(`审核完成，共 ${auditResults.length} 条人员记录`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "审核失败");
    } finally {
      setRunning(false);
    }
  };

  const addNewToHistory = async () => {
    const rows = results
      .filter((result) => result.status === "new")
      .map((result) => ({
        company: result.person.std.company,
        name: result.person.std.name,
        idCard: result.person.std.idCard,
        phone: result.person.std.phone,
        empNo: result.person.std.empNo,
        department: result.person.std.department,
        sourceFile: result.person.fileName,
        addedAt: Date.now(),
      }));

    await addHistory(rows);
    setHistoryVersion((version) => version + 1);
    go(4);
    toast.success(`已将 ${rows.length} 条正常新增人员写入历史库`);
  };

  return (
    <div className="persona-flow min-h-screen bg-surface text-foreground">
      <Toaster position="top-center" />
      <header className="border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-semibold">Persona Flow</h1>
                <span className="rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                  公开访问
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                人员清单本地审核 · 数据仅在浏览器内解析和保存
              </p>
            </div>
          </div>

          <StepNav current={step} onSelect={go} maxReached={maxStep} />
        </div>
      </header>

      <Link
        href="/excel-review"
        aria-label="进入原 Excel 审核"
        tabIndex={-1}
        className="fixed right-0 bottom-0 z-[60] h-12 w-12 cursor-default opacity-0"
      />

      <main className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6">
        {step === 0 && <ImportStep files={files} setFiles={setFiles} onNext={() => go(1)} />}

        {step === 1 && (
          <MappingStep
            files={files}
            setFiles={setFiles}
            rules={rules}
            setRules={setRules}
            onBack={() => setStep(0)}
            onNext={() => go(2)}
          />
        )}

        {step === 2 && (
          <div className="space-y-6">
            <HistoryPanel
              version={historyVersion}
              onChange={() => setHistoryVersion((version) => version + 1)}
            />
            <Card>
              <CardHeader>
                <CardTitle className="text-base">开始审核</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  将对 {files.filter((file) => file.status === "parsed").length} 个文件、
                  {persons.length} 条人员记录执行标准化与查重规则引擎，包括文件内重复、跨文件重复、历史库重复、疑似重复和数据异常。
                </p>
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    上一步
                  </Button>
                  <Button disabled={!persons.length || running} onClick={runAll}>
                    <Play className="mr-1 h-4 w-4" />
                    {running ? "审核中..." : "开始审核"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 3 && (
          <ResultsStep
            results={results}
            fileCount={files.filter((file) => file.status === "parsed").length}
            onBack={() => setStep(2)}
            onAddToHistory={addNewToHistory}
          />
        )}

        {step === 4 && (
          <div className="space-y-6">
            <HistoryPanel
              version={historyVersion}
              onChange={() => setHistoryVersion((version) => version + 1)}
            />
            <Card>
              <CardHeader>
                <CardTitle className="text-base">导出与收尾</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setStep(3)}>
                  返回结果页
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setFiles([]);
                    setResults([]);
                    setMaxStep(0);
                    setStep(0);
                  }}
                >
                  开始新一批审核
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
