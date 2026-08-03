import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { fetchPeriodes, semesterDariTanggal } from '../lib/periode'
import { useAuth } from './AuthContext.jsx'

const PeriodeContext = createContext(null)

// periode di context berbentuk: { periode_id, tahun, semester, status }
// - periode_id & tahun merujuk ke record `periodes` (tahun anggaran) di database.
// - semester: 0 = seluruh tahun, 1 = Jan-Jun, 2 = Jul-Des. Hanya filter tampilan/riwayat,
//   bukan partisi data -- progres tugas & subtugas tetap satu baris yang sama sepanjang tahun.
export function PeriodeProvider({ children }) {
  const { user } = useAuth()
  const [periodes, setPeriodes] = useState([])
  const [periode, setPeriodeState] = useState({ periode_id: null, tahun: null, semester: 0, status: null })
  const [loading, setLoading] = useState(true)

  const muatUlangPeriodes = useCallback(async () => {
    const data = await fetchPeriodes()
    setPeriodes(data)
    return data
  }, [])

  useEffect(() => {
    if (!user) { setLoading(false); return }
    let aktif = true
    ;(async () => {
      try {
        const data = await muatUlangPeriodes()
        if (!aktif) return
        // default: periode aktif (kalau ada), fallback ke tahun terbaru
        const terpilih = data.find((p) => p.status === 'aktif') || data[0]
        if (terpilih) {
          setPeriodeState({
            periode_id: terpilih.id,
            tahun: terpilih.tahun,
            status: terpilih.status,
            semester: semesterDariTanggal(),
          })
        }
      } finally {
        if (aktif) setLoading(false)
      }
    })()
    return () => { aktif = false }
  }, [user, muatUlangPeriodes])

  // ganti periode (tahun) yang dipilih, lewat periode_id
  function pilihPeriode(periodeId) {
    const p = periodes.find((x) => x.id === Number(periodeId))
    if (!p) return
    setPeriodeState((prev) => ({ ...prev, periode_id: p.id, tahun: p.tahun, status: p.status }))
  }

  // ganti filter semester (0 = seluruh tahun, 1, atau 2) untuk periode yang sedang dipilih
  function pilihSemester(semester) {
    setPeriodeState((prev) => ({ ...prev, semester: Number(semester) }))
  }

  return (
    <PeriodeContext.Provider value={{ periode, periodes, loading, pilihPeriode, pilihSemester, muatUlangPeriodes }}>
      {children}
    </PeriodeContext.Provider>
  )
}

export function usePeriode() {
  return useContext(PeriodeContext)
}
