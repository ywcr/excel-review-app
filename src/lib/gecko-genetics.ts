/**
 * 睫角守宫基因计算器 - 核心遗传逻辑
 *
 * 支持的基因座位 (Loci):
 * 1. Lilly Locus: Normal (N) / Lilly White (LW)
 * 2. Dark Locus: Normal (N) / Cappuccino (C) / Sable (S)
 * 3. Soft Locus: Normal (N) / Soft Scale (SS)
 * 4. Axanthic Locus: Normal (+) / Axanthic (ax) - Recessive
 * 5. Phantom Locus: Normal (+) / Phantom (ph) - Recessive
 */

// ============ 类型定义 ============

/** 基因座位类型 */
export type LocusType = "lilly" | "dark" | "soft" | "axanthic" | "phantom";

/** Lilly 等位基因 */
export type LillyAllele = "N" | "LW";

/** Dark 等位基因 (Cappuccino/Sable 复合体) */
export type DarkAllele = "N" | "C" | "S";

/** Soft Scale 等位基因 */
export type SoftAllele = "N" | "SS";

/** 隐性基因等位基因 */
export type RecessiveAllele = "+" | "het";

/** 基因型 (一对等位基因) */
export interface Genotype<T> {
  allele1: T;
  allele2: T;
}

/** 完整的个体基因组 */
export interface GeckoGenome {
  lilly: Genotype<LillyAllele>;
  dark: Genotype<DarkAllele>;
  soft: Genotype<SoftAllele>;
  axanthic: Genotype<RecessiveAllele>;
  phantom: Genotype<RecessiveAllele>;
}

/** 后代结果 */
export interface OffspringResult {
  genome: GeckoGenome;
  probability: number;
  phenotype: string;
  phenotypeDetails: string[];
}

/** Punnett Square 单元格 */
export interface PunnettCell {
  gamete1: string;
  gamete2: string;
  genotype: string;
  phenotype: string;
  probability: number;
}

// ============ 基因信息 ============

export const GENE_INFO = {
  lilly: {
    name: "Lilly White",
    nameCN: "莉莉白",
    type: "incompleteDominant" as const,
    alleles: {
      N: { name: "Normal", nameCN: "正常" },
      LW: { name: "Lilly White", nameCN: "莉莉白" },
    },
    superLethal: true,
    superNote: "Super Lilly White 致死",
  },
  dark: {
    name: "Dark Complex",
    nameCN: "深色复合体",
    type: "allelicComplex" as const,
    alleles: {
      N: { name: "Normal", nameCN: "正常" },
      C: { name: "Cappuccino", nameCN: "卡布奇诺" },
      S: { name: "Sable", nameCN: "貂色" },
    },
    superNote: "Super Cappuccino = 黑化型, Super Sable = 超级貂色",
  },
  soft: {
    name: "Soft Scale",
    nameCN: "软鳞",
    type: "incompleteDominant" as const,
    alleles: {
      N: { name: "Normal", nameCN: "正常" },
      SS: { name: "Soft Scale", nameCN: "软鳞" },
    },
  },
  axanthic: {
    name: "Axanthic",
    nameCN: "缺黄",
    type: "recessive" as const,
    alleles: {
      "+": { name: "Normal", nameCN: "正常" },
      het: { name: "Axanthic", nameCN: "缺黄" },
    },
  },
  phantom: {
    name: "Phantom",
    nameCN: "幻影",
    type: "recessive" as const,
    alleles: {
      "+": { name: "Normal", nameCN: "正常" },
      het: { name: "Phantom", nameCN: "幻影" },
    },
  },
} as const;

// ============ 计算函数 ============

/**
 * 计算单个基因座位的配子组合
 */
function getGametes<T>(genotype: Genotype<T>): T[] {
  return [genotype.allele1, genotype.allele2];
}

/**
 * 计算单个基因座位的后代基因型
 */
function calculateLocusOffspring<T>(
  parent1: Genotype<T>,
  parent2: Genotype<T>,
): { genotype: Genotype<T>; probability: number }[] {
  const gametes1 = getGametes(parent1);
  const gametes2 = getGametes(parent2);

  const outcomes: Map<string, { genotype: Genotype<T>; count: number }> =
    new Map();

  for (const g1 of gametes1) {
    for (const g2 of gametes2) {
      // 标准化顺序以便合并相同基因型
      const sorted = [g1, g2].sort() as [T, T];
      const key = `${sorted[0]}-${sorted[1]}`;

      if (outcomes.has(key)) {
        outcomes.get(key)!.count++;
      } else {
        outcomes.set(key, {
          genotype: { allele1: sorted[0], allele2: sorted[1] },
          count: 1,
        });
      }
    }
  }

  return Array.from(outcomes.values()).map(({ genotype, count }) => ({
    genotype,
    probability: count / 4,
  }));
}

