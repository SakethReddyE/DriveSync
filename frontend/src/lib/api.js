// Central API client. Falls back to the live Render backend if no env var is set,
// so the deployed build works even without Vercel env config.
// Normalise the base URL so it always ends with exactly one "/api",
// whether the env var is set with, without, or with a trailing slash.
const RAW_API = (import.meta.env.VITE_API_URL || 'https://drivesync-api-zove.onrender.com')
  .replace(/\/+$/, '')
const API_URL = /\/api$/.test(RAW_API) ? RAW_API : `${RAW_API}/api`

export const API_BASE = API_URL
// Socket connects to the host root (no /api).
export const SOCKET_URL = (
  import.meta.env.VITE_SOCKET_URL || API_URL.replace(/\/api$/, '')
).replace(/\/+$/, '')

// Public Google OAuth client id (safe to ship to the browser).
export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '522069871211-83ap5f2vd9euhed3ailr6mp127u8l480.apps.googleusercontent.com'

export function getToken() {
  try {
    return localStorage.getItem('ds_token')
  } catch (e) {
    return null
  }
}
export function setToken(t) {
  try {
    if (t) localStorage.setItem('ds_token', t)
    else localStorage.removeItem('ds_token')
  } catch (e) {
    /* ignore */
  }
}

export async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (auth && token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(API_URL + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch (e) {
    throw new Error('Network error — the backend may be waking up. Try again in a moment.')
  }

  let data = null
  try {
    data = await res.json()
  } catch (e) {
    data = null
  }

  if (!res.ok || (data && data.success === false)) {
    const msg = (data && (data.message || data.error)) || `Request failed (${res.status})`
    throw new Error(msg)
  }
  return data
}
