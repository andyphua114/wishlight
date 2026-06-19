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

const getAverageFrequencyEnergy = (
  frequencyData: Uint8Array,
  audioContext: AudioContext,
  minFrequency: number,
  maxFrequency: number,
) => {
  const nyquistFrequency = audioContext.sampleRate / 2;
  const startBin = Math.max(
    1,
    Math.floor((minFrequency / nyquistFrequency) * frequencyData.length),
  );
  const endBin = Math.min(
    frequencyData.length,
    Math.ceil((maxFrequency / nyquistFrequency) * frequencyData.length),
  );

  if (startBin >= endBin) {
    return 0;
  }

  let sum = 0;
  for (let index = startBin; index < endBin; index += 1) {
    sum += frequencyData[index] / 255;
  }

  return sum / (endBin - startBin);
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
    let ambientRms = 0;
    let ambientHighEnergy = 0;

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
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            autoGainControl: true,
            echoCancellation: false,
            noiseSuppression: false,
          },
        });

        if (!active) {
          stop();
          return;
        }

        audioContext = new AudioContextConstructor();
        if (audioContext.state === "suspended") {
          await audioContext.resume();
        }
        const activeAudioContext = audioContext;
        const source = activeAudioContext.createMediaStreamSource(stream);
        const analyser = activeAudioContext.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.15;
        source.connect(analyser);

        const samples = new Uint8Array(analyser.fftSize);
        const frequencyData = new Uint8Array(analyser.frequencyBinCount);
        setStatus("listening");

        const poll = (now: number) => {
          analyser.getByteTimeDomainData(samples);
          analyser.getByteFrequencyData(frequencyData);

          let sumSquares = 0;
          for (const sample of samples) {
            const centeredSample = (sample - 128) / 128;
            sumSquares += centeredSample * centeredSample;
          }

          const rms = Math.sqrt(sumSquares / samples.length);
          const highEnergy = getAverageFrequencyEnergy(
            frequencyData,
            activeAudioContext,
            1200,
            7600,
          );
          const {
            threshold: currentThreshold,
            minDurationMs: currentMinDurationMs,
            cooldownMs: currentCooldownMs,
          } = settingsRef.current;
          ambientRms ||= rms;
          ambientHighEnergy ||= highEnergy;

          const adaptiveRmsThreshold = Math.max(
            currentThreshold * 0.45,
            ambientRms * 2.15 + 0.002,
          );
          const adaptiveHighThreshold = Math.max(
            0.006,
            ambientHighEnergy * 1.85 + 0.002,
          );
          const volumeDetected =
            rms > currentThreshold || rms > adaptiveRmsThreshold;
          const breathNoiseDetected =
            highEnergy > adaptiveHighThreshold && rms > currentThreshold * 0.3;

          if (volumeDetected || breathNoiseDetected) {
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
            ambientRms = ambientRms * 0.96 + rms * 0.04;
            ambientHighEnergy = ambientHighEnergy * 0.96 + highEnergy * 0.04;
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
