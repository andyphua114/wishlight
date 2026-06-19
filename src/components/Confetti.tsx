import type { CSSProperties } from "react";

const confettiPieces = Array.from({ length: 28 }, (_, index) => ({
  id: index,
  left: `${8 + ((index * 31) % 84)}%`,
  delay: `${(index % 8) * 90}ms`,
  duration: `${1700 + (index % 6) * 140}ms`,
  color: ["#f97316", "#22c55e", "#3b82f6", "#ec4899", "#facc15"][
    index % 5
  ],
  rotation: `${(index * 47) % 180}deg`,
}));

export function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {confettiPieces.map((piece) => (
        <span
          key={piece.id}
          style={{
            "--left": piece.left,
            "--delay": piece.delay,
            "--duration": piece.duration,
            "--color": piece.color,
            "--rotation": piece.rotation,
          } as CSSProperties}
        />
      ))}
    </div>
  );
}
