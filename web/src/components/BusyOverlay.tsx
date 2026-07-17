type Props = {
  label?: string;
};

export function BusyOverlay({ label = "A processar…" }: Props) {
  return (
    <div className="cj-busy-overlay" role="status" aria-live="polite" aria-busy="true">
      <div className="cj-busy-card">
        <span className="cj-busy-spinner" aria-hidden />
        <p>{label}</p>
      </div>
    </div>
  );
}
