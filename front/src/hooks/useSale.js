import { useCallback, useEffect, useRef, useState } from 'react'
import {
  api,
  addItem as addItemRequest,
  completeSale as completeSaleRequest,
  createSale,
  removeItem as removeItemRequest,
} from '../services/api'

function getAxiosErrorMessage(err) {
  const msg = err.response?.data?.message
  return typeof msg === 'string' ? msg : err.message || 'Error de red'
}

function readPosConfig() {
  const userId = Number(import.meta.env.VITE_POS_USER_ID)
  const cashBoxId = Number(import.meta.env.VITE_POS_CASH_BOX_ID)
  const ok =
    Number.isInteger(userId) &&
    userId >= 1 &&
    Number.isInteger(cashBoxId) &&
    cashBoxId >= 1
  return ok ? { userId, cashBoxId } : null
}

/**
 * Venta activa: crea una venta al montar y expone acciones contra la API.
 */
export function useSale() {
  const [sale, setSale] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const saleRef = useRef(null)

  useEffect(() => {
    saleRef.current = sale
  }, [sale])

  const openNewSale = useCallback(async () => {
    const cfg = readPosConfig()
    if (!cfg) {
      setError(
        'Configurá VITE_POS_USER_ID y VITE_POS_CASH_BOX_ID en front/.env',
      )
      setSale(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await createSale(cfg)
      setSale(data)
    } catch (err) {
      setError(getAxiosErrorMessage(err))
      setSale(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    openNewSale()
  }, [openNewSale])

  const addItem = useCallback(async (productId, quantity = 1) => {
    const s = saleRef.current
    if (!s?.id || s.status !== 'PENDING') return

    setLoading(true)
    setError(null)
    try {
      const data = await addItemRequest(s.id, { productId, quantity })
      setSale(data)
    } catch (err) {
      setError(getAxiosErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  const removeItemFromSale = useCallback(async (itemId) => {
    const s = saleRef.current
    if (!s?.id || s.status !== 'PENDING') return

    setLoading(true)
    setError(null)
    try {
      const data = await removeItemRequest(s.id, itemId)
      setSale(data)
    } catch (err) {
      setError(getAxiosErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  const completeSale = useCallback(async () => {
    const s = saleRef.current
    if (!s?.id || s.status !== 'PENDING') return

    setLoading(true)
    setError(null)
    try {
      const total = Number(s.total) || 0
      const paid = (s.payments ?? []).reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      )
      if (total > 0 && paid < total - 0.005) {
        const { data: afterPay } = await api.post(`/api/sales/${s.id}/payments`, {
          method: 'CASH',
          amount: Math.round((total - paid) * 100) / 100,
        })
        setSale(afterPay)
      }
      const data = await completeSaleRequest(s.id)
      setSale(data)
    } catch (err) {
      setError(getAxiosErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  const submitBarcode = useCallback(
    async (raw) => {
      const trimmed = String(raw).trim()
      if (!trimmed) return
      const productId = Number.parseInt(trimmed, 10)
      if (!Number.isInteger(productId) || productId < 1) {
        setError('Usá el ID numérico del producto (por ahora)')
        return
      }
      await addItem(productId, 1)
    },
    [addItem],
  )

  const total =
    sale?.total != null && Number.isFinite(Number(sale.total))
      ? Number(sale.total)
      : null

  return {
    sale,
    saleId: sale?.id ?? null,
    items: sale?.items ?? [],
    total,
    status: sale?.status ?? null,
    loading,
    error,
    addItem,
    removeItem: removeItemFromSale,
    completeSale,
    submitBarcode,
    newSale: openNewSale,
  }
}
