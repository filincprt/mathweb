export const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

export function getAuthToken(): string | null {
  return localStorage.getItem('access')
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
