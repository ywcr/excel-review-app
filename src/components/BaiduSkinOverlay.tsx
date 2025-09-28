"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import UserMenu from "@/components/UserMenu";

interface BaiduSkinOverlayProps {
  onFileSelected: (file: File) => void;
  onStartValidate: () => void;
  progressPercent?: number; // 0-100
  progressText?: string | null;
  isLoggedIn?: boolean;
  fileName?: string | null;
  // 皮肤切换
  isBaiduSkin?: boolean;
  onSwitchSkin?: (skin: "classic" | "baidu") => void;
  // 审核报告下载
  isDownloadAvailable?: boolean;
  onDownloadReport?: () => void;
  // 任务选择
  onOpenTaskSelector?: () => void;
  // 当前选中的任务类型（用于更新左侧工具显示）
  selectedTask?: string | null;
  // 本轮审核是否已完成（非中间态）
  isRunCompleted?: boolean;
}

/**
 * 在皮肤2页面之上叠加交互：
 * - 点击搜索框(#kw 或 input[name=wd]) 触发本地文件选择
 * - 点击“百度一下”(#su 或 input[type=submit][value*="百度一下"]) 触发开始审核
 * - 在搜索框下方贴合显示进度条
 * - 右上角显示当前登录用户与菜单（复用 UserMenu）
 */
