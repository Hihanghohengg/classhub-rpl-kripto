# Checklist Kesesuaian Blueprint ClassHub

## A. UI Login & Register
- [x] UI Login hanya menampilkan ikon/logo, judul, NPM, Password, dan tombol Login.
- [x] Register tidak tampil sebagai tombol biasa.
- [x] Register dibuka dengan double-click cepat pada ikon/logo.
- [x] Form register berisi Nama Lengkap, Nama Panggilan, NPM, Password, Konfirmasi Password, Tanggal Lahir.
- [x] Format tanggal lahir UI: dd/mm/yy.
- [x] Setelah registrasi berhasil muncul teks `Pendaftaran/Registrasi Berhasil`.
- [x] Ada tombol `Kembali` untuk balik ke UI Login.

## B. Login Session
- [x] Login menggunakan NPM + Password.
- [x] Welcome pop-up muncul setiap login berhasil.
- [x] Welcome pop-up hanya ditutup dengan tombol X.
- [x] Jika idle 15 menit, sistem logout dan langsung kembali ke UI Login.

## C. Dashboard Utama
- [x] Header: REKAYASA PERANGKAT LUNAK KRIPTO.
- [x] Header kanan berisi notifikasi dan akun.
- [x] Dashboard berisi Info Hari Ini, Kalender Mingguan Grid, Tugas Terdekat, Pengumuman Terbaru.
- [x] Info Hari Ini bisa collapse/expand.
- [x] Dashboard dirancang fit di laptop dengan `h-screen` dan `overflow-hidden`.
- [x] Dashboard tidak menjadi halaman panjang yang scroll ke bawah.

## D. Sidebar
- [x] Sidebar berisi Dashboard, Kalender, Mata Kuliah, Tugas, Kelompok, Pengumuman, Anggota, Pengaturan.
- [x] Sidebar desktop berada di kiri.
- [x] Sidebar mobile memakai hamburger.

## E. Kalender
- [x] Jadwal template hanya dibuat admin.
- [x] Jadwal pengganti bisa dibuat semua anggota.
- [x] Form Tambah Jadwal Pengganti sesuai final: Mata Kuliah, Tanggal, Waktu Mulai/Selesai, Daring/Luring, Catatan, Simpan.
- [x] Waktu menggunakan template Jam ke-1 sampai Jam ke-8.
- [x] Jam ke-6 dimulai 13.15.
- [x] Jadwal pengganti buatan anggota hanya bisa diedit/hapus oleh pembuat atau admin melalui RLS.

## F. Pengumuman
- [x] Pengumuman model chat/pesan, bukan form template kaku.
- [x] Semua anggota bisa mengirim pengumuman.
- [x] Hapus hanya pembuat atau admin melalui RLS.

## G. Tugas
- [x] Semua anggota bisa menambahkan tugas.
- [x] Tugas memiliki Notion-style Table View.
- [x] Tugas memiliki Status/Kanban View.
- [x] Tugas memiliki Calendar View.
- [x] Timeline disediakan sebagai placeholder lanjutan.

## H. Mata Kuliah & Catatan
- [x] Mata Kuliah memiliki detail pertemuan/catatan.
- [x] Semua anggota bisa menambahkan catatan pertemuan.
- [x] Catatan hanya bisa diedit/hapus pembuat/admin melalui RLS.

## I. Kelompok
- [x] Generate kelompok otomatis.
- [x] Metode berdasarkan jumlah kelompok atau jumlah anggota per kelompok.
- [x] Hasil kelompok bisa disimpan.
- [x] Hasil kelompok bisa disalin ke WhatsApp.

## J. Tema & Warna
- [x] Light mode memakai slate-putih + aksen biru.
- [x] Dark mode memakai slate gelap + aksen biru terang.
- [x] Teks utama/sekunder/muted sudah dipisah agar tidak tabrakan.
- [x] Status memakai badge, bukan background besar yang ramai.

## K. Deploy
- [x] Project Vite siap deploy ke Vercel/Netlify.
- [x] Supabase schema tersedia di `supabase/schema.sql`.
- [x] `.env.example` tersedia.
- [x] README setup tersedia.
