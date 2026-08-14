import type { Metadata } from "next";
import PersonaFlowApp from "@/features/persona-flow/PersonaFlowApp";

export const metadata: Metadata = {
  title: "Persona Flow · 公开人员清单审核",
  description: "无需登录，在浏览器本地完成多份 Excel 人员清单审核，原始数据不上传。",
};

export default function PersonaFlowPage() {
  return <PersonaFlowApp />;
}
