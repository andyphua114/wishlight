type PermissionMessageProps = {
  kind: "mic-denied" | "unsupported";
};

export function PermissionMessage({ kind }: PermissionMessageProps) {
  const message =
    kind === "unsupported"
      ? "Your browser does not support microphone access. Tap the candle to blow it out instead."
      : "Microphone permission was denied. You can still tap the candle to make a wish.";

  return (
    <p className="permission-message" role="status">
      {message}
    </p>
  );
}