/**
 * 获取 Lilly 表型
 */
function getLillyPhenotype(genotype: Genotype<LillyAllele>): {
  name: string;
  isLethal: boolean;
} {
  const { allele1, allele2 } = genotype;
  if (allele1 === "LW" && allele2 === "LW") {
    return { name: "Super Lilly (致死)", isLethal: true };
  }
  if (allele1 === "LW" || allele2 === "LW") {
    return { name: "Lilly White", isLethal: false };
  }
  return { name: "正常", isLethal: false };
}

/**
 * 获取 Dark Complex 表型
 */
function getDarkPhenotype(genotype: Genotype<DarkAllele>): string {
  const { allele1, allele2 } = genotype;

  // Super forms
  if (allele1 === "C" && allele2 === "C") return "Super Cappuccino (黑化)";
  if (allele1 === "S" && allele2 === "S") return "Super Sable";

  // Compound heterozygote
  if (
    (allele1 === "C" && allele2 === "S") ||
    (allele1 === "S" && allele2 === "C")
  ) {
    return "Cappuccino-Sable";
  }

  // Heterozygotes
  if (allele1 === "C" || allele2 === "C") return "Cappuccino";
  if (allele1 === "S" || allele2 === "S") return "Sable";

  return "正常";
}

/**
 * 获取 Soft Scale 表型
 */
function getSoftPhenotype(genotype: Genotype<SoftAllele>): string {
  const { allele1, allele2 } = genotype;
  if (allele1 === "SS" && allele2 === "SS") return "Super Soft Scale";
  if (allele1 === "SS" || allele2 === "SS") return "Soft Scale";
  return "正常";
}

/**
 * 获取隐性基因表型
 */
function getRecessivePhenotype(
  genotype: Genotype<RecessiveAllele>,
  geneName: string,
): string {
  const { allele1, allele2 } = genotype;
  if (allele1 === "het" && allele2 === "het") return geneName;
  if (allele1 === "het" || allele2 === "het") return `Het ${geneName}`;
  return "正常";
}

/**
 * 获取完整表型描述
 */
export function getFullPhenotype(genome: GeckoGenome): {
  name: string;
  details: string[];
  isLethal: boolean;
} {
  const details: string[] = [];
  let isLethal = false;

  // Lilly
  const lilly = getLillyPhenotype(genome.lilly);
  if (lilly.isLethal) isLethal = true;
  if (lilly.name !== "正常") details.push(lilly.name);

  // Dark
  const dark = getDarkPhenotype(genome.dark);
  if (dark !== "正常") details.push(dark);

  // Soft
  const soft = getSoftPhenotype(genome.soft);
  if (soft !== "正常") details.push(soft);

  // Axanthic
  const axanthic = getRecessivePhenotype(genome.axanthic, "Axanthic");
  if (axanthic !== "正常") details.push(axanthic);

  // Phantom
  const phantom = getRecessivePhenotype(genome.phantom, "Phantom");
  if (phantom !== "正常") details.push(phantom);

  // Special combos
  const hasLilly =
    genome.lilly.allele1 === "LW" || genome.lilly.allele2 === "LW";
  const hasCapp = genome.dark.allele1 === "C" || genome.dark.allele2 === "C";
  const hasSoft = genome.soft.allele1 === "SS" || genome.soft.allele2 === "SS";

  let name = details.length > 0 ? details.join(" + ") : "Normal";

  // Frappuccino = Lilly + Cappuccino
  if (hasLilly && hasCapp && !isLethal) {
    name = "Frappuccino" + (details.length > 2 ? " +" : "");
  }

  // Moon Water = Lilly + Soft Scale (common combo name)
  if (hasLilly && hasSoft && !hasCapp && !isLethal) {
    name = "Moon Water";
  }

  return { name, details, isLethal };
}

/**
 * 主计算函数：计算两只守宫配对的所有可能后代
 */
