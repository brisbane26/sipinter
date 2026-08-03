import bcrypt from 'bcryptjs';
import pool from './pool.js';

const ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12);

async function createUser(client, { name, nip, email, role, jabatan }) {
  const hash = await bcrypt.hash('password', ROUNDS);
  const { rows } = await client.query(
    `INSERT INTO users (name, nip, email, password, role, jabatan, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,true) RETURNING *`,
    [name, nip, email, hash, role, jabatan]
  );
  return rows[0];
}

async function createTeam(client, { nama_tim, kode_tim, katim_id }) {
  const { rows } = await client.query(
    `INSERT INTO teams (nama_tim, kode_tim, katim_id) VALUES ($1,$2,$3) RETURNING *`,
    [nama_tim, kode_tim, katim_id]
  );
  return rows[0];
}

async function syncMembers(client, teamId, userIds) {
  for (const uid of userIds) {
    await client.query(
      `INSERT INTO team_members (team_id, user_id) VALUES ($1,$2)
       ON CONFLICT (team_id, user_id) DO NOTHING`,
      [teamId, uid]
    );
  }
}

async function createTugas(client, { judul, deskripsi, periode_id, created_by, team_id }) {
  const { rows } = await client.query(
    `INSERT INTO tugas (judul, deskripsi, periode_id, deadline, status, progress, created_by, team_id)
     VALUES ($1,$2,$3,NULL,'Belum Dimulai',0,$4,$5) RETURNING *`,
    [judul, deskripsi, periode_id, created_by, team_id]
  );
  return rows[0];
}

