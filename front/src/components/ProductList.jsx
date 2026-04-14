export function ProductList({ items, onRemoveItem, disabled }) {
  if (!items?.length) {
    return (
      <section
        className="min-h-32 flex-1 rounded border border-neutral-200 p-3"
        aria-label="Productos en la venta"
      >
        <p className="text-sm text-neutral-500">Sin ítems</p>
      </section>
    )
  }

  return (
    <section
      className="min-h-32 flex-1 rounded border border-neutral-200 p-3"
      aria-label="Productos en la venta"
    >
      <ul className="space-y-2 text-sm">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-2 border-b border-neutral-100 pb-2"
          >
            <span>
              {item.product?.name ?? `Producto #${item.productId}`} ×{' '}
              {item.quantity} — {item.subtotal}
            </span>
            <button
              type="button"
              disabled={disabled}
              className="rounded border px-2 py-0.5 text-xs disabled:opacity-50"
              onClick={() => onRemoveItem?.(item.id)}
            >
              Quitar
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
