import { avatarColor, initials } from "./shared";

export function Avatar(props: { name: string; size?: number }) {
  const size = props.size ?? 32;
  return (
    <div
      class="avatar"
      style={{
        background: avatarColor(props.name),
        width: `${size}px`,
        height: `${size}px`,
        fontSize: `${Math.max(10, size * 0.4)}px`,
      }}
    >
      {initials(props.name)}
    </div>
  );
}
