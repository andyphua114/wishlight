import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
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
const sensitivityStorageKey = "wishlight-sensitivity";

const clampSensitivity = (value: number) =>
  Math.min(10, Math.max(1, Math.round(value)));

const getSensitivityLabel = (sensitivity: number) => {
  if (sensitivity >= 9) {
    return "Phone distance";
  }

  if (sensitivity >= 7) {
    return "Extra gentle";
  }

  if (sensitivity >= 4) {
    return "Balanced";
  }

  return "Steady";
};

function App() {
  const [candleState, setCandleState] = useState<CandleState>("idle");
  const [isBlowingOut, setIsBlowingOut] = useState(false);
  const [hasStartedMic, setHasStartedMic] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [sensitivity, setSensitivity] = useState(() => {
    const savedSensitivity = window.localStorage.getItem(sensitivityStorageKey);
    return savedSensitivity ? clampSensitivity(Number(savedSensitivity)) : 9;
  });
  const settingsRef = useRef<HTMLDivElement | null>(null);

  const blowSettings = useMemo(
    () => ({
      threshold: 0.012 + (10 - sensitivity) * 0.012,
      minDurationMs: 80 + (10 - sensitivity) * 24,
    }),
    [sensitivity],
  );

  useEffect(() => {
    const supportsAudio =
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      Boolean(window.AudioContext || (window as AudioWindow).webkitAudioContext);

    if (!supportsAudio) {
      setCandleState("unsupported");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(sensitivityStorageKey, String(sensitivity));
  }, [sensitivity]);

  useEffect(() => {
    if (!isSettingsOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (
        settingsRef.current &&
        !settingsRef.current.contains(event.target as Node)
      ) {
        setIsSettingsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSettingsOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSettingsOpen]);

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
    threshold: blowSettings.threshold,
    minDurationMs: blowSettings.minDurationMs,
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

  const handleSensitivityChange = (event: FormEvent<HTMLInputElement>) => {
    setSensitivity(clampSensitivity(Number(event.currentTarget.value)));
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
        <div className="settings-menu" ref={settingsRef}>
          <button
            className="settings-toggle"
            type="button"
            aria-label={
              isSettingsOpen ? "Close wish settings" : "Open wish settings"
            }
            aria-expanded={isSettingsOpen}
            aria-controls="wish-settings-panel"
            onClick={() => setIsSettingsOpen((isOpen) => !isOpen)}
          >
            <span className="settings-toggle__spark settings-toggle__spark--one" />
            <span className="settings-toggle__spark settings-toggle__spark--two" />
            <span className="settings-toggle__spark settings-toggle__spark--three" />
          </button>

          {isSettingsOpen && (
            <div
              className="settings-panel"
              id="wish-settings-panel"
              role="dialog"
              aria-label="Wish settings"
            >
              <label className="sensitivity-control" htmlFor="sensitivity">
                <span className="settings-title">Wish sensitivity</span>
                <span className="settings-value">
                  {getSensitivityLabel(sensitivity)} - {sensitivity}/10
                </span>
              </label>
              <input
                id="sensitivity"
                className="sensitivity-slider"
                type="range"
                min="1"
                max="10"
                step="1"
                value={sensitivity}
                onChange={handleSensitivityChange}
                onInput={handleSensitivityChange}
              />
              <div className="sensitivity-scale" aria-hidden="true">
                <span>Less</span>
                <span>More</span>
              </div>
            </div>
          )}
        </div>

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
