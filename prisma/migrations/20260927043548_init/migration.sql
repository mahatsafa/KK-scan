-- CreateTable
CREATE TABLE "kelurahan" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kecamatan" TEXT NOT NULL,
    "kabupatenKota" TEXT NOT NULL,
    "provinsi" TEXT NOT NULL,
    "kodePos" TEXT NOT NULL,
    "kodeWilayah" TEXT NOT NULL,

    CONSTRAINT "kelurahan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kartu_keluarga" (
    "id" TEXT NOT NULL,
    "noKK" TEXT NOT NULL,
    "kelurahanId" TEXT NOT NULL,
    "rt" TEXT NOT NULL,
    "rw" TEXT NOT NULL,
    "alamat" TEXT NOT NULL,
    "kepalaKeluarga" TEXT NOT NULL,
    "desil" INTEGER NOT NULL,
    "fileAsliPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kartu_keluarga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anggota_keluarga" (
    "id" TEXT NOT NULL,
    "kartuKeluargaId" TEXT NOT NULL,
    "namaLengkap" TEXT NOT NULL,
    "nik" TEXT NOT NULL,
    "jenisKelamin" TEXT NOT NULL,
    "tempatLahir" TEXT NOT NULL,
    "tanggalLahir" DATE NOT NULL,
    "agama" TEXT NOT NULL,
    "pendidikanTerakhir" TEXT NOT NULL,
    "pekerjaan" TEXT NOT NULL,
    "statusPerkawinan" TEXT NOT NULL,
    "statusHubungan" TEXT NOT NULL,
    "kewarganegaraan" TEXT NOT NULL,
    "nomorPaspor" TEXT,
    "nomorKitap" TEXT,
    "namaAyah" TEXT NOT NULL,
    "namaIbu" TEXT NOT NULL,

    CONSTRAINT "anggota_keluarga_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "kartu_keluarga_noKK_key" ON "kartu_keluarga"("noKK");

-- CreateIndex
CREATE INDEX "kartu_keluarga_kelurahanId_rt_rw_idx" ON "kartu_keluarga"("kelurahanId", "rt", "rw");

-- CreateIndex
CREATE UNIQUE INDEX "anggota_keluarga_nik_key" ON "anggota_keluarga"("nik");

-- CreateIndex
CREATE INDEX "anggota_keluarga_kartuKeluargaId_idx" ON "anggota_keluarga"("kartuKeluargaId");

-- AddForeignKey
ALTER TABLE "kartu_keluarga" ADD CONSTRAINT "kartu_keluarga_kelurahanId_fkey" FOREIGN KEY ("kelurahanId") REFERENCES "kelurahan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anggota_keluarga" ADD CONSTRAINT "anggota_keluarga_kartuKeluargaId_fkey" FOREIGN KEY ("kartuKeluargaId") REFERENCES "kartu_keluarga"("id") ON DELETE CASCADE ON UPDATE CASCADE;
