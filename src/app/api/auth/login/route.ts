import { NextRequest, NextResponse } from "next/server";
import {
  authenticateUser,
  generateToken,
  clearUserSession,
  setUserSession,
  generateSessionId,
  hashToken,
  getDeviceInfo,
  isVercelEnvironment,
  type ActiveSession,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // 验证输入
    if (!username || !password) {
      return NextResponse.json(
        { error: "用户名和密码不能为空" },
        { status: 400 }
      );
    }

    // 验证用户凭据
    const user = await authenticateUser(username, password);

    if (!user) {
      return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
    }

    // 🆕 检查是否已有活跃会话，如果有则清除（实现互踢）
    // admin 角色允许多设备登录，不清除之前的会话
    if (user.activeSession && user.role !== "admin") {
      console.log(`用户 ${username} 在其他设备登录，清除之前的会话`);
      clearUserSession(user.id);
    }

    // 🆕 创建新的会话信息（仅在非 Vercel 环境中）
    let sessionId = generateSessionId();

    // 生成JWT令牌（包含会话ID）
    const token = generateToken(user, sessionId);

    // 在所有环境中都保存会话信息
    const deviceInfo = getDeviceInfo(request);
    const tokenHash = hashToken(token);

    const newSession: ActiveSession = {
      sessionId,
      tokenHash,
      deviceInfo,
      loginTime: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
    };

    // 🆕 保存会话信息（Vercel环境会保存在内存中）
    setUserSession(user.id, newSession);

    // 创建响应（不返回敏感信息）
    const response = NextResponse.json({
      success: true,
      message: "登录成功",
    });

    // 设置HTTP-only cookie（持久化会话配置）
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // 开发环境允许HTTP
      sameSite: "lax", // 放宽同站策略以支持更好的兼容性
      maxAge: 365 * 24 * 60 * 60, // 1年过期时间（单位：秒），支持持久化会话
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("登录API错误:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
