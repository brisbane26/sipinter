import { useEffect, useMemo, useState } from 'react'
import api from '../lib/api'
import { useAutoRefresh } from '../lib/useAutoRefresh'
import { Link } from 'react-router-dom'
import { usePeriode } from '../context/PeriodeContext'
import Modal from './Modal'
import ProgressBar from './ProgressBar'
import Loading from './Loading'
import EmptyState from './EmptyState'
import { formatDate, statusBadgeClass } from '../lib/helpers'
import { Plus, Search, Layers } from 'lucide-react'

const STATUSES = ['Belum Dimulai', 'Sedang Berjalan', 'Menunggu Verifikasi', 'Selesai', 'Terlambat']
const TANPA_KODE = '__tanpa_kode__'

// Kelompokkan daftar tugas berdasarkan kode_tim milik tim pemilik tugas.
// Tim tanpa kode_tim (kosong/null) dikelompokkan ke grup "Tanpa Kode".
function groupTugasByKodeTim(tugasList) {
  const groups = new Map()

  for (const t of tugasList) {
    const kode = t.team?.kode_tim?.trim() || TANPA_KODE
    if (!groups.has(kode)) {
      groups.set(kode, { kode_tim: kode, nama_tim: t.team?.nama_tim || '-', items: [] })
    }
    groups.get(kode).items.push(t)
  }

  return [...groups.values()].sort((a, b) => {
    if (a.kode_tim === TANPA_KODE) return 1
    if (b.kode_tim === TANPA_KODE) return -1
    return a.kode_tim.localeCompare(b.kode_tim)
  })
}

export default function TugasListView({ basePath, canCreate, title, subtitle, groupByTeam }) {
  const { periode } = usePeriode()
  const [tugasList, setTugasList] = useState(null)
  const [teams, setTeams] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [teamFilter, setTeamFilter] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ judul: '', deskripsi: '', deadline: '', team_id: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function load() {
    if (!periode.periode_id) return
    api.get('/tugas', {
      params: {
        search,
        status: statusFilter,
        team_id: teamFilter || undefined,
        periode_id: periode.periode_id,
        semester: periode.semester,
      },
    }).then((res) => setTugasList(res.data.data))
  }

  useAutoRefresh(load, [search, statusFilter, teamFilter, periode.periode_id, periode.semester])
  useEffect(() => { if (canCreate || groupByTeam) api.get('/teams').then((res) => setTeams(res.data)) }, [canCreate, groupByTeam])

  const groupedTugas = useMemo(() => {
    if (!groupByTeam || !tugasList) return null
    return groupTugasByKodeTim(tugasList)
  }, [groupByTeam, tugasList])

  const teamOptions = useMemo(() => {
    return [...teams].sort((a, b) => (a.kode_tim || a.nama_tim).localeCompare(b.kode_tim || b.nama_tim))
  }, [teams])

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.post('/tugas', { ...form, periode_id: periode.periode_id })
      setOpen(false)
      setForm({ judul: '', deskripsi: '', deadline: '', team_id: '' })
      load()
    } catch (err) {
      setError('Gagal membuat tugas. Periksa kembali data.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
        {canCreate && <button onClick={() => setOpen(true)} className="btn bg-pupr-blue-dark hover:bg-pupr-blue text-white transition-colors disabled:opacity-60"><Plus size={16} /> Buat Tugas</button>}
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="     Cari judul atau deskripsi..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input sm:w-56" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Semua Status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {groupByTeam && (
          <select className="input sm:w-64" value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}>
            <option value="">Semua Kategori (Kode Tim)</option>
            {teamOptions.map((t) => (
              <option key={t.id} value={t.id}>{t.kode_tim ? `${t.kode_tim} — ${t.nama_tim}` : t.nama_tim}</option>
            ))}
          </select>
        )}
      </div>

      {!tugasList ? <Loading /> : !tugasList.length ? <EmptyState text="Belum ada tugas pada periode ini." /> : groupByTeam ? (
        <div className="space-y-8">
          {groupedTugas.map((group) => (
            <div key={group.kode_tim}>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 bg-brand-50 text-brand-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                  <Layers size={12} />
                  {group.kode_tim === TANPA_KODE ? 'Tanpa Kode Tim' : group.kode_tim}
                </span>
                <h2 className="font-semibold text-gray-900">{group.nama_tim}</h2>
                <span className="text-xs text-gray-400">({group.items.length} tugas)</span>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {group.items.map((t) => <TugasCard key={t.id} t={t} basePath={basePath} />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {tugasList.map((t) => <TugasCard key={t.id} t={t} basePath={basePath} />)}
        </div>
      )}

      {canCreate && (
        <Modal   open={open} onClose={() => setOpen(false)} title={ <span className="inline-block -mx-6 -mt-6 mb-2 px-6 py-4 bg-pupr-yellow text-pupr-blue-dark font-semibold rounded-t-xl w-[calc(100%+3rem)]"> Buat Tugas Baru </span>} wide>
          <form onSubmit={handleCreate} className="space-y-4">
            {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              Periode: Tahun {periode.tahun} (ubah lewat pemilih periode di atas). Tugas ini akan
              tersimpan di tahun tersebut dan progresnya berlanjut otomatis dari Semester 1 ke Semester 2.
            </p>
            <div>
              <label className="label">Judul Tugas</label>
              <input required className="input" value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} />
            </div>
            <div>
              <label className="label">Deskripsi</label>
              <textarea className="input" rows={3} value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} />
            </div>
            <div>
              <label className="label">Deadline (opsional)</label>
              <input type="date" className="input" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            </div>
            <div>
              <label className="label">Assign ke Tim (Katim)</label>
              <select required className="input" value={form.team_id} onChange={(e) => setForm({ ...form, team_id: e.target.value })}>
                <option value="">Pilih tim...</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.nama_tim} {t.kode_tim ? `(${t.kode_tim})` : ''} — Katim: {t.katim?.name}</option>)}
              </select>
            </div>
            <button className="w-full py-2.5 rounded-lg font-medium bg-pupr-blue-dark hover:bg-pupr-blue text-white transition-colors disabled:opacity-60" disabled={saving}>{saving ? 'Menyimpan...' : 'Buat Tugas'}</button>
          </form>
        </Modal>
      )}
    </div>
  )
}

function TugasCard({ t, basePath }) {
  return (
    <Link to={`${basePath}/${t.id}`} className="card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-900">{t.judul}</h3>
      </div>
      <p className="text-sm text-gray-500 mt-1">Tim: {t.team?.nama_tim} · {t.subtugas_count} subtugas</p>
      <div className="mt-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Progress</span><span>{t.progress}%</span></div>
        <ProgressBar value={t.progress} />
      </div>
      <div className="flex items-center justify-between mt-3">
        <span className={statusBadgeClass(t.status)}>{t.status}</span>
        {t.deadline && <span className="text-xs text-gray-400">Deadline: {formatDate(t.deadline)}</span>}
      </div>
    </Link>
  )
}