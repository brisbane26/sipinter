import { useState } from 'react'
import { usePeriode } from '../context/PeriodeContext'
import { useAuth } from '../context/AuthContext.jsx'
import { createPeriode } from '../lib/periode'
import { Calendar, Plus } from 'lucide-react'

// Pemilih Periode (tahun anggaran) + filter Semester.
// - Dropdown Periode: daftar tahun anggaran yang sudah dibuat Kabalai (data asli dari DB,
//   bukan dihitung dari tanggal hari ini), jadi bisa ditambah tahun baru kapan pun.
// - Dropdown Semester: hanya filter tampilan (Seluruh Tahun / Semester 1 / Semester 2),
//   TIDAK mereset atau memisahkan data -- progres tetap satu baris yang sama sepanjang tahun.
// - Tombol "+ Periode Baru" hanya muncul untuk Kabalai, untuk membuka tahun anggaran baru.
export default function PeriodeSelector() {
  const { periode, periodes, pilihPeriode, pilihSemester, muatUlangPeriodes } = usePeriode()
  const { user } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [tahunBaru, setTahunBaru] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleBuatPeriode(e) {
    e.preventDefault()
    setError('')
    const tahun = Number(tahunBaru)
    if (!tahun || tahun < 2020 || tahun > 2100) {
      setError('Masukkan tahun yang valid.')
      return
    }
    setSaving(true)
    try {
      const baru = await createPeriode(tahun)
      await muatUlangPeriodes()
      pilihPeriode(baru.id)
      setShowForm(false)
      setTahunBaru('')
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal membuat periode baru.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <select
          className="input pl-9 pr-8 py-2 text-sm w-44"
          value={periode.periode_id ?? ''}
          onChange={(e) => pilihPeriode(e.target.value)}
        >
          {periodes.map((p) => (
            <option key={p.id} value={p.id}>
              Tahun {p.tahun}{p.status === 'aktif' ? ' (Aktif)' : ''}
            </option>
          ))}
        </select>
      </div>

      <select
        className="input pr-8 py-2 text-sm w-40"
        value={periode.semester}
        onChange={(e) => pilihSemester(e.target.value)}
      >
        <option value={0}>Seluruh Tahun</option>
        <option value={1}>Semester 1 (Jan-Jun)</option>
        <option value={2}>Semester 2 (Jul-Des)</option>
      </select>

      {user?.role === 'kabalai' && (
        <div className="relative">
          <button
            type="button"
            className="btn btn-secondary py-2 px-3 text-sm flex items-center gap-1"
            onClick={() => setShowForm((v) => !v)}
            title="Buka periode/tahun anggaran baru"
          >
            <Plus size={15} /> Periode
          </button>

          {showForm && (
            <form
              onSubmit={handleBuatPeriode}
              className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-20 space-y-2"
            >
              <label className="text-xs font-medium text-gray-600">Tahun anggaran baru</label>
              <input
                type="number"
                className="input w-full text-sm"
                placeholder="mis. 2027"
                value={tahunBaru}
                onChange={(e) => setTahunBaru(e.target.value)}
                autoFocus
              />
              {error && <p className="text-xs text-red-600">{error}</p>}
              <p className="text-xs text-gray-400">
                Semester 1 & 2 otomatis tersedia. Tugas & subtugas lama tidak ikut pindah —
                gunakan tombol "Duplikasi ke Periode Lain" pada tugas kalau ingin menyalin strukturnya.
              </p>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" className="btn btn-secondary text-sm py-1 px-3" onClick={() => setShowForm(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary text-sm py-1 px-3" disabled={saving}>
                  {saving ? 'Menyimpan...' : 'Buka Periode'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
