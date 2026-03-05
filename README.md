# 🏢 SIPebaru — Sistem Informasi Pengaduan Barang Rusak

Sistem manajemen pengaduan inventaris *enterprise-ready* dengan **Role-Based Access Control (RBAC)** ketat, validasi Portal Badge, dan pelaporan otomatis.

![React](https://img.shields.io/badge/React_18-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite_5-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase&logoColor=white)

---

## ✨ Fitur Utama

### 🔐 Keamanan & Akses
- **Single Point of Entry (SPOE)** — Halaman `/setup` untuk inisialisasi Super Admin pertama. Setelah digunakan, rute otomatis terkunci permanen dan tidak dapat diakses lagi.
- **Strict RBAC** di level database (RLS + RPC) dan frontend:

  | Role | Hak Akses |
  |------|-----------|
  | **Super Admin** | Full access: kelola pengaduan, kelola akun (CRUD), import data, lihat log aktivitas |
  | **Admin** | Kelola pengaduan, edit profil & password sendiri |
  | **Viewer** | Read-only dashboard, export laporan |

### 📊 Operasional
- **Portal Badge** — Validasi Nomor Induk (NPK 6-digit) karyawan sebelum submit pengaduan.
- **Dashboard Visualisasi** — Grafik statistik pengaduan per bulan, departemen, dan status.
- **Laporan Bulanan** — Generate & export laporan dalam format PDF.
- **Manajemen Data Master** — Kelola Unit Kerja (Departments) dan Batch Member.

### 📥 Batch Import
- **Drag & drop** file Excel (`.xlsx`) untuk import data anggota secara massal.
- **Download Template** Excel siap pakai.
- Validasi otomatis per baris: skip data kosong, duplikat, atau unit kerja yang tidak valid.
- Toast rangkuman hasil import (berhasil vs dilewati).

---

## 🛠️ Tech Stack

| Layer | Teknologi |
|-------|-----------|
| **Frontend** | React 18, Vite 5, TypeScript |
| **Styling** | Tailwind CSS, shadcn/ui |
| **State** | TanStack React Query |
| **Form** | React Hook Form, Zod |
| **Backend** | Supabase (PostgreSQL, Auth, RLS, RPC, Edge Functions, Storage) |
| **Import** | SheetJS (`xlsx`) |
| **Report** | jsPDF, jspdf-autotable |
| **Chart** | Recharts |

---

## 📋 Prerequisites

Pastikan tools berikut sudah terinstall:

- **Node.js** `≥ 18` atau **Bun** `≥ 1.0`
- **Git**
- **Supabase CLI** — [Panduan Instalasi](https://supabase.com/docs/guides/cli/getting-started)

  ```bash
  npm install -g supabase
  ```

---

## 🚀 Local Development Setup

Berikut adalah panduan mendetail dari awal hingga aplikasi siap dijalankan.

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/your-username/SIPebaru.git
cd SIPebaru
npm install
# atau
bun install
```

### 2. Setup Environment Variables

Salin file template lingkungan dan ubah namanya menjadi `.env` (bukan `.env.local`).

```bash
cp .env.example .env
```

Buka file `.env` dan isi variabel berikut dengan kredensial dari dashboard Supabase Anda (Project Settings -> API):

```env
VITE_SUPABASE_PROJECT_ID=your_project_id
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
VITE_SUPABASE_URL=https://your_project_id.supabase.co
```

### 3. Konfigurasi Supabase Config (`config.toml`)

Buka file `supabase/config.toml` dan tambahkan ID proyek Anda serta konfigurasi JWT untuk Edge Functions. Pastikan blok berikut ada di dalam file tersebut:

```toml
project_id = "mvzfzmjlcuuwdaesehqq"
```

### 4. Connect Supabase & Push Database

> ⚠️ **Metode ini tidak memerlukan Docker lokal.** Semua operasi dilakukan langsung ke database Supabase remote.

```bash
# Login ke akun Supabase melalui CLI
supabase login

# Hubungkan proyek lokal ke remote Supabase (ganti ID dengan Project Reference Anda)
supabase link --project-ref mvzfzmjlcuuwdaesehqq

# Push schema migrasi & terapkan seeder data (Departments, Members, dan Pengaduan dummy)
supabase db reset --linked
```

### 5. Deploy Edge Functions

Setelah mengatur `config.toml`, deploy ketiga fungsi manajemen akun ke proyek Supabase Anda:

```bash
supabase functions deploy create-admin
supabase functions deploy admin-create-user
supabase functions deploy update-admin-password
```

### 6. Setup Storage Bucket (Manual)

Penyimpanan foto keluhan harus dibuat secara manual di dashboard:

1. Masuk ke **Supabase Dashboard > Storage**.
2. Klik **New Bucket** dan beri nama sesuai dengan yang digunakan di aplikasi (misalnya: `complaints` atau `attachments`).
3. Pastikan Anda mengaktifkan *toggle* **Public bucket**.
4. Buka tab **Policies** di bucket tersebut dan tambahkan aturan:
   * *Public* dapat melakukan **SELECT** (Melihat gambar).
   * *Authenticated Users* dapat melakukan **INSERT** (Mengunggah gambar).

### 7. Konfigurasi Auth Redirect URL

Agar pengguna bisa login tanpa diblokir oleh sistem keamanan Supabase, tambahkan asal URL aplikasi Anda:

1. Masuk ke **Supabase Dashboard > Authentication > URL Configuration**.
2. Di bagian **Site URL**, masukkan: `http://localhost:5173` (atau port yang aktif).
3. Di bagian **Redirect URLs**, tambahkan URL *wildcard* berikut:
   * `http://localhost:5173/**`
   * `https://www.sipebaru.com/**` *(URL untuk production)*
4. Klik **Save**.

### 8. Jalankan Development Server

```bash
npm run dev
# atau
bun run dev
```

Aplikasi kini berjalan di `http://localhost:5173`.

---

## 🔑 First Time Usage

Setelah development server berjalan:

1. Buka `http://localhost:5173/setup` di browser.
2. Isi form: **Username**, **NPK** (opsional), **Email**, dan **Password**.
3. Klik **"Buat Akun Admin"** — akun Super Admin pertama akan otomatis dibuat dan disimpan.
4. **Rute `/setup` otomatis terkunci** setelah proses ini. Akses selanjutnya akan langsung diarahkan ke `/login`.
5. Login di `http://localhost:5173/login` dengan kredensial yang baru saja dibuat.

---

## ⚙️ CI/CD — GitHub Actions (Database Backup)

Repository ini dilengkapi *workflow* otomatis (`backup.yml`) untuk mencadangkan database Anda.

* **Jadwal**: Otomatis setiap **5 hari** (cron: `0 0 */5 * *`).
* **Trigger Manual**: Dapat dijalankan kapan saja melalui tab **Actions** di GitHub.
* **Output**: File `.sql` tersimpan sebagai *GitHub Artifact* selama **90 hari**.

### Setup GitHub Secrets (Sangat Penting)

*Runner* standar milik GitHub Actions **tidak mendukung IPv6**, sehingga URL koneksi database standar (`db.ref.supabase.co`) akan gagal (*Network is unreachable*). Anda **wajib menggunakan URL Connection Pooler (IPv4)**.

1. Buka **Supabase Dashboard > Settings > Database**.
2. Pada bagian **Connection string**, centang kotak **"Use connection pooling"** (pilih **Session** jika ada opsi).
3. Buka tab **URI** dan salin URL tersebut. Pastikan port-nya adalah `5432`.
   *Contoh Format: `postgresql://postgres.xxx:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`*
4. Buka repositori GitHub Anda, masuk ke **Settings > Secrets and variables > Actions**.
5. Klik **New repository secret**.
   * Name: `SUPABASE_DB_URL`
   * Secret: *Paste URL Pooler tadi, dan jangan lupa ganti tulisan `[PASSWORD]` dengan password database Anda yang asli.*
6. Simpan secret dan jalankan (Re-run) *workflow* dari tab Actions untuk mengujinya.

---

## 📁 Struktur Proyek

```
SIPebaru/
├── .github/workflows/       # GitHub Actions (backup)
├── public/                   # Static assets
├── src/
│   ├── components/           # Reusable UI components (shadcn/ui)
│   ├── hooks/                # Custom React hooks
│   ├── integrations/         # Supabase client config
│   ├── lib/                  # Utilities, types, helpers
│   ├── pages/
│   │   ├── admin/            # Protected admin pages
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Complaints.tsx
│   │   │   ├── Accounts.tsx
│   │   │   ├── Departments.tsx
│   │   │   ├── ImportData.tsx
│   │   │   ├── Reports.tsx
│   │   │   └── ActivityLogs.tsx
│   │   ├── Home.tsx          # Form pengaduan publik
│   │   ├── PortalBadge.tsx   # Validasi NPK
│   │   ├── Setup.tsx         # SPOE setup admin
│   │   └── Login.tsx
│   ├── App.tsx               # Router utama
│   └── main.tsx
├── supabase/
│   ├── functions/                   # Edge Functions
│   │   ├── admin-create-user/
│   │   ├── create-admin/
│   │   └── update-admin-password/
│   ├── migrations/
│   │   └── 0000_master_schema.sql   # Schema + RLS + RPC
│   ├── config.toml                  # Konfigurasi Supabase lokal & Edge Functions
│   └── seed.sql                     # Data seeder dummy
├── .env                             # Variabel lingkungan
├── package.json
└── vite.config.ts
```

---

## 📄 Lisensi

Proyek ini dikembangkan untuk keperluan internal organisasi.
