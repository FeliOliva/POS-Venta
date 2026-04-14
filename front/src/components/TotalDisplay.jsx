export function TotalDisplay({ total }) {
  return (
    <footer className="rounded border border-neutral-200 p-3 text-right">
      <p className="text-sm text-neutral-600">Total</p>
      <p className="text-xl font-medium tabular-nums text-neutral-900">
        {total != null ? total : '—'}
      </p>
    </footer>
  )
}
