# Progress Kerja Balai PUPR

Aplikasi ini sudah dipisah menjadi dua folder terpisah:

```
progress-kerja-balai-pupr/
├── backend/    -> API Express.js + PostgreSQL (Supabase)  (dulu: Laravel)
└── frontend/   -> React + Vite + Tailwind (tidak diubah tampilan/fiturnya)
```

Semua fitur dan tampilan **sama persis** seperti versi Laravel sebelumnya. Yang diganti hanya:
1. Backend Laravel -> Express.js (Node.js), dengan logika bisnis, endpoint, dan format response yang dibuat identik.
2. Struktur folder dipisah rapi jadi `backend/` dan `frontend/`.

## 1. Backend (Express.js)

```bash
cd backend
cp .env.example .env
# edit .env, isi DATABASE_URL dengan connection string Supabase Postgres Anda
npm install
npm run db:migrate   # membuat semua tabel
npm run db:seed      # (opsional) mengisi data contoh: user, tim, tugas demo
npm run dev           # jalan di http://localhost:8000
```

Semua akun demo dari `npm run db:seed` memakai password: `password`
- kabalai@pupr.go.id (Kepala Balai)
- kasubag@pupr.go.id (Kasubag)
- katim.kpa@pupr.go.id / katim.koi@pupr.go.id / katim.upb@pupr.go.id (Katim)
- rudi@pupr.go.id, dewi@pupr.go.id, dst. (Anggota)

### Catatan teknis backend
- Autentikasi: token bearer (disimpan ter-hash di tabel `auth_tokens`), setara dengan Laravel Sanctum personal access token.
- Upload file (foto profil, lampiran tugas, bukti kerja) disimpan di `backend/storage/` dan diserve lewat `/storage/...`, setara dengan `storage:link` di Laravel.
- Format response list yang di-paginate (`/tugas`, `/users`, `/notifications`) dibuat identik dengan bentuk `LengthAwarePaginator` Laravel (`data`, `current_page`, `per_page`, `total`, dst.) supaya frontend tidak perlu diubah.
- Semua endpoint, aturan role (`kabalai`, `kasubag`, `katim`, `anggota`), dan alur verifikasi berjenjang (Katim -> Kasubag) sama persis dengan versi Laravel.

## 2. Frontend (React + Vite)

```bash
cd frontend
cp .env.example .env   # biarkan VITE_API_URL kosong kalau pakai proxy dev
npm install
npm run dev             # jalan di http://localhost:5173, proxy otomatis ke backend :8000
```

Untuk build production:
```bash
npm run build
# isi VITE_API_URL di .env dengan URL backend production sebelum build, contoh:
# VITE_API_URL=https://api.domainanda.go.id/api
```

Tidak ada perubahan pada tampilan, komponen, halaman, atau alur fitur React — hanya baseURL axios (`src/lib/api.js`) yang dibuat fleksibel karena sekarang backend & frontend berjalan sebagai dua service terpisah (sebelumnya satu server Laravel).

## Database

Skema PostgreSQL lengkap ada di `backend/src/db/schema.sql` (dikonversi 1:1 dari seluruh migration Laravel), dijalankan otomatis lewat `npm run db:migrate`. Cocok langsung dipakai dengan Supabase Postgres — tinggal isi `DATABASE_URL` dari Project Settings > Database di Supabase.
