export function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function daysUntil(dateStr) {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.round((target - today) / (1000 * 60 * 60 * 24))
}

export function statusBadgeClass(status) {
  const map = {
    'Belum Dimulai': 'badge-belum',
    'Sedang Berjalan': 'badge-berjalan',
    'Menunggu Verifikasi': 'badge-verif-kasubag',
    'Menunggu Verifikasi Katim': 'badge-verif-katim',
    'Menunggu Verifikasi Kasubag': 'badge-verif-kasubag',
    'Selesai': 'badge-selesai',
    'Terlambat': 'badge-terlambat',
  }
  return `badge ${map[status] || 'badge-belum'}`
}

// Bangun URL lengkap untuk file yang disimpan di /storage backend (mis. foto profil).
export function storageUrl(relPath) {
  if (!relPath) return null
  const apiUrl = import.meta.env.VITE_API_URL
  const origin = apiUrl ? apiUrl.replace(/\/api\/?$/, '') : ''
  return `${origin}/storage/${relPath}`
}

export function roleLabel(role) {
  return { kabalai: 'Kabalai', kasubag: 'Kasubag', katim: 'Kepala Tim', anggota: 'Anggota' }[role] || role
}
