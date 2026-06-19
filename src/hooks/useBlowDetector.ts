import { useEffect, useRef, useState } from "react";

type BlowDetectorOptions = {
  enabled: boolean;
  threshold?: number;
  minDurationMs?: number;
  cooldownMs?: number;
  onBlow: () => void;
};

type BlowDetectorStatus =
  | "idle"
  | "requesting"
  | "listening"
  | "denied"
  | "unsupported"
  | "error";

type WebKitWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

export function useBlowDetector({
  enabled,
  threshold = 0.1,
  minDurationMs = 160,
  cooldownMs = 1500,
  onBlow,
}: BlowDetectorOptions) {
  const [status, setStatus] = useState<BlowDetectorStatus>("idle");
  const onBlowRef = useRef(onBlow);
  const settingsRef = useRef({
    threshold,
    minDurationMs,
    cooldownMs,
  });

  useEffect(() => {
    onBlowRef.current = onBlow;
  }, [onBlow]);

  useEffect(() => {
    settingsRef.current = {
      threshold,
      minDurationMs,
      cooldownMs,
    };
  }, [cooldownMs, minDurationMs, threshold]);

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      return;
    }

    const AudioContextConstructor =
      window.AudioContext || (window as WebKitWindow).webkitAudioContext;

    if (!navigator.mediaDevices?.getUserMedia || !AudioContextConstructor) {
      setStatus("unsupported");
      return;
    }

    let active = true;
    let animationFrame = 0;
    let stream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    let aboveThresholdSince = 0;
    let lastTriggerAt = 0;

    const stop = () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }

      stream?.getTracks().forEach((track) => track.stop());

      if (audioContext && audioContext.state !== "closed") {
        void audioContext.close();
      }
    };

    const start = async () => {
      setStatus("requesting");

      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        if (!active) {
          stop();
          return;
        }

        audioContext = new AudioContextConstructor();
        if (audioContext.state === "suspended") {
          await audioContext.resume();
        }
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.15;
        source.connect(analyser);

        const samples = new Uint8Array(analyser.fftSize);
        setStatus("listening");

        const poll = (now: number) => {
          analyser.getByteTimeDomainData(samples);

          let sumSquares = 0;
          for (const sample of samples) {
            const centeredSample = (sample - 128) / 128;
            sumSquares += centeredSample * centeredSample;
          }

          const rms = Math.sqrt(sumSquares / samples.length);
          const {
            threshold: currentThreshold,
            minDurationMs: currentMinDurationMs,
            cooldownMs: currentCooldownMs,
          } = settingsRef.current;

          if (rms > currentThreshold) {
            aboveThresholdSince ||= now;

            if (
              now - aboveThresholdSince >= currentMinDurationMs &&
              now - lastTriggerAt >= currentCooldownMs
            ) {
              lastTriggerAt = now;
              aboveThresholdSince = 0;
              onBlowRef.current();
            }
          } else {
            aboveThresholdSince = 0;
          }

          animationFrame = requestAnimationFrame(poll);
        };

        animationFrame = requestAnimationFrame(poll);
      } catch (error) {
        if (!active) {
          return;
        }

        const name = error instanceof DOMException ? error.name : "";
        setStatus(
          name === "NotAllowedError" || name === "PermissionDeniedError"
            ? "denied"
            : "error",
        );
      }
    };

    void start();

    return () => {
      active = false;
      stop();
    };
  }, [enabled]);

  return {
    status,
  };
}
