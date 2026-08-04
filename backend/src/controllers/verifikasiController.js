import pool from '../db/pool.js';
import * as ActivityLog from '../utils/activityLog.js';
import * as NotificationService from '../services/notificationService.js';
import { recalculateProgress } from '../utils/tugasHelper.js';
import { fileUrl } from '../middleware/upload.js';

/**
 * Tahap 1: Katim memverifikasi subtugas anggotanya (baik yang dia buat sendiri
 * maupun yang dibuat langsung oleh Kasubag untuk anggota timnya).
 */
export async function verifikasiKatim(req, res) {
  const user = req.user;
  const subtugasId = req.params.subtugas;

  if (!['katim', 'kasubag'].includes(user.role)) {
    return res.status(403).json({ message: 'Hanya katim yang dapat melakukan verifikasi tahap ini.' });
  }

  const { rows: subtugasRows } = await pool.query(`SELECT * FROM subtugas WHERE id = $1`, [subtugasId]);
  const subtugas = subtugasRows[0];
  if (!subtugas) return res.status(404).json({ message: 'Subtugas tidak ditemukan.' });

  if (subtugas.status !== 'Menunggu Verifikasi Katim') {
    return res.status(422).json({ message: 'Subtugas ini tidak sedang menunggu verifikasi katim.' });
  }

  const { keputusan, catatan = null } = req.body || {};
  if (!['disetujui', 'ditolak'].includes(keputusan)) {
    return res.status(422).json({ message: 'Keputusan tidak valid.' });
  }
  if (keputusan === 'ditolak' && !catatan) {
    return res.status(422).json({ message: 'Catatan wajib diisi jika menolak.' });
  }

  let updated;
  if (keputusan === 'disetujui') {
    const { rows } = await pool.query(
      `UPDATE subtugas SET status = 'Menunggu Verifikasi Kasubag',
          verifikasi_katim_status = 'disetujui', verifikasi_katim_by = $1,
          verifikasi_katim_at = now(), verifikasi_katim_catatan = $2, updated_at = now()
       WHERE id = $3 RETURNING *`,
      [user.id, catatan, subtugasId]
    );
    updated = rows[0];

    const { rows: kasubagRows } = await pool.query(`SELECT id FROM users WHERE role = 'kasubag'`);
    await NotificationService.kirimKeBanyak(
      kasubagRows.map((r) => r.id),
      'Subtugas menunggu verifikasi akhir',
      `Subtugas '${subtugas.judul}' sudah diverifikasi katim, menunggu verifikasi Anda.`,
      '/kasubag/verifikasi'
    );
  } else {
    const { rows } = await pool.query(
      `UPDATE subtugas SET status = 'Sedang Berjalan',
          verifikasi_katim_status = 'ditolak', verifikasi_katim_by = $1,
          verifikasi_katim_at = now(), verifikasi_katim_catatan = $2, updated_at = now()
       WHERE id = $3 RETURNING *`,
      [user.id, catatan, subtugasId]
    );
    updated = rows[0];
  }

  await recalculateProgress(updated.tugas_id);

  await NotificationService.kirim(
    updated.assigned_to,
    keputusan === 'disetujui' ? 'Subtugas diverifikasi katim' : 'Subtugas dikembalikan katim',
    keputusan === 'disetujui'
      ? `Subtugas '${updated.judul}' disetujui katim, menunggu verifikasi akhir kasubag.`
      : `Subtugas '${updated.judul}' dikembalikan. Catatan: ${catatan}`,
    `/anggota/subtugas/${updated.id}`
  );

  await ActivityLog.catat(
    user.id,
    `verifikasi katim subtugas ${updated.judul} (${keputusan})`,
    'subtugas',
    updated.id
  );

  const { rows: fresh } = await pool.query(`SELECT * FROM subtugas WHERE id = $1`, [subtugasId]);
  return res.json(fresh[0]);
}

/**
 * Tahap 2: Kasubag melakukan verifikasi akhir (double-check) atas subtugas
 * yang sudah disetujui katim -- baik subtugas buatan katim maupun buatan kasubag sendiri.
 */
