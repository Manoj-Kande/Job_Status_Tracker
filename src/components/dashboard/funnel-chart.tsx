export function FunnelChart({ funnel }: { funnel: { stage: string; count: number }[] }) {
  const max = Math.max(1, ...funnel.map((f) => f.count));
  return (
    <div className="space-y-3">
      {funnel.map((f) => (
        <div key={f.stage} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="font-medium">{f.stage}</span>
            <span className="text-muted-foreground">{f.count}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-200"
              style={{ width: `${(f.count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
