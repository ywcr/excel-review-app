"use client";

import React, { useEffect, useState, useRef } from "react";

interface Skin2ReplicaProps {
  // 例如 "/百度首页/www.baidu.com/index.html" 或 "/www.baidu.com2/www.baidu.com/s.html"
  srcPath?: string;
  // 去静态文件化：支持直接传入快照数据（优先级高于 srcPath）
  cssLinks?: string[];
  inlineStyles?: string[];
  bodyHtml?: string;
  // 可选：内容注入完成后的回调
  onContentReady?: () => void;
}

/**
 * 皮肤2页面还原组件（无 iframe）
 * - 仅注入 CSS（<style> 与 <link rel="stylesheet">），不执行任何脚本
 * - 渲染目标 HTML 的 <body> 内容，确保视觉还原
 * - 卸载时清理注入到 <head> 的样式，避免污染全局
 */
function Skin2ReplicaInner({ srcPath, cssLinks, inlineStyles, bodyHtml, onContentReady }: Skin2ReplicaProps) {
  const [html, setHtml] = useState<string>(bodyHtml || "");
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;
    const appendedHeadNodes: HTMLElement[] = [];

    async function injectFromSnapshot() {
      // 注入 inlineStyles 与 cssLinks
      try {
        for (const content of inlineStyles || []) {
          const styleEl = document.createElement("style");
          styleEl.setAttribute("data-skin2", "");
          styleEl.textContent = content;
          document.head.appendChild(styleEl);
          appendedHeadNodes.push(styleEl);
        }
        for (const href of cssLinks || []) {
          if (!href) continue;
          const linkEl = document.createElement("link");
          linkEl.setAttribute("rel", "stylesheet");
          linkEl.setAttribute("href", href);
          linkEl.setAttribute("data-skin2", "");
          document.head.appendChild(linkEl);
          appendedHeadNodes.push(linkEl);
        }
        if (!canceled && bodyHtml) {
          setHtml(bodyHtml);
          // 下一帧通知
          requestAnimationFrame(() => onContentReady?.());
        }
      } catch (e: any) {
        if (!canceled) setError(e?.message || String(e));
      }
    }

    async function injectFromRemote(path: string) {
      try {
        setError(null);
        setHtml("");
        const res = await fetch(path, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, "text/html");
        // <style>
        const styleTags = Array.from(doc.head?.querySelectorAll("style") || []);
        for (const st of styleTags) {
          const styleEl = document.createElement("style");
          styleEl.setAttribute("data-skin2", "");
          styleEl.textContent = st.textContent || "";
          document.head.appendChild(styleEl);
          appendedHeadNodes.push(styleEl);
        }
        // <link rel="stylesheet">
        const linkTags = Array.from(
          doc.head?.querySelectorAll('link[rel="stylesheet"]') || []
        );
        for (const ln of linkTags) {
          const href = ln.getAttribute("href");
          if (!href) continue;
          const linkEl = document.createElement("link");
          linkEl.setAttribute("rel", "stylesheet");
          linkEl.setAttribute("href", href);
          linkEl.setAttribute("data-skin2", "");
          document.head.appendChild(linkEl);
          appendedHeadNodes.push(linkEl as HTMLLinkElement);
        }
        const inner = doc.body?.innerHTML || "";
        if (!canceled) {
          setHtml(inner);
          requestAnimationFrame(() => onContentReady?.());
        }
      } catch (e: any) {
        if (!canceled) setError(e?.message || String(e));
      }
    }

    // 选择注入方式
    if (bodyHtml) {
      injectFromSnapshot();
    } else if (srcPath) {
      injectFromRemote(srcPath);
    } else {
      setError("未提供 srcPath 或 snapshot 数据");
    }

    return () => {
      canceled = true;
      for (const node of appendedHeadNodes) {
        try {
          node.parentNode?.removeChild(node);
        } catch {}
      }
    };
  }, [srcPath, bodyHtml, JSON.stringify(cssLinks), JSON.stringify(inlineStyles)]);

  if (error) {
    return (
      <div style={{ padding: 16, color: "#c00", background: "#fff5f5" }}>
        页面加载失败：{error}
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="skin2-replica" dangerouslySetInnerHTML={{ __html: html }} />
  );
}

export default React.memo(Skin2ReplicaInner, () => true);
