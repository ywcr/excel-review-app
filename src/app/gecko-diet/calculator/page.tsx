"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/gecko-ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/gecko-ui/tabs";
import { Badge } from "@/components/gecko-ui/badge";
import { Button } from "@/components/gecko-ui/button";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/gecko-ui/alert";
import {
  Calculator,
  Dna,
  ArrowLeft,
  ArrowRight,
  Info,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import {
  GeckoGenome,
  LillyAllele,
  DarkAllele,
  SoftAllele,
  RecessiveAllele,
  GENE_INFO,
  calculateOffspring,
  createDefaultGenome,
  formatProbability,
  getFullPhenotype,
  OffspringResult,
} from "@/lib/gecko-genetics";

// ============ 基因选择器组件 ============

interface GeneSelectProps<T extends string> {
  label: string;
  labelCN: string;
  value: { allele1: T; allele2: T };
  onChange: (value: { allele1: T; allele2: T }) => void;
  options: { value: T; label: string }[];
}

function GeneSelect<T extends string>({
  label,
  labelCN,
  value,
  onChange,
  options,
}: GeneSelectProps<T>) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        {labelCN} <span className="text-muted-foreground">({label})</span>
      </label>
      <div className="flex gap-2 items-center">
        <select
          value={value.allele1}
          onChange={(e) => onChange({ ...value, allele1: e.target.value as T })}
          className="flex-1 px-3 py-2 border rounded-md bg-background text-sm"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="text-muted-foreground">/</span>
        <select
          value={value.allele2}
          onChange={(e) => onChange({ ...value, allele2: e.target.value as T })}
          className="flex-1 px-3 py-2 border rounded-md bg-background text-sm"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ============ 亲代选择面板 ============

interface ParentPanelProps {
  title: string;
  genome: GeckoGenome;
  onChange: (genome: GeckoGenome) => void;
}

function ParentPanel({ title, genome, onChange }: ParentPanelProps) {
  const phenotype = getFullPhenotype(genome);

  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-gradient-to-r from-[oklch(0.55_0.12_145)] to-[oklch(0.45_0.10_145)] text-white rounded-t-xl">
        <CardTitle className="flex items-center gap-2">
          <Dna className="w-5 h-5" />
          {title}
        </CardTitle>
        <CardDescription className="text-white/80">
          当前表型:{" "}
          <span className="font-semibold text-white">{phenotype.name}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Lilly White */}
        <GeneSelect<LillyAllele>
          label="Lilly White"
          labelCN="莉莉白"
          value={genome.lilly}
          onChange={(lilly) => onChange({ ...genome, lilly })}
          options={[
            { value: "N", label: "N (正常)" },
            { value: "LW", label: "LW (莉莉白)" },
          ]}
        />

        {/* Dark Complex */}
        <GeneSelect<DarkAllele>
          label="Dark Complex"
          labelCN="深色复合体"
          value={genome.dark}
          onChange={(dark) => onChange({ ...genome, dark })}
          options={[
            { value: "N", label: "N (正常)" },
            { value: "C", label: "C (卡布奇诺)" },
            { value: "S", label: "S (貂色)" },
          ]}
        />

        {/* Soft Scale */}
        <GeneSelect<SoftAllele>
          label="Soft Scale"
          labelCN="软鳞"
          value={genome.soft}
          onChange={(soft) => onChange({ ...genome, soft })}
          options={[
            { value: "N", label: "N (正常)" },
            { value: "SS", label: "SS (软鳞)" },
          ]}
        />

        {/* Axanthic */}
        <GeneSelect<RecessiveAllele>
          label="Axanthic"
          labelCN="缺黄"
          value={genome.axanthic}
          onChange={(axanthic) => onChange({ ...genome, axanthic })}
          options={[
            { value: "+", label: "+ (正常)" },
            { value: "het", label: "het (携带)" },
          ]}
        />

        {/* Phantom */}
        <GeneSelect<RecessiveAllele>
          label="Phantom"
          labelCN="幻影"
          value={genome.phantom}
          onChange={(phantom) => onChange({ ...genome, phantom })}
          options={[
            { value: "+", label: "+ (正常)" },
            { value: "het", label: "het (携带)" },
          ]}
        />
      </CardContent>
    </Card>
  );
}

// ============ 结果表格 ============

interface ResultsTableProps {
  results: OffspringResult[];
}

