export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? 'http://127.0.0.1:8000' : '')

export function getAuthToken(): string | null {
  return localStorage.getItem('access')
}

export async function parseApiError(res: Response, fallback = 'Ошибка запроса'): Promise<string> {
  const data = await res.json().catch(() => null)
  const detail = data?.detail

  if (typeof detail === 'string') {
    return detail
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => item?.msg || item?.message || JSON.stringify(item))
      .filter(Boolean)
      .join('; ') || fallback
  }

  return data?.message || fallback
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getAuthToken()
  const headers = new Headers(options.headers || {})
  headers.set('Content-Type', 'application/json')
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  const res = await fetch(API_BASE + path, { ...options, headers, credentials: 'include' })
  if (res.status === 401) {
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  return res
}
