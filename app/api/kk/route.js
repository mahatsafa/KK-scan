import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

async function pastikanLogin() {
  const session = await getSession();
  return session.isLoggedIn === true;
}

export async function POST(request) {
  if (!(await pastikanLogin())) {
    return Response.json({ message: 'Belum login' }, { status: 401 });
  }

  const body = await request.json();

  try {
    const kk = await prisma.kartuKeluarga.create({
      data: {
        noKK: body.noKK,
        kelurahanId: body.kelurahanId,
        rt: body.rt,
        rw: body.rw,
        alamat: body.alamat,
        kepalaKeluarga: body.kepalaKeluarga,
        desil: Number(body.desil),
        fileAsliPath: body.fileAsliPath || null,
        anggota: {
          create: (body.anggota || []).map((a) => ({
            namaLengkap: a.namaLengkap,
            nik: a.nik,
            jenisKelamin: a.jenisKelamin,
            tempatLahir: a.tempatLahir,
            tanggalLahir: new Date(a.tanggalLahir),
            agama: a.agama,
            pendidikanTerakhir: a.pendidikanTerakhir,
            pekerjaan: a.pekerjaan,
            statusPerkawinan: a.statusPerkawinan,
            statusHubungan: a.statusHubungan,
            kewarganegaraan: a.kewarganegaraan,
            nomorPaspor: a.nomorPaspor || null,
            nomorKitap: a.nomorKitap || null,
            namaAyah: a.namaAyah,
            namaIbu: a.namaIbu,
          })),
        },
      },
    });

    return Response.json({ success: true, id: kk.id });
  } catch (err) {
    if (err.code === 'P2002') {
      return Response.json({ message: 'No. KK atau NIK sudah terdaftar sebelumnya.' }, { status: 409 });
    }
    console.error(err);
    return Response.json({ message: 'Gagal menyimpan data.' }, { status: 500 });
  }
}