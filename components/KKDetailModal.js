'use client';

import { useEffect } from 'react';

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function formatTanggal(tanggalStr) {
  const [tahun, bulan, tanggal] = tanggalStr.split('-');
  return `${parseInt(tanggal, 10)} ${NAMA_BULAN[parseInt(bulan, 10) - 1]} ${tahun}`;
}

export default function KKDetailModal({ kk, onClose }) {
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    const overflowSebelumnya = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = overflowSebelumnya;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/60 p-4 sm:items-center"
      onClick={onClose}
    >
      <div className="w-full max-w-4xl rounded bg-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs text-ink-soft">No. KK</p>
            <p className="font-mono text-sm text-ink">{kk.noKK}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="rounded p-1 text-ink-soft hover:bg-paper hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-5 py-5 sm:px-6">
          <section className="mb-6 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            <Info label="Nama kepala keluarga" value={kk.kepalaKeluarga} />
            <Info label="Alamat" value={`${kk.alamat}, RT ${kk.rt}/RW ${kk.rw}`} />
            <Info label="Kelurahan/Desa" value={kk.namaKelurahan} />
            <Info label="Kecamatan" value={kk.kecamatan} />
            <Info label="Kabupaten/Kota" value={kk.kabupatenKota} />
            <Info label="Provinsi" value={kk.provinsi} />
            <Info label="Kode pos" value={kk.kodePos} />
          </section>

          <section>
            <p className="mb-2 text-sm text-ink-soft">Rincian anggota keluarga</p>
            <div className="overflow-x-auto rounded border border-line">
              <table className="w-full min-w-[1300px] text-left text-sm">
                <thead className="bg-ink text-paper">
                  <tr>
                    <th className="whitespace-nowrap px-3 py-2 font-medium">Nama lengkap</th>
                    <th className="whitespace-nowrap px-3 py-2 font-medium">NIK</th>
                    <th className="whitespace-nowrap px-3 py-2 font-medium">Jenis kelamin</th>
                    <th className="whitespace-nowrap px-3 py-2 font-medium">Tempat, tanggal lahir</th>
                    <th className="whitespace-nowrap px-3 py-2 font-medium">Agama</th>
                    <th className="whitespace-nowrap px-3 py-2 font-medium">Pendidikan terakhir</th>
                    <th className="whitespace-nowrap px-3 py-2 font-medium">Pekerjaan</th>
                    <th className="whitespace-nowrap px-3 py-2 font-medium">Status perkawinan</th>
                    <th className="whitespace-nowrap px-3 py-2 font-medium">Status hubungan</th>
                    <th className="whitespace-nowrap px-3 py-2 font-medium">Kewarganegaraan</th>
                    <th className="whitespace-nowrap px-3 py-2 font-medium">No. paspor</th>
                    <th className="whitespace-nowrap px-3 py-2 font-medium">No. KITAP/KITAS</th>
                    <th className="whitespace-nowrap px-3 py-2 font-medium">Nama ayah</th>
                    <th className="whitespace-nowrap px-3 py-2 font-medium">Nama ibu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {kk.anggotaKeluarga.map((orang, idx) => (
                    <tr key={idx}>
                      <td className="whitespace-nowrap px-3 py-2 font-medium text-ink">{orang.namaLengkap}</td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-ink-soft">{orang.nik}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-ink">
                        {orang.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-ink">
                        {orang.tempatLahir}, {formatTanggal(orang.tanggalLahir)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-ink">{orang.agama}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-ink">{orang.pendidikanTerakhir}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-ink">{orang.pekerjaan}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-ink">{orang.statusPerkawinan}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-ink">{orang.statusHubungan}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-ink">{orang.kewarganegaraan}</td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-ink-soft">{orang.nomorPaspor || '—'}</td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-ink-soft">{orang.nomorKitap || '—'}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-ink">{orang.namaAyah}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-ink">{orang.namaIbu}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs text-ink-soft">{label}</p>
      <p className="text-sm text-ink">{value}</p>
    </div>
  );
}