function ResultsTable({ results }: ResultsTableProps) {
  const lethalResults = results.filter((r) => r.phenotype.includes("致死"));
  const viableResults = results.filter((r) => !r.phenotype.includes("致死"));
  const lethalProb = lethalResults.reduce((sum, r) => sum + r.probability, 0);

  return (
    <div className="space-y-4">
      {lethalProb > 0 && (
        <Alert className="border-red-500 bg-red-50">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <AlertTitle className="text-red-700">注意: 存在致死组合</AlertTitle>
          <AlertDescription className="text-red-600">
            约 {formatProbability(lethalProb)} 的后代将为 Super Lilly
            White（致死）。 实际可育后代概率需按剩余{" "}
            {formatProbability(1 - lethalProb)} 重新计算。
          </AlertDescription>
        </Alert>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted">
              <th className="text-left py-3 px-4 font-semibold border-b">
                表型
              </th>
              <th className="text-right py-3 px-4 font-semibold border-b">
                概率
              </th>
              <th className="text-right py-3 px-4 font-semibold border-b">
                可育概率
              </th>
            </tr>
          </thead>
          <tbody>
            {viableResults.map((result, index) => {
              const adjustedProb =
                lethalProb > 0
                  ? result.probability / (1 - lethalProb)
                  : result.probability;

              return (
                <tr
                  key={index}
                  className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}
                >
                  <td className="py-3 px-4 border-b">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{result.phenotype}</span>
                      {result.phenotypeDetails.length > 1 && (
                        <Badge variant="outline" className="text-xs">
                          复合
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="text-right py-3 px-4 border-b font-mono">
                    {formatProbability(result.probability)}
                  </td>
                  <td className="text-right py-3 px-4 border-b font-mono text-green-600">
                    {formatProbability(adjustedProb)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {lethalResults.length > 0 && (
        <div className="text-sm text-muted-foreground mt-2">
          <span className="text-red-500">†</span> 致死组合 (
          {lethalResults.map((r) => r.phenotype).join(", ")}) 未计入可育概率
        </div>
      )}
    </div>
  );
}

// ============ Punnett Square 可视化 ============

interface PunnettSquareProps {
  parent1: GeckoGenome;
  parent2: GeckoGenome;
  locus: "lilly" | "dark" | "soft";
}

function PunnettSquare({ parent1, parent2, locus }: PunnettSquareProps) {
  const info = GENE_INFO[locus];

  const getGametes = (genome: GeckoGenome) => {
    const g = genome[locus];
    return [g.allele1, g.allele2] as string[];
  };

  const gametes1 = getGametes(parent1);
  const gametes2 = getGametes(parent2);

  // Generate 2x2 grid
  const grid: { genotype: string; alleles: [string, string] }[][] = [];
  for (let i = 0; i < 2; i++) {
    const row: { genotype: string; alleles: [string, string] }[] = [];
    for (let j = 0; j < 2; j++) {
      const sorted = [gametes1[j], gametes2[i]].sort();
      row.push({
        genotype: `${sorted[0]}/${sorted[1]}`,
        alleles: sorted as [string, string],
      });
    }
    grid.push(row);
  }

  const getCellColor = (alleles: [string, string]) => {
    if (locus === "lilly") {
      if (alleles[0] === "LW" && alleles[1] === "LW")
        return "bg-red-200 text-red-800";
      if (alleles.includes("LW")) return "bg-yellow-100 text-yellow-800";
    }
    if (locus === "dark") {
      if (alleles[0] === "C" && alleles[1] === "C")
        return "bg-amber-200 text-amber-800";
      if (alleles[0] === "S" && alleles[1] === "S")
        return "bg-gray-300 text-gray-800";
      if (alleles.includes("C") || alleles.includes("S"))
        return "bg-amber-100 text-amber-700";
    }
    if (locus === "soft") {
      if (alleles[0] === "SS" && alleles[1] === "SS")
        return "bg-purple-200 text-purple-800";
      if (alleles.includes("SS")) return "bg-purple-100 text-purple-700";
    }
    return "bg-gray-100 text-gray-600";
  };

  return (
    <div className="space-y-2">
      <h4 className="font-semibold text-sm">
        {info.nameCN} ({info.name})
      </h4>
      <div className="inline-block border rounded-lg overflow-hidden">
        <table className="border-collapse">
          <thead>
            <tr>
              <th className="w-16 h-10 bg-muted"></th>
              {gametes1.map((g, i) => (
                <th
                  key={i}
                  className="w-20 h-10 bg-muted font-mono text-sm border-l"
                >
                  {g}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row, i) => (
              <tr key={i}>
                <th className="w-16 h-16 bg-muted font-mono text-sm border-t">
                  {gametes2[i]}
                </th>
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className={`w-20 h-16 text-center font-mono text-sm border-l border-t ${getCellColor(cell.alleles)}`}
                  >
                    {cell.genotype}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============ 主页面 ============

export default function CalculatorPage() {
  const [parent1, setParent1] = useState<GeckoGenome>(createDefaultGenome());
  const [parent2, setParent2] = useState<GeckoGenome>(createDefaultGenome());

  const results = useMemo(() => {
    return calculateOffspring(parent1, parent2);
  }, [parent1, parent2]);

  const handleReset = () => {
    setParent1(createDefaultGenome());
    setParent2(createDefaultGenome());
  };

  // 预设配对
  const presets = [
    {
      name: "Lilly × Lilly",
      p1: {
        ...createDefaultGenome(),
        lilly: { allele1: "N" as LillyAllele, allele2: "LW" as LillyAllele },
      },
      p2: {
        ...createDefaultGenome(),
        lilly: { allele1: "N" as LillyAllele, allele2: "LW" as LillyAllele },
      },
    },
    {
      name: "Het Axanthic × Het Axanthic",
      p1: {
        ...createDefaultGenome(),
        axanthic: {
          allele1: "+" as RecessiveAllele,
          allele2: "het" as RecessiveAllele,
        },
      },
      p2: {
        ...createDefaultGenome(),
        axanthic: {
          allele1: "+" as RecessiveAllele,
          allele2: "het" as RecessiveAllele,
        },
      },
    },
    {
      name: "Lilly × Cappuccino (Frappuccino)",
      p1: {
        ...createDefaultGenome(),
        lilly: { allele1: "N" as LillyAllele, allele2: "LW" as LillyAllele },
      },
      p2: {
        ...createDefaultGenome(),
        dark: { allele1: "N" as DarkAllele, allele2: "C" as DarkAllele },
      },
    },
    {
      name: "Cappuccino × Sable",
      p1: {
        ...createDefaultGenome(),
        dark: { allele1: "N" as DarkAllele, allele2: "C" as DarkAllele },
      },
      p2: {
        ...createDefaultGenome(),
        dark: { allele1: "N" as DarkAllele, allele2: "S" as DarkAllele },
      },
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Hero */}
      <section className="relative py-16 md:py-24 overflow-hidden bg-gradient-to-r from-[oklch(0.55_0.20_300)] to-[oklch(0.45_0.15_280)]">
        <div className="container mx-auto text-center text-white z-10 relative">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
            <Calculator className="w-10 h-10" />
            基因计算器
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            计算睫角守宫配对的后代基因型和表型概率
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 flex-1">
        <div className="container mx-auto">
          {/* 预设按钮 */}
          <div className="mb-8 flex flex-wrap gap-2 justify-center">
            <span className="text-sm text-muted-foreground self-center mr-2">
              快速预设:
            </span>
            {presets.map((preset, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                onClick={() => {
                  setParent1(preset.p1);
                  setParent2(preset.p2);
                }}
              >
                {preset.name}
              </Button>
            ))}
            <Button variant="ghost" size="sm" onClick={handleReset}>
              重置
            </Button>
          </div>

          {/* 亲代选择 */}
          <div className="grid lg:grid-cols-2 gap-8 mb-12">
            <ParentPanel
              title="父本 (Male)"
              genome={parent1}
              onChange={setParent1}
            />
            <ParentPanel
              title="母本 (Female)"
              genome={parent2}
              onChange={setParent2}
            />
          </div>

          {/* 结果 */}
          <Card className="shadow-xl mb-12">
            <CardHeader className="bg-gradient-to-r from-[oklch(0.65_0.15_65)] to-[oklch(0.55_0.12_50)] text-white rounded-t-xl">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Sparkles className="w-6 h-6" />
                后代预测结果
              </CardTitle>
              <CardDescription className="text-white/80">
                共 {results.length} 种可能的表型组合
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Tabs defaultValue="table">
                <TabsList className="mb-6">
                  <TabsTrigger value="table">概率表</TabsTrigger>
                  <TabsTrigger value="punnett">遗传图</TabsTrigger>
                </TabsList>

                <TabsContent value="table">
                  <ResultsTable results={results} />
                </TabsContent>

                <TabsContent value="punnett">
                  <div className="grid md:grid-cols-3 gap-8">
                    <PunnettSquare
                      parent1={parent1}
                      parent2={parent2}
                      locus="lilly"
                    />
                    <PunnettSquare
                      parent1={parent1}
                      parent2={parent2}
                      locus="dark"
                    />
                    <PunnettSquare
                      parent1={parent1}
                      parent2={parent2}
                      locus="soft"
                    />
                  </div>
                  <Alert className="mt-6">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      隐性基因 (Axanthic, Phantom)
                      的潘尼特方格遵循标准隐性遗传规律。 Het × Het = 25%
                      纯合表现, 50% Het, 25% 正常。
                    </AlertDescription>
                  </Alert>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* 基因说明 */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Dna className="w-5 h-5" />
                基因说明
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(GENE_INFO).map(([key, info]) => (
                  <div key={key} className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold">{info.nameCN}</h4>
                    <p className="text-sm text-muted-foreground">{info.name}</p>
                    <Badge variant="outline" className="mt-2 text-xs">
                      {info.type === "recessive"
                        ? "隐性"
                        : info.type === "allelicComplex"
                          ? "等位复合体"
                          : "不完全显性"}
                    </Badge>
                    {"superNote" in info && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {info.superNote}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-8 bg-[oklch(0.25_0.02_145)]">
        <div className="container mx-auto text-center">
          <div className="flex justify-center gap-4 flex-wrap">
            <Link href="/gecko-diet">
              <Button
                variant="outline"
                className="text-white border-white/50 hover:bg-white/10"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                饮食指南
              </Button>
            </Link>
            <Link href="/gecko-diet/breeding">
              <Button
                variant="outline"
                className="text-white border-white/50 hover:bg-white/10"
              >
                选育指南
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
