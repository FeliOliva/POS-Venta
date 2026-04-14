import { BarcodeInput } from '../../components/BarcodeInput'
import { ProductList } from '../../components/ProductList'
import { TotalDisplay } from '../../components/TotalDisplay'
import { useSale } from '../../hooks/useSale'

export function PosPage() {
  const {
    sale,
    items,
    total,
    loading,
    error,
    removeItem,
    completeSale,
    submitBarcode,
    newSale,
  } = useSale()

  const pending = sale?.status === 'PENDING'
  const blocked = loading || !pending

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-medium text-neutral-800">POS</h1>
        <button
          type="button"
          className="rounded border px-2 py-1 text-sm disabled:opacity-50"
          disabled={loading}
          onClick={() => newSale()}
        >
          Nueva venta
        </button>
      </div>

      {loading && !sale ? (
        <p className="text-sm text-neutral-500">Abriendo venta…</p>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <BarcodeInput onSubmit={submitBarcode} disabled={blocked} />
      <ProductList
        items={items}
        onRemoveItem={removeItem}
        disabled={blocked}
      />
      <TotalDisplay total={total} />

      <div className="flex gap-2">
        <button
          type="button"
          className="rounded border px-3 py-1 text-sm disabled:opacity-50"
          disabled={blocked || !items.length}
          onClick={() => completeSale()}
        >
          Completar venta
        </button>
      </div>

      {sale?.status === 'COMPLETED' ? (
        <p className="text-sm text-green-700">Venta completada.</p>
      ) : null}
    </main>
  )
}
