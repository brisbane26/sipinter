import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Building2 } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(email, password)
      navigate(`/${user.role}`)
    } catch (err) {
      setError(err.response?.data?.message || Object.values(err.response?.data?.errors || {})[0]?.[0] || 'Login gagal.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 to-brand-700 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6 text-white">
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Building2 size={28} />
          </div>
          <h1 className="text-xl font-semibold">Progres Kerja PUPR</h1>
          <p className="text-white/70 text-sm">Sistem tracking progres kerja internal</p>
        </div>
        <form onSubmit={handleSubmit} className="card p-6 space-y-4 bg-white">
          {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
          <div>
            <label className="label">Email</label>
            <input type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@pupr.go.id" />
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary w-full">{loading ? 'Memproses...' : 'Masuk'}</button>
        </form>
        <p className="text-center text-white/50 text-xs mt-4">
          Demo (password: <code>password</code>):<br />
          kabalai@pupr.go.id · kasubag@pupr.go.id · katim.kpa@pupr.go.id · rudi@pupr.go.id
        </p>
      </div>
    </div>
  )
}
