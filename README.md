# Organ AR - Versi Statis (Supabase + GitHub Pages)

Aplikasi web AR pengenalan organ tubuh untuk siswa SD. Versi ini sepenuhnya
statis (HTML/CSS/JS) sehingga bisa di-deploy ke **GitHub Pages**, dengan
**Supabase** sebagai database, autentikasi, dan penyimpanan file.

## Fitur

- Login & daftar untuk 3 peran: **mahasiswa**, **guru**, **admin**.
- **AR Markerless**: model organ tampil di atas kamera tanpa perlu marker.
- **Scan QR**: pindai QR organ untuk langsung menampilkan model + info.
- **AR Marker** (MindAR): pelacakan gambar QR yang dicetak (opsional).
- **Demo 3D**: jelajahi semua model.
- **Panel Admin**: kelola organ, deskripsi, fungsi, model 3D, dan QR otomatis;
  kompilasi marker; serta kelola peran pengguna (khusus admin).
- QR marker dibuat otomatis untuk setiap organ baru.
- Palet warna `#32a3cd`, `#3253cd`, `#2fd0aa`; font Fredoka + Nunito; tanpa emoji.

## Struktur Folder (modular)

```
organ-ar-web/
├── *.html                      # halaman: login, register, index, demo,
│                               #          scan, ar-markerless, ar-marker, admin
├── assets/
│   ├── css/                    # variables, main, ar
│   └── js/
│       ├── config/             # config.js (kredensial), supabaseClient.js
│       ├── modules/            # auth, db, storage, qr, ar-*, admin-*, nav, ui
│       └── pages/              # satu skrip entry per halaman
└── supabase/
    └── schema.sql              # skema tabel, peran, RLS, storage
```

## Langkah Setup Supabase

1. Buat proyek baru di https://supabase.com (gratis).
2. Buka **SQL Editor > New query**, tempel seluruh isi `supabase/schema.sql`,
   lalu **Run**. Ini membuat tabel, peran, RLS, dan bucket penyimpanan.
3. Buka **Storage**, pastikan bucket `models` dan `markers` berstatus **Public**.
4. Buka **Project Settings > API**, salin:
   - **Project URL** dan **anon public key**.
5. Buka `assets/js/config/config.js`, isi `SUPABASE_URL` dan `SUPABASE_ANON_KEY`.
6. (Opsional) Di **Authentication > Providers > Email**, matikan
   "Confirm email" agar bisa langsung login saat pengembangan.

## Membuat Admin Pertama

Peran admin tidak bisa dipilih saat daftar (demi keamanan). Caranya:

1. Daftar akun lewat aplikasi (sebagai mahasiswa/guru).
2. Di Supabase **SQL Editor**, jalankan (ganti emailnya):

   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'email-anda@contoh.com');
   ```

Setelah itu, admin bisa mengubah peran pengguna lain lewat menu Admin > Pengguna.

## Menjalankan Secara Lokal

Karena memakai ES Modules dan kamera, buka lewat server (bukan klik file):

```bash
cd organ-ar-web
python3 -m http.server 8000
# buka http://localhost:8000/login.html
```

Kamera hanya berfungsi di **HTTPS** atau **localhost**.

## Deploy ke GitHub Pages

1. Buat repo GitHub, unggah seluruh isi folder `organ-ar-web` ke root repo.
2. Buka **Settings > Pages**, pilih branch `main` dan folder `/ (root)`.
3. Tunggu beberapa menit, situs aktif di `https://USER.github.io/REPO/`.
4. Tambahkan URL itu ke **Supabase > Authentication > URL Configuration**
   (Site URL & Redirect URLs) agar autentikasi lancar.

## Cara Pakai Singkat

1. Login sebagai guru/admin, buka **Admin**.
2. Tambah organ (QR otomatis dibuat). Tambahkan deskripsi, fungsi, dan unggah
   model `.glb`.
3. Untuk **AR Markerless**: buka menu AR Markerless, pilih organ + kamera, Mulai.
4. Untuk **Scan QR**: cetak QR dari Admin, buka menu Scan QR, arahkan kamera.
5. Untuk **AR Marker** (opsional): jalankan **Admin > Kompilasi Marker** sekali,
   cetak QR, lalu buka menu AR Marker.

## Catatan Teknis

- Pustaka dimuat dari CDN saat dijalankan di browser: supabase-js, three.js,
  qrcode, html5-qrcode, model-viewer, A-Frame + MindAR. Perlu koneksi internet.
- Tombol **Berhenti** pada mode AR sudah diperbaiki: kontrol UI diberi
  `z-index` di atas canvas AR sehingga bisa diklik.
- DroidCam akan muncul di daftar kamera bila terpasang sebagai webcam.
