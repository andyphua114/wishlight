import { useCallback, useEffect, useMemo, useState } from "react";
import { Candle } from "./components/Candle";
import { Confetti } from "./components/Confetti";
import { PermissionMessage } from "./components/PermissionMessage";
import { useBlowDetector } from "./hooks/useBlowDetector";

type CandleState =
  | "idle"
  | "requesting-mic"
  | "listening"
  | "blown-out"
  | "mic-denied"
  | "unsupported";

type AudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

const blowOutDelayMs = 520;

function App() {
  const [candleState, setCandleState] = useState<CandleState>("idle");
  const [isBlowingOut, setIsBlowingOut] = useState(false);
  const [hasStartedMic, setHasStartedMic] = useState(false);

  useEffect(() => {
    const supportsAudio =
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      Boolean(window.AudioContext || (window as AudioWindow).webkitAudioContext);

    if (!supportsAudio) {
      setCandleState("unsupported");
    }
  }, []);

  const extinguishCandle = useCallback(() => {
    setHasStartedMic(false);
    setIsBlowingOut(true);

    window.setTimeout(() => {
      setIsBlowingOut(false);
      setCandleState("blown-out");
    }, blowOutDelayMs);
  }, []);

  const { status: blowDetectorStatus } = useBlowDetector({
    enabled: hasStartedMic && candleState !== "blown-out",
    threshold: 0.1,
    minDurationMs: 160,
    onBlow: extinguishCandle,
  });

  useEffect(() => {
    if (!hasStartedMic) {
      return;
    }

    if (blowDetectorStatus === "requesting") {
      setCandleState("requesting-mic");
    }

    if (blowDetectorStatus === "listening") {
      setCandleState("listening");
    }

    if (blowDetectorStatus === "denied" || blowDetectorStatus === "error") {
      setHasStartedMic(false);
      setCandleState("mic-denied");
    }

    if (blowDetectorStatus === "unsupported") {
      setHasStartedMic(false);
      setCandleState("unsupported");
    }
  }, [blowDetectorStatus, hasStartedMic]);

  const actionLabel = useMemo(() => {
    switch (candleState) {
      case "requesting-mic":
        return "Lighting...";
      case "listening":
        return "Make a wish and blow the candle";
      case "blown-out":
        return "Make another wish";
      case "mic-denied":
      case "unsupported":
        return "Make a wish";
      default:
        return "Light the candle";
    }
  }, [candleState]);

  const handleAction = () => {
    if (
      candleState === "listening" ||
      candleState === "mic-denied" ||
      candleState === "unsupported"
    ) {
      extinguishCandle();
      return;
    }

    if (candleState === "blown-out") {
      setIsBlowingOut(false);
    }

    setHasStartedMic(true);
    setCandleState("requesting-mic");
  };

  const fallbackEnabled =
    candleState === "mic-denied" ||
    candleState === "unsupported" ||
    candleState === "listening";

  const isLit = candleState !== "blown-out" || isBlowingOut;
  const showSmoke = candleState === "blown-out";

  return (
    <main className="app-shell">
      {candleState === "blown-out" && <Confetti />}

      <section className="wish-card" aria-live="polite">
        <p className="eyebrow">Birthday wishlight</p>
        <h1>{candleState === "blown-out" ? "Wish made ✨" : "Make a wish"}</h1>

        <Candle
          isLit={isLit}
          isBlowingOut={isBlowingOut}
          showSmoke={showSmoke}
          onFallbackBlow={extinguishCandle}
          fallbackEnabled={fallbackEnabled}
        />

        {candleState === "mic-denied" && (
          <PermissionMessage kind="mic-denied" />
        )}
        {candleState === "unsupported" && (
          <PermissionMessage kind="unsupported" />
        )}

        <button
          className="primary-action"
          type="button"
          onClick={handleAction}
          disabled={candleState === "requesting-mic"}
        >
          {actionLabel}
        </button>

        {candleState === "idle" && (
          <p className="secure-note">
            Microphone access starts only after tapping the button and works on
            HTTPS or localhost.
          </p>
        )}
      </section>
    </main>
  );
}

export default App;
