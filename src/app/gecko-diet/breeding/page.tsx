"use client";

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
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/gecko-ui/alert";
import { Badge } from "@/components/gecko-ui/badge";
import { Button } from "@/components/gecko-ui/button";
import {
  Info,
  Dna,
  Palette,
  Layers,
  Heart,
  Star,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
  Utensils,
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";

export default function BreedingPage() {
  const [selectedGene, setSelectedGene] = useState<string>("lilly");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1585095595205-e68428a9e205?w=1920)",
            opacity: 0.85,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black/70" />

        <div className="relative container mx-auto text-center text-white z-10">
          <h1 className="text-5xl md:text-6xl font-bold mb-4">
            睫角守宫选育指南
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-white/90">
            从基础花色到稀有基因的完整培育手册
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Badge className="bg-[oklch(0.65_0.15_65)] text-white px-4 py-2 text-base">
              8种底色品系
            </Badge>
            <Badge className="bg-[oklch(0.35_0.08_145)] text-white px-4 py-2 text-base">
              9种纹路等级
            </Badge>
            <Badge className="bg-[oklch(0.55_0.20_300)] text-white px-4 py-2 text-base">
              6种已确认基因
            </Badge>
          </div>
        </div>
      </section>

      {/* Introduction */}
      <section className="py-16 bg-background">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <Alert className="mb-8 border-[oklch(0.35_0.08_145)]">
              <Info className="h-5 w-5" />
              <AlertTitle>选育目标</AlertTitle>
              <AlertDescription>
                本指南将帮助你了解睫角守宫的遗传规律，从基础的底色和纹路品系，到已确认的遗传基因，再到实际的配对策略。无论你是新手还是有经验的繁殖者，都能找到有价值的信息。
              </AlertDescription>
            </Alert>

            <div className="grid md:grid-cols-4 gap-6">
              <Card className="shadow-lg border-t-4 border-t-[oklch(0.65_0.15_65)]">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Palette className="w-5 h-5" />
                    底色品系
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    8种基础底色，从常见到稀有
                  </p>
                </CardContent>
              </Card>
              <Card className="shadow-lg border-t-4 border-t-[oklch(0.35_0.08_145)]">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Layers className="w-5 h-5" />
                    纹路等级
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    从无纹到超级小丑的9个等级
                  </p>
                </CardContent>
              </Card>
              <Card className="shadow-lg border-t-4 border-t-[oklch(0.55_0.20_300)]">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Dna className="w-5 h-5" />
                    遗传基因
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    6种已确认的可遗传基因
                  </p>
                </CardContent>
              </Card>
              <Card className="shadow-lg border-t-4 border-t-[oklch(0.65_0.15_160)]">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Heart className="w-5 h-5" />
                    配对策略
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    科学的选育配对方法
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Genetics Basics */}
      <section className="py-16 bg-[oklch(0.95_0.01_70)]">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 flex items-center justify-center gap-3">
              <Dna className="w-10 h-10 text-[oklch(0.55_0.20_300)]" />
              基础遗传学概念
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              了解遗传类型是选育的基础
            </p>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <Card className="shadow-lg">
                <CardHeader className="bg-[oklch(0.65_0.15_65)] text-white rounded-t-lg">
                  <CardTitle>显性遗传 Dominant</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <p className="mb-4">只需一个等位基因即可表现该性状</p>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="font-semibold mb-2">代表性状：</p>
                    <ul className="list-disc list-inside text-muted-foreground">
                      <li>麦町斑点 (Dalmatian Spots)</li>
                      <li>斑点越多的个体通常会产生斑点后代</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader className="bg-[oklch(0.55_0.20_300)] text-white rounded-t-lg">
                  <CardTitle>共显性/等显性 Co-dominant</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <p className="mb-4">杂合子表现中间型，纯合子为超级体</p>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="font-semibold mb-2">代表基因：</p>
                    <ul className="list-disc list-inside text-muted-foreground">
                      <li>莉莉白 (Lilly White)</li>
                      <li>卡布奇诺 (Cappuccino)</li>
                      <li>紫貂 (Sable)</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader className="bg-[oklch(0.35_0.08_145)] text-white rounded-t-lg">
                  <CardTitle>隐性遗传 Recessive</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <p className="mb-4">需两个相同等位基因才能表现该性状</p>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="font-semibold mb-2">代表基因：</p>
                    <ul className="list-disc list-inside text-muted-foreground">
                      <li>缺黄 (Axanthic)</li>
                      <li>巧克力 (Chocho)</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader className="bg-[oklch(0.65_0.15_160)] text-white rounded-t-lg">
                  <CardTitle>多基因遗传 Polygenic</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <p className="mb-4">多个基因共同影响，可通过选育增强</p>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="font-semibold mb-2">代表性状：</p>
                    <ul className="list-disc list-inside text-muted-foreground">
                      <li>底色深浅和饱和度</li>
                      <li>纹路覆盖度</li>
                      <li>奶油特征强度</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-lg border-2 border-[oklch(0.65_0.15_65)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-6 h-6" />
                  显色状态 Fire-up / Fire-down
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="p-4 bg-[oklch(0.65_0.15_65)]/10 rounded-lg">
                    <h4 className="font-bold text-lg mb-2">Fired Up（显色）</h4>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• 高湿度环境下触发</li>
                      <li>• 颜色最鲜艳、最饱和</li>
                      <li>• 鉴定底色的标准状态</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-bold text-lg mb-2">
                      Fired Down（未显色）
                    </h4>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• 干燥环境下的状态</li>
                      <li>• 颜色较暗淡、灰暗</li>
                      <li>• 不作为品质评判标准</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Base Colors */}
      <section className="py-16 bg-background">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 flex items-center justify-center gap-3">
              <Palette className="w-10 h-10 text-[oklch(0.65_0.15_65)]" />
              底色品系图鉴
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              底色是睫角守宫最基础的表现，以显色状态为鉴定标准
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 鹿皮色 */}
              <Card className="shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="pb-2">
                  <div
                    className="w-full h-24 rounded-lg mb-2"
                    style={{
                      background: "linear-gradient(135deg, #8B7355, #6B5344)",
                    }}
                  />
                  <CardTitle className="text-lg">鹿皮色/橄榄色</CardTitle>
                  <CardDescription>Buckskin / Olive</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">稀有度：</span>
                    <span className="text-yellow-500">★☆☆☆☆</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    野生原始底色，军绿色表现，通常为无纹
                  </p>
                </CardContent>
              </Card>

              {/* 黑色 */}
              <Card className="shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="pb-2">
                  <div
                    className="w-full h-24 rounded-lg mb-2"
                    style={{
                      background: "linear-gradient(135deg, #2D2D2D, #1A1A1A)",
                    }}
                  />
                  <CardTitle className="text-lg">黑色/巧克力色</CardTitle>
                  <CardDescription>Black / Coffee</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">稀有度：</span>
                    <span className="text-yellow-500">★★☆☆☆</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    最常见底色，可与多种纹路和花纹共显
                  </p>
                </CardContent>
              </Card>

              {/* 月光 */}
              <Card className="shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="pb-2">
                  <div
                    className="w-full h-24 rounded-lg mb-2"
                    style={{
                      background: "linear-gradient(135deg, #E8E8E8, #C0C0C0)",
                    }}
                  />
                  <CardTitle className="text-lg">月光</CardTitle>
                  <CardDescription>Moon Glow</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">稀有度：</span>
                    <span className="text-yellow-500">★★★☆☆</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    接近白色的底色，常见于麦町品系
                  </p>
                </CardContent>
              </Card>

              {/* 黄色 */}
              <Card className="shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="pb-2">
                  <div
                    className="w-full h-24 rounded-lg mb-2"
                    style={{
                      background: "linear-gradient(135deg, #F5D76E, #E9B824)",
                    }}
                  />
                  <CardTitle className="text-lg">黄色/奶油色</CardTitle>
                  <CardDescription>Yellow / Cream</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">稀有度：</span>
                    <span className="text-yellow-500">★★★☆☆</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    奶油黄色，较少见，常伴随幻影品系
                  </p>
                </CardContent>
              </Card>

              {/* 橙色 */}
              <Card className="shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="pb-2">
                  <div
                    className="w-full h-24 rounded-lg mb-2"
                    style={{
                      background: "linear-gradient(135deg, #FF8C00, #E67300)",
                    }}
                  />
                  <CardTitle className="text-lg">橙色/橘色</CardTitle>
                  <CardDescription>Orange</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">稀有度：</span>
                    <span className="text-yellow-500">★★★☆☆</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    橘红色表现，较难与纹路颜色共显
                  </p>
                </CardContent>
              </Card>

              {/* 红色 */}
              <Card className="shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="pb-2">
                  <div
                    className="w-full h-24 rounded-lg mb-2"
                    style={{
                      background: "linear-gradient(135deg, #C41E3A, #8B0000)",
                    }}
                  />
                  <CardTitle className="text-lg">红色</CardTitle>
                  <CardDescription>Red</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">稀有度：</span>
                    <span className="text-yellow-500">★★★★☆</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    最受欢迎的底色，跨度最大（浅红到砖红）
                  </p>
                </CardContent>
              </Card>

              {/* 铁锈色 */}
              <Card className="shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="pb-2">
                  <div
                    className="w-full h-24 rounded-lg mb-2"
                    style={{
                      background: "linear-gradient(135deg, #8B4513, #5C3317)",
                    }}
                  />
                  <CardTitle className="text-lg">铁锈色</CardTitle>
                  <CardDescription>Rust</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">稀有度：</span>
                    <span className="text-yellow-500">★★★☆☆</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    红与黑的过渡色，发色时颜色较深
                  </p>
                </CardContent>
              </Card>

              {/* 薰衣草 */}
              <Card className="shadow-lg hover:shadow-xl transition-shadow border-2 border-[oklch(0.55_0.20_300)]">
                <CardHeader className="pb-2">
                  <div
                    className="w-full h-24 rounded-lg mb-2"
                    style={{
                      background: "linear-gradient(135deg, #B57EDC, #9370DB)",
                    }}
                  />
                  <CardTitle className="text-lg flex items-center gap-2">
                    薰衣草
                    <Badge className="bg-[oklch(0.55_0.20_300)]">稀有</Badge>
                  </CardTitle>
                  <CardDescription>Lavender</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">稀有度：</span>
                    <span className="text-yellow-500">★★★★★</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    淡紫色底色，通常与莉莉白基因共同出现
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Pattern Grades */}
      <section className="py-16 bg-[oklch(0.95_0.01_70)]">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 flex items-center justify-center gap-3">
              <Layers className="w-10 h-10 text-[oklch(0.35_0.08_145)]" />
              纹路品系等级
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              从无纹到超级小丑，纹路覆盖度决定品质等级
            </p>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="space-y-4">
              {/* 无纹 */}
              <Card className="shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-6">
                    <div
                      className="w-32 h-20 rounded-lg flex-shrink-0 flex items-center justify-center text-white font-bold"
                      style={{
                        background: "linear-gradient(135deg, #C41E3A, #8B0000)",
                      }}
                    >
                      0-5%
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-xl font-bold mb-1">
                        无纹/纯色 Patternless
                      </h3>
                      <p className="text-muted-foreground">
                        全身基本只有单独一种颜色，斑点和斑纹越少品质越高。常见于红色、黑色、橙色等。
                      </p>
                    </div>
                    <Badge className="bg-muted text-foreground">基础</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* 双色 */}
              <Card className="shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-6">
                    <div
                      className="w-32 h-20 rounded-lg flex-shrink-0 flex items-center justify-center text-white font-bold"
                      style={{
                        background:
                          "linear-gradient(180deg, #8B0000 50%, #C41E3A 50%)",
                      }}
                    >
                      5-15%
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-xl font-bold mb-1">双色 Bicolor</h3>
                      <p className="text-muted-foreground">
                        全身由两种同色系不同色度的颜色组成，通常背部颜色深于体侧。
                      </p>
                    </div>
                    <Badge className="bg-muted text-foreground">基础</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* 幻影 */}
              <Card className="shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-6">
                    <div
                      className="w-32 h-20 rounded-lg flex-shrink-0 flex items-center justify-center text-white font-bold relative overflow-hidden"
                      style={{ background: "#C41E3A" }}
                    >
                      <div className="absolute w-1 h-full bg-black/50 left-1/2 transform -translate-x-1/2"></div>
                      15-25%
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-xl font-bold mb-1">幻影 Phantom</h3>
                      <p className="text-muted-foreground">
                        自眼睛末端起有一条深色直线延伸至尾根，体侧呈现破碎状花纹。
                      </p>
                    </div>
                    <Badge className="bg-[oklch(0.65_0.15_65)]">中级</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* 虎纹 */}
              <Card className="shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-6">
                    <div
                      className="w-32 h-20 rounded-lg flex-shrink-0 flex items-center justify-center text-white font-bold"
                      style={{
                        background:
                          "repeating-linear-gradient(90deg, #F5D76E, #F5D76E 8px, #2D2D2D 8px, #2D2D2D 16px)",
                      }}
                    >
                      25-40%
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-xl font-bold mb-1">虎纹 Tiger</h3>
                      <p className="text-muted-foreground">
                        明显的深条状纹路自背部向下延伸至体侧，形成犹如老虎般的纹路。
                      </p>
                    </div>
                    <Badge className="bg-[oklch(0.65_0.15_65)]">中级</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* 火焰 */}
              <Card className="shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-6">
                    <div
                      className="w-32 h-20 rounded-lg flex-shrink-0 flex items-center justify-center text-white font-bold"
                      style={{
                        background:
                          "linear-gradient(180deg, #F5D76E 0%, #F5D76E 30%, #2D2D2D 30%)",
                      }}
                    >
                      30-50%
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-xl font-bold mb-1">火焰 Flame</h3>
                      <p className="text-muted-foreground">
                        花纹自头部延伸至背部，部分体侧会带有少量花纹。
                      </p>
                    </div>
                    <Badge className="bg-[oklch(0.65_0.15_65)]">中级</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* 小丑 */}
              <Card className="shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-6">
                    <div
                      className="w-32 h-20 rounded-lg flex-shrink-0 flex items-center justify-center text-white font-bold"
                      style={{
                        background:
                          "linear-gradient(180deg, #F5D76E 0%, #F5D76E 40%, #2D2D2D 40%, #2D2D2D 60%, #F5D76E 60%)",
                      }}
                    >
                      50-65%
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-xl font-bold mb-1">小丑 Harlequin</h3>
                      <p className="text-muted-foreground">
                        火焰的进阶版，更多的体侧花纹，四肢也有花纹表现。
                      </p>
                    </div>
                    <Badge className="bg-[oklch(0.55_0.20_300)]">高级</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* 极端小丑 */}
              <Card className="shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-6">
                    <div
                      className="w-32 h-20 rounded-lg flex-shrink-0 flex items-center justify-center text-white font-bold"
                      style={{
                        background:
                          "linear-gradient(180deg, #F5D76E 0%, #F5D76E 50%, #2D2D2D 50%, #2D2D2D 70%, #F5D76E 70%)",
                      }}
                    >
                      65-80%
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-xl font-bold mb-1">
                        极端小丑 Extreme Harlequin
                      </h3>
                      <p className="text-muted-foreground">
                        小丑的升级版，侧面花纹延伸至背部下方，四肢花纹覆盖面积更大。
                      </p>
                    </div>
                    <Badge className="bg-[oklch(0.55_0.20_300)]">高级</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* 超级小丑 */}
              <Card className="shadow-lg border-2 border-[oklch(0.65_0.15_65)]">
                <CardContent className="p-6">
                  <div className="flex items-center gap-6">
                    <div
                      className="w-32 h-20 rounded-lg flex-shrink-0 flex items-center justify-center text-black font-bold"
                      style={{ background: "#F5D76E" }}
                    >
                      80-100%
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
                        超级小丑 Super Harlequin / Baseless
                        <Star className="w-5 h-5 text-[oklch(0.65_0.15_65)]" />
                      </h3>
                      <p className="text-muted-foreground">
                        小丑的究极版本，侧面花纹基本延伸至背部，四肢花纹覆盖基本看不到底色。脖子处纹路覆盖率需达到80%以上。
                      </p>
                    </div>
                    <Badge className="bg-[oklch(0.65_0.15_65)]">顶级</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Confirmed Genes */}
      <section className="py-16 bg-background">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 flex items-center justify-center gap-3">
              <Dna className="w-10 h-10 text-[oklch(0.55_0.20_300)]" />
              已确认的遗传基因
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              这些基因已被证实可以稳定遗传，是选育的重要工具
            </p>
          </div>

          <Tabs defaultValue="lilly" className="max-w-5xl mx-auto">
            <TabsList className="grid grid-cols-3 md:grid-cols-6 gap-2 h-auto mb-8">
              <TabsTrigger value="lilly" className="py-3">
                莉莉白
              </TabsTrigger>
              <TabsTrigger value="cappuccino" className="py-3">
                卡布奇诺
              </TabsTrigger>
              <TabsTrigger value="sable" className="py-3">
                紫貂
              </TabsTrigger>
              <TabsTrigger value="hypo" className="py-3">
                基因淡黑
              </TabsTrigger>
              <TabsTrigger value="axanthic" className="py-3">
                缺黄
              </TabsTrigger>
              <TabsTrigger value="chocho" className="py-3">
                巧克力
              </TabsTrigger>
            </TabsList>

            <TabsContent value="lilly">
              <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-[oklch(0.95_0.05_90)] to-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl">
                        莉莉白 Lilly White
                      </CardTitle>
                      <CardDescription className="text-lg">
                        共显性基因 | 2010年发现
                      </CardDescription>
                    </div>
                    <Badge className="bg-[oklch(0.55_0.20_300)] text-lg px-4 py-2">
                      共显性
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
                        <Info className="w-5 h-5" />
                        基因特征
                      </h4>
                      <ul className="space-y-2 text-muted-foreground">
                        <li>• 发现者：英国 Lilly Exotics（2010年）</li>
                        <li>• 表现：奶油色加厚加深，蜡质感</li>
                        <li>• 遗传：共显性，超级体致死</li>
                        <li>• 世界上第一条真正可遗传的睫角守宫基因</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
                        <Target className="w-5 h-5" />
                        配对建议
                      </h4>
                      <div className="space-y-3">
                        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                          <p className="flex items-center gap-2 text-green-700">
                            <CheckCircle className="w-4 h-4" />
                            <span className="font-semibold">推荐：</span>
                          </p>
                          <p className="text-sm mt-1">
                            莉莉白 × 非莉莉白 = 50%莉莉白后代
                          </p>
                        </div>
                        <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                          <p className="flex items-center gap-2 text-red-700">
                            <XCircle className="w-4 h-4" />
                            <span className="font-semibold">避免：</span>
                          </p>
                          <p className="text-sm mt-1">
                            莉莉白 × 莉莉白（25%超级体会死亡）
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="cappuccino">
              <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-[oklch(0.85_0.08_60)] to-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl">
                        卡布奇诺 Cappuccino / High Way
                      </CardTitle>
                      <CardDescription className="text-lg">
                        等显性基因 | 2020年发现
                      </CardDescription>
                    </div>
                    <Badge className="bg-[oklch(0.55_0.20_300)] text-lg px-4 py-2">
                      等显性
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
                        <Info className="w-5 h-5" />
                        基因特征
                      </h4>
                      <ul className="space-y-2 text-muted-foreground">
                        <li>• 发现者：韩国 Reptile City Korea（2020年）</li>
                        <li>• 表现：尾巴有黑色素沉淀</li>
                        <li>• 血线：韩系卡布 vs 美系High Way</li>
                        <li>• 衍生：法布奇诺 = 卡布奇诺 + 莉莉白</li>
                      </ul>
                    </div>
                    <div>
                      <Alert className="border-red-300 bg-red-50">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <AlertTitle className="text-red-700">
                          健康警告
                        </AlertTitle>
                        <AlertDescription className="text-red-600">
                          超级卡布奇诺有严重健康问题：鼻孔小、呼吸不畅、脊柱畸形、体质瘦弱。不建议培育超级体。
                        </AlertDescription>
                      </Alert>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sable">
              <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-[oklch(0.75_0.05_50)] to-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl">紫貂 Sable</CardTitle>
                      <CardDescription className="text-lg">
                        等显性基因 | 韩国发现
                      </CardDescription>
                    </div>
                    <Badge className="bg-[oklch(0.55_0.20_300)] text-lg px-4 py-2">
                      等显性
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
                        <Info className="w-5 h-5" />
                        基因特征
                      </h4>
                      <ul className="space-y-2 text-muted-foreground">
                        <li>• 发现者：韩国 @moonoo_saurus</li>
                        <li>• 表现：大面积奶油覆盖睫毛和背部</li>
                        <li>• 底色：灰黑色，焦糖色纹路</li>
                        <li>• 特点：对比度很高</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-bold text-lg mb-3">超级体表现</h4>
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-muted-foreground">
                          全身为灰黑色，睫毛和软刺有退化痕迹
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="hypo">
              <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-[oklch(0.90_0.02_300)] to-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl">
                        基因淡黑 Genetic Hypo / 幽灵 Ghost
                      </CardTitle>
                      <CardDescription className="text-lg">
                        等显性基因 | 美国发现
                      </CardDescription>
                    </div>
                    <Badge className="bg-[oklch(0.55_0.20_300)] text-lg px-4 py-2">
                      等显性
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
                        <Info className="w-5 h-5" />
                        基因特征
                      </h4>
                      <ul className="space-y-2 text-muted-foreground">
                        <li>• 发现者：美国 Brian J Burnett</li>
                        <li>• 表现：躯干有淡淡透明果冻感</li>
                        <li>• 血线：美系 vs 韩系（@crepax_fox）</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-bold text-lg mb-3">超级体 (Pinky)</h4>
                      <div className="p-4 bg-pink-50 rounded-lg border border-pink-200">
                        <ul className="space-y-1 text-muted-foreground">
                          <li>• 粉白色透明露西表现</li>
                          <li>• 背部和头部有淡淡未褪尽的花纹</li>
                          <li>• 瞳孔在光线下呈现红色</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="axanthic">
              <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-[oklch(0.70_0.00_0)] to-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl">缺黄 Axanthic</CardTitle>
                      <CardDescription className="text-lg">
                        隐性基因 | 最早发现的隐性基因
                      </CardDescription>
                    </div>
                    <Badge className="bg-[oklch(0.35_0.08_145)] text-lg px-4 py-2">
                      隐性
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
                        <Info className="w-5 h-5" />
                        基因特征
                      </h4>
                      <ul className="space-y-2 text-muted-foreground">
                        <li>• 消除所有黄色素和红色素</li>
                        <li>• 未显色：磨砂感灰色</li>
                        <li>• 显色：纯正黑色</li>
                        <li>• 会消除纹路表现</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-bold text-lg mb-3">血线对比</h4>
                      <div className="space-y-2">
                        <div className="p-3 bg-gray-100 rounded-lg">
                          <p className="font-semibold">
                            灰色星尘 (Altitude Exotics)
                          </p>
                          <p className="text-sm text-muted-foreground">
                            英国发现，加拿大发扬光大
                          </p>
                        </div>
                        <div className="p-3 bg-gray-800 text-white rounded-lg">
                          <p className="font-semibold">
                            默然者 (Matt Karwacki)
                          </p>
                          <p className="text-sm text-gray-300">
                            颜色更深更黑，对比度更高
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <h4 className="font-bold mb-2">配对公式</h4>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p>
                          <strong>缺黄 × 缺黄</strong> = 100% 缺黄后代
                        </p>
                        <p>
                          <strong>缺黄 × 正常</strong> = 100% het缺黄后代
                        </p>
                      </div>
                      <div>
                        <p>
                          <strong>缺黄 × het缺黄</strong> = 50%缺黄 + 50%
                          het缺黄
                        </p>
                        <p>
                          <strong>het缺黄 × het缺黄</strong> = 25%缺黄 + 50% het
                          + 25%正常
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="chocho">
              <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-[oklch(0.50_0.10_30)] to-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl text-white">
                        巧克力 Chocho
                      </CardTitle>
                      <CardDescription className="text-lg text-white/80">
                        隐性基因 | 韩国发现
                      </CardDescription>
                    </div>
                    <Badge className="bg-[oklch(0.35_0.08_145)] text-lg px-4 py-2">
                      隐性
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
                        <Info className="w-5 h-5" />
                        基因特征
                      </h4>
                      <ul className="space-y-2 text-muted-foreground">
                        <li>• 发现者：韩国 @Kimsunju</li>
                        <li>• 幼年：暗红/巧克力红色</li>
                        <li>• 背部和尾巴有橘红色表现</li>
                        <li>• 成年后暗红色进一步变暗</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-bold text-lg mb-3">成年特征</h4>
                      <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                        <ul className="space-y-1 text-muted-foreground">
                          <li>• 暗红色体色进一步变暗</li>
                          <li>• 背刺有奶油色覆盖</li>
                          <li>• 特征在成年后不如幼年明显</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Breeding Strategies */}
      <section className="py-16 bg-[oklch(0.95_0.01_70)]">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 flex items-center justify-center gap-3">
              <Heart className="w-10 h-10 text-[oklch(0.65_0.15_65)]" />
              选育配对策略
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              科学的配对方法是培育高品质后代的关键
            </p>
          </div>

          <div className="max-w-5xl mx-auto">
            {/* 基础原则 */}
            <Card className="shadow-lg mb-8">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Target className="w-6 h-6" />
                  选育基础原则
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-[oklch(0.65_0.15_65)] text-white flex items-center justify-center flex-shrink-0">
                        1
                      </div>
                      <div>
                        <h4 className="font-bold">同类配对</h4>
                        <p className="text-muted-foreground text-sm">
                          相似表现的个体配对，后代更稳定可预测
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-[oklch(0.65_0.15_65)] text-white flex items-center justify-center flex-shrink-0">
                        2
                      </div>
                      <div>
                        <h4 className="font-bold">血线追踪</h4>
                        <p className="text-muted-foreground text-sm">
                          了解亲本的血统背景，预测隐性基因
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-[oklch(0.65_0.15_65)] text-white flex items-center justify-center flex-shrink-0">
                        3
                      </div>
                      <div>
                        <h4 className="font-bold">避免过度近交</h4>
                        <p className="text-muted-foreground text-sm">
                          适当引入新血线，保持基因多样性
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-[oklch(0.65_0.15_65)] text-white flex items-center justify-center flex-shrink-0">
                        4
                      </div>
                      <div>
                        <h4 className="font-bold">质量优先</h4>
                        <p className="text-muted-foreground text-sm">
                          选择高品质亲本，而非数量取胜
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 配对公式 */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <Card className="shadow-lg">
                <CardHeader className="bg-[oklch(0.95_0.05_90)]">
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    培育高品质莉莉白
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="p-4 bg-muted rounded-lg font-mono text-sm">
                    高表现莉莉白 × 高纹路非莉莉白
                    <br />
                    <ArrowRight className="inline w-4 h-4 mx-2" />
                    50% 高表现莉莉白后代
                  </div>
                  <p className="text-muted-foreground text-sm mt-3">
                    关键：选择纹路覆盖度高的配对对象
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader className="bg-[oklch(0.90_0.03_70)]">
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    培育超级麦町
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="p-4 bg-muted rounded-lg font-mono text-sm">
                    超级麦町血线 × 超级麦町血线
                    <br />
                    <ArrowRight className="inline w-4 h-4 mx-2" />
                    高概率超级麦町后代
                  </div>
                  <p className="text-muted-foreground text-sm mt-3">
                    即使亲本斑点不多，只要血线纯正即可
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader className="bg-[oklch(0.85_0.05_145)]">
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="w-5 h-5" />
                    培育极端小丑
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="p-4 bg-muted rounded-lg font-mono text-sm">
                    极端小丑 × 极端小丑
                    <br />
                    <ArrowRight className="inline w-4 h-4 mx-2" />
                    高概率极端/超级小丑后代
                  </div>
                  <p className="text-muted-foreground text-sm mt-3">
                    注意四肢和脖子的纹路覆盖度
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader className="bg-[oklch(0.70_0.00_0)] text-white">
                  <CardTitle className="flex items-center gap-2">
                    <Dna className="w-5 h-5" />
                    培育缺黄
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="p-4 bg-muted rounded-lg font-mono text-sm">
                    het缺黄 × het缺黄
                    <br />
                    <ArrowRight className="inline w-4 h-4 mx-2" />
                    25%缺黄 + 50% het + 25%正常
                  </div>
                  <p className="text-muted-foreground text-sm mt-3">
                    隐性基因需要耐心积累
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* 选育路线图 */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <TrendingUp className="w-6 h-6" />
                  选育路线图
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-[oklch(0.85_0.05_145)] mx-auto mb-4 flex items-center justify-center text-2xl font-bold">
                      1-2
                    </div>
                    <h4 className="font-bold text-lg mb-2">初级选育</h4>
                    <p className="text-muted-foreground text-sm">
                      目标：稳定底色和基础纹路
                      <br />
                      配对：同底色、同纹路类型
                      <br />
                      预期：后代与亲本相似
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-[oklch(0.65_0.15_65)] mx-auto mb-4 flex items-center justify-center text-2xl font-bold text-white">
                      3-5
                    </div>
                    <h4 className="font-bold text-lg mb-2">中级选育</h4>
                    <p className="text-muted-foreground text-sm">
                      目标：强化特定性状
                      <br />
                      配对：最佳后代回配或引入高品质
                      <br />
                      预期：性状更加突出和稳定
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-[oklch(0.55_0.20_300)] mx-auto mb-4 flex items-center justify-center text-2xl font-bold text-white">
                      5+
                    </div>
                    <h4 className="font-bold text-lg mb-2">高级选育</h4>
                    <p className="text-muted-foreground text-sm">
                      目标：培育新品系或复合基因
                      <br />
                      配对：引入新基因（莉莉白、缺黄）
                      <br />
                      预期：创造独特的复合表现
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Breeding Practice */}
      <section className="py-16 bg-background">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 flex items-center justify-center gap-3">
              <Zap className="w-10 h-10 text-[oklch(0.65_0.15_160)]" />
              繁殖实践指南
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              从配对到孵化的完整流程
            </p>
          </div>

          <div className="max-w-5xl mx-auto">
            {/* 繁殖条件 */}
            <Card className="shadow-lg mb-8">
              <CardHeader>
                <CardTitle>繁殖条件要求</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">项目</th>
                        <th className="text-center py-3 px-4">雄性</th>
                        <th className="text-center py-3 px-4">雌性</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-3 px-4 font-semibold">
                          最低繁殖年龄
                        </td>
                        <td className="text-center py-3 px-4">9-12个月</td>
                        <td className="text-center py-3 px-4">12-14个月</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4 font-semibold">
                          最低繁殖体重
                        </td>
                        <td className="text-center py-3 px-4">35g</td>
                        <td className="text-center py-3 px-4">
                          40g（建议45g+）
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-semibold">繁殖季节</td>
                        <td className="text-center py-3 px-4" colSpan={2}>
                          春季至秋季（8-9个月）
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* 繁殖流程 */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <Card className="shadow-lg">
                <CardHeader className="bg-[oklch(0.95_0.03_145)]">
                  <CardTitle>配对前准备</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>确认双方健康状态</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>雌性补充钙质（提前2周）</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>准备产卵盒（湿润椰土）</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader className="bg-[oklch(0.95_0.05_65)]">
                  <CardTitle>配对与交配</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <ArrowRight className="w-5 h-5 text-[oklch(0.65_0.15_65)] flex-shrink-0 mt-0.5" />
                      <span>将雄性放入雌性饲养箱</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="w-5 h-5 text-[oklch(0.65_0.15_65)] flex-shrink-0 mt-0.5" />
                      <span>观察交配行为（可能有轻微攻击性）</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <span>如雌性强烈反抗，立即分开</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader className="bg-[oklch(0.90_0.03_200)]">
                  <CardTitle>产卵周期</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-2 bg-muted rounded">
                      <span>首次产卵</span>
                      <span className="font-semibold">交配后4-6周</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-muted rounded">
                      <span>每窝数量</span>
                      <span className="font-semibold">2枚蛋</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-muted rounded">
                      <span>产卵间隔</span>
                      <span className="font-semibold">每2-4周</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-muted rounded">
                      <span>每季产量</span>
                      <span className="font-semibold">8-10窝</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader className="bg-[oklch(0.95_0.05_300)]">
                  <CardTitle>孵化条件</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-2 bg-muted rounded">
                      <span>温度</span>
                      <span className="font-semibold">22-26°C</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-muted rounded">
                      <span>湿度</span>
                      <span className="font-semibold">80-90%</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-muted rounded">
                      <span>孵化期</span>
                      <span className="font-semibold">60-120天</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 注意事项 */}
            <Alert className="border-amber-300 bg-amber-50">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <AlertTitle className="text-amber-700">繁殖注意事项</AlertTitle>
              <AlertDescription className="text-amber-600">
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>繁殖季守宫较神经质，断尾是常见现象</li>
                  <li>雌性需要充足的钙质补充，防止代谢性骨病</li>
                  <li>不要让雌性过度产卵，每季最多8-10窝</li>
                  <li>首次繁殖的雌性可能产出未受精蛋</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </section>

      {/* Quality Assessment */}
      <section className="py-16 bg-[oklch(0.95_0.01_70)]">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 flex items-center justify-center gap-3">
              <Star className="w-10 h-10 text-[oklch(0.65_0.15_65)]" />
              品质评估标准
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              如何评估睫角守宫的品质和价值
            </p>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              {/* 评分维度 */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>评分维度</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="font-semibold">底色</span>
                        <span>25%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-3">
                        <div
                          className="bg-[oklch(0.65_0.15_65)] h-3 rounded-full"
                          style={{ width: "25%" }}
                        ></div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        纯净度、饱和度、显色对比
                      </p>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="font-semibold">纹路</span>
                        <span>25%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-3">
                        <div
                          className="bg-[oklch(0.55_0.20_300)] h-3 rounded-full"
                          style={{ width: "25%" }}
                        ></div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        覆盖度、对称性、清晰度
                      </p>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="font-semibold">结构</span>
                        <span>20%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-3">
                        <div
                          className="bg-[oklch(0.35_0.08_145)] h-3 rounded-full"
                          style={{ width: "20%" }}
                        ></div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        体型、头部比例、睫毛
                      </p>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="font-semibold">基因</span>
                        <span>20%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-3">
                        <div
                          className="bg-[oklch(0.65_0.15_160)] h-3 rounded-full"
                          style={{ width: "20%" }}
                        ></div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        是否携带已知基因
                      </p>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="font-semibold">血线</span>
                        <span>10%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-3">
                        <div
                          className="bg-gray-400 h-3 rounded-full"
                          style={{ width: "10%" }}
                        ></div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        亲本品质、繁殖历史
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 价值参考 */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>价值参考（人民币）</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold">宠物级</span>
                        <span className="text-lg font-semibold">¥200-500</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        普通表现，无特殊基因
                      </p>
                    </div>
                    <div className="p-4 bg-[oklch(0.95_0.03_145)] rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold">繁殖级</span>
                        <span className="text-lg font-semibold">
                          ¥500-1,500
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        良好表现，有选育价值
                      </p>
                    </div>
                    <div className="p-4 bg-[oklch(0.90_0.05_65)] rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold">展示级</span>
                        <span className="text-lg font-semibold">
                          ¥1,500-5,000
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        优秀表现，高品质血线
                      </p>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-[oklch(0.65_0.15_65)] to-[oklch(0.55_0.20_300)] text-white rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold">顶级</span>
                        <span className="text-lg font-semibold">
                          ¥5,000-20,000+
                        </span>
                      </div>
                      <p className="text-sm text-white/80">
                        极品表现，稀有基因
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Diet Guide CTA */}
      <section className="py-16 bg-gradient-to-r from-[oklch(0.65_0.15_65)] to-[oklch(0.55_0.12_50)]">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center text-white">
            <Utensils className="w-16 h-16 mx-auto mb-6 opacity-90" />
            <h2 className="text-4xl font-bold mb-4">想要自制守宫饮食？</h2>
            <p className="text-xl mb-8 text-white/90">
              查看Repashy和Pangea品牌配方推导，学习如何在家制作专业级的睫角守宫饮食
            </p>
            <Link href="/gecko-diet">
              <Button
                size="lg"
                className="bg-white text-[oklch(0.55_0.12_50)] hover:bg-white/90 text-lg px-8 py-6"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                查看饮食指南
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-[oklch(0.25_0.02_145)] text-white">
        <div className="container text-center">
          <p className="text-lg font-semibold mb-2">睫角守宫选育指南</p>
          <p className="text-sm text-white/70">
            从基础花色到稀有基因的完整培育手册
          </p>
          <div className="mt-4">
            <Link
              href="/gecko-diet"
              className="text-white/70 hover:text-white underline"
            >
              饮食指南
            </Link>
          </div>
          <p className="text-xs text-white/50 mt-4">
            本指南基于多方资料整理，选育结果可能因个体差异而有所不同
          </p>
        </div>
      </footer>
    </div>
  );
}
