<p align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Cloudflare_Turnstile-F38020?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Cloudflare Turnstile" />
</p>

# SIPebaru — Sistem Informasi Pengaduan Barang Rusak

Aplikasi pengaduan internal dengan standar keamanan enterprise untuk PT Pupuk Kaltim.  
Dibangun dengan **React + Vite + Supabase** dan dilengkapi fitur keamanan tingkat lanjut:

- 🔐 **RBAC (Role-Based Access Control)** — 4 level akses: Public, Viewer, Admin, Super Admin
- 📝 **Audit Logging** — Seluruh perubahan data tercatat otomatis dengan JSON diff
- 🤖 **Anti-Spam / Anti-Bot** — Cloudflare Turnstile CAPTCHA pada form pengaduan
- 🎫 **Atomic Ticket Sequencing** — Nomor tiket berurutan tanpa race condition

---

## 📋 Daftar Isi

- [Prasyarat](#-prasyarat)
- [Instalasi](#-instalasi)
- [Environment Variables](#-environment-variables)
- [Database Setup](#-database-setup)
- [Cloudflare Turnstile Setup](#-cloudflare-turnstile-setup)
- [Menjalankan Aplikasi](#-menjalankan-aplikasi)
- [Login & Akses Awal](#-login--akses-awal)
- [Dokumentasi RBAC](#-dokumentasi-rbac)

---

## ✅ Prasyarat

Pastikan tools berikut sudah terinstal di sistem Anda:

| Tool        | Versi Minimum | Keterangan                                   |
|-------------|---------------|----------------------------------------------|
| **Node.js** | v18+          | Runtime JavaScript                           |
| **npm**     | v9+           | Package manager (atau gunakan **bun**)       |
| **Git**     | -             | Version control                              |
| **Akun Supabase** | -      | [supabase.com](https://supabase.com)         |
| **Akun Cloudflare** | -    | [dash.cloudflare.com](https://dash.cloudflare.com) |

---

## 📦 Instalasi

### 1. Clone Repository

```bash
git clone https://github.com/Zephydro/SIPEBARUCIHUY.git
cd SIPEBARUCIHUY
```

### 2. Install Dependencies

```bash
npm install
```

---

## 🔑 Environment Variables

Salin file template environment, lalu isi dengan kredensial Anda:

```bash
cp .env.example .env
```

Buka file `.env` dan isi variabel berikut:

| Variabel | Keterangan | Cara Mendapatkan |
|----------|------------|------------------|
| `VITE_SUPABASE_URL` | Project URL Supabase | Supabase Dashboard → **Settings** → **API** → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Public Anon Key | Supabase Dashboard → **Settings** → **API** → `anon` `public` |
| `VITE_CLOUDFLARE_SITE_KEY` | Site Key Turnstile | Cloudflare Dashboard → **Turnstile** → Site Key |

> [!IMPORTANT]
> **`CLOUDFLARE_SECRET_KEY`** hanya digunakan di sisi backend / Edge Functions.  
> **Jangan** letakkan secret key di variabel yang berawalan `VITE_` karena akan ter-expose ke client.

---

## 🗄️ Database Setup

Skema database **wajib** diterapkan agar aplikasi berfungsi. Pilih salah satu metode:

### Opsi A: Supabase CLI (Rekomendasi)

```bash
# Login ke Supabase (jika belum)
npx supabase login

# Link ke project Anda
npx supabase link --project-ref <your-project-ref>

# Push semua migration
npx supabase db push
```

### Opsi B: Manual via SQL Editor

1. Buka **Supabase Dashboard** → **SQL Editor**
2. Salin isi file `supabase/migrations/` secara berurutan
3. Jalankan setiap file SQL satu per satu

> [!NOTE]
> Migration `20260216050000_security_hardening.sql` akan otomatis:
> - Membuat **sequence** atomic untuk nomor tiket (`PB-YYYYMMDD-XXXXX`)
> - Menambahkan role `super_admin` dan `viewer` ke enum `app_role`
> - Membuat tabel `activity_logs` dengan trigger audit otomatis
> - Mengonfigurasi RLS (Row Level Security) untuk semua tabel
> - Meng-assign role `super_admin` ke email `admin@pupukkaltim.com` (jika ada di `auth.users`)

---

## ☁️ Cloudflare Turnstile Setup

Turnstile melindungi form pengaduan dari bot dan spam submission.

### Langkah:

1. Buka [Cloudflare Dashboard](https://dash.cloudflare.com) → **Turnstile**
2. Klik **Add Site**
3. Isi konfigurasi:
   - **Site Name:** `SIPebaru`
   - **Domains:** Tambahkan domain berikut:
     - `localhost` (untuk development)
     - `127.0.0.1` (untuk development)
     - Domain production Anda (misal: `sipebaru.pupukkaltim.co.id`)
   - **Widget Mode:** `Managed`
4. Klik **Create**
5. Salin **Site Key** → tempel ke `VITE_CLOUDFLARE_SITE_KEY` di file `.env`

---

## 🚀 Menjalankan Aplikasi

```bash
npm run dev
```

Aplikasi akan berjalan di `http://localhost:8080` (atau port yang tersedia).

> [!TIP]
> Untuk build production:
> ```bash
> npm run build
> npm run preview
> ```

---

## 🔓 Login & Akses Awal

SIPebaru menggunakan sistem **Closed Registration** — pengguna tidak dapat mendaftar sendiri.

### Mendapatkan Akses Pertama

1. **Buat user** secara manual melalui Supabase Dashboard → **Authentication** → **Users** → **Add User**
2. Gunakan email `admin@pupukkaltim.com` agar otomatis mendapat role `super_admin` dari migration seed
3. Login di halaman `/login` dengan email dan password yang telah dibuat

### Menambahkan Pengguna Baru

Setelah login sebagai `super_admin` atau `admin`:
1. Buka menu **Akun** di sidebar
2. Tambahkan user baru dan tentukan role-nya

---

## 🛡️ Dokumentasi RBAC

Aplikasi menerapkan 4 level akses dengan prinsip **least privilege**:

| Role | Akses | Keterangan |
|------|-------|------------|
| 🌐 **Public** | Submit pengaduan | Tanpa login. Dilindungi Cloudflare Turnstile CAPTCHA. |
| 👁️ **Viewer** | Dashboard, Laporan, Daftar Pengaduan (Read-Only) | Tidak dapat mengedit, menghapus, atau memproses tiket. Tombol aksi tersembunyi. |
| 🔧 **Admin** | Proses tiket, Edit, Hapus | Akses operasional penuh untuk menangani pengaduan. |
| 👑 **Super Admin** | Semua + Manajemen Akun & Departemen | Akses penuh termasuk kelola user, role assignment, dan konfigurasi sistem. |

### Keamanan Berlapis

```
┌─────────────────────────────────────────────────┐
│  Frontend (UI)     │  Tombol & form disembunyikan│
│                    │  berdasarkan role user       │
├─────────────────────────────────────────────────┤
│  Route Guard       │  ProtectedRoute dengan       │
│                    │  allowedRoles array           │
├─────────────────────────────────────────────────┤
│  Database (RLS)    │  Row Level Security policies  │
│                    │  memblokir akses di level DB  │
└─────────────────────────────────────────────────┘
```

> [!CAUTION]
> Keamanan UI bersifat **kosmetik** — perlindungan sesungguhnya ada di **RLS policies** di level database. Jangan pernah mengandalkan hanya penyembunyian tombol di frontend sebagai satu-satunya mekanisme keamanan.

---

## 📄 Lisensi

Proyek internal PT Pupuk Kalimantan Timur. Hak cipta dilindungi.
