export function ParticipantList({
  names,
}: {
  names: string[];
}) {
  if (!names.length) return <p className="text-muted">No participants yet.</p>;
  return (
    <ul className="flex flex-wrap gap-2">
      {names.map((name) => (
        <li key={name} className="rounded-full bg-slate-100 px-3 py-1 text-sm">
          {name}
        </li>
      ))}
    </ul>
  );
}
