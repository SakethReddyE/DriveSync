import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api, setToken, getToken } from '../lib/api'
import { connectSocket, disconnectSocket } from '../lib/socket'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = getToken()
    if (!t) {
      setLoading(false)
      return
    }
    api('/auth/me')
      .then((d) => setUser({ ...d.user, id: d.user.id || d.user._id }))
      .catch(() => setToken(null))
      .finally(() => setLoading(false))
  }, [])

  // keep a realtime socket bound to the signed-in user/driver
  useEffect(() => {
    if (user && (user.role === 'user' || user.role === 'driver') && user.id) {
      connectSocket(user.role, user.id)
    } else {
      disconnectSocket()
    }
  }, [user])

  const login = useCallback(async (email, password) => {
    const d = await api('/auth/login', { method: 'POST', body: { email, password }, auth: false })
    setToken(d.token)
    setUser({ ...d.user, id: d.user.id || d.user._id, role: d.role || d.user.role })
    return d
  }, [])

  const signup = useCallback(async (payload) => {
    const d = await api('/auth/signup', { method: 'POST', body: payload, auth: false })
    setToken(d.token)
    setUser({ ...d.user, id: d.user.id || d.user._id, role: 'user' })
    return d
  }, [])

  const googleLogin = useCallback(async (credential) => {
    const d = await api('/auth/google', { method: 'POST', body: { credential }, auth: false })
    setToken(d.token)
    setUser({ ...d.user, id: d.user.id || d.user._id, role: 'user' })
    return d
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    disconnectSocket()
  }, [])

  return (
    <AuthCtx.Provider value={{ user, loading, login, signup, googleLogin, logout, setUser }}>
      {children}
    </AuthCtx.Provider>
  )
}