async function recalculateProgress(client, tugasId) {
  const { rows: subtugasRows } = await client.query(
    `SELECT progress, status FROM subtugas WHERE tugas_id = $1`,
    [tugasId]
  );
  const { rows: tugasRows } = await client.query(`SELECT * FROM tugas WHERE id = $1`, [tugasId]);
  const tugas = tugasRows[0];

  let progress = 0;
  let status = tugas.status;

  if (subtugasRows.length > 0) {
    const avg = subtugasRows.reduce((s, r) => s + Number(r.progress), 0) / subtugasRows.length;
    progress = Math.round(avg * 100) / 100;

    const allSelesai = subtugasRows.every((s) => s.status === 'Selesai');
    if (allSelesai) {
      if (status !== 'Selesai') status = 'Menunggu Verifikasi';
    } else if (progress > 0 && ['Belum Dimulai', 'Menunggu Verifikasi'].includes(status)) {
      status = 'Sedang Berjalan';
    }
  }

  await client.query(`UPDATE tugas SET progress = $1, status = $2, updated_at = now() WHERE id = $3`, [
    progress,
    status,
    tugasId,
  ]);
}

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const kabalai = await createUser(client, {
      name: 'Ir. Bambang Sutrisno',
      nip: '196601011990031001',
      email: 'kabalai@pupr.go.id',
      role: 'kabalai',
      jabatan: 'Kepala Balai',
    });

    const kasubag = await createUser(client, {
      name: 'Dra. Sri Wahyuni, M.M.',
      nip: '197005152000032001',
      email: 'kasubag@pupr.go.id',
      role: 'kasubag',
      jabatan: 'Kepala Sub Bagian Tata Usaha',
    });

    const katimKpa = await createUser(client, {
      name: 'Andi Wijaya, S.T.',
      nip: '198203152005011002',
      email: 'katim.kpa@pupr.go.id',
      role: 'katim',
      jabatan: 'Ketua Tim Bidang Program, Keuangan dan Anggaran (Katim KPA)',
    });

    const katimKoi = await createUser(client, {
      name: 'Siti Rahayu, S.T., M.T.',
      nip: '198507102008012003',
      email: 'katim.koi@pupr.go.id',
      role: 'katim',
      jabatan: 'Ketua Tim Bidang Kepegawaian, Organisasi dan Informasi (Katim KOI)',
    });

    const katimUpb = await createUser(client, {
      name: 'Rahmat Hidayat, S.E.',
      nip: '198809202010011004',
      email: 'katim.upb@pupr.go.id',
      role: 'katim',
      jabatan: 'Ketua Tim Bidang Umum, Pengadaan dan BMN (Katim UPB)',
    });

    const anggotaData = [
      ['Rudi Hartono', '199001012015011001', 'rudi@pupr.go.id'],
      ['Dewi Lestari', '199203152016022002', 'dewi@pupr.go.id'],
      ['Fajar Nugroho', '199105202017011003', 'fajar@pupr.go.id'],
      ['Maya Anggraini', '199308122018022004', 'maya@pupr.go.id'],
      ['Yusuf Pratama', '199206182019011005', 'yusuf@pupr.go.id'],
      ['Nita Kurniawati', '199410102020022006', 'nita@pupr.go.id'],
    ];
    const anggota = [];
    for (const [name, nip, email] of anggotaData) {
      anggota.push(
        await createUser(client, { name, nip, email, role: 'anggota', jabatan: 'Staf Teknik' })
      );
    }

    const teamKpa = await createTeam(client, {
      nama_tim: 'Tim Program, Keuangan dan Anggaran',
      kode_tim: 'KPA',
      katim_id: katimKpa.id,
    });
    await syncMembers(client, teamKpa.id, [anggota[0].id, anggota[1].id]);

    const teamKoi = await createTeam(client, {
      nama_tim: 'Tim Kepegawaian, Organisasi dan Informasi',
      kode_tim: 'KOI',
      katim_id: katimKoi.id,
    });
    await syncMembers(client, teamKoi.id, [anggota[2].id, anggota[3].id]);

    const teamUpb = await createTeam(client, {
      nama_tim: 'Tim Umum, Pengadaan dan BMN',
      kode_tim: 'UPB',
      katim_id: katimUpb.id,
    });
    await syncMembers(client, teamUpb.id, [anggota[4].id, anggota[5].id]);

    const tahunSekarang = new Date().getFullYear();
    const { rows: periodeRows } = await client.query(
      `INSERT INTO periodes (tahun, status, dibuat_oleh) VALUES ($1,'aktif',$2) RETURNING *`,
      [tahunSekarang, kasubag.id]
    );
    const periode = periodeRows[0];

    const uraianTugas = {
      [teamKpa.id]: [
        'Perencanaan dan Penyusunan Program/Anggaran',
        'Pengelolaan dan Pengendalian Keuangan',
        'Penyusunan Laporan Keuangan dan Akuntabilitas',
        'Pemantauan, Evaluasi, dan Pelaporan Kinerja (Monev)',
      ],
      [teamKoi.id]: [
        'Pelaksanaan Layanan Kepegawaian',
        'Pelaksanaan Tata Kelola Informasi',
        'Pelayanan dan Penyebarluasan Informasi Publik',
        'Pemantauan Terpenuhinya Pengembangan Kompetensi Pegawai',
        'Koordinasi Penyiapan Bahan, Pelaksanaan, dan Pemantauan Program Reformasi Birokrasi (ZI, SMM, SMAP)',
      ],
      [teamUpb.id]: [
        'Pelaksanaan Urusan Umum, Persuratan dan Rumah Tangga',
        'Pengelolaan dan Penatausahaan Barang Milik Negara',
        'Pelaksanaan Pengadaan Barang dan Jasa',
      ],
    };

    let contohTugasId = null;
    for (const [teamId, daftar] of Object.entries(uraianTugas)) {
      for (const judul of daftar) {
        const t = await createTugas(client, {
          judul,
          deskripsi: `Uraian tugas sesuai SK penunjukan Ketua Tim, Tahun Anggaran ${periode.tahun}.`,
          periode_id: periode.id,
          created_by: kasubag.id,
          team_id: Number(teamId),
        });
        if (Number(teamId) === teamKpa.id && contohTugasId === null) {
          contohTugasId = t.id;
        }
      }
    }

    // ---- Contoh 1 tugas dengan subtugas berjalan, biar ada demo data hidup ----
    const deadline1 = new Date();
    deadline1.setDate(deadline1.getDate() + 14);
    const deadline2 = new Date();
    deadline2.setDate(deadline2.getDate() + 7);

    await client.query(
      `INSERT INTO subtugas (tugas_id, judul, deskripsi, assigned_to, deadline, progress, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        contohTugasId,
        'Menyusun draft RKA-KL tahun berjalan',
        'Kompilasi usulan dari masing-masing bidang.',
        anggota[0].id,
        deadline1.toISOString().slice(0, 10),
        60,
        'Sedang Berjalan',
        katimKpa.id,
      ]
    );

    await client.query(
      `INSERT INTO subtugas (tugas_id, judul, deskripsi, assigned_to, deadline, progress, status, verifikasi_katim_status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'menunggu',$8)`,
      [
        contohTugasId,
        'Rekonsiliasi realisasi anggaran bulan berjalan',
        'Cocokkan data SAKTI dengan realisasi riil.',
        anggota[1].id,
        deadline2.toISOString().slice(0, 10),
        100,
        'Menunggu Verifikasi Katim',
        katimKpa.id,
      ]
    );

    await recalculateProgress(client, contohTugasId);

    await client.query('COMMIT');
    console.log('Seeding selesai. Semua akun demo memakai password: "password"');
    console.log('Contoh login: kabalai@pupr.go.id / kasubag@pupr.go.id / katim.kpa@pupr.go.id / rudi@pupr.go.id');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Seeding gagal:', err);
  process.exit(1);
});
