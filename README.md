<div align="center">

# 🏭 SIPebaru

### Sistem Pengaduan Barang Rusak

**Platform manajemen pengaduan barang rusak dengan RBAC 4-tier, Edge Functions, Portal Badge, dan Auto-Backup.**

[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?logo=vite&logoColor=white)](#)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](#)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-06B6D4?logo=tailwindcss&logoColor=white)](#)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase&logoColor=white)](#)
[![Build](https://img.shields.io/badge/build-passing-brightgreen)](#)

</div>

---

## 📋 Deskripsi

**SIPebaru** adalah sistem pengaduan barang rusak berbasis web yang dirancang untuk lingkungan korporat/instansi. Sistem ini menyediakan alur lengkap mulai dari pelaporan pengaduan oleh karyawan, validasi identitas melalui Portal Badge, pemrosesan dan pengelolaan oleh admin, hingga pelaporan dan ekspor dokumen resmi.

---

## ✨ Fitur Utama

| Fitur | Deskripsi |
|-------|-----------|
| 📊 **Dashboard** | Statistik pengaduan real-time dengan grafik tren dan filter interaktif |
| 📝 **Manajemen Pengaduan** | CRUD pengaduan lengkap, edit detail, perubahan status, dan timeline riwayat |
| 🏢 **Unit Kerja** | Kelola data departemen/unit kerja dengan soft delete |
| 📄 **Laporan & Ekspor** | Unduh laporan dalam format PDF (dengan nomor Kop Surat otomatis) dan Excel/CSV |
| 👤 **Manajemen Akun** | Kelola akun admin, viewer, dan super admin dengan role assignment |
| 📥 **Import Data Massal** | Upload Excel/CSV untuk batch import data anggota dan akun internal |
| 📜 **Log Aktivitas** | Audit trail lengkap semua aksi admin (khusus Super Admin) |
| 🪪 **Portal Badge** | Validasi Nomor Induk karyawan sebelum mengakses form pengaduan |
| 🔐 **RBAC 4-Tier** | Super Admin, Admin, Viewer, dan Pengguna Publik |
| 🔄 **Soft Delete** | Penghapusan data tanpa kehilangan riwayat |
| ⏰ **Auto-Backup** | GitHub Actions untuk backup database otomatis |

---

## 🛠️ Tech Stack

### Frontend

| Teknologi | Kegunaan |
|-----------|----------|
| **React 18** | Library UI berbasis komponen |
| **Vite 5** | Build tool modern dengan HMR |
| **TypeScript 5** | Static typing untuk keamanan kode |
| **Tailwind CSS 3** | Utility-first CSS framework |
| **shadcn/ui** | Komponen UI accessible dan reusable |
| **React Hook Form + Zod** | Manajemen dan validasi form |
| **TanStack React Query** | Data fetching & caching |
| **Recharts** | Visualisasi data (grafik dan chart) |
| **jsPDF + autoTable** | Generasi dokumen PDF sisi klien |
| **xlsx** | Parsing file Excel/CSV untuk import data |
| **Lucide React** | Ikon SVG modern |

### Backend

| Teknologi | Kegunaan |
|-----------|----------|
| **Supabase PostgreSQL** | Database relasional dengan Row Level Security |
| **Supabase Auth** | Autentikasi dan manajemen sesi |
| **Supabase Edge Functions** | Serverless functions (Deno runtime) |
| **Supabase RPC** | Stored procedures untuk logika bisnis atomik |
| **Supabase Storage** | Penyimpanan foto pengaduan |

### DevOps

| Teknologi | Kegunaan |
|-----------|----------|
| **GitHub Actions** | CI/CD dan auto-backup database |
| **ESLint** | Linting dan code quality |

---

## 🏗️ Arsitektur & Clean Code

### Role-Based Access Control (RBAC)

| Role | Akses Menu | Kemampuan |
|------|-----------|-----------|
| **Super Admin** | Semua menu | CRUD penuh + Import + Log Aktivitas |
| **Admin** | Dashboard, Pengaduan, Unit Kerja, Laporan, Akun | CRUD pengaduan, unit kerja, dan akun |
| **Viewer** | Dashboard, Laporan | Hanya bisa melihat data (read-only) |
| **Pengguna Publik** | Portal Badge → Form Pengaduan | Submit & cek status pengaduan |

- **Route Guards:** `ProtectedRoute` memvalidasi role di frontend.
- **RLS Policies:** PostgreSQL Row Level Security memfilter data di level database.
- **Sidebar Dinamis:** Menu ditampilkan berdasarkan role pengguna.

### Database Design

- **Consolidated Migration:** Seluruh skema database dikelola dalam satu file master (`0000_master_schema.sql`) untuk kemudahan deployment.
- **Soft Delete Pattern:** Kolom `deleted_at` pada tabel `complaints`, `departments`, `profiles`, dan `members_batch`.
- **Triggers & RPC:** Fungsi atomik seperti `generate_ticket_number()`, `generate_kop_surat_number()`, `generate_complaint_code()`, dan `log_complaint_status_change()`.
- **Advisory Locks:** Mencegah race condition pada pembuatan nomor tiket dan setup admin.

---

## 📁 Struktur Folder

```
SIPebaru/
├── .github/workflows/           # GitHub Actions (auto-backup)
├── public/                      # Aset statis (logo, favicon, robots.txt)
├── src/
│   ├── components/              # Komponen UI reusable
│   │   ├── AdminLayout.tsx      # Layout admin dengan RBAC sidebar
│   │   ├── ComplaintFormDialog.tsx
│   │   ├── AddComplaintDialog.tsx
│   │   ├── ComplaintBarChart.tsx
│   │   ├── ComplaintTrendsChart.tsx
│   │   ├── MonthlyStatsTable.tsx
│   │   ├── StatCard.tsx
│   │   ├── StatusSearchResult.tsx
│   │   ├── EmptyState.tsx
│   │   ├── ProtectedRoute.tsx
│   │   ├── NavLink.tsx
│   │   └── ui/                  # shadcn/ui components (26 komponen)
│   ├── hooks/                   # Custom React hooks
│   │   ├── use-mobile.tsx       # Deteksi perangkat mobile
│   │   └── use-toast.ts         # Notifikasi toast
│   ├── integrations/            # Konfigurasi Supabase
│   │   └── supabase/
│   │       ├── client.ts        # Supabase client instance
│   │       └── types.ts         # Auto-generated database types
│   ├── lib/                     # Shared utilities & constants
│   │   ├── constants.ts         # Status labels, badge variants, pagination
│   │   ├── types.ts             # TypeScript interfaces (Complaint, Profile, Department)
│   │   └── utils.ts             # Helper functions (cn, formatDate)
│   ├── pages/                   # Halaman aplikasi
│   │   ├── Home.tsx             # Form pengaduan publik
│   │   ├── PortalBadge.tsx      # Validasi Nomor Induk
│   │   ├── Login.tsx            # Login admin
│   │   ├── Setup.tsx            # First-time admin setup
│   │   ├── NotFound.tsx         # Halaman 404
│   │   └── admin/               # Halaman admin panel
│   │       ├── Dashboard.tsx    # Statistik & overview
│   │       ├── Complaints.tsx   # Daftar pengaduan
│   │       ├── EditComplaint.tsx# Detail & edit pengaduan
│   │       ├── Departments.tsx  # Manajemen unit kerja
│   │       ├── Reports.tsx      # Laporan & ekspor
│   │       ├── Accounts.tsx     # Manajemen akun
│   │       ├── ImportData.tsx   # Import data massal
│   │       └── ActivityLogs.tsx # Log aktivitas admin
│   ├── App.tsx                  # Routing utama
│   ├── main.tsx                 # Entry point
│   └── index.css                # Global styles
├── supabase/
│   ├── migrations/
│   │   └── 0000_master_schema.sql  # Skema database (consolidated)
│   ├── functions/               # Supabase Edge Functions
│   │   ├── admin-create-user/   # Pembuatan akun admin
│   │   ├── create-admin/        # Setup admin pertama
│   │   └── update-admin-password/ # Update password admin
│   ├── seed.sql                 # Data dummy untuk development
│   └── config.toml              # Konfigurasi lokal Supabase
├── .env.example                 # Template environment variables
├── index.html                   # HTML entry point
├── vite.config.ts               # Konfigurasi Vite
├── tailwind.config.ts           # Konfigurasi Tailwind CSS
├── tsconfig.json                # Konfigurasi TypeScript
├── eslint.config.js             # Konfigurasi ESLint
├── components.json              # Konfigurasi shadcn/ui
└── package.json                 # Dependencies & scripts
```

---

## 📦 Panduan Instalasi

### Prasyarat

| Tool | Versi Minimum | Verifikasi |
|------|--------------|------------|
| Node.js | v18+ | `node -v` |
| npm | v9+ | `npm -v` |
| Git | v2+ | `git --version` |
| Supabase CLI | v1.100+ | `supabase --version` |

### Step 1: Clone & Install

```bash
# Clone repository
git clone https://github.com/Zephydro/SIPEBARUCIHUY.git
cd SIPEBARUCIHUY

# Install dependencies
npm install
```

### Step 2: Environment Setup

Salin template environment dan sesuaikan nilainya:

```bash
cp .env.example .env.local
```

Edit `.env.local` dengan kredensial project Supabase Anda:

```env
VITE_SUPABASE_PROJECT_ID=your_project_id
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
VITE_SUPABASE_URL=https://your_project_id.supabase.co
```

> **Catatan:** Dapatkan nilai ini dari [Supabase Dashboard](https://supabase.com/dashboard) → Project Settings → API.

### Step 3: Database Setup (Master Schema)

Skema database sudah dikonsolidasi ke dalam satu file master. Pilih salah satu cara berikut:

#### Opsi A: Melalui Supabase SQL Editor (Rekomendasi)

1. Buka [Supabase Dashboard](https://supabase.com/dashboard) → **SQL Editor**.
2. Salin dan jalankan seluruh isi file **`supabase/migrations/0000_master_schema.sql`**.
3. Setelah skema berhasil dibuat, jalankan **`supabase/seed.sql`** untuk mengisi data dummy.

#### Opsi B: Melalui Supabase CLI

```bash
# Login ke Supabase
supabase login

# Link ke project Anda
supabase link --project-ref YOUR_PROJECT_ID

# Push skema database (master schema)
supabase db push

# Jalankan seed data
supabase db seed
```

#### Buat Storage Bucket

1. Buka Supabase Dashboard → **Storage**.
2. Buat bucket baru bernama **`complaint-photos`**.
3. Set bucket sebagai **Public**.

### Step 4: Deploy Edge Functions

```bash
# Deploy semua Edge Functions
supabase functions deploy admin-create-user
supabase functions deploy create-admin
supabase functions deploy update-admin-password
```

Pastikan environment variables berikut sudah diset di Supabase Edge Functions:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Step 5: Jalankan Secara Lokal

```bash
npm run dev
```

Aplikasi akan berjalan di `http://localhost:8080`.

### Perintah Lainnya

```bash
npm run build       # Build untuk production
npm run build:dev   # Build mode development
npm run lint        # Jalankan ESLint
npm run preview     # Preview build production
```

---

## ⚙️ Konfigurasi DevOps (GitHub Actions)

### Auto-Backup Database

SIPebaru dilengkapi workflow GitHub Actions untuk backup database PostgreSQL secara otomatis.

#### Setup:

1. Buka repository GitHub → **Settings** → **Secrets and variables** → **Actions**.
2. Tambahkan secret berikut:

| Nama Secret | Nilai |
|-------------|-------|
| `SUPABASE_DB_URL` | `postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres` |

> **Catatan:** Connection string tersedia di Supabase Dashboard → Project Settings → Database → Connection string → URI.

#### Jadwal & Retensi:

| Parameter | Nilai |
|-----------|-------|
| Jadwal | Setiap **5 hari** (`0 0 */5 * *`) |
| Manual Trigger | ✅ Tersedia via `workflow_dispatch` |
| Retensi Backup | **90 hari** |
| Format File | `sipebaru_backup_YYYYMMDD_HHMMSS.sql` |

---

## 📄 Lisensi

Hak Cipta © 2026 — SIPebaru. Seluruh hak dilindungi.
