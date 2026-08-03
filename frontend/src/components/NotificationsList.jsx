import { useEffect, useState } from 'react'
import api from '../lib/api'
import { formatDate } from '../lib/helpers'
import { Bell, CheckCheck } from 'lucide-react'
import EmptyState from './EmptyState'
import Loading from './Loading'

export default function NotificationsList() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  function load() {
    api.get('/notifications').then((res) => setData(res.data.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function markRead(id) {
    await api.post(`/notifications/${id}/read`)
    load()
  }

  async function markAll() {
    await api.post('/notifications/read-all')
    load()
  }

  if (loading) return <Loading />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Notifikasi</h1>
          <p className="text-sm text-gray-500">Pemberitahuan tugas, subtugas, deadline, dan verifikasi.</p>
        </div>
        <button onClick={markAll} className="btn btn-secondary text-xs"><CheckCheck size={16} /> Tandai semua dibaca</button>
      </div>

      {!data?.length ? <EmptyState text="Belum ada notifikasi." /> : (
        <div className="card divide-y divide-gray-100">
          {data.map((n) => (
            <button
              key={n.id}
              onClick={() => !n.is_read && markRead(n.id)}
              className={`w-full text-left flex items-start gap-3 px-5 py-4 hover:bg-gray-50 ${!n.is_read ? 'bg-brand-50/40' : ''}`}
            >
              <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${!n.is_read ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-400'}`}>
                <Bell size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${!n.is_read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{n.judul}</p>
                <p className="text-sm text-gray-500 mt-0.5">{n.isi}</p>
                <p className="text-xs text-gray-400 mt-1">{formatDate(n.created_at)}</p>
              </div>
              {!n.is_read && <span className="w-2 h-2 rounded-full bg-brand-500 mt-2 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
