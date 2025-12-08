"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface UserMenuProps {
  isBaiduSkin?: boolean;
  onSwitchSkin?: (skin: "classic" | "baidu") => void;
}

export default function UserMenu({
  isBaiduSkin = false,
  onSwitchSkin,
}: UserMenuProps) {
  const { user, logout, isLoading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-pulse bg-gray-200 h-8 w-20 rounded"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    setIsMenuOpen(false);
    await logout();
  };

  // 针对百度皮肤的更精细样式
  const triggerClass = isBaiduSkin
    ? "inline-flex items-center gap-1 text-[13px] text-[#222] hover:text-[#315efb] px-1.5 py-1 rounded-sm"
    : "flex items-center space-x-2 text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-md px-3 py-2";
  const avatarClass = isBaiduSkin
    ? "w-6 h-6 bg-[#f0f3ff] rounded-full flex items-center justify-center"
    : "w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center";
  const dropdownClass = isBaiduSkin
    ? "absolute right-0 mt-1 w-44 bg-white rounded-sm p-2 shadow-[0_2px_8px_rgba(0,0,0,0.08)] z-20 border border-[#e6e6e6]"
    : "absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20 border border-gray-200";
  const itemClass = isBaiduSkin
    ? "block w-full text-left px-3 py-2 text-[13px] text-[#222] hover:bg-[#f5f5f7]"
    : "block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100";

  return (
    <div className="relative">
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className={triggerClass}
      >
        <div className="flex items-center space-x-2">
          <div className={avatarClass}>
            <span
              className={
                isBaiduSkin
                  ? "text-[#315efb] font-medium text-[12px]"
                  : "text-indigo-600 font-medium text-sm"
              }
            >
              {user.username.charAt(0).toUpperCase()}
            </span>
          </div>
          <span
            className={
              isBaiduSkin
                ? "text-[13px] max-w-[120px] truncate"
                : "text-sm font-medium max-w-[120px] truncate"
            }
          >
            {user.username}
          </span>
          <svg
            className={`w-4 h-4 transition-transform ${
              isMenuOpen ? "rotate-180" : ""
            } ${isBaiduSkin ? "text-[#999]" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {isMenuOpen && (
        <>
          {/* 背景遮罩 */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* 下拉菜单 */}
          <div className={dropdownClass}>
            {isBaiduSkin ? null : (
              <div className="px-4 pb-2 text-sm text-gray-600 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{user.username}</span>
                  <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                    {user.role}
                  </span>
                </div>
              </div>
            )}
            {user?.role === "admin" && (
              <>
                <Link href="/compare" className={itemClass}>
                  📊 文件对比
                </Link>
                <Link href="/multi-review" className={itemClass}>
                  🚀 多文件审核
                </Link>
              </>
            )}
            {/* {onSwitchSkin && (
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onSwitchSkin(isBaiduSkin ? "classic" : "baidu");
                }}
                className={itemClass}
              >
                <div className="flex items-center">
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582A2 2 0 007 9h10a2 2 0 002-2V4M20 20v-5h-.582A2 2 0 0017 15H7a2 2 0 01-2-2v7"
                    />
                  </svg>
                  {isBaiduSkin ? "切换回原皮肤" : "切换到百度皮肤"}
                </div>
              </button>
            )} */}

            {isBaiduSkin && <div className="my-1 border-t border-[#f0f0f0]" />}
            <button onClick={handleLogout} className={itemClass}>
              <div className="flex items-center">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                登出
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
