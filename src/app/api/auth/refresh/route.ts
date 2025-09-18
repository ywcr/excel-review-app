import { NextRequest, NextResponse } from "next/server";
import {
  verifyTokenWithSession,
  verifyToken,
  generateToken,
  findUserByUsername,
  setUserSession,
  hashToken,
  getDeviceInfo,
  isVercelEnvironment,
  type ActiveSession,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    // 从cookie中获取当前token
    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "未找到认证令牌" }, { status: 401 });
    }

    // 🆕 使用增强的token验证（包含会话验证）
    // 对于refresh，我们需要特殊处理，因为token可能即将过期
    let user;
    try {
      // 在 Vercel 环境中，直接使用基本 JWT 验证
      if (isVercelEnvironment()) {
        user = verifyToken(token);
        if (!user) {
          // 如果基本验证失败，尝试解析过期的token
          try {
            const jwt = await import("jsonwebtoken");
            const JWT_SECRET =
              process.env.JWT_SECRET ||
              "your-super-secret-jwt-key-change-this-in-production";
            user = jwt.decode(token);
          } catch (decodeError) {
            return NextResponse.json(
              { error: "无效的认证令牌" },
              { status: 401 }
            );
          }
        }
      } else {
        // 本地环境使用完整的会话验证
        user = verifyTokenWithSession(token);
      }
    } catch (error: any) {
      // 如果会话验证失败，尝试基本的token验证
      try {
        user = verifyToken(token);
        if (user && !isVercelEnvironment()) {
          // Token有效但会话可能失效，需要重新验证用户
          const currentUser = findUserByUsername(user.username);
          if (!currentUser || !currentUser.activeSession) {
            return NextResponse.json(
              {
                error: "会话已失效，请重新登录",
              },
              { status: 401 }
            );
          }
        }
      } catch (tokenError: any) {
        // 如果是过期错误，尝试解析过期的token
        if (tokenError.name === "TokenExpiredError") {
          const jwt = await import("jsonwebtoken");
          const JWT_SECRET =
            process.env.JWT_SECRET ||
            "your-super-secret-jwt-key-change-this-in-production";
          user = jwt.decode(token);
        } else {
          return NextResponse.json(
            { error: "无效的认证令牌" },
            { status: 401 }
          );
        }
      }
    }

    if (!user || typeof user === "string" || !user.username) {
      return NextResponse.json({ error: "无效的用户信息" }, { status: 401 });
    }

    // 验证用户是否仍然存在（账户删除检测）
    const currentUser = findUserByUsername(user.username);
    if (!currentUser) {
      console.log(`用户 ${user.username} 账户已被删除，拒绝令牌刷新`);
      return NextResponse.json(
        {
          error: "用户账户已被删除，请重新登录",
        },
        { status: 401 }
      );
    }

    // 生成新的JWT令牌
    const newToken = generateToken(currentUser);

    // 🆕 更新会话信息（仅在非 Vercel 环境中）
    if (!isVercelEnvironment()) {
      const newTokenHash = hashToken(newToken);

      if (currentUser.activeSession) {
        // 更新现有会话
        const updatedSession: ActiveSession = {
          ...currentUser.activeSession,
          tokenHash: newTokenHash,
          lastActivity: new Date().toISOString(),
        };
        setUserSession(currentUser.id, updatedSession);
      }
    }

    // 创建响应
    const response = NextResponse.json({
      success: true,
      message: "令牌刷新成功",
      user: {
        id: currentUser.id,
        username: currentUser.username,
        role: currentUser.role,
      },
    });

    // 设置新的HTTP-only cookie（持久化会话配置）
    response.cookies.set("auth-token", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1年过期时间，支持持久化会话
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("令牌刷新API错误:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
