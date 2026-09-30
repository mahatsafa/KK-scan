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

## Catatan

- RT/RW pada dropdown ini murni tampilan; CRUD data wilayah direncanakan
  terpisah, langsung ke database.
- Desil (1-10) masih random/dummy untuk semua KK.
- Field WNA (No. Paspor, No. KITAP/KITAS) hanya terisi untuk anggota
  keluarga berstatus WNA; untuk WNI kolom tersebut ditampilkan kosong (—).