export async function verifikasiKasubag(req, res) {
  const user = req.user;
  const subtugasId = req.params.subtugas;

  if (user.role !== 'kasubag') {
    return res.status(403).json({ message: 'Hanya kasubag yang dapat melakukan verifikasi akhir.' });
  }

  const { rows: subtugasRows } = await pool.query(`SELECT * FROM subtugas WHERE id = $1`, [subtugasId]);
  const subtugas = subtugasRows[0];
  if (!subtugas) return res.status(404).json({ message: 'Subtugas tidak ditemukan.' });

  if (subtugas.status !== 'Menunggu Verifikasi Kasubag') {
    return res.status(422).json({ message: 'Subtugas ini tidak sedang menunggu verifikasi kasubag.' });
  }

  const { keputusan, catatan = null } = req.body || {};
  if (!['disetujui', 'ditolak'].includes(keputusan)) {
    return res.status(422).json({ message: 'Keputusan tidak valid.' });
  }
  if (keputusan === 'ditolak' && !catatan) {
    return res.status(422).json({ message: 'Catatan wajib diisi jika menolak.' });
  }

  let updated;
  if (keputusan === 'disetujui') {
    const { rows } = await pool.query(
      `UPDATE subtugas SET status = 'Selesai', progress = 100,
          verifikasi_kasubag_status = 'disetujui', verifikasi_kasubag_by = $1,
          verifikasi_kasubag_at = now(), verifikasi_kasubag_catatan = $2, updated_at = now()
       WHERE id = $3 RETURNING *`,
      [user.id, catatan, subtugasId]
    );
    updated = rows[0];
  } else {
    // Ditolak kasubag -> kembali ke anggota untuk revisi, verifikasi katim direset
    // supaya rantai verifikasi diulang dari awal (mencegah kelalaian double-check).
    const { rows } = await pool.query(
      `UPDATE subtugas SET status = 'Sedang Berjalan',
          verifikasi_katim_status = NULL,
          verifikasi_kasubag_status = 'ditolak', verifikasi_kasubag_by = $1,
          verifikasi_kasubag_at = now(), verifikasi_kasubag_catatan = $2, updated_at = now()
       WHERE id = $3 RETURNING *`,
      [user.id, catatan, subtugasId]
    );
    updated = rows[0];
  }

  await recalculateProgress(updated.tugas_id);

  await NotificationService.kirim(
    updated.assigned_to,
    keputusan === 'disetujui' ? 'Subtugas selesai & terverifikasi' : 'Subtugas dikembalikan kasubag',
    keputusan === 'disetujui'
      ? `Subtugas '${updated.judul}' telah diverifikasi final oleh kasubag.`
      : `Subtugas '${updated.judul}' dikembalikan kasubag. Catatan: ${catatan}`,
    `/anggota/subtugas/${updated.id}`
  );

  const { rows: teamRows } = await pool.query(
    `SELECT tm.katim_id FROM tugas t JOIN teams tm ON tm.id = t.team_id WHERE t.id = $1`,
    [updated.tugas_id]
  );
  const katimId = teamRows[0]?.katim_id;
  if (katimId) {
    await NotificationService.kirim(
      katimId,
      keputusan === 'disetujui' ? 'Subtugas diverifikasi final kasubag' : 'Subtugas dikembalikan kasubag',
      `Subtugas '${updated.judul}' (tim Anda) telah ${keputusan} oleh kasubag.`
    );
  }

  await ActivityLog.catat(
    user.id,
    `verifikasi kasubag subtugas ${updated.judul} (${keputusan})`,
    'subtugas',
    updated.id
  );

  const { rows: fresh } = await pool.query(`SELECT * FROM subtugas WHERE id = $1`, [subtugasId]);
  return res.json(fresh[0]);
}

// Antrian verifikasi untuk Katim: subtugas timnya yang menunggu verifikasi katim.
export async function antrianKatim(req, res) {
  const user = req.user;

  const { rows } = await pool.query(
    `SELECT s.*,
        json_build_object(
          'id', t.id, 'judul', t.judul,
          'team', json_build_object('id', tm.id, 'nama_tim', tm.nama_tim, 'katim_id', tm.katim_id)
        ) AS tugas,
        json_build_object('id', a.id, 'name', a.name) AS assignee
     FROM subtugas s
     JOIN tugas t ON t.id = s.tugas_id
     JOIN teams tm ON tm.id = t.team_id
     JOIN users a ON a.id = s.assigned_to
     WHERE tm.katim_id = $1 AND s.status = 'Menunggu Verifikasi Katim'`,
    [user.id]
  );

  for (const s of rows) {
    const { rows: updateRows } = await pool.query(
      `SELECT * FROM subtugas_updates WHERE subtugas_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [s.id]
    );
    if (updateRows[0]) {
      const { rows: fileRows } = await pool.query(
        `SELECT * FROM subtugas_files WHERE subtugas_update_id = $1`,
        [updateRows[0].id]
      );
      updateRows[0].files = fileRows.map((f) => ({ ...f, url: fileUrl(req, f.file_path) }));
    }
    s.updates = updateRows;
  }

  return res.json(rows);
}

// Antrian verifikasi untuk Kasubag: subtugas (semua tim) + tugas yang menunggu verifikasi akhir.
export async function antrianKasubag(req, res) {
  const { rows: subtugas } = await pool.query(
    `SELECT s.*,
        json_build_object(
          'id', t.id, 'judul', t.judul,
          'team', json_build_object('id', tm.id, 'nama_tim', tm.nama_tim, 'katim_id', tm.katim_id)
        ) AS tugas,
        json_build_object('id', a.id, 'name', a.name) AS assignee
     FROM subtugas s
     JOIN tugas t ON t.id = s.tugas_id
     JOIN teams tm ON tm.id = t.team_id
     JOIN users a ON a.id = s.assigned_to
     WHERE s.status = 'Menunggu Verifikasi Kasubag'`
  );

  for (const s of subtugas) {
    const { rows: updateRows } = await pool.query(
      `SELECT * FROM subtugas_updates WHERE subtugas_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [s.id]
    );
    if (updateRows[0]) {
      const { rows: fileRows } = await pool.query(
        `SELECT * FROM subtugas_files WHERE subtugas_update_id = $1`,
        [updateRows[0].id]
      );
      updateRows[0].files = fileRows.map((f) => ({ ...f, url: fileUrl(req, f.file_path) }));
    }
    s.updates = updateRows;
  }

  const { rows: tugas } = await pool.query(
    `SELECT t.*,
        json_build_object(
          'id', tm.id, 'nama_tim', tm.nama_tim,
          'katim', json_build_object('id', k.id, 'name', k.name)
        ) AS team
     FROM tugas t
     JOIN teams tm ON tm.id = t.team_id
     JOIN users k ON k.id = tm.katim_id
     WHERE t.status = 'Menunggu Verifikasi'`
  );

  return res.json({ subtugas, tugas });
}
