'use client';

import { useMemo, useState } from 'react';
import WilayahFilter from '@/components/WilayahFilter';
import KKList from '@/components/KKList';
import KKDetailModal from '@/components/KKDetailModal';
import { daftarKelurahan, getRTList, getRWList, searchKK } from '@/data/dummyData';

export default function Home() {
  const [kelurahanId, setKelurahanId] = useState('');
  const [rt, setRt] = useState('');
  const [rw, setRw] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasil, setHasil] = useState(null);
  const [kkTerpilih, setKkTerpilih] = useState(null);

  const daftarRT = useMemo(() => (kelurahanId ? getRTList(kelurahanId) : []), [kelurahanId]);
  const daftarRW = useMemo(() => (kelurahanId && rt ? getRWList(kelurahanId, rt) : []), [kelurahanId, rt]);

  function pilihKelurahan(value) {
    setKelurahanId(value);
    setRt('');
    setRw('');
    setHasil(null);
  }

  function pilihRt(value) {
    setRt(value);
    setRw('');
    setHasil(null);
  }

  function pilihRw(value) {
    setRw(value);
    if (!kelurahanId || !rt || !value) return;

    setLoading(true);
    setHasil(null);
    window.setTimeout(() => {
      setHasil(searchKK(kelurahanId, rt, value));
      setLoading(false);
    }, 450);
  }

  return (
    <>
      <header className="bg-ink px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-5xl">
          <h1 className="font-display text-2xl font-semibold text-paper sm:text-3xl">
            Pencarian Data Kartu Keluarga
          </h1>
          <p className="mt-2 max-w-md text-sm text-paper/70">
            Cari data keluarga berdasarkan kelurahan, RT, dan RW.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6">
        <WilayahFilter
          daftarKelurahan={daftarKelurahan}
          kelurahanId={kelurahanId}
          rt={rt}
          rw={rw}
          daftarRT={daftarRT}
          daftarRW={daftarRW}
          onKelurahanChange={pilihKelurahan}
          onRtChange={pilihRt}
          onRwChange={pilihRw}
        />

        <div className="mt-8">
          <KKList loading={loading} hasil={hasil} onLihatDetail={setKkTerpilih} />
        </div>
      </main>

      {kkTerpilih && <KKDetailModal kk={kkTerpilih} onClose={() => setKkTerpilih(null)} />}
    </>
  );
}
