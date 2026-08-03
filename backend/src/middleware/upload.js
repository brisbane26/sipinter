import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';

const STORAGE_ROOT = path.join(process.cwd(), 'storage');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function makeStorage(subfolder) {
  const dir = path.join(STORAGE_ROOT, subfolder);
  ensureDir(dir);
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const name = crypto.randomBytes(20).toString('hex') + ext;
      cb(null, name);
    },
  });
}

export const uploadProfil = multer({
  storage: makeStorage('profil'),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB, sama dengan validasi Laravel (max:2048 KB)
});

export const uploadLampiranTugas = multer({
  storage: makeStorage('lampiran-tugas'),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB (max:10240 KB)
});

export const uploadBuktiKerja = multer({
  storage: makeStorage('bukti-kerja'),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB (max:20480 KB)
});

/**
 * Klasifikasi tipe file, port dari logika di TugasController & SubtugasUpdateController.
 */
export function classifyFileType(originalName) {
  const ext = path.extname(originalName).replace('.', '').toLowerCase();
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return 'foto';
  if (ext === 'pdf') return 'pdf';
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) return 'dokumen';
  return 'lainnya';
}

export function relativePath(subfolder, filename) {
  return `${subfolder}/${filename}`;
}

export function fileUrl(req, relPath) {
  const base = `${req.protocol}://${req.get('host')}`;
  return `${base}/storage/${relPath}`;
}