export function calculateOffspring(
  parent1: GeckoGenome,
  parent2: GeckoGenome,
): OffspringResult[] {
  // 计算每个基因座位的后代
  const lillyOffspring = calculateLocusOffspring(parent1.lilly, parent2.lilly);
  const darkOffspring = calculateLocusOffspring(parent1.dark, parent2.dark);
  const softOffspring = calculateLocusOffspring(parent1.soft, parent2.soft);
  const axanthicOffspring = calculateLocusOffspring(
    parent1.axanthic,
    parent2.axanthic,
  );
  const phantomOffspring = calculateLocusOffspring(
    parent1.phantom,
    parent2.phantom,
  );

  // 组合所有可能
  const results: OffspringResult[] = [];

  for (const lilly of lillyOffspring) {
    for (const dark of darkOffspring) {
      for (const soft of softOffspring) {
        for (const axanthic of axanthicOffspring) {
          for (const phantom of phantomOffspring) {
            const genome: GeckoGenome = {
              lilly: lilly.genotype,
              dark: dark.genotype,
              soft: soft.genotype,
              axanthic: axanthic.genotype,
              phantom: phantom.genotype,
            };

            const probability =
              lilly.probability *
              dark.probability *
              soft.probability *
              axanthic.probability *
              phantom.probability;

            const { name, details } = getFullPhenotype(genome);

            results.push({
              genome,
              probability,
              phenotype: name,
              phenotypeDetails: details,
            });
          }
        }
      }
    }
  }

  // 合并相同表型
  const merged = new Map<string, OffspringResult>();
  for (const result of results) {
    const key = result.phenotype;
    if (merged.has(key)) {
      merged.get(key)!.probability += result.probability;
    } else {
      merged.set(key, { ...result });
    }
  }

  return Array.from(merged.values()).sort(
    (a, b) => b.probability - a.probability,
  );
}

/**
 * 创建默认基因组 (全部正常)
 */
export function createDefaultGenome(): GeckoGenome {
  return {
    lilly: { allele1: "N", allele2: "N" },
    dark: { allele1: "N", allele2: "N" },
    soft: { allele1: "N", allele2: "N" },
    axanthic: { allele1: "+", allele2: "+" },
    phantom: { allele1: "+", allele2: "+" },
  };
}

/**
 * 生成 Punnett Square 数据（单基因座位）
 */
export function generatePunnettSquare<T>(
  parent1: Genotype<T>,
  parent2: Genotype<T>,
  getPhenotype: (g: Genotype<T>) => string,
): PunnettCell[][] {
  const gametes1 = getGametes(parent1);
  const gametes2 = getGametes(parent2);

  const grid: PunnettCell[][] = [];

  for (let i = 0; i < gametes2.length; i++) {
    const row: PunnettCell[] = [];
    for (let j = 0; j < gametes1.length; j++) {
      const sorted = [gametes1[j], gametes2[i]].sort() as [T, T];
      const genotype: Genotype<T> = { allele1: sorted[0], allele2: sorted[1] };

      row.push({
        gamete1: String(gametes1[j]),
        gamete2: String(gametes2[i]),
        genotype: `${sorted[0]}/${sorted[1]}`,
        phenotype: getPhenotype(genotype),
        probability: 0.25,
      });
    }
    grid.push(row);
  }

  return grid;
}

/**
 * 格式化概率为百分比
 */
export function formatProbability(prob: number): string {
  return `${(prob * 100).toFixed(1)}%`;
}

/**
 * 格式化基因型显示
 */
export function formatGenotype(genome: GeckoGenome): string {
  const parts: string[] = [];

  // Lilly
  if (genome.lilly.allele1 !== "N" || genome.lilly.allele2 !== "N") {
    parts.push(`Lilly: ${genome.lilly.allele1}/${genome.lilly.allele2}`);
  }

  // Dark
  if (genome.dark.allele1 !== "N" || genome.dark.allele2 !== "N") {
    parts.push(`Dark: ${genome.dark.allele1}/${genome.dark.allele2}`);
  }

  // Soft
  if (genome.soft.allele1 !== "N" || genome.soft.allele2 !== "N") {
    parts.push(`Soft: ${genome.soft.allele1}/${genome.soft.allele2}`);
  }

  // Axanthic
  if (genome.axanthic.allele1 !== "+" || genome.axanthic.allele2 !== "+") {
    parts.push(`Ax: ${genome.axanthic.allele1}/${genome.axanthic.allele2}`);
  }

  // Phantom
  if (genome.phantom.allele1 !== "+" || genome.phantom.allele2 !== "+") {
    parts.push(`Ph: ${genome.phantom.allele1}/${genome.phantom.allele2}`);
  }

  return parts.length > 0 ? parts.join(", ") : "Normal";
}
