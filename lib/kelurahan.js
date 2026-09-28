import { prisma } from '@/lib/prisma';

// Kalau admin memilih "+ Tambah kelurahan baru" di form, buat (atau pakai yang
// sudah ada dengan nama + kecamatan sama) lalu kembalikan id-nya.
export async function tentukanKelurahanId(body) {
  if (body.kelurahanId !== '__baru__') return body.kelurahanId;

  const k = body.kelurahanBaru || {};
  const nama = (k.nama || '').trim();
  if (!nama) throw new Error('NAMA_KELURAHAN_KOSONG');
  const kecamatan = (k.kecamatan || '').trim();

  const ada = await prisma.kelurahan.findFirst({
    where: {
      nama: { equals: nama, mode: 'insensitive' },
      kecamatan: { equals: kecamatan, mode: 'insensitive' },
    },
  });
  if (ada) return ada.id;

  const baru = await prisma.kelurahan.create({
    data: {
      nama,
      kecamatan,
      kabupatenKota: (k.kabupatenKota || '').trim(),
      provinsi: (k.provinsi || '').trim(),
      kodePos: (k.kodePos || '').trim(),
      kodeWilayah: String(body.noKK || '').slice(0, 6),
    },
  });
  return baru.id;
}
