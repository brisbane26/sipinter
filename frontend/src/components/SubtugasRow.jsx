import { useState } from 'react'
import { Link } from 'react-router-dom'
import ProgressBar from './ProgressBar'
import { formatDate, statusBadgeClass } from '../lib/helpers'
import { Paperclip, CheckCircle2, XCircle, Lock } from 'lucide-react'
import api from '../lib/api'

// Baris subtugas yang dipakai di dalam TugasDetailView.
// role menentukan tombol verifikasi apa yang muncul.
export default function SubtugasRow({ subtugas, role, onChanged }) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const lastUpdate = subtugas.updates?.[0]

  const canVerifikasiKatim = role === 'katim' && subtugas.status === 'Menunggu Verifikasi Katim'
  const canVerifikasiKasubag = role === 'kasubag' && subtugas.status === 'Menunggu Verifikasi Kasubag'

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
        <span className={statusBadgeClass(subtugas.status)}>{subtugas.status}</span>
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
    </div>
  )
}
