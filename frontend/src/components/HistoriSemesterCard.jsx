import { useEffect, useState } from 'react'
import { fetchHistoriSemester } from '../lib/periode'
import ProgressBar from './ProgressBar'
import Loading from './Loading'
import { History } from 'lucide-react'

// Menampilkan histori progres tiap semester dalam satu periode (tahun) yang sedang dipilih.
// Progres semester 1 diambil dari update TERAKHIR yang masuk sebelum akhir Juni, jadi tetap
// tercatat apa adanya walau progres total tugas sudah berubah/bertambah di semester 2.
export default function HistoriSemesterCard({ periodeId }) {
  const [histori, setHistori] = useState(null)

  useEffect(() => {
    if (!periodeId) return
    setHistori(null)
    fetchHistoriSemester(periodeId).then((res) => setHistori(res.histori))
  }, [periodeId])

  if (!periodeId) return null

  return (
    <div className="card p-5">
      <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
        <History size={17} /> Histori Progres per Semester
      </h2>
      <p className="text-xs text-gray-400 mb-4">
        Progres tiap semester tercatat dari riwayat update, tidak berubah lagi setelah semester itu berakhir.
      </p>
      {!histori ? <Loading /> : (
        <div className="grid sm:grid-cols-2 gap-4">
          {histori.map((h) => (
            <div key={h.semester} className="border border-gray-100 rounded-lg p-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-gray-800">{h.label}</span>
                <span className="text-gray-500">{h.rata_rata_progress_akhir_semester}%</span>
              </div>
              <ProgressBar value={h.rata_rata_progress_akhir_semester} />
              <p className="text-xs text-gray-400 mt-2">
                {h.jumlah_tugas} tugas · {h.jumlah_update_progres} update progres pada semester ini
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
