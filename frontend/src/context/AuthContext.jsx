import { createContext, useContext, useState, useEffect } from 'react'
import client from '../api/client'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('minsettle_user')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [token, setToken] = useState(() => localStorage.getItem('minsettle_token') || null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMe = async () => {
      if (token) {
        try {
          const res = await client.get('/auth/me')
          const userData = res.data.user || res.data.data?.user || res.data.data
          setUser(userData)
          localStorage.setItem('minsettle_user', JSON.stringify(userData))
        } catch {
          logout()
        }
      }
      setLoading(false)
    }
    fetchMe()
  }, [token])

  const login = async (email, password) => {
    const res = await client.post('/auth/login', { email, password })
    const newToken = res.data.token || res.data.data?.token
    const userData = res.data.user || res.data.data?.user
    if (!newToken) {
      throw new Error(res.data.message || 'Login failed: no token returned')
    }
    localStorage.setItem('minsettle_token', newToken)
    localStorage.setItem('minsettle_user', JSON.stringify(userData))
    setToken(newToken)
    setUser(userData)
    return userData
  }

  const register = async (name, email, password, upiId) => {
    const payload = { name, email, password }
    if (upiId && upiId.trim()) payload.upiId = upiId.trim()
    const res = await client.post('/auth/register', payload)
    const newToken = res.data.token || res.data.data?.token
    const userData = res.data.user || res.data.data?.user
    if (!newToken) {
      throw new Error(res.data.message || 'Registration failed: no token returned')
    }
    localStorage.setItem('minsettle_token', newToken)
    localStorage.setItem('minsettle_user', JSON.stringify(userData))
    setToken(newToken)
    setUser(userData)
    return userData
  }

  const updateProfile = async (name, upiId) => {
    const res = await client.patch('/auth/profile', { name, upiId })
    const updated = res.data.user || res.data.data?.user || res.data.data
    setUser(updated)
    localStorage.setItem('minsettle_user', JSON.stringify(updated))
    return updated
  }

  const logout = () => {
    localStorage.removeItem('minsettle_token')
    localStorage.removeItem('minsettle_user')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
