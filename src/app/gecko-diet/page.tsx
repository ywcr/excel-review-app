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
  AlertCircle,
  Info,
  ShoppingCart,
  Clock,
  Leaf,
  Zap,
  Beaker,
  ChefHat,
  Package,
  Star,
  Dna,
  ArrowRight,
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";

export default function GeckoDietPage() {
  const [selectedRecipe, setSelectedRecipe] = useState<string>("basic");

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
            睫角守宫饮食全解析
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-white/90">
            从品牌配方推导到家庭自制的完整指南
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Badge className="bg-[oklch(0.65_0.15_65)] text-white px-4 py-2 text-base">
              Repashy 9款配方
            </Badge>
            <Badge className="bg-[oklch(0.35_0.08_145)] text-white px-4 py-2 text-base">
              Pangea 4款配方
            </Badge>
            <Badge className="bg-[oklch(0.65_0.15_160)] text-white px-4 py-2 text-base">
              家庭可制作
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
              <AlertTitle>研究目标</AlertTitle>
              <AlertDescription>
                本报告通过分析Repashy和Pangea两大品牌的官方成分表，推导出可在家庭环境中制作的完整配方。每个配方都包含精确的用量、购买渠道和制作步骤，确保你能够轻松复制这些专业配方。
              </AlertDescription>
            </Alert>

            <div className="grid md:grid-cols-3 gap-6">
              <Card className="shadow-lg border-t-4 border-t-[oklch(0.65_0.15_65)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Beaker className="w-5 h-5" />
                    科学配方
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    基于品牌官方成分表推导，营养配比科学合理
                  </p>
                </CardContent>
              </Card>
              <Card className="shadow-lg border-t-4 border-t-[oklch(0.35_0.08_145)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ChefHat className="w-5 h-5" />
                    家庭可制作
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    所有原料均可在淘宝/京东购买，无需专业设备
                  </p>
                </CardContent>
              </Card>
              <Card className="shadow-lg border-t-4 border-t-[oklch(0.65_0.15_160)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    易于存储
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    干粉形式可保存6-12个月，随用随调
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Repashy Brand Formulas */}
      <section className="py-16 bg-[oklch(0.95_0.01_70)]">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 flex items-center justify-center gap-3">
              <Star className="w-10 h-10 text-[oklch(0.65_0.15_65)]" />
              Repashy 品牌配方推导
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              基于官方成分表推导的9款家庭制作配方 (500g)
            </p>
          </div>

          <Tabs defaultValue="classic" className="w-full mb-12">
            <TabsList className="flex flex-wrap justify-center gap-2 mb-8 h-auto bg-transparent">
              <TabsTrigger value="classic" className="text-sm bg-white shadow">
                Classic 经典
              </TabsTrigger>
              <TabsTrigger value="grubs" className="text-sm bg-white shadow">
                Grubs N Fruit
              </TabsTrigger>
              <TabsTrigger value="mango" className="text-sm bg-white shadow">
                Mango 芒果
              </TabsTrigger>
              <TabsTrigger value="banana" className="text-sm bg-white shadow">
                Banana 香蕉
              </TabsTrigger>
              <TabsTrigger value="cherry" className="text-sm bg-white shadow">
                Cherry Bomb
              </TabsTrigger>
              <TabsTrigger value="fig" className="text-sm bg-white shadow">
                Fig Frenzy
              </TabsTrigger>
              <TabsTrigger value="mulberry" className="text-sm bg-white shadow">
                Mulberry
              </TabsTrigger>
              <TabsTrigger
                value="pineapple"
                className="text-sm bg-white shadow"
              >
                Pineapple
              </TabsTrigger>
              <TabsTrigger
                value="mangotango"
                className="text-sm bg-white shadow"
              >
                Mango Tango
              </TabsTrigger>
            </TabsList>

            {/* Classic Formula */}
            <TabsContent value="classic" className="space-y-6">
              <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-[oklch(0.65_0.15_65)] to-[oklch(0.65_0.15_65)]/80 text-white rounded-t-lg">
                  <CardTitle className="text-2xl">
                    Repashy Classic 经典配方 - 500g
                  </CardTitle>
                  <CardDescription className="text-white/90">
                    最均衡的配方，适合所有生命阶段
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="mb-6">
                    <h4 className="font-bold text-lg mb-2">官方成分表</h4>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                      Dried Banana, Whey Protein Isolate, Dried Date, Dried Egg,
                      Dried Honey, Dried Fig, Cane Molasses, Dicalcium
                      Phosphate, Coconut Meal, Calcium Carbonate, Lecithin,
                      Citric Acid, Locust Bean Gum, Methionine, Taurine, Dried
                      Kelp, Dried Watermelon, Rose Hips, Hibiscus Flower,
                      Marigold Flower...
                    </p>
                    <div className="flex gap-4 mt-3">
                      <Badge variant="outline">蛋白质≥20%</Badge>
                      <Badge variant="outline">脂肪≥4.5%</Badge>
                      <Badge variant="outline">钙≥1.2%</Badge>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-bold text-[oklch(0.65_0.15_65)] mb-3 flex items-center gap-2">
                        <Leaf className="w-4 h-4" /> 水果干粉 (250g, 50%)
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-[oklch(0.65_0.15_65)]/5 rounded">
                          <span>香蕉干粉</span>
                          <span className="font-semibold">150g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-[oklch(0.65_0.15_65)]/5 rounded">
                          <span>枣干粉</span>
                          <span className="font-semibold">50g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-[oklch(0.65_0.15_65)]/5 rounded">
                          <span>无花果干粉</span>
                          <span className="font-semibold">40g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-[oklch(0.65_0.15_65)]/5 rounded">
                          <span>西瓜干粉</span>
                          <span className="font-semibold">10g</span>
                        </div>
                      </div>

                      <h4 className="font-bold text-[oklch(0.35_0.08_145)] mt-4 mb-3 flex items-center gap-2">
                        <Zap className="w-4 h-4" /> 蛋白质 (150g, 30%)
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-[oklch(0.35_0.08_145)]/5 rounded">
                          <span>乳清蛋白分离物</span>
                          <span className="font-semibold">100g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-[oklch(0.35_0.08_145)]/5 rounded">
                          <span>全蛋粉</span>
                          <span className="font-semibold">50g</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-[oklch(0.65_0.15_160)] mb-3 flex items-center gap-2">
                        <Package className="w-4 h-4" /> 甜味剂和脂肪 (55g, 11%)
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-[oklch(0.65_0.15_160)]/5 rounded">
                          <span>蜂蜜粉</span>
                          <span className="font-semibold">25g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-[oklch(0.65_0.15_160)]/5 rounded">
                          <span>甘蔗糖蜜(干)</span>
                          <span className="font-semibold">15g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-[oklch(0.65_0.15_160)]/5 rounded">
                          <span>椰子粉</span>
                          <span className="font-semibold">15g</span>
                        </div>
                      </div>

                      <h4 className="font-bold text-gray-700 mt-4 mb-3 flex items-center gap-2">
                        <Beaker className="w-4 h-4" /> 矿物质和营养 (45g, 9%)
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>碳酸钙</span>
                          <span className="font-semibold">15g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>磷酸二钙</span>
                          <span className="font-semibold">10g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>卵磷脂</span>
                          <span className="font-semibold">5g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>木槿花粉+万寿菊花粉</span>
                          <span className="font-semibold">5g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>海带粉+玫瑰果粉</span>
                          <span className="font-semibold">5g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>刺槐豆胶+牛磺酸+蛋氨酸</span>
                          <span className="font-semibold">5g</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 bg-gradient-to-r from-[oklch(0.65_0.15_65)] to-[oklch(0.65_0.15_65)]/70 p-4 rounded-lg text-white">
                    <p className="font-bold text-lg">预计成本: ¥180-280</p>
                    <p className="text-sm mt-1">可供一只成体守宫食用3-4个月</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Grubs N Fruit Formula */}
            <TabsContent value="grubs" className="space-y-6">
              <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-[oklch(0.35_0.08_145)] to-[oklch(0.35_0.08_145)]/80 text-white rounded-t-lg">
                  <CardTitle className="text-2xl">
                    Repashy Grubs N Fruit 昆虫水果配方 - 500g
                  </CardTitle>
                  <CardDescription className="text-white/90">
                    30%昆虫+50%水果，高蛋白配方
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="mb-6">
                    <h4 className="font-bold text-lg mb-2">官方成分表</h4>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                      Black Soldier Fly Larvae Meal, Dried Banana, Dried Date,
                      Dried Mango, Coconut Meal, Pea Protein, Rice Protein, Heat
                      Stabilized Rice Bran, Ground Flaxseed, Cane Molasses,
                      Lecithin, Algae Meal, Calcium Carbonate, Dicalcium
                      Phosphate, Taurine, Dried Kelp...
                    </p>
                    <div className="flex gap-4 mt-3">
                      <Badge variant="outline">蛋白质≥24%</Badge>
                      <Badge variant="outline">脂肪≥6%</Badge>
                      <Badge variant="outline">钙≥1.2%</Badge>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-bold text-[oklch(0.35_0.08_145)] mb-3">
                        昆虫蛋白 (150g, 30%)
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-[oklch(0.35_0.08_145)]/5 rounded">
                          <span>黑水虻幼虫粉</span>
                          <span className="font-semibold">150g</span>
                        </div>
                      </div>

                      <h4 className="font-bold text-[oklch(0.65_0.15_65)] mt-4 mb-3">
                        水果干粉 (210g, 42%)
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-[oklch(0.65_0.15_65)]/5 rounded">
                          <span>香蕉干粉</span>
                          <span className="font-semibold">100g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-[oklch(0.65_0.15_65)]/5 rounded">
                          <span>枣干粉</span>
                          <span className="font-semibold">50g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-[oklch(0.65_0.15_65)]/5 rounded">
                          <span>芒果干粉</span>
                          <span className="font-semibold">50g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-[oklch(0.65_0.15_65)]/5 rounded">
                          <span>西瓜干粉</span>
                          <span className="font-semibold">10g</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-[oklch(0.65_0.15_160)] mb-3">
                        植物蛋白 (50g, 10%)
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-[oklch(0.65_0.15_160)]/5 rounded">
                          <span>豌豆蛋白</span>
                          <span className="font-semibold">30g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-[oklch(0.65_0.15_160)]/5 rounded">
                          <span>米蛋白</span>
                          <span className="font-semibold">20g</span>
                        </div>
                      </div>

                      <h4 className="font-bold text-gray-700 mt-4 mb-3">
                        脂肪和营养 (90g, 18%)
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>椰子粉</span>
                          <span className="font-semibold">20g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>亚麻籽粉</span>
                          <span className="font-semibold">15g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>碳酸钙+磷酸二钙</span>
                          <span className="font-semibold">25g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>螺旋藻粉+海带粉</span>
                          <span className="font-semibold">8g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>甘蔗糖蜜+花卉粉</span>
                          <span className="font-semibold">15g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>米糠+牛磺酸</span>
                          <span className="font-semibold">7g</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 bg-gradient-to-r from-[oklch(0.35_0.08_145)] to-[oklch(0.35_0.08_145)]/70 p-4 rounded-lg text-white">
                    <p className="font-bold text-lg">预计成本: ¥220-350</p>
                    <p className="text-sm mt-1">适合幼体快速生长和繁殖期</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Mango Superblend Formula */}
            <TabsContent value="mango" className="space-y-6">
              <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-[oklch(0.65_0.15_65)] to-[oklch(0.65_0.15_65)]/80 text-white rounded-t-lg">
                  <CardTitle className="text-2xl">
                    Repashy Mango Superblend 芒果超级版 - 500g
                  </CardTitle>
                  <CardDescription className="text-white/90">
                    最受欢迎的口味，适口性极强
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="mb-6">
                    <h4 className="font-bold text-lg mb-2">官方成分表</h4>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                      Dried Mango, Dried Banana, Whey Protein Isolate, Dried
                      Honey, Black Soldier Fly Larvae Meal, Dried Date, Whole
                      Dried Egg, Rice Protein, Pea Protein, Heat Stabilized Rice
                      Bran, Ground Flaxseed, Cane Molasses, Lecithin, Algae
                      Meal...
                    </p>
                    <div className="flex gap-4 mt-3">
                      <Badge variant="outline">蛋白质≥22%</Badge>
                      <Badge variant="outline">脂肪≥5%</Badge>
                      <Badge variant="outline">钙≥1.2%</Badge>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-bold text-[oklch(0.65_0.15_65)] mb-3">
                        水果干粉 (240g, 48%)
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-[oklch(0.65_0.15_65)]/5 rounded">
                          <span>芒果干粉</span>
                          <span className="font-semibold">120g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-[oklch(0.65_0.15_65)]/5 rounded">
                          <span>香蕉干粉</span>
                          <span className="font-semibold">80g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-[oklch(0.65_0.15_65)]/5 rounded">
                          <span>枣干粉</span>
                          <span className="font-semibold">30g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-[oklch(0.65_0.15_65)]/5 rounded">
                          <span>西瓜干粉</span>
                          <span className="font-semibold">10g</span>
                        </div>
                      </div>

                      <h4 className="font-bold text-[oklch(0.35_0.08_145)] mt-4 mb-3">
                        蛋白质 (160g, 32%)
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-[oklch(0.35_0.08_145)]/5 rounded">
                          <span>乳清蛋白分离物</span>
                          <span className="font-semibold">80g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-[oklch(0.35_0.08_145)]/5 rounded">
                          <span>黑水虻幼虫粉</span>
                          <span className="font-semibold">50g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-[oklch(0.35_0.08_145)]/5 rounded">
                          <span>全蛋粉</span>
                          <span className="font-semibold">30g</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-[oklch(0.65_0.15_160)] mb-3">
                        植物蛋白和甜味剂 (60g, 12%)
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-[oklch(0.65_0.15_160)]/5 rounded">
                          <span>米蛋白+豌豆蛋白</span>
                          <span className="font-semibold">30g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-[oklch(0.65_0.15_160)]/5 rounded">
                          <span>蜂蜜粉</span>
                          <span className="font-semibold">20g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-[oklch(0.65_0.15_160)]/5 rounded">
                          <span>甘蔗糖蜜(干)</span>
                          <span className="font-semibold">10g</span>
                        </div>
                      </div>

                      <h4 className="font-bold text-gray-700 mt-4 mb-3">
                        矿物质和营养 (40g, 8%)
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>碳酸钙+磷酸二钙</span>
                          <span className="font-semibold">20g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>亚麻籽粉</span>
                          <span className="font-semibold">10g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>螺旋藻+万寿菊+金盏花</span>
                          <span className="font-semibold">8g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>牛磺酸</span>
                          <span className="font-semibold">2g</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 bg-gradient-to-r from-[oklch(0.65_0.15_65)] to-[oklch(0.65_0.15_65)]/70 p-4 rounded-lg text-white">
                    <p className="font-bold text-lg">预计成本: ¥200-320</p>
                    <p className="text-sm mt-1">挑食守宫的最佳选择</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Banana Formula */}
            <TabsContent value="banana" className="space-y-6">
              <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-[oklch(0.65_0.15_65)] to-[oklch(0.65_0.15_65)]/80 text-white rounded-t-lg">
                  <CardTitle className="text-2xl">
                    Repashy Banana 香蕉配方 - 500g
                  </CardTitle>
                  <CardDescription className="text-white/90">
                    适口性最强，新手入门首选
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-bold text-[oklch(0.65_0.15_65)] mb-3">
                        水果干粉 (260g, 52%)
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-[oklch(0.65_0.15_65)]/5 rounded">
                          <span>香蕉干粉</span>
                          <span className="font-semibold">180g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-[oklch(0.65_0.15_65)]/5 rounded">
                          <span>芒果干粉</span>
                          <span className="font-semibold">40g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-[oklch(0.65_0.15_65)]/5 rounded">
                          <span>无花果干粉</span>
                          <span className="font-semibold">30g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-[oklch(0.65_0.15_65)]/5 rounded">
                          <span>西瓜干粉</span>
                          <span className="font-semibold">10g</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-[oklch(0.35_0.08_145)] mb-3">
                        蛋白质 (160g, 32%)
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-[oklch(0.35_0.08_145)]/5 rounded">
                          <span>乳清蛋白分离物</span>
                          <span className="font-semibold">80g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-[oklch(0.35_0.08_145)]/5 rounded">
                          <span>全蛋粉</span>
                          <span className="font-semibold">40g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-[oklch(0.35_0.08_145)]/5 rounded">
                          <span>黑水虻幼虫粉</span>
                          <span className="font-semibold">40g</span>
                        </div>
                      </div>

                      <h4 className="font-bold text-gray-700 mt-4 mb-3">
                        其他成分 (80g, 16%)
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>蜂蜜粉+甘蔗糖蜜</span>
                          <span className="font-semibold">30g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>碳酸钙+磷酸二钙</span>
                          <span className="font-semibold">23g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>椰子粉</span>
                          <span className="font-semibold">15g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>花卉粉+海带粉+牛磺酸</span>
                          <span className="font-semibold">12g</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 bg-gradient-to-r from-[oklch(0.65_0.15_65)] to-[oklch(0.65_0.15_65)]/70 p-4 rounded-lg text-white">
                    <p className="font-bold text-lg">预计成本: ¥180-280</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Cherry Bomb Formula */}
            <TabsContent value="cherry" className="space-y-6">
              <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-red-600 to-red-500 text-white rounded-t-lg">
                  <CardTitle className="text-2xl">
                    Repashy Cherry Bomb 樱桃炸弹 - 500g
                  </CardTitle>
                  <CardDescription className="text-white/90">
                    黑樱桃+菠萝，独特风味
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-bold text-red-600 mb-3">
                        水果干粉 (250g, 50%)
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-red-50 rounded">
                          <span>香蕉干粉</span>
                          <span className="font-semibold">100g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-red-50 rounded">
                          <span>黑樱桃干粉</span>
                          <span className="font-semibold">80g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-red-50 rounded">
                          <span>菠萝干粉</span>
                          <span className="font-semibold">50g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-red-50 rounded">
                          <span>枣干粉</span>
                          <span className="font-semibold">20g</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-[oklch(0.35_0.08_145)] mb-3">
                        蛋白质 (170g, 34%)
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-[oklch(0.35_0.08_145)]/5 rounded">
                          <span>乳清蛋白分离物</span>
                          <span className="font-semibold">80g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-[oklch(0.35_0.08_145)]/5 rounded">
                          <span>黑水虻幼虫粉</span>
                          <span className="font-semibold">50g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-[oklch(0.35_0.08_145)]/5 rounded">
                          <span>全蛋粉</span>
                          <span className="font-semibold">40g</span>
                        </div>
                      </div>

                      <h4 className="font-bold text-gray-700 mt-4 mb-3">
                        其他成分 (80g, 16%)
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>蜂蜜粉+椰子粉</span>
                          <span className="font-semibold">35g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>碳酸钙+磷酸二钙</span>
                          <span className="font-semibold">25g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>花卉粉+海带粉+牛磺酸</span>
                          <span className="font-semibold">20g</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 bg-gradient-to-r from-red-600 to-red-500 p-4 rounded-lg text-white">
                    <p className="font-bold text-lg">预计成本: ¥220-350</p>
                    <p className="text-sm mt-1">黑樱桃干粉价格较高</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Fig Frenzy Formula */}
            <TabsContent value="fig" className="space-y-6">
              <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-purple-700 to-purple-600 text-white rounded-t-lg">
                  <CardTitle className="text-2xl">
                    Repashy Fig Frenzy 无花果狂热 - 500g
                  </CardTitle>
                  <CardDescription className="text-white/90">
                    无花果+鸡肉粉，独特配方
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-bold text-purple-700 mb-3">
                        水果干粉 (250g, 50%)
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-purple-50 rounded">
                          <span>香蕉干粉</span>
                          <span className="font-semibold">100g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-purple-50 rounded">
                          <span>无花果干粉</span>
                          <span className="font-semibold">100g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-purple-50 rounded">
                          <span>枣干粉</span>
                          <span className="font-semibold">50g</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-[oklch(0.35_0.08_145)] mb-3">
                        蛋白质 (150g, 30%)
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-[oklch(0.35_0.08_145)]/5 rounded">
                          <span>鸡肉粉/鸡汤粉</span>
                          <span className="font-semibold">50g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-[oklch(0.35_0.08_145)]/5 rounded">
                          <span>全蛋粉</span>
                          <span className="font-semibold">50g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-[oklch(0.35_0.08_145)]/5 rounded">
                          <span>黑水虻幼虫粉</span>
                          <span className="font-semibold">50g</span>
                        </div>
                      </div>

                      <h4 className="font-bold text-gray-700 mt-4 mb-3">
                        其他成分 (100g, 20%)
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>椰奶粉</span>
                          <span className="font-semibold">30g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>碳酸钙+磷酸二钙</span>
                          <span className="font-semibold">35g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>甜菜根粉+花卉粉</span>
                          <span className="font-semibold">20g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>海带粉+姜黄粉+牛磺酸</span>
                          <span className="font-semibold">15g</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 bg-gradient-to-r from-purple-700 to-purple-600 p-4 rounded-lg text-white">
                    <p className="font-bold text-lg">预计成本: ¥200-320</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Mulberry Formula */}
            <TabsContent value="mulberry" className="space-y-6">
              <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-indigo-700 to-indigo-600 text-white rounded-t-lg">
                  <CardTitle className="text-2xl">
                    Repashy Mulberry Madness 桑葚疯狂 - 500g
                  </CardTitle>
                  <CardDescription className="text-white/90">
                    桑葚+蓝莓，浆果风味
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-bold text-indigo-700 mb-3">
                        水果干粉 (250g, 50%)
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-indigo-50 rounded">
                          <span>桑葚干粉</span>
                          <span className="font-semibold">100g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-indigo-50 rounded">
                          <span>香蕉干粉</span>
                          <span className="font-semibold">80g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-indigo-50 rounded">
                          <span>蓝莓干粉</span>
                          <span className="font-semibold">40g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-indigo-50 rounded">
                          <span>枣干粉</span>
                          <span className="font-semibold">30g</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-[oklch(0.35_0.08_145)] mb-3">
                        蛋白质 (170g, 34%)
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-[oklch(0.35_0.08_145)]/5 rounded">
                          <span>乳清蛋白分离物</span>
                          <span className="font-semibold">80g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-[oklch(0.35_0.08_145)]/5 rounded">
                          <span>黑水虻幼虫粉</span>
                          <span className="font-semibold">50g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-[oklch(0.35_0.08_145)]/5 rounded">
                          <span>全蛋粉</span>
                          <span className="font-semibold">40g</span>
                        </div>
                      </div>

                      <h4 className="font-bold text-gray-700 mt-4 mb-3">
                        其他成分 (80g, 16%)
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>蜂蜜粉+椰子粉</span>
                          <span className="font-semibold">35g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>碳酸钙+磷酸二钙</span>
                          <span className="font-semibold">25g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>花卉粉+海带粉+牛磺酸</span>
                          <span className="font-semibold">20g</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 bg-gradient-to-r from-indigo-700 to-indigo-600 p-4 rounded-lg text-white">
                    <p className="font-bold text-lg">预计成本: ¥230-360</p>
                    <p className="text-sm mt-1">蓝莓干粉价格较高</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pineapple Formula */}
            <TabsContent value="pineapple" className="space-y-6">
              <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-yellow-600 to-yellow-500 text-white rounded-t-lg">
                  <CardTitle className="text-2xl">
                    Repashy Pineapple Express 菠萝特快 - 500g
                  </CardTitle>
                  <CardDescription className="text-white/90">
                    热带菠萝风味
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-bold text-yellow-700 mb-3">
                        水果干粉 (260g, 52%)
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-yellow-50 rounded">
                          <span>菠萝干粉</span>
                          <span className="font-semibold">120g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-yellow-50 rounded">
                          <span>香蕉干粉</span>
                          <span className="font-semibold">80g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-yellow-50 rounded">
                          <span>芒果干粉</span>
                          <span className="font-semibold">40g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-yellow-50 rounded">
                          <span>枣干粉</span>
                          <span className="font-semibold">20g</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-[oklch(0.35_0.08_145)] mb-3">
                        蛋白质 (160g, 32%)
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-[oklch(0.35_0.08_145)]/5 rounded">
                          <span>乳清蛋白分离物</span>
                          <span className="font-semibold">80g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-[oklch(0.35_0.08_145)]/5 rounded">
                          <span>全蛋粉</span>
                          <span className="font-semibold">40g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-[oklch(0.35_0.08_145)]/5 rounded">
                          <span>黑水虻幼虫粉</span>
                          <span className="font-semibold">40g</span>
                        </div>
                      </div>

                      <h4 className="font-bold text-gray-700 mt-4 mb-3">
                        其他成分 (80g, 16%)
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>蜂蜜粉+椰子粉</span>
                          <span className="font-semibold">35g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>碳酸钙+磷酸二钙</span>
                          <span className="font-semibold">25g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>花卉粉+海带粉+姜黄粉</span>
                          <span className="font-semibold">20g</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 bg-gradient-to-r from-yellow-600 to-yellow-500 p-4 rounded-lg text-white">
                    <p className="font-bold text-lg">预计成本: ¥200-320</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Mango Tango Formula */}
            <TabsContent value="mangotango" className="space-y-6">
              <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-t-lg">
                  <CardTitle className="text-2xl">
                    Repashy Mango Tango 芒果探戈 - 500g
                  </CardTitle>
                  <CardDescription className="text-white/90">
                    高昆虫含量的芒果配方
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-bold text-orange-700 mb-3">
                        水果干粉 (260g, 52%)
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-orange-50 rounded">
                          <span>芒果干粉</span>
                          <span className="font-semibold">150g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-orange-50 rounded">
                          <span>香蕉干粉</span>
                          <span className="font-semibold">60g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-orange-50 rounded">
                          <span>木瓜干粉</span>
                          <span className="font-semibold">30g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-orange-50 rounded">
                          <span>枣干粉</span>
                          <span className="font-semibold">20g</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-[oklch(0.35_0.08_145)] mb-3">
                        蛋白质 (160g, 32%)
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-[oklch(0.35_0.08_145)]/5 rounded">
                          <span>黑水虻幼虫粉</span>
                          <span className="font-semibold">80g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-[oklch(0.35_0.08_145)]/5 rounded">
                          <span>乳清蛋白分离物</span>
                          <span className="font-semibold">50g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-[oklch(0.35_0.08_145)]/5 rounded">
                          <span>全蛋粉</span>
                          <span className="font-semibold">30g</span>
                        </div>
                      </div>

                      <h4 className="font-bold text-gray-700 mt-4 mb-3">
                        其他成分 (80g, 16%)
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>蜂蜜粉+椰子粉</span>
                          <span className="font-semibold">35g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>碳酸钙+磷酸二钙</span>
                          <span className="font-semibold">25g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>花卉粉+海带粉+姜黄粉</span>
                          <span className="font-semibold">20g</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 bg-gradient-to-r from-orange-600 to-orange-500 p-4 rounded-lg text-white">
                    <p className="font-bold text-lg">预计成本: ¥220-350</p>
                    <p className="text-sm mt-1">高昆虫含量，适合繁殖期</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Pangea Brand Formulas */}
      <section className="py-16 bg-background">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 flex items-center justify-center gap-3">
              <Star className="w-10 h-10 text-[oklch(0.35_0.08_145)]" />
              Pangea 品牌配方推导
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              基于官方成分表推导的4款家庭制作配方 (500g)
            </p>
          </div>

          <Tabs defaultValue="breeding" className="w-full mb-12">
            <TabsList className="flex flex-wrap justify-center gap-2 mb-8 h-auto bg-transparent">
              <TabsTrigger value="breeding" className="text-sm bg-white shadow">
                Growth & Breeding
              </TabsTrigger>
              <TabsTrigger
                value="watermelon"
                className="text-sm bg-white shadow"
              >
                Watermelon 西瓜
              </TabsTrigger>
              <TabsTrigger value="papaya" className="text-sm bg-white shadow">
                Banana Papaya
              </TabsTrigger>
              <TabsTrigger
                value="figinsects"
                className="text-sm bg-white shadow"
              >
                Fig & Insects
              </TabsTrigger>
            </TabsList>

            {/* Growth & Breeding Formula */}
            <TabsContent value="breeding" className="space-y-6">
              <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-[oklch(0.35_0.08_145)] to-[oklch(0.35_0.08_145)]/80 text-white rounded-t-lg">
                  <CardTitle className="text-2xl">
                    Pangea Growth & Breeding 繁殖配方 - 500g
                  </CardTitle>
                  <CardDescription className="text-white/90">
                    高蛋白高脂肪，繁殖期专用
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="mb-6">
                    <h4 className="font-bold text-lg mb-2">官方成分表</h4>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                      Banana Flake, Apricot Powder, Dried House Cricket, Dried
                      Milk Protein (Micellar Casein), Calcium Carbonate,
                      Dicalcium Phosphate, Vegetable Fat, Xanthan Gum, Flax
                      Meal, Potassium Sorbate, Salt, Choline Bitartrate,
                      Maltodextrin, Natural Guava Flavor, Dried Kelp...
                    </p>
                    <div className="flex gap-4 mt-3">
                      <Badge variant="outline">蛋白质≥21%</Badge>
                      <Badge variant="outline">脂肪≥5.7%</Badge>
                      <Badge variant="outline">钙≥1.5%</Badge>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-bold text-[oklch(0.65_0.15_65)] mb-3">
                        水果干粉 (200g, 40%)
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-[oklch(0.65_0.15_65)]/5 rounded">
                          <span>香蕉片粉</span>
                          <span className="font-semibold">120g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-[oklch(0.65_0.15_65)]/5 rounded">
                          <span>杏干粉</span>
                          <span className="font-semibold">80g</span>
                        </div>
                      </div>

                      <h4 className="font-bold text-[oklch(0.35_0.08_145)] mt-4 mb-3">
                        蛋白质 (160g, 32%)
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-[oklch(0.35_0.08_145)]/5 rounded">
                          <span>蟋蟀粉</span>
                          <span className="font-semibold">100g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-[oklch(0.35_0.08_145)]/5 rounded">
                          <span>酪蛋白(Micellar Casein)</span>
                          <span className="font-semibold">60g</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-[oklch(0.65_0.15_160)] mb-3">
                        脂肪来源 (50g, 10%)
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-[oklch(0.65_0.15_160)]/5 rounded">
                          <span>植物油粉</span>
                          <span className="font-semibold">30g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-[oklch(0.65_0.15_160)]/5 rounded">
                          <span>亚麻籽粉</span>
                          <span className="font-semibold">20g</span>
                        </div>
                      </div>

                      <h4 className="font-bold text-gray-700 mt-4 mb-3">
                        矿物质和营养 (90g, 18%)
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>碳酸钙</span>
                          <span className="font-semibold">25g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>磷酸二钙</span>
                          <span className="font-semibold">15g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>麦芽糊精+番石榴香精</span>
                          <span className="font-semibold">15g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>海带粉+米糠</span>
                          <span className="font-semibold">20g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>黄原胶+卵磷脂+胆碱</span>
                          <span className="font-semibold">15g</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 bg-gradient-to-r from-[oklch(0.35_0.08_145)] to-[oklch(0.35_0.08_145)]/70 p-4 rounded-lg text-white">
                    <p className="font-bold text-lg">预计成本: ¥250-380</p>
                    <p className="text-sm mt-1">
                      蟋蟀粉价格较高，适合繁殖期雌性
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Watermelon Formula */}
            <TabsContent value="watermelon" className="space-y-6">
              <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-green-600 to-green-500 text-white rounded-t-lg">
                  <CardTitle className="text-2xl">
                    Pangea Watermelon 西瓜配方 - 500g
                  </CardTitle>
                  <CardDescription className="text-white/90">
                    清爽口感，夏季首选
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="mb-6">
                    <h4 className="font-bold text-lg mb-2">官方成分表</h4>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                      Dried Watermelon, Whey Protein Isolate, Dried Mango, Dried
                      Banana, Dried Apple, Dried Egg White, Dried Coconut Milk,
                      Rice Bran, Precipitated Calcium Carbonate...
                    </p>
                    <div className="flex gap-4 mt-3">
                      <Badge variant="outline">蛋白质≥18%</Badge>
                      <Badge variant="outline">脂肪≥4%</Badge>
                      <Badge variant="outline">钙≥1.2%</Badge>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-bold text-green-700 mb-3">
                        水果干粉 (290g, 58%)
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-green-50 rounded">
                          <span>西瓜干粉</span>
                          <span className="font-semibold">150g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-green-50 rounded">
                          <span>芒果干粉</span>
                          <span className="font-semibold">60g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-green-50 rounded">
                          <span>香蕉干粉</span>
                          <span className="font-semibold">50g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-green-50 rounded">
                          <span>苹果干粉</span>
                          <span className="font-semibold">30g</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-[oklch(0.35_0.08_145)] mb-3">
                        蛋白质 (110g, 22%)
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-[oklch(0.35_0.08_145)]/5 rounded">
                          <span>乳清蛋白分离物</span>
                          <span className="font-semibold">80g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-[oklch(0.35_0.08_145)]/5 rounded">
                          <span>蛋白粉(蛋清)</span>
                          <span className="font-semibold">30g</span>
                        </div>
                      </div>

                      <h4 className="font-bold text-gray-700 mt-4 mb-3">
                        其他成分 (100g, 20%)
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>椰奶粉</span>
                          <span className="font-semibold">30g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>米糠</span>
                          <span className="font-semibold">20g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>碳酸钙+磷酸二钙</span>
                          <span className="font-semibold">30g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>螺旋藻+海带+蜂花粉</span>
                          <span className="font-semibold">15g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>卵磷脂</span>
                          <span className="font-semibold">5g</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 bg-gradient-to-r from-green-600 to-green-500 p-4 rounded-lg text-white">
                    <p className="font-bold text-lg">预计成本: ¥200-320</p>
                    <p className="text-sm mt-1">
                      西瓜干粉较难购买，可用冻干西瓜研磨
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Banana Papaya Formula */}
            <TabsContent value="papaya" className="space-y-6">
              <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-[oklch(0.65_0.15_65)] to-[oklch(0.65_0.15_65)]/80 text-white rounded-t-lg">
                  <CardTitle className="text-2xl">
                    Pangea Banana Papaya 香蕉木瓜配方 - 500g
                  </CardTitle>
                  <CardDescription className="text-white/90">
                    消化友好，日常首选
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="mb-6">
                    <h4 className="font-bold text-lg mb-2">官方成分表</h4>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                      Dried Banana, Dried Papaya, Rice Bran, Micellar Casein,
                      Whey Protein Isolate, Dried Egg, Calcium Carbonate,
                      Di-Calcium Phosphate, Lecithin...
                    </p>
                    <div className="flex gap-4 mt-3">
                      <Badge variant="outline">蛋白质≥20%</Badge>
                      <Badge variant="outline">脂肪≥4%</Badge>
                      <Badge variant="outline">钙≥1.2%</Badge>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-bold text-[oklch(0.65_0.15_65)] mb-3">
                        水果干粉 (250g, 50%)
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-[oklch(0.65_0.15_65)]/5 rounded">
                          <span>香蕉干粉</span>
                          <span className="font-semibold">150g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-[oklch(0.65_0.15_65)]/5 rounded">
                          <span>木瓜干粉</span>
                          <span className="font-semibold">100g</span>
                        </div>
                      </div>

                      <h4 className="font-bold text-[oklch(0.35_0.08_145)] mt-4 mb-3">
                        蛋白质 (140g, 28%)
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-[oklch(0.35_0.08_145)]/5 rounded">
                          <span>酪蛋白(Micellar Casein)</span>
                          <span className="font-semibold">60g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-[oklch(0.35_0.08_145)]/5 rounded">
                          <span>乳清蛋白分离物</span>
                          <span className="font-semibold">50g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-[oklch(0.35_0.08_145)]/5 rounded">
                          <span>全蛋粉</span>
                          <span className="font-semibold">30g</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-gray-700 mb-3">
                        其他成分 (110g, 22%)
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>米糠</span>
                          <span className="font-semibold">40g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>碳酸钙</span>
                          <span className="font-semibold">25g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>磷酸二钙</span>
                          <span className="font-semibold">15g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>卵磷脂</span>
                          <span className="font-semibold">10g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>螺旋藻+海带</span>
                          <span className="font-semibold">10g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>益生菌粉+蜂花粉</span>
                          <span className="font-semibold">10g</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 bg-gradient-to-r from-[oklch(0.65_0.15_65)] to-[oklch(0.65_0.15_65)]/70 p-4 rounded-lg text-white">
                    <p className="font-bold text-lg">预计成本: ¥180-280</p>
                    <p className="text-sm mt-1">
                      木瓜含有消化酶，适合消化敏感的守宫
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Fig & Insects Formula */}
            <TabsContent value="figinsects" className="space-y-6">
              <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-purple-700 to-purple-600 text-white rounded-t-lg">
                  <CardTitle className="text-2xl">
                    Pangea Fig & Insects 无花果昆虫配方 - 500g
                  </CardTitle>
                  <CardDescription className="text-white/90">
                    营养全面，高蛋白
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="mb-6">
                    <h4 className="font-bold text-lg mb-2">官方成分表</h4>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                      Organic Dried Mango, Dried Apricot, Insect Meal, Micellar
                      Casein, Organic Dried Fig, Organic Natural Fig Flavor,
                      Calcium Carbonate, Di-Calcium Phosphate...
                    </p>
                    <div className="flex gap-4 mt-3">
                      <Badge variant="outline">蛋白质≥22%</Badge>
                      <Badge variant="outline">脂肪≥5%</Badge>
                      <Badge variant="outline">钙≥1.5%</Badge>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-bold text-purple-700 mb-3">
                        水果干粉 (240g, 48%)
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-purple-50 rounded">
                          <span>芒果干粉(有机)</span>
                          <span className="font-semibold">100g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-purple-50 rounded">
                          <span>杏干粉</span>
                          <span className="font-semibold">80g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-purple-50 rounded">
                          <span>无花果干粉(有机)</span>
                          <span className="font-semibold">60g</span>
                        </div>
                      </div>

                      <h4 className="font-bold text-[oklch(0.35_0.08_145)] mt-4 mb-3">
                        蛋白质 (160g, 32%)
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-[oklch(0.35_0.08_145)]/5 rounded">
                          <span>昆虫粉(蟋蟀/黑水虻)</span>
                          <span className="font-semibold">100g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-[oklch(0.35_0.08_145)]/5 rounded">
                          <span>酪蛋白(Micellar Casein)</span>
                          <span className="font-semibold">60g</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-gray-700 mb-3">
                        其他成分 (100g, 20%)
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>碳酸钙</span>
                          <span className="font-semibold">30g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>磷酸二钙</span>
                          <span className="font-semibold">20g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>天然无花果香精</span>
                          <span className="font-semibold">10g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>米糠</span>
                          <span className="font-semibold">20g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-100 rounded">
                          <span>卵磷脂+海带+蜂花粉</span>
                          <span className="font-semibold">20g</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 bg-gradient-to-r from-purple-700 to-purple-600 p-4 rounded-lg text-white">
                    <p className="font-bold text-lg">预计成本: ¥220-350</p>
                    <p className="text-sm mt-1">
                      有机原料价格较高，但营养价值最优
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Shopping List */}
      <section className="py-16 bg-[oklch(0.95_0.01_70)]">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 flex items-center justify-center gap-3">
              <ShoppingCart className="w-10 h-10 text-[oklch(0.65_0.15_65)]" />
              原料购买清单
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              所有原料均可在淘宝/京东购买
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="shadow-lg">
              <CardHeader className="bg-[oklch(0.65_0.15_65)] text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <Leaf className="w-5 h-5" /> 水果干粉类
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>香蕉干粉 250g</span>
                    <span>¥35-50</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>芒果干粉 250g</span>
                    <span>¥45-65</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>无花果干粉 250g</span>
                    <span>¥40-60</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>木瓜干粉 250g</span>
                    <span>¥35-50</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>枣干粉 500g</span>
                    <span>¥25-40</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>西瓜干粉 100g</span>
                    <span>¥30-45</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  搜索: 冻干水果粉、新疆特产店
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader className="bg-[oklch(0.35_0.08_145)] text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" /> 蛋白质类
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>乳清蛋白分离物 500g</span>
                    <span>¥120-180</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>酪蛋白 500g</span>
                    <span>¥150-220</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>全蛋粉 500g</span>
                    <span>¥60-90</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>黑水虻幼虫粉 250g</span>
                    <span>¥80-120</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>蟋蟀粉 250g</span>
                    <span>¥100-150</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  搜索: ON/MyProtein、爬宠饲料店
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader className="bg-[oklch(0.65_0.15_160)] text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <Beaker className="w-5 h-5" /> 营养强化类
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>碳酸钙粉 500g</span>
                    <span>¥15-25</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>磷酸二钙 500g</span>
                    <span>¥20-35</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>螺旋藻粉 100g</span>
                    <span>¥30-50</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>蜂蜜粉 250g</span>
                    <span>¥40-60</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>海带粉 250g</span>
                    <span>¥15-25</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>牛磺酸 100g</span>
                    <span>¥25-40</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  搜索: 药店、保健品店、烘焙原料店
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Making Steps */}
      <section className="py-16 bg-background">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 flex items-center justify-center gap-3">
              <Clock className="w-10 h-10 text-[oklch(0.65_0.15_160)]" />
              制作步骤
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              从购买到制作的完整流程
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl">步骤1：准备和研磨</CardTitle>
                <CardDescription>耗时：30-45分钟</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-[oklch(0.35_0.08_145)] text-white flex items-center justify-center flex-shrink-0 font-bold">
                    1
                  </div>
                  <p>购买所有干果原料后，用食品研磨机分别研磨成细粉</p>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-[oklch(0.35_0.08_145)] text-white flex items-center justify-center flex-shrink-0 font-bold">
                    2
                  </div>
                  <p>使用80目筛网过筛所有粉末，确保细腻无颗粒</p>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-[oklch(0.35_0.08_145)] text-white flex items-center justify-center flex-shrink-0 font-bold">
                    3
                  </div>
                  <p>将过筛后的粉末分别放入干净的容器中</p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl">步骤2：精确称量</CardTitle>
                <CardDescription>耗时：10-15分钟</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-[oklch(0.65_0.15_65)] text-white flex items-center justify-center flex-shrink-0 font-bold">
                    1
                  </div>
                  <p>使用精密电子秤(精度0.1g)称量每种原料</p>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-[oklch(0.65_0.15_65)] text-white flex items-center justify-center flex-shrink-0 font-bold">
                    2
                  </div>
                  <p>按配方表依次称量，使用独立容器避免交叉污染</p>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-[oklch(0.65_0.15_65)] text-white flex items-center justify-center flex-shrink-0 font-bold">
                    3
                  </div>
                  <p>记录实际称量数据，便于后续调整</p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl">步骤3：分层混合</CardTitle>
                <CardDescription>耗时：15-20分钟</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-[oklch(0.65_0.15_160)] text-white flex items-center justify-center flex-shrink-0 font-bold">
                    1
                  </div>
                  <p>先将所有水果干粉混合均匀 (5分钟)</p>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-[oklch(0.65_0.15_160)] text-white flex items-center justify-center flex-shrink-0 font-bold">
                    2
                  </div>
                  <p>加入蛋白质类原料，继续混合 (5分钟)</p>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-[oklch(0.65_0.15_160)] text-white flex items-center justify-center flex-shrink-0 font-bold">
                    3
                  </div>
                  <p>最后加入矿物质和微量成分 (5分钟)</p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl">步骤4：装罐存储</CardTitle>
                <CardDescription>耗时：5分钟</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-gray-700 text-white flex items-center justify-center flex-shrink-0 font-bold">
                    1
                  </div>
                  <p>将混合好的干粉倒入密封玻璃罐</p>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-gray-700 text-white flex items-center justify-center flex-shrink-0 font-bold">
                    2
                  </div>
                  <p>放入1-2包食品级干燥剂</p>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-gray-700 text-white flex items-center justify-center flex-shrink-0 font-bold">
                    3
                  </div>
                  <p>贴上标签：配方名称、制作日期、保质期</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12 max-w-2xl mx-auto">
            <Card className="shadow-lg border-2 border-[oklch(0.65_0.15_65)]">
              <CardHeader>
                <CardTitle className="text-2xl text-center">喂食方法</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="font-bold text-lg">调配比例</p>
                    <p className="text-muted-foreground">
                      1份干粉 + 2-2.5份温水
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="font-bold text-lg">最终稠度</p>
                    <p className="text-muted-foreground">类似番茄酱</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="font-bold text-lg">喂食时间</p>
                    <p className="text-muted-foreground">晚上7-9点</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="font-bold text-lg">清理时间</p>
                    <p className="text-muted-foreground">24小时内移除</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Breeding Guide CTA */}
      <section className="py-16 bg-gradient-to-r from-[oklch(0.55_0.20_300)] to-[oklch(0.45_0.15_280)]">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center text-white">
            <Dna className="w-16 h-16 mx-auto mb-6 opacity-90" />
            <h2 className="text-4xl font-bold mb-4">
              想要培育漂亮的睫角守宫？
            </h2>
            <p className="text-xl mb-8 text-white/90">
              了解睫角守宫的遗传规律，从基础花色到稀有基因，掌握科学的选育配对策略
            </p>
            <Link href="/gecko-diet/breeding">
              <Button
                size="lg"
                className="bg-white text-[oklch(0.45_0.15_280)] hover:bg-white/90 text-lg px-8 py-6"
              >
                查看选育指南
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-[oklch(0.25_0.02_145)] text-white">
        <div className="container text-center">
          <p className="text-lg font-semibold mb-2">睫角守宫饮食全解析</p>
          <p className="text-sm text-white/70">
            基于Repashy和Pangea官方成分表推导的家庭制作配方指南
          </p>
          <div className="mt-4">
            <Link
              href="/gecko-diet/breeding"
              className="text-white/70 hover:text-white underline"
            >
              选育指南
            </Link>
          </div>
          <p className="text-xs text-white/50 mt-4">
            本指南仅供参考，请根据守宫的实际反应调整配方
          </p>
        </div>
      </footer>
    </div>
  );
}
