export function Avatar({ emoji, size = 40, ring }: { emoji: string; size?: number; ring?: string }) {
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.52, boxShadow: ring ? `0 0 0 2px ${ring}` : undefined }}
      aria-hidden
    >
      {emoji}
    </span>
  );
}
