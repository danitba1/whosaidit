export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
      <h3 className="font-display text-xl">{title}</h3>
      <p className="mt-2 text-muted">{body}</p>
    </div>
  );
}

export function ErrorState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
      <h3 className="font-display text-xl text-danger">{title}</h3>
      <p className="mt-2 text-slate-700">{body}</p>
    </div>
  );
}
