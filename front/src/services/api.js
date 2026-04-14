import axios from 'axios'

const rawBase = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const baseURL = String(rawBase).replace(/\/$/, '')

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export async function createSale(body) {
  const { data } = await api.post('/api/sales', body)
  return data
}

export async function addItem(saleId, body) {
  const { data } = await api.post(`/api/sales/${saleId}/items`, body)
  return data
}

export async function removeItem(saleId, itemId) {
  const { data } = await api.delete(`/api/sales/${saleId}/items/${itemId}`)
  return data
}

export async function completeSale(saleId) {
  const { data } = await api.post(`/api/sales/${saleId}/complete`)
  return data
}

export default api
