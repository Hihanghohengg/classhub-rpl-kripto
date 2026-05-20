# ClassHub RPL Kripto

Website koordinasi internal kelas **REKAYASA PERANGKAT LUNAK KRIPTO**.

## Fitur sesuai kesepakatan

- UI Login bersih: NPM + Password.
- Hidden register: double-click ikon/logo pada UI login.
- Register: Nama Lengkap, Nama Panggilan, NPM, Password, Konfirmasi Password, Tanggal Lahir dd/mm/yy.
- Setelah register berhasil: muncul pesan `Pendaftaran/Registrasi Berhasil` dan tombol `Kembali`.
- Welcome pop-up setelah login, ditutup hanya dengan tombol X.
- Timeout 15 menit idle: langsung kembali ke UI login.
- Dashboard fit laptop, tidak scroll ke bawah untuk tampilan utama.
- Sidebar: Dashboard, Kalender, Mata Kuliah, Tugas, Kelompok, Pengumuman, Anggota, Pengaturan.
- Kalender mingguan grid.
- Admin mengelola jadwal template.
- Semua anggota bisa menambahkan jadwal pengganti.
- Jadwal pengganti hanya bisa diedit/hapus oleh pembuat atau admin.
- Pengumuman model chat/pesan.
- Tugas bergaya Notion: Table, Status, Calendar, Timeline placeholder.
- Mata Kuliah berisi pertemuan/catatan.
- Generate kelompok otomatis.
- Tema terang/gelap dan ukuran font di pengaturan.

## Stack

- React + Vite
- Tailwind CSS
- Supabase Auth + PostgreSQL + RLS
- Deploy ke Vercel/Netlify

## Setup Lokal

```bash
npm install
cp .env.example .env
npm run dev
```

Isi `.env`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

## Setup Supabase

1. Buat project Supabase.
2. Buka SQL Editor.
3. Jalankan `supabase/schema.sql`.
4. Untuk MVP, buka Authentication > Providers/Settings lalu matikan email confirmation.
5. Register akun pertama lewat UI.
6. Jadikan akun pertama sebagai admin:

```sql
update profiles set role = 'admin' where npm = 'NPM_KAMU';
```

7. Login ulang.
8. Tambahkan mata kuliah di menu Mata Kuliah.
9. Tambahkan jadwal template di menu Kalender > Jadwal Template.

## Build & Deploy

```bash
npm run build
```

Deploy folder/project ke Vercel atau Netlify. Set environment variables yang sama:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Catatan Keamanan

- Register disembunyikan via double-click ikon, tetapi keamanan utama tetap RLS dan akun Supabase.
- Password tidak disimpan manual di database aplikasi; password dikelola Supabase Auth.
- Jadwal/tugas/pengumuman/catatan buatan anggota hanya bisa diubah/dihapus oleh pembuat atau admin.
- Untuk produksi yang lebih ketat, tambahkan whitelist NPM.
