export function BarcodeInput({ onSubmit, disabled }) {
  function handleKeyDown(e) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const value = e.currentTarget.value
    onSubmit?.(value)
    e.currentTarget.value = ''
  }

  return (
    <div className="rounded border border-neutral-200 p-3">
      <label className="mb-1 block text-sm text-neutral-600" htmlFor="barcode">
        Código / ID de producto (Enter para agregar)
      </label>
      <input
        id="barcode"
        type="text"
        autoComplete="off"
        disabled={disabled}
        onKeyDown={handleKeyDown}
        className="w-full rounded border border-neutral-300 px-2 py-1 text-sm disabled:opacity-50"
        placeholder="Ej: 1"
      />
    </div>
  )
}
