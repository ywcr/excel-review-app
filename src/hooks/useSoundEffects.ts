"use client";

import { useCallback } from "react";
import { useAtmosphereSettings } from "../components/AtmosphereSettings";

export function useSoundEffects() {
  const { settings } = useAtmosphereSettings();

  const playSound = useCallback(
    (frequency: number, duration: number, type: OscillatorType = "sine") => {
      if (!settings.enableSounds || typeof window === "undefined") return;

      try {
        const audioContext = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(
          frequency,
          audioContext.currentTime
        );
        oscillator.type = type;

        gainNode.gain.setValueAtTime(0.06, audioContext.currentTime); // 降低音量
        gainNode.gain.exponentialRampToValueAtTime(
          0.005,
          audioContext.currentTime + duration
        );

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
      } catch (error) {
        console.warn("Sound playback failed:", error);
      }
    },
    [settings.enableSounds]
  );

  const playSuccessSound = useCallback(() => {
    // 简洁轻快的成功音效 - 单音符上升
    playSound(659.25, 0.12); // E5 - 短促明亮
  }, [playSound]);

  const playErrorSound = useCallback(() => {
    // 简洁的提示音效 - 温和下降音
    playSound(440, 0.15, "triangle"); // A4 - 柔和提示
  }, [playSound]);

  const playClickSound = useCallback(() => {
    // 极简的点击音效 - 更短更轻
    playSound(800, 0.08, "sine");
  }, [playSound]);

  const playUploadSound = useCallback(() => {
    // 简洁的上传音效 - 快速双音
    playSound(523.25, 0.1); // C5
    setTimeout(() => playSound(659.25, 0.1), 60); // E5 - 缩短间隔
  }, [playSound]);

  const playCompleteSound = useCallback(() => {
    // 简洁的完成音效 - 轻快三音
    playSound(523.25, 0.12); // C5
    setTimeout(() => playSound(659.25, 0.12), 80); // E5
    setTimeout(() => playSound(783.99, 0.15), 160); // G5 - 更紧凑的时间
  }, [playSound]);

  const playProgressSound = useCallback(() => {
    // 极简的进度音效 - 更短更轻
    playSound(698.46, 0.08, "triangle"); // F5
  }, [playSound]);

  return {
    playSuccessSound,
    playErrorSound,
    playClickSound,
    playUploadSound,
    playCompleteSound,
    playProgressSound,
    isEnabled: settings.enableSounds,
  };
}
