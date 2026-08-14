import type { Metadata } from "next";
import PersonaFlowApp from "@/features/persona-flow/PersonaFlowApp";

export const metadata: Metadata = {
  title: "Persona Flow · 人员清单审核工具",
  description: "在浏览器本地完成多份 Excel 人员清单的字段映射、查重、异常分类和结果导出。",
};

export default function HomePage() {
  return <PersonaFlowApp />;
}
