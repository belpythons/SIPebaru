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

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/your-username/SIPebaru.git
cd SIPebaru
npm install
# atau
bun install
```

### 2. Setup Environment Variables

Salin file template dan isi dengan kredensial Supabase Anda:

```bash
cp .env.example .env.local
```

Isi variabel berikut:

```env
VITE_SUPABASE_PROJECT_ID=your_project_id
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
VITE_SUPABASE_URL=https://your_project_id.supabase.co
```

### 3. Setup Database (Remote via Supabase CLI)

> ⚠️ **Metode ini tidak memerlukan Docker lokal.** Semua operasi dilakukan langsung ke database Supabase remote.

```bash
# Login ke akun Supabase
supabase login

# Hubungkan proyek lokal ke remote Supabase
supabase link --project-ref ewhrjsjsgnfftnoipwyf

# Push schema migrasi ke remote database
supabase db push

# Reset database: terapkan schema + masukkan data seeder
supabase db reset --linked
```

> **💡 Catatan:** Perintah `supabase db reset --linked` akan menerapkan seluruh schema (`0000_master_schema.sql`) sekaligus memasukkan data seeder (`seed.sql`) yang berisi 7 unit kerja, 25 data member batch, dan 220 pengaduan dummy — langsung ke remote database tanpa memerlukan Docker lokal.

### 4. Jalankan Development Server

```bash
npm run dev
```

Aplikasi berjalan di `http://localhost:5173`.

---

## 🔑 First Time Usage

Setelah development server berjalan:

1. Buka `http://localhost:5173/setup` di browser.
2. Isi form: **Username**, **NPK** (opsional), **Email**, dan **Password**.
3. Klik **"Buat Akun Admin"** — akun Super Admin pertama akan dibuat.
4. **Rute `/setup` otomatis terkunci** setelah proses ini. Akses selanjutnya akan langsung di-redirect ke `/login`.
5. Login di `http://localhost:5173/login` dengan kredensial yang baru dibuat.

---

## ⚙️ CI/CD — GitHub Actions

Repository ini dilengkapi workflow otomatis untuk backup database.

### 🗄️ Database Backup (`backup.yml`)

- **Jadwal**: Otomatis setiap **5 hari** (cron: `0 0 */5 * *`).
- **Trigger Manual**: Bisa dijalankan kapan saja dari tab **Actions** di GitHub.
- **Output**: File `.sql` tersimpan sebagai GitHub Artifact selama **90 hari**.

**Konfigurasi yang diperlukan:**

Tambahkan secret di **Settings → Secrets and variables → Actions**:

| Secret Name | Format |
|-------------|--------|
| `SUPABASE_DB_URL` | `postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres` |

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
│   ├── migrations/
│   │   └── 0000_master_schema.sql   # Schema + RLS + RPC
│   └── seed.sql                     # Data seeder
├── .env.example
├── package.json
└── vite.config.ts
```

---

## 📄 Lisensi

Proyek ini dikembangkan untuk keperluan internal organisasi.
