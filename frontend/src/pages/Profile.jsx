import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import { storageUrl } from '../lib/helpers'
import { User as UserIcon } from 'lucide-react'

export default function Profile() {
  const { user, updateUser } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [jabatan, setJabatan] = useState(user?.jabatan || '')
  const [password, setPassword] = useState('')
  const [foto, setFoto] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  // Preview foto baru yang baru dipilih (sebelum di-submit).
  useEffect(() => {
    if (!foto) { setPreviewUrl(null); return }
    const url = URL.createObjectURL(foto)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [foto])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setMsg('')
    try {
      const form = new FormData()
      form.append('name', name)
      form.append('jabatan', jabatan)
      if (password) form.append('password', password)
      if (foto) form.append('foto', foto)
      // PENTING: jangan set header Content-Type manual di sini.
      // Axios/browser perlu men-generate boundary multipart secara otomatis;
      // kalau di-set manual, boundary-nya hilang dan backend gagal parsing file.
      const res = await api.post('/profile', form)
      updateUser(res.data)
      setMsg('Profil berhasil diperbarui.')
      setPassword('')
      setFoto(null)
    } catch (err) {
      setMsg(err.response?.data?.message || 'Gagal menyimpan perubahan.')
    } finally {
      setSaving(false)
    }
  }

  const currentFotoUrl = user?.foto ? storageUrl(user.foto) : null

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Profil Saya</h1>
      <p className="text-sm text-gray-500 mb-6">Kelola informasi akun Anda.</p>
      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        {msg && <div className="bg-brand-50 text-brand-700 text-sm px-3 py-2 rounded-lg">{msg}</div>}

        <div className="flex items-center gap-4">
          {previewUrl || currentFotoUrl ? (
            <img
              src={previewUrl || currentFotoUrl}
              alt="Foto profil"
              className="w-16 h-16 rounded-full object-cover border border-gray-200"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-pupr-yellow text-pupr-blue-dark flex items-center justify-center font-semibold text-xl">
              {user?.name?.charAt(0) || <UserIcon size={22} />}
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-900">{user?.name}</p>
            <p className="text-xs text-gray-500">{previewUrl ? 'Preview foto baru (belum disimpan)' : 'Foto profil saat ini'}</p>
          </div>
        </div>

        <div><label className="label">NIP</label><input className="input bg-gray-50" value={user?.nip || '-'} disabled /></div>
        <div><label className="label">Email</label><input className="input bg-gray-50" value={user?.email || ''} disabled /></div>
        <div><label className="label">Nama Lengkap</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><label className="label">Jabatan</label><input className="input" value={jabatan} onChange={(e) => setJabatan(e.target.value)} /></div>
        <div><label className="label">Foto Profil</label><input type="file" accept="image/*" className="input" onChange={(e) => setFoto(e.target.files[0] || null)} /></div>
        <div><label className="label">Password Baru (opsional)</label><input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Kosongkan jika tidak diubah" /></div>
        <button className="btn btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
      </form>
    </div>
  )
}