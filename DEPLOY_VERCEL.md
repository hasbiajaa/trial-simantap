# Panduan Deploy Demo ke Vercel

Panduan ini mencakup langkah lengkap untuk mempublikasikan aplikasi SIMSPI (versi demo) ke Vercel sebagai static site yang dapat diakses publik.

---

## Prasyarat

- Akun [GitHub](https://github.com)
- Akun [Vercel](https://vercel.com) (bisa daftar pakai akun GitHub, gratis)
- Node.js dan pnpm terinstall di komputer lokal
- Kode project sudah ada di komputer lokal

---

## Step 1 — Persiapkan File `vercel.json`

Buat file `vercel.json` di **root folder project** (sejajar dengan `package.json`):

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

> **Mengapa perlu ini?**
> Aplikasi ini menggunakan client-side routing (React). Tanpa file ini, jika user membuka URL langsung atau melakukan refresh, Vercel akan mengembalikan error 404.

---

## Step 2 — Pastikan Build Berjalan Lokal

Sebelum deploy, pastikan proses build tidak ada error:

```bash
pnpm install
pnpm run build
```

Jika berhasil, akan muncul folder `dist/` di root project. Folder inilah yang akan di-deploy ke Vercel.

Jika ada error TypeScript, perbaiki terlebih dahulu sebelum lanjut.

---

## Step 3 — Upload Kode ke GitHub

### Jika belum punya repo GitHub:

1. Buka [github.com](https://github.com) → klik **New** (buat repository baru)
2. Isi nama repository, contoh: `simspi-demo`
3. Pilih **Private** (disarankan untuk demo internal) atau **Public**
4. Klik **Create repository**

### Push kode dari lokal ke GitHub:

Jalankan perintah berikut di terminal, di dalam folder project:

```bash
# Inisialisasi git (lewati jika sudah pernah)
git init

# Tambahkan semua file
git add .

# Commit pertama
git commit -m "initial commit: simspi demo"

# Hubungkan ke repo GitHub (ganti URL sesuai repo kamu)
git remote add origin https://github.com/username/simspi-demo.git

# Push ke branch main
git push -u origin main
```

> Jika diminta login GitHub di terminal, gunakan **Personal Access Token** (bukan password). Buat di: GitHub → Settings → Developer Settings → Personal Access Tokens.

---

## Step 4 — Deploy ke Vercel

1. Buka [vercel.com](https://vercel.com) dan login menggunakan akun GitHub
2. Dari dashboard, klik **"Add New Project"**
3. Pilih repository `simspi-demo` dari daftar
4. Vercel akan otomatis mendeteksi bahwa ini proyek Vite. Pastikan konfigurasi berikut:

   | Setting | Nilai |
   |---|---|
   | Framework Preset | Vite |
   | Build Command | `pnpm run build` |
   | Output Directory | `dist` |
   | Install Command | `pnpm install` |
   | Root Directory | `.` (default) |

5. Klik **"Deploy"**
6. Tunggu proses build selesai (biasanya 1–2 menit)

---

## Step 5 — Akses URL Demo

Setelah deploy berhasil, Vercel akan memberikan URL publik seperti:

```
https://simspi-demo.vercel.app
```

URL ini bisa langsung dibagikan. Setiap kali ada perubahan kode yang di-push ke GitHub, Vercel akan otomatis melakukan redeploy.

---

## Step 6 — Custom Domain (Opsional)

Jika ingin menggunakan domain sendiri, misalnya `demo.simspi.ac.id`:

1. Di dashboard Vercel, buka project → tab **Domains**
2. Klik **"Add Domain"** → masukkan domain
3. Ikuti instruksi untuk mengarahkan DNS di registrar domain kamu:
   - Tambahkan **CNAME record**: `demo` → `cname.vercel-dns.com`
   - Atau **A record**: `@` → `76.76.21.21`
4. Vercel otomatis mengurus SSL/HTTPS

---

## Catatan Penting

| Hal | Keterangan |
|---|---|
| Data | Semua data pada demo bersifat statis (hardcoded), tidak tersimpan ke database |
| Autentikasi | Login demo menggunakan simulasi lokal, bukan autentikasi sungguhan |
| Tampilan mobile | Tampilan dioptimalkan untuk desktop; pada ponsel beberapa bagian mungkin perlu scroll horizontal |
| Biaya | Tier gratis Vercel mencukupi untuk kebutuhan demo |
| Batas bandwidth | Gratis: 100 GB/bulan — lebih dari cukup untuk demo internal |

---

## Troubleshooting

### Build gagal karena error TypeScript
```bash
npx tsc --noEmit
```
Perbaiki semua error yang muncul, lalu push ulang.

### Halaman 404 setelah refresh
Pastikan file `vercel.json` sudah ada di root project dan sudah di-commit ke GitHub.

### Vercel tidak mendeteksi pnpm
Pastikan Install Command di Vercel diisi manual: `pnpm install` (bukan dibiarkan auto-detect).

### Perubahan tidak muncul setelah push
Cek tab **Deployments** di dashboard Vercel — pastikan build terbaru statusnya **Ready**, bukan **Error**.

---

## Alur Ringkas

```
Edit kode lokal
      ↓
pnpm run build  (verifikasi tidak ada error)
      ↓
git add . && git commit -m "pesan" && git push
      ↓
Vercel otomatis build & deploy
      ↓
URL demo terupdate
```
