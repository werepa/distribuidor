export function ViolationBadge({ msgs }: { msgs: string[] }) {
  if (msgs.length === 0) return null;
  return (
    <span title={msgs.join("\n")}
      className="ml-1 inline-block bg-red-100 text-red-700 text-[10px] px-1 rounded">
      ⚠ {msgs.length}
    </span>
  );
}
