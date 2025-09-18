import { NextResponse } from "next/server";

export async function GET() {
  // 仅在开发环境或特定条件下提供环境变量调试信息
  const isDev = process.env.NODE_ENV === "development";
  
  if (!isDev) {
    return NextResponse.json({ 
      error: "此端点仅在开发环境可用" 
    }, { status: 403 });
  }

  return NextResponse.json({
    NODE_ENV: process.env.NODE_ENV,
    JWT_SECRET_EXISTS: !!process.env.JWT_SECRET,
    JWT_SECRET_LENGTH: process.env.JWT_SECRET?.length || 0,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });
}
