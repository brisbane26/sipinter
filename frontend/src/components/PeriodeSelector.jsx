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
  <div className="flex flex-wrap items-center gap-3">
    {/* Tahun */}
    <div className="relative">
      <Calendar
        size={17}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
      />

      <select
        className="
          h-11
          w-52
          rounded-xl
          border
          border-gray-300
          bg-white
          pl-10
          pr-8
          text-sm
          shadow-sm
          hover:border-gray-400
          focus:outline-none
          focus:ring-2
          focus:ring-blue-500
          transition
        "
        value={periode.periode_id ?? ""}
        onChange={(e) => pilihPeriode(e.target.value)}
      >
        {periodes.map((p) => (
          <option key={p.id} value={p.id}>
            Tahun {p.tahun}
            {p.status === "aktif" ? " (Aktif)" : ""}
          </option>
        ))}
      </select>
    </div>

    {/* Semester */}
    <select
      className="
        h-11
        w-60
        rounded-xl
        border
        border-gray-300
        bg-white
        px-4
        text-sm
        shadow-sm
        hover:border-gray-400
        focus:outline-none
        focus:ring-2
        focus:ring-blue-500
        transition
      "
      value={periode.semester}
      onChange={(e) => pilihSemester(e.target.value)}
    >
      <option value={0}>Seluruh Tahun</option>
      <option value={1}>Semester 1 (Jan–Jun)</option>
      <option value={2}>Semester 2 (Jul–Des)</option>
    </select>

    {user?.role === "kabalai" && (
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="
            h-11
            px-5
            rounded-xl
            border
            border-gray-300
            bg-white
            text-gray-700
            shadow-sm
            hover:bg-gray-50
            hover:border-gray-400
            transition
            flex
            items-center
            gap-2
          "
        >
          <Plus size={17} />
          <span>Periode</span>
        </button>

        {/* Form tetap */}
      </div>
    )}
  </div>
)
}
