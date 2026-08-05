import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ProgressBar from './ProgressBar'
import Modal from './Modal'
import { formatDate, statusBadgeClass } from '../lib/helpers'
import { Paperclip, CheckCircle2, XCircle, Lock, MessageSquare, Send, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import api from '../lib/api'

// Baris subtugas yang dipakai di dalam TugasDetailView.
// role menentukan tombol verifikasi & edit/hapus apa yang muncul.
// users = daftar anggota tim (untuk dropdown assign saat edit).
export default function SubtugasRow({ subtugas, role, onChanged, users = [] }) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [sendingComment, setSendingComment] = useState(false)
  const lastUpdate = subtugas.updates?.[0]

  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ judul: '', deskripsi: '', assigned_to: '', deadline: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const canVerifikasiKatim = role === 'katim' && subtugas.status === 'Menunggu Verifikasi Katim'
  const canVerifikasiKasubag = role === 'kasubag' && subtugas.status === 'Menunggu Verifikasi Kasubag'
  const canManageSubtugas = role === 'katim' || role === 'kasubag'

  // Catatan di sini khusus untuk subtugas ini saja (subtugas_id), bukan catatan
  // umum tugas (yang tampil di bagian "Catatan / Diskusi" pada TugasDetailView).
  useEffect(() => {
    api.get('/comments', { params: { subtugas_id: subtugas.id } }).then((res) => setComments(res.data))
  }, [subtugas.id])

  async function handleAddComment(e) {
    e.preventDefault()
    if (!commentText.trim()) return
    setSendingComment(true)
    try {
      const res = await api.post('/comments', { subtugas_id: subtugas.id, komentar: commentText })
      setComments([...comments, res.data])
      setCommentText('')
    } finally {
      setSendingComment(false)
    }
  }

  async function verifikasi(tahap, keputusan) {
    if (keputusan === 'ditolak' && !note.trim()) {
      alert('Wajib isi catatan alasan penolakan.')
      return
    }
    setBusy(true)
    try {
      await api.post(`/subtugas/${subtugas.id}/verifikasi-${tahap}`, { keputusan, catatan: note })
      setNote('')
      onChanged?.()
    } finally {
      setBusy(false)
    }
  }

  function openEdit() {
    setEditForm({
      judul: subtugas.judul,
      deskripsi: subtugas.deskripsi || '',
      assigned_to: subtugas.assigned_to || subtugas.assignee?.id || '',
      deadline: (subtugas.deadline || '').slice(0, 10),
    })
    setEditError('')
    setEditOpen(true)
  }

  async function handleEdit(e) {
    e.preventDefault()
    setEditSaving(true)
    setEditError('')
    try {
      await api.put(`/subtugas/${subtugas.id}`, editForm)
      setEditOpen(false)
      onChanged?.()
    } catch (err) {
      setEditError(err.response?.data?.message || 'Gagal menyimpan perubahan.')
    } finally {
      setEditSaving(false)
    }
  }

  function openDelete() {
    setDeleteError('')
    setDeleteOpen(true)
  }

  async function handleDelete() {
    setDeleting(true)
    setDeleteError('')
    try {
      await api.delete(`/subtugas/${subtugas.id}`)
      setDeleteOpen(false)
      onChanged?.()
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Gagal menghapus subtugas.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <p className="font-medium text-gray-900 flex items-center gap-1.5">
            {subtugas.judul}
            {subtugas.locked && <Lock size={13} className="text-gray-400" />}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {subtugas.assignee?.name}{subtugas.deadline ? ` · Deadline ${formatDate(subtugas.deadline)}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {canManageSubtugas && (
            <>
              <button onClick={openEdit} title="Edit subtugas" className="p-1.5 rounded-md text-gray-400 hover:text-brand-600 hover:bg-brand-50">
                <Pencil size={14} />
              </button>
              <button onClick={openDelete} title="Hapus subtugas" className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50">
                <Trash2 size={14} />
              </button>
            </>
          )}
          <span className={statusBadgeClass(subtugas.status)}>{subtugas.status}</span>
        </div>
      </div>

      <div className="mt-2"><ProgressBar value={subtugas.progress} /></div>

      {lastUpdate && (
        <div className="mt-2 bg-gray-50 rounded-lg p-3 text-sm">
          {subtugas.updates?.length > 0 && (
            <div className="mt-2 space-y-2">
              {subtugas.updates.map((u) => (
                <div key={u.id} className="bg-gray-50 rounded-lg p-3 text-sm">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>{u.persentase}%</span>
                    <span>{formatDate(u.created_at)}</span>
                  </div>
                  <p className="text-gray-600">{u.catatan || 'Tidak ada catatan dari anggota.'}</p>
                  {u.files?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {u.files.map((f) => (
                        <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-brand-600 hover:underline">
                          <Paperclip size={12} /> {f.file_name || `Bukti ${f.id}`}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {(canVerifikasiKatim || canVerifikasiKasubag) && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <textarea className="input mb-2" rows={2} placeholder="Catatan (wajib jika ditolak)" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex gap-2">
            <button disabled={busy} onClick={() => verifikasi(canVerifikasiKatim ? 'katim' : 'kasubag', 'disetujui')} className="btn btn-success text-sm">
              <CheckCircle2 size={15} /> Verifikasi & Setujui
            </button>
            <button disabled={busy} onClick={() => verifikasi(canVerifikasiKatim ? 'katim' : 'kasubag', 'ditolak')} className="btn btn-danger text-sm">
              <XCircle size={15} /> Kembalikan
            </button>
          </div>
        </div>
      )}

      <div className="mt-3 border-t border-gray-100 pt-3">
        <p className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mb-2">
          <MessageSquare size={13} /> Catatan untuk subtugas ini
        </p>
        {comments.length > 0 && (
          <div className="space-y-2 mb-2">
            {comments.map((c) => (
              <div key={c.id} className="text-sm">
                <span className="font-medium text-gray-800">{c.user?.name}</span>{' '}
                <span className="text-xs text-gray-400">({c.user?.role})</span>
                <p className="text-gray-600">{c.komentar}</p>
              </div>
            ))}
          </div>
        )}
        <form onSubmit={handleAddComment} className="flex gap-2">
          <input
            className="input flex-1 text-sm"
            placeholder="Tulis catatan untuk subtugas ini..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
          />
          <button type="submit" disabled={sendingComment} className="btn btn-secondary text-sm">
            <Send size={14} />
          </button>
        </form>
      </div>

      {canManageSubtugas && (
        <Modal open={editOpen} onClose={() => setEditOpen(false)} title={<span className="inline-block -mx-6 -mt-6 mb-2 px-6 py-4 bg-pupr-yellow text-pupr-blue-dark font-semibold rounded-t-xl w-[calc(100%+3rem)]">Edit Subtugas</span>}>
          <form onSubmit={handleEdit} className="space-y-4">
            {editError && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{editError}</div>}
            <div>
              <label className="label">Judul Subtugas</label>
              <input required className="input" value={editForm.judul} onChange={(e) => setEditForm({ ...editForm, judul: e.target.value })} />
            </div>
            <div>
              <label className="label">Deskripsi</label>
              <textarea className="input" rows={2} value={editForm.deskripsi} onChange={(e) => setEditForm({ ...editForm, deskripsi: e.target.value })} />
            </div>
            <div>
              <label className="label">Assign ke Anggota</label>
              <select required className="input" value={editForm.assigned_to} onChange={(e) => setEditForm({ ...editForm, assigned_to: e.target.value })}>
                <option value="">Pilih anggota...</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                {/* jaga-jaga kalau assignee saat ini tidak ada di daftar users yang diteruskan */}
                {editForm.assigned_to && !users.some((u) => String(u.id) === String(editForm.assigned_to)) && subtugas.assignee && (
                  <option value={subtugas.assignee.id}>{subtugas.assignee.name}</option>
                )}
              </select>
            </div>
            <div>
              <label className="label">Deadline (opsional)</label>
              <input type="date" className="input" value={editForm.deadline} onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })} />
            </div>
            <button className="btn bg-pupr-blue-dark hover:bg-pupr-blue text-white transition-colors disabled:opacity-60 w-full" disabled={editSaving}>{editSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
          </form>
        </Modal>
      )}

      {canManageSubtugas && (
        <Modal
          open={deleteOpen}
          onClose={() => !deleting && setDeleteOpen(false)}
          title={<span className="inline-block -mx-6 -mt-6 mb-2 px-6 py-4 bg-pupr-yellow text-pupr-blue-dark font-semibold rounded-t-xl w-[calc(100%+3rem)]">Hapus Subtugas</span>}
        >
          <div className="space-y-4">
            {deleteError && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{deleteError}</div>}
            <div className="flex items-start gap-3 bg-red-50 text-red-700 rounded-lg px-4 py-3">
              <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
              <p className="text-sm">
                Yakin ingin menghapus subtugas <span className="font-semibold">"{subtugas.judul}"</span>?
                Tindakan ini tidak bisa dibatalkan.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setDeleteOpen(false)} disabled={deleting}>
                Batal
              </button>
              <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Menghapus...' : 'Ya, Hapus Subtugas'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}