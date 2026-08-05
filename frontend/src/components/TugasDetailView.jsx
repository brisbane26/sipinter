import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../lib/api'
import { useAutoRefresh } from '../lib/useAutoRefresh'
import { useAuth } from '../context/AuthContext'
import ProgressBar from './ProgressBar'
import Modal from './Modal'
import Loading from './Loading'
import EmptyState from './EmptyState'
import SubtugasRow from './SubtugasRow'
import { formatDate, statusBadgeClass } from '../lib/helpers'
import { usePeriode } from '../context/PeriodeContext'
import { ArrowLeft, Plus, MessageSquare, CheckCircle2, XCircle, Send, Copy } from 'lucide-react'

// role: 'kabalai' | 'kasubag' | 'katim'
export default function TugasDetailView({ basePath, role }) {
  const { id } = useParams()
  const { user } = useAuth()
  const [tugas, setTugas] = useState(null)
  const [users, setUsers] = useState([])
  const [subtugasOpen, setSubtugasOpen] = useState(false)
  const [form, setForm] = useState({ judul: '', deskripsi: '', assigned_to: '', deadline: '' })
  const [saving, setSaving] = useState(false)
  const [comment, setComment] = useState('')
  const [comments, setComments] = useState([])
  const [verifNote, setVerifNote] = useState('')

  const { periodes } = usePeriode()
  const [duplicateOpen, setDuplicateOpen] = useState(false)
  const [targetPeriodeId, setTargetPeriodeId] = useState('')
  const [salinSubtugas, setSalinSubtugas] = useState(true)
  const [duplicating, setDuplicating] = useState(false)
  const [duplicateError, setDuplicateError] = useState('')

  const canCreateSubtugas = role === 'katim' || role === 'kasubag'
  const canVerifikasiTugas = role === 'kasubag'
  const canDuplicate = role === 'kasubag'
  const canComment = user?.role !== 'anggota'

  function load() {
    api.get(`/tugas/${id}`).then((res) => setTugas(res.data))
    api.get('/comments', { params: { tugas_id: id } }).then((res) => setComments(res.data))
  }

  useAutoRefresh(load, [id])
  useEffect(() => { if (tugas?.team) setUsers(tugas.team.members || []) }, [tugas])

  async function handleAddSubtugas(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post(`/tugas/${id}/subtugas`, form)
      setSubtugasOpen(false)
      setForm({ judul: '', deskripsi: '', assigned_to: '', deadline: '' })
      load()
    } finally {
      setSaving(false)
    }
  }

  async function handleComment(e) {
    e.preventDefault()
    if (!comment.trim()) return
    const res = await api.post('/comments', { tugas_id: id, komentar: comment })
    setComments([...comments, res.data])
    setComment('')
  }

  async function handleVerifikasiTugas(keputusan) {
    if (keputusan === 'ditolak' && !verifNote.trim()) {
      alert('Isi catatan alasan pengembalian.')
      return
    }
    await api.post(`/tugas/${id}/verifikasi`, { keputusan, catatan: verifNote })
    setVerifNote('')
    load()
  }

  async function handleDuplicate(e) {
    e.preventDefault()
    setDuplicateError('')
    if (!targetPeriodeId) {
      setDuplicateError('Pilih periode/tahun tujuan.')
      return
    }
    setDuplicating(true)
    try {
      const res = await api.post(`/tugas/${id}/duplicate`, {
        periode_id: targetPeriodeId,
        salin_subtugas: salinSubtugas,
      })
      setDuplicateOpen(false)
      setTargetPeriodeId('')
      alert(`Tugas berhasil diduplikasi ke periode baru. Progres dimulai dari 0%.`)
    } catch (err) {
      setDuplicateError(err.response?.data?.message || 'Gagal menduplikasi tugas.')
    } finally {
      setDuplicating(false)
    }
  }

  if (!tugas) return <Loading />

  return (
    <div>
      <Link to={basePath} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={15} /> Kembali
      </Link>

      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{tugas.judul}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Tim: {tugas.team?.nama_tim} ({tugas.team?.kode_tim}) · Katim: {tugas.team?.katim?.name}
            </p>
            <p className="text-xs text-gray-400 mt-1">Periode: Tahun {tugas.periode?.tahun}</p>
          </div>
          <span className={statusBadgeClass(tugas.status)}>{tugas.status}</span>
        </div>
        {canDuplicate && (
          <button
            onClick={() => setDuplicateOpen(true)}
            className="btn btn-secondary text-xs mt-3"
            title="Salin tugas & subtugas ini ke tahun anggaran lain, progres mulai dari 0%"
          >
            <Copy size={14} /> Duplikasi ke Periode Lain
          </button>
        )}
        <p className="text-sm text-gray-600 mt-4">{tugas.deskripsi || 'Tidak ada deskripsi.'}</p>
        <div className="mt-5">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progress Keseluruhan</span><span className="font-medium">{tugas.progress}%</span>
          </div>
          <ProgressBar value={tugas.progress} />
        </div>
        {tugas.deadline && <p className="text-xs text-gray-400 mt-3">Deadline: {formatDate(tugas.deadline)}</p>}

        {canVerifikasiTugas && tugas.status === 'Menunggu Verifikasi' && (
          <div className="mt-5 border-t border-gray-100 pt-4">
            <p className="text-sm font-medium text-gray-800 mb-2">Verifikasi Akhir Tugas</p>
            <p className="text-xs text-gray-500 mb-2">Semua subtugas sudah selesai. Verifikasi untuk menutup tugas ini.</p>
            <textarea className="input mb-2" rows={2} placeholder="Catatan (opsional)" value={verifNote} onChange={(e) => setVerifNote(e.target.value)} />
            <div className="flex gap-2">
              <button onClick={() => handleVerifikasiTugas('disetujui')} className="btn btn-success"><CheckCircle2 size={16} /> Verifikasi</button>
              <button onClick={() => handleVerifikasiTugas('ditolak')} className="btn btn-danger"><XCircle size={16} /> Kembalikan</button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-900">Subtugas ({tugas.subtugas?.length || 0})</h2>
        {canCreateSubtugas && (
          <button onClick={() => setSubtugasOpen(true)} className="btn btn-secondary text-sm"><Plus size={15} /> Tambah Subtugas</button>
        )}
      </div>

      {!tugas.subtugas?.length ? <EmptyState text="Belum ada subtugas." /> : (
        <div className="space-y-3 mb-6">
          {tugas.subtugas.map((s) => (
            <SubtugasRow key={s.id} subtugas={s} role={role} onChanged={load} />
          ))}
        </div>
      )}

      <Modal open={subtugasOpen} onClose={() => setSubtugasOpen(false)} title="Tambah Subtugas">
        <form onSubmit={handleAddSubtugas} className="space-y-4">
          <div>
            <label className="label">Judul Subtugas</label>
            <input required className="input" value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} />
          </div>
          <div>
            <label className="label">Deskripsi</label>
            <textarea className="input" rows={2} value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} />
          </div>
          <div>
            <label className="label">Assign ke Anggota</label>
            <select required className="input" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}>
              <option value="">Pilih anggota...</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Deadline (opsional)</label>
            <input type="date" className="input" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          </div>
          <button className="btn bg-pupr-blue-dark hover:bg-pupr-blue text-white transition-colors disabled:opacity-60 w-full" disabled={saving}>{saving ? 'Menyimpan...' : 'Tambah Subtugas'}</button>
        </form>
      </Modal>

      <Modal open={duplicateOpen} onClose={() => setDuplicateOpen(false)} title="Duplikasi Tugas ke Periode Lain">
        <form onSubmit={handleDuplicate} className="space-y-4">
          <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
            Fitur ini membuat salinan tugas ini (beserta subtugasnya bila dicentang) di tahun anggaran lain.
            Progres tugas baru akan mulai dari 0% -- tugas & subtugas yang sekarang tidak berubah.
            Gunakan ini hanya saat pindah ke <b>tahun anggaran baru</b>; pindah semester dalam tahun
            yang sama tidak perlu duplikasi apa pun, progres berlanjut otomatis.
          </p>
          {duplicateError && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{duplicateError}</div>}
          <div>
            <label className="label">Periode/Tahun Tujuan</label>
            <select required className="input" value={targetPeriodeId} onChange={(e) => setTargetPeriodeId(e.target.value)}>
              <option value="">Pilih periode...</option>
              {periodes.filter((p) => p.id !== tugas.periode_id).map((p) => (
                <option key={p.id} value={p.id}>Tahun {p.tahun}{p.status === 'aktif' ? ' (Aktif)' : ''}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={salinSubtugas} onChange={(e) => setSalinSubtugas(e.target.checked)} />
            Salin juga daftar subtugas (tanpa progres/riwayat lama)
          </label>
          <button className="btn bg-pupr-blue-dark hover:bg-pupr-blue text-white transition-colors disabled:opacity-60 w-full" disabled={duplicating}>
            {duplicating ? 'Menduplikasi...' : 'Duplikasi Tugas'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
