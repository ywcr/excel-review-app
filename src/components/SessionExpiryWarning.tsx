"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

/**
 * 会话过期提醒组件
 * 当会话即将过期时显示提醒，允许用户延长会话
 */
export default function SessionExpiryWarning() {
  const { sessionExpiryWarning, extendSession, logout } = useAuth();
  const [countdown, setCountdown] = useState(5 * 60); // 5分钟倒计时
  const [isExtending, setIsExtending] = useState(false);

  useEffect(() => {
    if (!sessionExpiryWarning) {
      setCountdown(5 * 60);
      return;
    }

    // 倒计时
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionExpiryWarning]);

  const handleExtend = async () => {
    setIsExtending(true);
    try {
      await extendSession();
    } catch (error) {
      console.error("延长会话失败:", error);
    } finally {
      setIsExtending(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!sessionExpiryWarning) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[10000] max-w-md animate-in slide-in-from-bottom-5"
      role="alert"
      aria-live="assertive"
    >
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg shadow-2xl p-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-6 w-6 text-white animate-pulse"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium">会话即将过期</h3>
            <p className="mt-2 text-sm opacity-90">
              由于长时间无活动，您的会话将在{" "}
              <span className="font-bold text-lg">{formatTime(countdown)}</span>{" "}
              后自动登出
            </p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleExtend}
                disabled={isExtending}
                className="flex-1 bg-white text-orange-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isExtending ? (
                  <>
                    <span className="inline-block animate-spin mr-2">⟳</span>
                    延长中...
                  </>
                ) : (
                  "继续使用"
                )}
              </button>
              <button
                onClick={logout}
                className="flex-1 bg-transparent border-2 border-white text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-orange-500 transition-all"
              >
                立即登出
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