export default function BaiduSkinOverlay({
  onFileSelected,
  onStartValidate,
  progressPercent = 0,
  progressText = null,
  isLoggedIn = false,
  fileName = null,
  isBaiduSkin = true,
  onSwitchSkin,
  isDownloadAvailable = false,
  onDownloadReport,
  onOpenTaskSelector,
  selectedTask = null,
  isRunCompleted = false,
}: BaiduSkinOverlayProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const downloadBtnRef = useRef<HTMLElement | null>(null);
  const downloadCbRef = useRef<(() => void) | null>(null);
  const hintTimer = useRef<number | null>(null);
  const [downloadHint, setDownloadHint] = useState<string | null>(null);


  const handleDownloadClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const cb = downloadCbRef.current;
    if (!isDownloadAvailable || !cb) {
      const msg = isRunCompleted ? "本次审核未发现问题，无需下载" : "暂无审核结果，请先完成审核";
      setDownloadHint(msg);
      try {
        if (hintTimer.current) window.clearTimeout(hintTimer.current as any);
        hintTimer.current = window.setTimeout(
          () => setDownloadHint(null),
          1800
        ) as any;
      } catch {}
      return;
    }
    cb();
  };

  // 选择器集合，兼容首页与结果页
  const inputSelectors = useMemo(
    () => [
      "#chat-input-area", // 明确的容器优先
      "#maiU",
      "#maiU input",
      "#maiU textarea",
      "#kw",
      "input[name=wd]",
      "input[type=text][name=q]",
      ".chat-input-area",
      ".chat-input-area input",
      ".chat-input-area textarea",
    ],
    []
  );
  const buttonSelectors = useMemo(
    () => [
      "#chat-submit-button",
      "#su",
      'input[type=submit][value*="百度一下"]',
      "button[type=submit]",
    ],
    []
  );

  useEffect(() => {
    const capture = true;
    const attached = {
      kwEl: null as HTMLElement | null,
      containerEl: null as HTMLElement | null,
      btnEl: null as HTMLElement | null,
      leftToolEl: null as HTMLElement | null,
      ro: null as ResizeObserver | null,
      hidHeader: false,
    };

    const rectEquals = (a: DOMRect | null, b: DOMRect | null) => {
      if (!a && !b) return true;
      if (!a || !b) return false;
      const toKey = (r: DOMRect) =>
        [r.left, r.top, r.width, r.height]
          .map((v) => Number(v.toFixed(2)))
          .join(",");
      return toKey(a) === toKey(b);
    };

    const updateRect = () => {
      const src = attached.containerEl || attached.kwEl;
      if (!src) return;
      try {
        const r = src.getBoundingClientRect();
        setAnchorRect(prev => (rectEquals(prev, r) ? prev : r));
      } catch {}
    };

    // 在滚动时更新定位（使用 rAF 节流）
    let scrollScheduled = false;
    const onScroll = () => {
      if (scrollScheduled) return;
      scrollScheduled = true;
      try {
        requestAnimationFrame(() => {
          scrollScheduled = false;
          updateRect();
        });
      } catch {
        scrollScheduled = false;
        updateRect();
      }
    };

    // 监听页面滚动（窗口与文档）
    try {
      window.addEventListener('scroll', onScroll, { passive: true } as any);
      document.addEventListener('scroll', onScroll, { passive: true, capture: true } as any);
    } catch {}

    const isWithinSubmit = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return false;
      if (target.closest("#chat-submit-button")) return true;
      if (attached.btnEl && attached.btnEl.contains(target)) return true;
      // 兜底：常见的提交按钮选择器
      if (
        target.closest(
          '#su, input[type=submit][value*="百度一下"], button[type=submit]'
        )
      )
        return true;
      return false;
    };

    const handleAnyTrigger = (e: Event) => {
      if (isWithinSubmit(e.target)) {
        // 放行给按钮处理
        return;
      }
      try {
        (e as any).stopImmediatePropagation?.();
      } catch {}
      e.preventDefault();
      e.stopPropagation();
      fileInputRef.current?.click();
    };

    const onKwPointerDown = (e: Event) => handleAnyTrigger(e);
    const onKwMouseDown = (e: Event) => handleAnyTrigger(e);
    const onKwClick = (e: Event) => handleAnyTrigger(e);

    const onBtnClick = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      // 若尚未选择任务，先弹出任务选择器
      const task = (selectedTask || "").trim();
      if (!task) {
        onOpenTaskSelector?.();
        return;
      }
      onStartValidate();
    };

    let attempts = 0;
    const maxAttempts = 30; // ~9s if interval=300ms
    const interval = 300;
    const timer = setInterval(() => {
      attempts++;

      // 容器优先：.chat-input-container
      if (!attached.containerEl) {
        const cont = document.querySelector<HTMLElement>(
          ".chat-input-container"
        );
        const isVisible = (el: HTMLElement) => {
          const style = window.getComputedStyle(el);
          const r = el.getBoundingClientRect();
          return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            r.width > 0 &&
            r.height > 0
          );
        };
        if (cont && isVisible(cont)) {
          attached.containerEl = cont;
          updateRect();
          if ((window as any).ResizeObserver) {
            attached.ro = new ResizeObserver(() => updateRect());
            attached.ro.observe(cont);
          } else {
            window.addEventListener("resize", updateRect);
          }
        }
      }

      if (!attached.kwEl) {
        // 选取第一个可见且不在 #form 内部的候选
        const candidates = inputSelectors
          .map((sel) => document.querySelector<HTMLElement>(sel))
          .filter(Boolean) as HTMLElement[];
        const isVisible = (el: HTMLElement) => {
          const style = window.getComputedStyle(el);
          const r = el.getBoundingClientRect();
          return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            r.width > 0 &&
            r.height > 0
          );
        };
        const notInHiddenForm = (el: HTMLElement) => !el.closest("#form");
        const kwEl =
          candidates.find((el) => isVisible(el) && notInHiddenForm(el)) || null;
        if (kwEl) {
          attached.kwEl = kwEl;
          try {
            kwEl.style.cursor = "pointer";
          } catch {}
          // 捕获阶段阻止默认，让 textarea 不获取焦点
          kwEl.addEventListener("pointerdown", onKwPointerDown, capture);
          kwEl.addEventListener("mousedown", onKwMouseDown, capture);
          kwEl.addEventListener("click", onKwClick, capture);
          // 如果尚未有容器，使用输入框定位
          if (!attached.containerEl) updateRect();
        }
      }

      if (!attached.btnEl) {
        const btnEl =
          buttonSelectors
            .map((sel) => document.querySelector<HTMLElement>(sel))
            .find(Boolean) || null;
        if (btnEl) {
          attached.btnEl = btnEl;
          btnEl.addEventListener("click", onBtnClick, capture);
        }
      }

      // 左侧工具：任务选择触发
      if (!attached.leftToolEl) {
        const lt = document.querySelector<HTMLElement>(".left-tool_12WeH");
        if (lt) {
          attached.leftToolEl = lt;
          const onLtClick = (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            onOpenTaskSelector?.();
          };
          lt.addEventListener("click", onLtClick, capture);
          // 把清理函数绑到 el 上，便于卸载
          (lt as any).__skin2_onLtClick = onLtClick;
        }
      }

      // 隐藏右上角的“登录/设置”（避免与 UserMenu 重叠）
      if (!attached.hidHeader) {
        const candidates = Array.from(
          document.querySelectorAll<HTMLElement>("a,button")
        );
        const isTopRight = (el: HTMLElement) => {
          const r = el.getBoundingClientRect();
          return r.top < 160 && r.left > window.innerWidth * 0.6;
        };
        let hidAny = false;
        for (const el of candidates) {
          const txt = (el.innerText || "").trim();
          if ((txt === "登录" || txt === "设置") && isTopRight(el)) {
            try {
              el.style.display = "none";
              hidAny = true;
            } catch {}
          }
        }
        if (hidAny) attached.hidHeader = true;
      }

      if ((attached.kwEl && attached.btnEl) || attempts >= maxAttempts) {
        clearInterval(timer);
      }
    }, interval);

    return () => {
      clearInterval(timer);
      if (attached.kwEl) {
        attached.kwEl.removeEventListener(
          "pointerdown",
          onKwPointerDown,
          capture
        );
        attached.kwEl.removeEventListener("mousedown", onKwMouseDown, capture);
        attached.kwEl.removeEventListener("click", onKwClick, capture);
      }
      if (attached.btnEl)
        attached.btnEl.removeEventListener("click", onBtnClick, capture);
      if (attached.leftToolEl) {
        const handler = (attached.leftToolEl as any).__skin2_onLtClick as any;
        if (handler)
          attached.leftToolEl.removeEventListener("click", handler, capture);
      }
      if (attached.ro) attached.ro.disconnect(); else window.removeEventListener('resize', updateRect);
      try {
        window.removeEventListener('scroll', onScroll as any, { passive: true } as any);
        document.removeEventListener('scroll', onScroll as any, { capture: true } as any);
      } catch {}
      // 清理注入的下载icon
      try { downloadBtnRef.current?.remove(); } catch {}
      downloadBtnRef.current = null;
      // downloadBtnRef.current = null;
    };
  }, [inputSelectors, buttonSelectors, onStartValidate]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
    // 清空值以便可以重复选相同文件
    e.target.value = "";
  };

  const clamped = Math.max(0, Math.min(progressPercent || 0, 100));

  // 保持最新下载回调
  useEffect(() => {
    downloadCbRef.current = onDownloadReport || null;
  }, [onDownloadReport]);


  // 根据 isDownloadAvailable 注入/移除下载icon；当容器未准备好时自动重试一段时间
  useEffect(() => {
    let disposed = false;
    let attempts = 0;
    let injected = false;
    let timer: any | null = null;

    const tryInject = () => {
      const rt = document.getElementById("right-tool");
      if (!rt) return false;
      const existing = rt.querySelector(
        "[data-skin2-download]"
      ) as HTMLElement | null;
      if (!isDownloadAvailable) {
        if (existing) {
          try {
            existing.remove();
          } catch {}
        }
        downloadBtnRef.current = null;
        return true;
      }
      if (existing) {
        injected = true;
        downloadBtnRef.current = existing as any;
        return true;
      }
      // 注入新的按钮
      const exemplar = rt.querySelector("button, a, span, i, svg");
      const el = document.createElement("button");
      el.type = "button";
      el.setAttribute("data-skin2-download", "");
      el.setAttribute("title", "下载审核结果");
      el.style.marginLeft = "8px";
      el.style.marginRight = "8px";
      el.style.cursor = "pointer";
      const baseClass =
        exemplar && (exemplar as HTMLElement).className
          ? (exemplar as HTMLElement).className
          : "s-toolbar-icon";
      el.className = baseClass;
      el.innerHTML =
        '<svg t="1758876825249" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1483" width="20" height="20"><path d="M896 672c-17.066667 0-32 14.933333-32 32v128c0 6.4-4.266667 10.666667-10.666667 10.666667H170.666667c-6.4 0-10.666667-4.266667-10.666667-10.666667v-128c0-17.066667-14.933333-32-32-32s-32 14.933333-32 32v128c0 40.533333 34.133333 74.666667 74.666667 74.666667h682.666666c40.533333 0 74.666667-34.133333 74.666667-74.666667v-128c0-17.066667-14.933333-32-32-32z" fill="#666666" p-id="1484"></path><path d="M488.533333 727.466667c6.4 6.4 14.933333 8.533333 23.466667 8.533333s17.066667-2.133333 23.466667-8.533333l213.333333-213.333334c12.8-12.8 12.8-32 0-44.8-12.8-12.8-32-12.8-44.8 0l-157.866667 157.866667V170.666667c0-17.066667-14.933333-32-32-32s-34.133333 14.933333-34.133333 32v456.533333L322.133333 469.333333c-12.8-12.8-32-12.8-44.8 0-12.8 12.8-12.8 32 0 44.8l211.2 213.333334z" fill="#666666" p-id="1485"></path></svg>';
      el.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        downloadCbRef.current && downloadCbRef.current();
      });
      rt.appendChild(el);
      downloadBtnRef.current = el;
      injected = true;
      return true;
    };

    if (isDownloadAvailable) {
      // 立即尝试一次
      tryInject();
      // 若容器尚未准备好，则轮询等待出现
      if (!injected) {
        timer = setInterval(() => {
          if (disposed) {
            if (timer) clearInterval(timer);
            return;
          }
          attempts++;
          if (tryInject()) {
            if (timer) clearInterval(timer);
          } else if (attempts > 40) {
            if (timer) clearInterval(timer);
          }
        }, 300);
      }
    } else {
      // 不可用时清理按钮
      const ex = document
        .getElementById("right-tool")
        ?.querySelector("[data-skin2-download]") as HTMLElement | null;
      if (ex) {
        try {
          ex.remove();
        } catch {}
      }
      downloadBtnRef.current = null;
    }

    return () => {
      disposed = true;
      if (timer) clearInterval(timer);
      const ex = document
        .getElementById("right-tool")
        ?.querySelector("[data-skin2-download]") as HTMLElement | null;
      if (ex) {
        try {
          ex.remove();
        } catch {}
      }
      downloadBtnRef.current = null;
    };
  }, [isDownloadAvailable]);

  useEffect(() => {
    if (!isLoggedIn) return;
    try {
      const el = document.querySelector<HTMLElement>(
        ".s-top-right.s-isindex-wrap"
      );
      if (el) el.style.display = "none";
    } catch {}
  }, [isLoggedIn]);

  // 清理提示定时器
  useEffect(() => {
    return () => {
      try {
        if (hintTimer.current) window.clearTimeout(hintTimer.current as any);
      } catch {}
    };
  }, []);

  // 文件名变化时，回填到可见的输入控件
  useEffect(() => {
    const name = fileName || "";
    const selectors = [
      "#chat-input-area input",
      "#chat-input-area textarea",
      "#maiU input",
      "#maiU textarea",
      '#maiU [contenteditable="true"]',
      '#chat-input-area [contenteditable="true"]',
      "#kw",
      "input[name=wd]",
    ];
    const isVisible = (el: HTMLElement) => {
      const style = window.getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        r.width > 0 &&
        r.height > 0
      );
    };
    const notInHiddenForm = (el: HTMLElement) => !el.closest("#form");

    const target = (
      selectors
        .map((sel) => document.querySelector<HTMLElement>(sel))
        .filter(Boolean) as HTMLElement[]
    ).find((el) => isVisible(el) && notInHiddenForm(el));

    if (!target) return;

    try {
      if ((target as HTMLInputElement).value !== undefined) {
        const inp = target as HTMLInputElement;
        inp.value = name;
        inp.setAttribute("value", name);
        return;
      }
    } catch {}
    try {
      if ((target as HTMLTextAreaElement).value !== undefined) {
        const ta = target as HTMLTextAreaElement;
        ta.value = name;
        return;
      }
    } catch {}
    try {
      if (target.hasAttribute("contenteditable")) {
        target.textContent = name;
      }
    } catch {}
  }, [fileName]);

  // 左侧工具按钮内容更新为当前任务类型（清空原内容，直接使用任务名）
  useEffect(() => {
    const lt = document.querySelector<HTMLElement>(".left-tool_12WeH");
    if (!lt) return;
    const text = selectedTask || "选择任务";
    lt.innerHTML = "";
    lt.appendChild(document.createTextNode(text));
  }, [selectedTask]);

  return (
    <>
      {/* 隐藏的文件选择器 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        style={{ display: "none" }}
        onChange={onFileChange}
      />

      {/* 顶层覆盖层：进度条与用户菜单 */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 2147483647,
        }}
      >
        {/* 进度条：贴在 .chat-input-container 下方（若无则贴输入框），宽度不超过容器 */}
        {anchorRect && clamped > 0 ? (
          <div
            style={{
              position: "absolute",
              left: `${anchorRect.left}px`,
              top: `${anchorRect.bottom + 6}px`,
              width: `${anchorRect.width}px`,
            }}
          >
            <div
              style={{
                height: "4px",
                background: "#e5e7eb",
                borderRadius: "9999px",
                boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.04)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${clamped}%`,
                  height: "100%",
                  borderRadius: "9999px",
                  background:
                    "linear-gradient(90deg, rgba(59,130,246,1) 0%, rgba(99,102,241,1) 100%)",
                  transition: "width 200ms ease",
                }}
              />
            </div>
            {/* 文字进度 */}
            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                color: "#4b5563",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>{progressText || "处理中"}</span>
              <span>{`${Math.round(clamped)}%`}</span>
            </div>
          </div>
        ) : null}

        {/* 右上角用户菜单（可交互） */}
        <div
          style={{
            position: "fixed",
            top: 12,
            right: 12,
            pointerEvents: "auto",
          }}
        >
          <UserMenu isBaiduSkin={isBaiduSkin} onSwitchSkin={onSwitchSkin} />
        </div>

        {/* 下载按钮由脚本注入到 #right-tool 内，不再用绝对定位渲染 */}
      </div>

      {/* 固定位置下载按钮（兜底显示，避免容器未挂载导致不可见） */}
      {isBaiduSkin && (
        <>
          <button
            onClick={handleDownloadClick}
            title={isDownloadAvailable ? "下载审核结果" : (isRunCompleted ? "未发现问题，无需下载" : "暂无审核结果")}
            className={`fixed bottom-6 right-6 z-[2147483649] pointer-events-auto inline-flex items-center gap-2 px-4 py-2 rounded-full shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
              isDownloadAvailable
                ? "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 focus-visible:ring-blue-500"
                : "bg-gray-400 text-white hover:bg-gray-400 focus-visible:ring-gray-400"
            }`}
          >
            &nbsp;&nbsp;
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M3 14a2 2 0 012-2h2v2H5v2h10v-2h-2v-2h2a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2z" />
              <path d="M7 10a1 1 0 011-1h1V3a1 1 0 112 0v6h1a1 1 0 011 1v.01l-3 3-3-3V10z" />
            </svg>
            <span>下载</span>&nbsp;&nbsp;
          </button>
          {downloadHint && (
            <div className="fixed bottom-20 right-6 z-[2147483649] pointer-events-none bg-black/80 text-white text-xs px-3 py-1.5 rounded-md shadow">
              {downloadHint}
            </div>
          )}
        </>
      )}
    </>
  );
}
