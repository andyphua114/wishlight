type FlameProps = {
  isBlowingOut?: boolean;
};

export function Flame({ isBlowingOut = false }: FlameProps) {
  return (
    <div
      className={`flame-shell ${isBlowingOut ? "flame-shell--wild" : ""}`}
      aria-hidden="true"
    >
      <div className="flame-glow" />
      <div className="flame flame--outer" />
      <div className="flame flame--inner" />
    </div>
  );
}
