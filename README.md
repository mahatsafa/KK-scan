# Pencarian Data Kartu Keluarga (KK)

Website untuk mencari data Kartu Keluarga (KK) berdasarkan wilayah (Kelurahan,
RT, RW). Tahap ini fokus pada tampilan depan (frontend) dengan data dummy —
belum ada login, belum terhubung ke database sungguhan.

## Fitur

- Filter wilayah berjenjang: Kelurahan → RT → RW
- Daftar KK hasil pencarian: Nama Kepala Keluarga, No. KK, Desil, tombol
  "Tampilkan KK"
- Detail lengkap KK saat tombol diklik: info umum keluarga + tabel rincian
  seluruh anggota keluarga

## Menjalankan di Localhost

1. Pastikan Node.js sudah terpasang, versi 18.17 LTS atau 20 LTS ke atas.
   Cek dengan `node -v`.
2. Ekstrak file zip ini, lalu buka terminal (WSL) di folder hasil ekstrak.
3. Install dependency (butuh koneksi internet untuk mengunduh Next.js, React,
   Tailwind, dst):
   ```
   npm install
   ```
4. Jalankan development server:
   ```
   npm run dev
   ```
5. Buka `http://localhost:3000` di browser.

## Struktur Folder

```
kk-search-app/
├── app/
│   ├── layout.js         # Root layout, font, metadata
│   ├── page.js           # Halaman utama: state filter & pencarian
│   └── globals.css
├── components/
│   ├── WilayahFilter.js  # Dropdown berjenjang Kelurahan/RT/RW
│   ├── KKList.js         # Wrapper list (loading/kosong/hasil)
│   ├── KKRow.js          # Satu baris hasil pencarian KK
│   └── KKDetailModal.js  # Modal detail KK + tabel anggota keluarga
└── data/
    └── dummyData.js      # Generator data dummy + fungsi query
```

## Mengganti dengan Data Asli

Semua data saat ini digenerate otomatis dengan seed tetap (jadi hasilnya
konsisten setiap kali dijalankan) di `data/dummyData.js`. Untuk pindah ke
database/API sungguhan nanti, cukup ganti isi tiga fungsi berikut di file
itu — komponen UI tidak perlu diubah karena hanya bergantung pada bentuk
data yang dikembalikan:

- `getRTList(kelurahanId)` — daftar RT untuk sebuah kelurahan
- `getRWList(kelurahanId, rt)` — daftar RW untuk kelurahan + RT tertentu
- `searchKK(kelurahanId, rt, rw)` — daftar KK yang cocok dengan filter

## Catatan

- RT/RW pada dropdown ini murni tampilan; CRUD data wilayah direncanakan
  terpisah, langsung ke database.
- Desil (1-10) masih random/dummy untuk semua KK.
- Field WNA (No. Paspor, No. KITAP/KITAS) hanya terisi untuk anggota
  keluarga berstatus WNA; untuk WNI kolom tersebut ditampilkan kosong (—).
