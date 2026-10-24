import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('minsettle_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}, (error) => {
  return Promise.reject(error)
})

client.interceptors.response.use((response) => {
  return response
}, (error) => {
  if (error.response && error.response.status === 401) {
    if (!window.location.pathname.includes('/login')) {
      localStorage.removeItem('minsettle_token')
      localStorage.removeItem('minsettle_user')
      window.location.href = '/login'
    }
  }
  return Promise.reject(error)
})

export default client
