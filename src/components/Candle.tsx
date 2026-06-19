import { Flame } from "./Flame";
import { Smoke } from "./Smoke";

type CandleProps = {
  isLit: boolean;
  isBlowingOut: boolean;
  showSmoke: boolean;
  onFallbackBlow: () => void;
  fallbackEnabled: boolean;
};

export function Candle({
  isLit,
  isBlowingOut,
  showSmoke,
  onFallbackBlow,
  fallbackEnabled,
}: CandleProps) {
  return (
    <button
      className="candle-stage"
      type="button"
      onClick={fallbackEnabled ? onFallbackBlow : undefined}
      disabled={!fallbackEnabled}
      aria-label={fallbackEnabled ? "Tap the candle to make a wish" : "Birthday candle"}
    >
      <div className="sparkles" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className="candle-stack" aria-hidden="true">
        <div className="flame-zone">
          {showSmoke && <Smoke />}
          {isLit && <Flame isBlowingOut={isBlowingOut} />}
        </div>
        <div className="wick" />
        <div className="candle-body">
          <div className="stripe stripe--one" />
          <div className="stripe stripe--two" />
          <div className="stripe stripe--three" />
        </div>
        <div className="wax-drip wax-drip--one" />
        <div className="wax-drip wax-drip--two" />
      </div>
    </button>
  );
}
