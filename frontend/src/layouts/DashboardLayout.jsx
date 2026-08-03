import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect, useState } from 'react'
import api from '../lib/api'
import PeriodeSelector from '../components/PeriodeSelector'
import {
  LayoutDashboard, ClipboardList, Users, UserCog, Bell,
  User, LogOut, CheckSquare, History, Building2, Menu, X, Eye,
} from 'lucide-react'

const NAV = {
  kabalai: [
    { to: '/kabalai', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/kabalai/tugas', label: 'Pantau Tugas', icon: Eye },
    { to: '/kabalai/teams', label: 'Manajemen Tim', icon: Building2 },
    { to: '/kabalai/users', label: 'Manajemen User', icon: UserCog },
    { to: '/kabalai/notifications', label: 'Notifikasi', icon: Bell },
  ],
  kasubag: [
    { to: '/kasubag', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/kasubag/tugas', label: 'Daftar Tugas', icon: ClipboardList },
    { to: '/kasubag/verifikasi', label: 'Verifikasi', icon: CheckSquare },
    { to: '/kasubag/teams', label: 'Manajemen Tim', icon: Building2 },
    { to: '/kasubag/users', label: 'Manajemen User', icon: UserCog },
    { to: '/kasubag/notifications', label: 'Notifikasi', icon: Bell },
  ],
  katim: [
    { to: '/katim', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/katim/tugas', label: 'Tugas dari Kasubag', icon: ClipboardList },
    { to: '/katim/verifikasi', label: 'Verifikasi Subtugas', icon: CheckSquare },
    { to: '/katim/team', label: 'Tim Saya', icon: Users },
    { to: '/katim/notifications', label: 'Notifikasi', icon: Bell },
  ],
  anggota: [
    { to: '/anggota', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/anggota/subtugas', label: 'Subtugas Saya', icon: ClipboardList },
    { to: '/anggota/history', label: 'Riwayat', icon: History },
    { to: '/anggota/notifications', label: 'Notifikasi', icon: Bell },
  ],
}

const ROLE_LABEL = { kabalai: 'Kabalai', kasubag: 'Kasubag', katim: 'Kepala Tim', anggota: 'Anggota Tim' }
const SHOW_PERIODE = ['kabalai', 'kasubag', 'katim', 'anggota']

export default function DashboardLayout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [unread, setUnread] = useState(0)
  const [mobileOpen, setMobileOpen] = useState(false)
  const items = NAV[user?.role] || []

  useEffect(() => {
    api.get('/notifications/unread-count').then((res) => setUnread(res.data.count)).catch(() => {})
    const interval = setInterval(() => {
      api.get('/notifications/unread-count').then((res) => setUnread(res.data.count)).catch(() => {})
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex">
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-brand-900 text-white flex flex-col transform transition-transform ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="px-5 py-5 border-b border-white/10">
          <p className="font-semibold text-lg leading-tight">Progres Kerja</p>
          <p className="text-xs text-white/60">Balai PUPR</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to} to={to} end={end} onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-brand-600 text-white' : 'text-white/80 hover:bg-white/10'}`}
            >
              <Icon size={18} />
              {label}
              {label === 'Notifikasi' && unread > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{unread}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-white/10 space-y-1">
          <NavLink to={`/${user?.role}/profile`} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/80 hover:bg-white/10">
            <User size={18} /> Profil
          </NavLink>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/80 hover:bg-white/10">
            <LogOut size={18} /> Keluar
          </button>
        </div>
      </aside>

      {mobileOpen && <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setMobileOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-8 py-4 flex items-center justify-between sticky top-0 z-10 gap-3">
          <button className="lg:hidden" onClick={() => setMobileOpen(true)}><Menu size={22} /></button>
          <div className="hidden lg:flex items-center">
            {SHOW_PERIODE.includes(user?.role) && <PeriodeSelector />}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500">{ROLE_LABEL[user?.role]} {user?.jabatan ? `· ${user.jabatan}` : ''}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold text-sm">
              {user?.name?.charAt(0)}
            </div>
          </div>
        </header>
        <div className="lg:hidden px-4 pt-4">
          {SHOW_PERIODE.includes(user?.role) && <PeriodeSelector />}
        </div>
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
