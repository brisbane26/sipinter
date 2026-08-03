import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../lib/api'
import ProgressBar from '../../components/ProgressBar'
import Loading from '../../components/Loading'
import { formatDate, statusBadgeClass } from '../../lib/helpers'
import { ArrowLeft, Paperclip, UploadCloud, Lock, MessageSquare } from 'lucide-react'

export default function SubtugasDetail() {
  const { id } = useParams()
  const [subtugas, setSubtugas] = useState(null)
  const [persentase, setPersentase] = useState(0)
  const [catatan, setCatatan] = useState('')
  const [files, setFiles] = useState([])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [comments, setComments] = useState([])

  function load() {
    api.get(`/subtugas/${id}`).then((res) => {
      setSubtugas(res.data)
      setPersentase(Number(res.data.progress))
    })
    api.get('/comments', { params: { subtugas_id: id } }).then((res) => setComments(res.data))
  }

  useEffect(() => { load() }, [id])

  async function handleUpdate(e) {
    e.preventDefault()
    setSaving(true)
    setMsg('')
    try {
      const form = new FormData()
      form.append('persentase', persentase)
      form.append('catatan', catatan)
      files.forEach((f) => form.append('files[]', f))
      await api.post(`/subtugas/${id}/updates`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      setCatatan('')
      setFiles([])
      setMsg('Progres berhasil diperbarui.')
      load()
    } catch (err) {
      setMsg(err.response?.data?.message || 'Gagal menyimpan update.')
    } finally {
      setSaving(false)
    }
  }

  if (!subtugas) return <Loading />
  const locked = subtugas.locked

  return (
    <div className="max-w-2xl">
      <Link to="/anggota/subtugas" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={15} /> Kembali
      </Link>

      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              {subtugas.judul}
              {locked && <Lock size={16} className="text-gray-400" />}
            </h1>
            <p className="text-sm text-gray-500 mt-1">Tugas: {subtugas.tugas?.judul}</p>
          </div>
          <span className={statusBadgeClass(subtugas.status)}>{subtugas.status}</span>
        </div>
        <p className="text-sm text-gray-600 mt-3">{subtugas.deskripsi || 'Tidak ada deskripsi.'}</p>
        {subtugas.deadline && <p className="text-xs text-gray-400 mt-3">Deadline: {formatDate(subtugas.deadline)}</p>}

        {subtugas.verifikasi_katim_status === 'ditolak' && subtugas.verifikasi_katim_catatan && (
          <div className="mt-3 bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">
            Dikembalikan oleh Katim: {subtugas.verifikasi_katim_catatan}
          </div>
        )}
        {subtugas.verifikasi_kasubag_status === 'ditolak' && subtugas.verifikasi_kasubag_catatan && (
          <div className="mt-3 bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">
            Dikembalikan oleh Kasubag: {subtugas.verifikasi_kasubag_catatan}
          </div>
        )}

        <div className="mt-4"><ProgressBar value={subtugas.progress} /></div>

        <div className="mt-4 flex items-center gap-4 text-xs">
          <span className={`flex items-center gap-1 ${subtugas.verifikasi_katim_status === 'disetujui' ? 'text-emerald-600' : 'text-gray-400'}`}>
            ● Verifikasi Katim: {subtugas.verifikasi_katim_status === 'disetujui' ? 'Disetujui' : subtugas.verifikasi_katim_status === 'ditolak' ? 'Ditolak' : 'Belum'}
          </span>
          <span className={`flex items-center gap-1 ${subtugas.verifikasi_kasubag_status === 'disetujui' ? 'text-emerald-600' : 'text-gray-400'}`}>
            ● Verifikasi Kasubag: {subtugas.verifikasi_kasubag_status === 'disetujui' ? 'Disetujui' : subtugas.verifikasi_kasubag_status === 'ditolak' ? 'Ditolak' : 'Belum'}
          </span>
        </div>
      </div>

      <div className="card p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Update Progres</h2>
        {locked ? (
          <p className="text-sm text-gray-500 flex items-center gap-2"><Lock size={15} /> Subtugas ini sudah terverifikasi dan progresnya terkunci.</p>
        ) : (
          <form onSubmit={handleUpdate} className="space-y-4">
            {msg && <div className="bg-brand-50 text-brand-700 text-sm px-3 py-2 rounded-lg">{msg}</div>}
            <div>
              <label className="label">Persentase Progres: {persentase}%</label>
              <input type="range" min="0" max="100" step="5" value={persentase} onChange={(e) => setPersentase(e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="label">Catatan</label>
              <textarea className="input" rows={3} value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Jelaskan progres yang sudah dikerjakan..." />
            </div>
            <div>
              <label className="label">Bukti Kerja (foto, PDF, Word, Excel, dll)</label>
              <label className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-gray-300 rounded-lg py-6 cursor-pointer hover:border-brand-400 text-sm text-gray-500">
                <UploadCloud size={22} />
                {files.length ? `${files.length} file dipilih` : 'Klik untuk pilih file (bisa lebih dari satu)'}
                <input type="file" multiple hidden accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.zip" onChange={(e) => setFiles(Array.from(e.target.files))} />
              </label>
            </div>
            <button className="btn btn-primary w-full" disabled={saving}>{saving ? 'Menyimpan...' : 'Kirim Update'}</button>
          </form>
        )}
      </div>

      <div className="card p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Riwayat Update</h2>
        {!subtugas.updates?.length ? <p className="text-sm text-gray-400">Belum ada riwayat.</p> : (
          <div className="space-y-4">
            {subtugas.updates.map((u) => (
              <div key={u.id} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-800">{u.persentase}% — {u.status}</span>
                  <span className="text-xs text-gray-400">{formatDate(u.created_at)}</span>
                </div>
                {u.catatan && <p className="text-sm text-gray-600 mt-1">{u.catatan}</p>}
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

      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><MessageSquare size={17} /> Catatan dari Atasan</h2>
        {!comments.length ? <p className="text-sm text-gray-400">Belum ada catatan.</p> : (
          <div className="space-y-3">
            {comments.map((c) => (
              <div key={c.id} className="text-sm">
                <span className="font-medium text-gray-800">{c.user?.name}</span>{' '}
                <span className="text-xs text-gray-400">({c.user?.role})</span>
                <p className="text-gray-600">{c.komentar}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
