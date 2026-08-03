import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    Accept: 'application/json',
  },
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginPage = window.location.pathname === '/login'
    if (error.response?.status === 401 && !isLoginPage) {
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export default api