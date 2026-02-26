<div align="center">

# 🏭 SIPebaru

### Sistem Pengaduan Barang Rusak

**Platform enterprise-ready untuk manajemen pengaduan barang rusak dengan RBAC 4-tier, Edge Functions, Portal Badge, dan Auto-Backup.**

[![Build](https://img.shields.io/badge/build-passing-brightgreen)](#) [![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](#) [![React](https://img.shields.io/badge/React-18-61dafb)](#) [![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3fcf8e)](#)

</div>

---

## 📋 Deskripsi

**SIPebaru** adalah sistem pengaduan barang rusak berbasis web yang dirancang untuk lingkungan korporat/instansi. Sistem ini menyediakan alur lengkap mulai dari pelaporan pengaduan oleh karyawan, validasi identitas melalui Portal Badge, pemrosesan oleh admin, hingga pelaporan dan ekspor dokumen resmi dengan nomor Kop Surat otomatis.

### Fitur Utama

| Fitur | Deskripsi |
|-------|-----------|
| 🔐 **RBAC 4-Tier** | Super Admin, Admin, Viewer, dan Pengguna Publik |
| 🪪 **Portal Badge** | Validasi Nomor Induk sebelum mengakses form pengaduan |
| 📊 **Dashboard Real-time** | Statistik pengaduan dengan filter dan pencarian |
| 📄 **Ekspor PDF & CSV** | Laporan resmi dengan nomor Kop Surat otomatis |
| 📥 **Import Data Massal** | Upload Excel/CSV untuk batch members dan akun internal |
| 📜 **Log Aktivitas** | Audit trail lengkap semua aksi admin |
| 🔄 **Soft Delete** | Penghapusan data tanpa kehilangan riwayat |
| ⏰ **Auto-Backup** | GitHub Actions untuk backup database setiap 5 hari |

---

## 🛠️ Tech Stack & Infrastruktur

### Frontend
- **React 18** — Library UI berbasis komponen
- **Vite** — Build tool modern dengan HMR
- **Tailwind CSS** — Utility-first CSS framework
- **shadcn/ui** — Komponen UI yang accessible dan reusable
- **Zod** — Validasi skema form secara ketat
- **React Hook Form** — Manajemen state form yang efisien
- **Tanstack React Query** — Data fetching & caching
- **jsPDF + autoTable** — Generasi dokumen PDF sisi klien
- **xlsx** — Parsing file Excel/CSV untuk import data

### Backend
- **Supabase PostgreSQL** — Database relasional dengan RLS
- **Supabase Auth** — Autentikasi dan manajemen sesi
- **Supabase Edge Functions** — Serverless functions (Deno)
- **Supabase RPC** — Stored procedures untuk logika bisnis atomik
- **Supabase Realtime** — Sinkronisasi data real-time
- **Supabase Storage** — Penyimpanan foto pengaduan

### DevOps
- **GitHub Actions** — CI/CD dan backup otomatis database

---

## 🏗️ Arsitektur & Clean Code Practices

### Component-Based UI
Seluruh antarmuka dibangun menggunakan **shadcn/ui** yang menyediakan komponen accessible, customizable, dan konsisten. Komponen reusable seperti `EmptyState`, `StatCard`, dan `Skeleton` loaders digunakan di seluruh aplikasi untuk pengalaman pengguna yang seragam.

### Role-Based Access Control (RBAC)
Sistem menerapkan RBAC 4-tier yang memengaruhi visibilitas menu, akses routing, dan kebijakan database:

| Role | Akses Menu | Kemampuan |
|------|-----------|-----------|
| **Super Admin** | Semua menu | CRUD penuh + Import + Log Aktivitas |
| **Admin** | Dashboard, Pengaduan, Unit Kerja, Laporan, Akun | CRUD pengaduan, unit kerja, dan akun |
| **Viewer** | Dashboard, Laporan | Hanya bisa melihat data (read-only) |
| **Pengguna Publik** | Portal Badge → Form Pengaduan | Submit & cek status pengaduan |

- **Route Guards:** `ProtectedRoute` memvalidasi role di frontend.
- **RLS Policies:** PostgreSQL Row Level Security memfilter data di level database.
- **Sidebar Dinamis:** Menu ditampilkan berdasarkan role tertinggi pengguna.

### Soft Delete Pattern
Alih-alih menghapus data secara permanen (`DELETE`), sistem menggunakan kolom `deleted_at`:

```sql
-- Contoh: Soft delete pada pengaduan
UPDATE complaints SET deleted_at = NOW() WHERE id = '...';

-- Query hanya menampilkan data yang belum dihapus
SELECT * FROM complaints WHERE deleted_at IS NULL;
```

Pola ini diterapkan pada tabel `complaints`, `departments`, `profiles`, dan `members_batch` untuk menjaga integritas data dan memungkinkan pemulihan.

### Validation Layer
Validasi input menggunakan **Zod** secara konsisten di frontend dan PostgreSQL constraints di backend:

- **Frontend:** Skema Zod pada `ComplaintFormDialog` dan `AddComplaintDialog` memvalidasi panjang karakter, format, dan keberadaan field.
- **Backend:** RLS policies memvalidasi panjang field (reporter_name ≤ 120, item_name ≤ 200, quantity ≤ 100000).

### Database Triggers & RPC
Logika bisnis kompleks dijalankan di level database untuk menjamin atomisitas:

- **`generate_ticket_number()`** — Membuat nomor tiket sequential dengan advisory lock untuk mencegah race condition.
- **`generate_kop_surat_number()`** — Membuat nomor Kop Surat resmi dengan row-level locking per tahun.
- **`log_complaint_status_change()`** — Trigger otomatis mencatat setiap perubahan status ke `complaint_history`.
- **`generate_complaint_code()`** — Membuat kode pengaduan 5-digit unik.

---

## 📦 Panduan Instalasi Lengkap

### Prasyarat

Pastikan tools berikut sudah terinstall:

| Tool | Versi Minimum | Cek |
|------|--------------|-----|
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

Buat file `.env.local` di root project:

```env
VITE_SUPABASE_URL=https://[PROJECT_ID].supabase.co
VITE_SUPABASE_ANON_KEY=[ANON_KEY_ANDA]
```

> **Catatan:** Dapatkan nilai ini dari [Supabase Dashboard](https://supabase.com/dashboard) → Project Settings → API.

### Step 3: Database Setup

Ada dua cara untuk menjalankan skema database:

#### Opsi A: Melalui Supabase SQL Editor (Rekomendasi)
1. Buka [Supabase Dashboard](https://supabase.com/dashboard) → SQL Editor.
2. Salin dan jalankan isi file `supabase/migrations/0000_initial_schema.sql`.
3. Setelah skema berhasil, jalankan `supabase/seed.sql` untuk data dummy.

#### Opsi B: Melalui Supabase CLI
```bash
# Login ke Supabase
supabase login

# Link ke project
supabase link --project-ref [PROJECT_ID]

# Push skema database
supabase db push

# Jalankan seed data
supabase db seed
```

#### Buat Storage Bucket
1. Buka Supabase Dashboard → Storage.
2. Buat bucket baru bernama `complaint-photos`.
3. Set bucket sebagai **Public**.

### Step 4: Deploy Edge Functions

```bash
# Deploy fungsi pembuatan akun admin
supabase functions deploy admin-create-user

# Deploy fungsi pembuatan admin (first-time setup)
supabase functions deploy create-admin
```

Pastikan environment variables berikut sudah diset di Supabase Edge Functions:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Step 5: Jalankan Secara Lokal

```bash
npm run dev
```

Aplikasi akan berjalan di `http://localhost:5173`.

---

## ⚙️ Panduan Konfigurasi DevOps (GitHub Actions)

### Auto-Backup Database

SIPebaru dilengkapi dengan workflow GitHub Actions untuk backup database PostgreSQL secara otomatis.

#### Konfigurasi:

1. Buka repository GitHub → **Settings** → **Secrets and variables** → **Actions**.
2. Klik **New repository secret**.
3. Tambahkan secret dengan konfigurasi berikut:

| Nama | Nilai |
|------|-------|
| `SUPABASE_DB_URL` | `postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres` |

> **Catatan:** Connection string bisa ditemukan di Supabase Dashboard → Project Settings → Database → Connection string → URI.

#### Jadwal & Retensi:

| Parameter | Nilai |
|-----------|-------|
| Jadwal | Setiap **5 hari** (cron: `0 0 */5 * *`) |
| Manual Trigger | ✅ Tersedia via `workflow_dispatch` |
| Retensi Backup | **90 hari** |
| Format File | `sipebaru_backup_YYYYMMDD_HHMMSS.sql` |

Backup juga bisa dijalankan secara manual melalui tab **Actions** di repository GitHub.

---

## 📁 Struktur Project

```
SIPEBARUCIHUY/
├── .github/workflows/       # GitHub Actions (backup)
├── public/                  # Aset statis (logo, ikon)
├── src/
│   ├── components/          # Komponen UI reusable
│   │   ├── AdminLayout.tsx  # Layout admin dengan RBAC sidebar
│   │   ├── ComplaintFormDialog.tsx
│   │   ├── AddComplaintDialog.tsx
│   │   ├── EmptyState.tsx
│   │   ├── ProtectedRoute.tsx
│   │   └── ui/              # shadcn/ui components
│   ├── pages/
│   │   ├── Home.tsx         # Halaman pengaduan publik
│   │   ├── PortalBadge.tsx  # Validasi Nomor Induk
│   │   ├── Login.tsx        # Login admin
│   │   └── admin/           # Halaman admin
│   │       ├── Dashboard.tsx
│   │       ├── Complaints.tsx
│   │       ├── Departments.tsx
│   │       ├── Reports.tsx
│   │       ├── Accounts.tsx
│   │       ├── ImportData.tsx
│   │       └── ActivityLogs.tsx
│   ├── integrations/        # Konfigurasi Supabase
│   └── App.tsx              # Routing utama
├── supabase/
│   ├── migrations/
│   │   └── 0000_initial_schema.sql  # Skema database (squashed)
│   ├── functions/           # Edge Functions
│   │   ├── admin-create-user/
│   │   └── create-admin/
│   └── seed.sql             # Data dummy
└── README.md
```

---

## 📄 Lisensi

Hak Cipta © 2026 — SIPebaru. Seluruh hak dilindungi.
