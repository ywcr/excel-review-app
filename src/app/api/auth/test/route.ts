import { NextRequest, NextResponse } from "next/server";
import {
  isVercelEnvironment,
  loadUsers,
  verifyToken,
  generateToken,
  findUserByUsername,
} from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const environment = isVercelEnvironment()
      ? "Vercel/Production"
      : "Local/Development";
    const users = loadUsers();

    // 测试用户查找
    const adminUser = findUserByUsername("admin");

    // 测试 JWT 生成和验证
    let tokenTest = null;
    if (adminUser) {
      const testToken = generateToken(adminUser);
      const verifiedToken = verifyToken(testToken);
      tokenTest = {
        generated: !!testToken,
        verified: !!verifiedToken,
        username: verifiedToken?.username,
      };
    }

    return NextResponse.json({
      success: true,
      environment,
      timestamp: new Date().toISOString(),
      tests: {
        userDataLoaded: users.users.length > 0,
        adminUserExists: !!adminUser,
        jwtTest: tokenTest,
      },
      users: {
        count: users.users.length,
        usernames: users.users.map((u) => u.username),
        details: users.users.map((u) => ({
          id: u.id,
          username: u.username,
          role: u.role,
          createdAt: u.createdAt,
          lastLogin: u.lastLogin,
          hasActiveSession: !!u.activeSession,
        })),
      },
      config: {
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL,
        hasJwtSecret: !!process.env.JWT_SECRET,
      },
    });
  } catch (error) {
    console.error("认证测试失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        environment: isVercelEnvironment()
          ? "Vercel/Production"
          : "Local/Development",
      },
      { status: 500 }
    );
  }
}
