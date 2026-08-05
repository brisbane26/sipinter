import { useEffect, useState } from 'react'
import { fetchHistoriSemester } from '../lib/periode'
import SpeedometerGauge from './SpeedometerGauge'
import Loading from './Loading'
import { History } from 'lucide-react'

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
            <div key={h.semester} className="border border-gray-100 rounded-lg p-4 flex flex-col items-center text-center">
              <span className="font-medium text-gray-800 text-sm mb-2">{h.label}</span>
              <SpeedometerGauge value={h.rata_rata_progress_akhir_semester} size={140} />
              <p className="text-xs text-gray-400 mt-2">
                {h.subtugas_selesai} / {h.jumlah_subtugas} subtugas selesai pada akhir semester ini · {h.jumlah_tugas} tugas
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}