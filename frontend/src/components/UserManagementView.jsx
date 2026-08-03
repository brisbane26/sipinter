import { useEffect, useState } from 'react'
import api from '../lib/api'
import Modal from './Modal'
import Loading from './Loading'
import EmptyState from './EmptyState'
import { roleLabel } from '../lib/helpers'
import { Plus, Pencil, UserX, Search } from 'lucide-react'

export default function UserManagementView() {
  const [users, setUsers] = useState(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', nip: '', email: '', jabatan: '', role: 'anggota', password: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function load() { api.get('/users', { params: { search, role: roleFilter } }).then((res) => setUsers(res.data.data)) }

  useEffect(() => { load() }, [search, roleFilter])

  function openCreate() {
    setEditing(null)
    setForm({ name: '', nip: '', email: '', jabatan: '', role: 'anggota', password: '' })
    setOpen(true)
  }

  function openEdit(u) {
    setEditing(u)
    setForm({ name: u.name, nip: u.nip || '', email: u.email, jabatan: u.jabatan || '', role: u.role, password: '' })
    setOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = { ...form }
      if (editing && !payload.password) delete payload.password
      if (editing) await api.put(`/users/${editing.id}`, payload)
      else await api.post('/users', payload)
      setOpen(false)
      load()
    } catch (err) {
      setError('Gagal menyimpan. Periksa email/NIP unik & kelengkapan data.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate(u) {
    if (!confirm(`Nonaktifkan akun ${u.name}?`)) return
    await api.delete(`/users/${u.id}`)
    load()
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Manajemen User</h1>
          <p className="text-sm text-gray-500">Tambah, ubah, atau nonaktifkan akun pegawai.</p>
        </div>
        <button onClick={openCreate} className="btn btn-primary"><Plus size={16} /> Tambah User</button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Cari nama, NIP, email..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input sm:w-48" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">Semua Role</option>
          <option value="kabalai">Kabalai</option>
          <option value="kasubag">Kasubag</option>
          <option value="katim">Kepala Tim</option>
          <option value="anggota">Anggota</option>
        </select>
      </div>

      {!users ? <Loading /> : !users.length ? <EmptyState text="Belum ada user." /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Nama</th>
                <th className="px-4 py-3 font-medium">NIP</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3"><p className="font-medium text-gray-900">{u.name}</p><p className="text-xs text-gray-400">{u.jabatan}</p></td>
                  <td className="px-4 py-3 text-gray-600">{u.nip || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3"><span className="badge badge-berjalan">{roleLabel(u.role)}</span></td>
                  <td className="px-4 py-3"><span className={`badge ${u.is_active ? 'badge-selesai' : 'badge-terlambat'}`}>{u.is_active ? 'Aktif' : 'Nonaktif'}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(u)} className="text-gray-400 hover:text-gray-700"><Pencil size={16} /></button>
                      {u.is_active && <button onClick={() => handleDeactivate(u)} className="text-gray-400 hover:text-red-600"><UserX size={16} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit User' : 'Tambah User'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
          <div>
            <label className="label">Nama Lengkap</label>
            <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">NIP</label>
              <input className="input" value={form.nip} onChange={(e) => setForm({ ...form, nip: e.target.value })} />
            </div>
            <div>
              <label className="label">Role</label>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="kabalai">Kabalai</option>
                <option value="kasubag">Kasubag</option>
                <option value="katim">Kepala Tim</option>
                <option value="anggota">Anggota</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" required className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Jabatan</label>
            <input className="input" value={form.jabatan} onChange={(e) => setForm({ ...form, jabatan: e.target.value })} />
          </div>
          <div>
            <label className="label">Password {editing && '(kosongkan jika tidak diubah)'}</label>
            <input type="password" className="input" required={!editing} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <button className="btn btn-primary w-full" disabled={saving}>{saving ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Tambah User'}</button>
        </form>
      </Modal>
    </div>
  )
}
