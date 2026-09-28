'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const OPSI_JENIS_KELAMIN = [
  { value: 'L', label: 'Laki-laki' },
  { value: 'P', label: 'Perempuan' },
];

const OPSI_AGAMA = ['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Konghucu'];
const OPSI_STATUS_PERKAWINAN = ['Belum Kawin', 'Kawin', 'Cerai Hidup', 'Cerai Mati'];
const OPSI_KEWARGANEGARAAN = ['WNI', 'WNA'];
const KELURAHAN_BARU = '__baru__';

function anggotaKosong() {
  return {
    _key: crypto.randomUUID(),
    namaLengkap: '',
    nik: '',
    jenisKelamin: 'L',
    tempatLahir: '',
    tanggalLahir: '',
    agama: 'Islam',
    pendidikanTerakhir: '',
    pekerjaan: '',
    statusPerkawinan: 'Belum Kawin',
    statusHubungan: '',
    kewarganegaraan: 'WNI',
    nomorPaspor: '',
    nomorKitap: '',
    namaAyah: '',
    namaIbu: '',
  };
}

export default function KKForm({ daftarKelurahan, initialData, kkId }) {
  const router = useRouter();
  const [form, setForm] = useState(() => ({
    noKK: initialData?.noKK || '',
    kelurahanId:
      initialData?.kelurahanId || (initialData?.kelurahanBaru?.nama ? KELURAHAN_BARU : ''),
    rt: initialData?.rt || '',
    rw: initialData?.rw || '',
    alamat: initialData?.alamat || '',
    kepalaKeluarga: initialData?.kepalaKeluarga || '',
    desil: initialData?.desil ?? '',
    fileAsliPath: initialData?.fileAsliPath || '',
  }));
  const [kelurahanBaru, setKelurahanBaru] = useState(() => ({
    nama: initialData?.kelurahanBaru?.nama || '',
    kecamatan: initialData?.kelurahanBaru?.kecamatan || '',
    kabupatenKota: initialData?.kelurahanBaru?.kabupatenKota || '',
    provinsi: initialData?.kelurahanBaru?.provinsi || '',
    kodePos: initialData?.kelurahanBaru?.kodePos || '',
  }));
  const [anggota, setAnggota] = useState(() =>
    initialData?.anggota?.length
      ? initialData.anggota.map((a) => ({
          ...a,
          _key: a.id || crypto.randomUUID(),
          tanggalLahir: a.tanggalLahir ? String(a.tanggalLahir).slice(0, 10) : '',
          nomorPaspor: a.nomorPaspor || '',
          nomorKitap: a.nomorKitap || '',
        }))
      : [anggotaKosong()]
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function ubahForm(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function ubahAnggota(index, field, value) {
    setAnggota((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  function tambahAnggota() {
    setAnggota((prev) => [...prev, anggotaKosong()]);
  }

  function hapusAnggota(index) {
    setAnggota((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.noKK || !form.kelurahanId || !form.rt || !form.rw || !form.kepalaKeluarga) {
      setError('Lengkapi dulu info umum keluarga (No. KK, kelurahan, RT, RW, kepala keluarga).');
      return;
    }
    const desilAngka = Number(form.desil);
    if (!form.desil || desilAngka < 1 || desilAngka > 10) {
      setError('Desil wajib diisi manual (angka 1 sampai 10).');
      return;
    }
    if (form.kelurahanId === KELURAHAN_BARU && !kelurahanBaru.nama.trim()) {
      setError('Nama kelurahan baru wajib diisi.');
      return;
    }
    const anggotaValid = anggota.every(
      (a) => a.namaLengkap && a.nik && a.tanggalLahir && a.jenisKelamin && a.agama && a.statusPerkawinan
    );
    if (!anggotaValid) {
      setError('Setiap anggota harus punya nama, NIK, tanggal lahir, jenis kelamin, agama, dan status perkawinan.');
      return;
    }

    setSaving(true);
    const payload = {
      ...form,
      desil: Number(form.desil),
      kelurahanBaru: form.kelurahanId === KELURAHAN_BARU ? kelurahanBaru : undefined,
      anggota: anggota.map(({ _key, ...rest }) => rest),
    };

    const res = await fetch(kkId ? `/api/kk/${kkId}` : '/api/kk', {
      method: kkId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message || 'Gagal menyimpan data.');
      setSaving(false);
      return;
    }

    router.push('/admin');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <p className="mb-4 rounded border border-seal/30 bg-seal/5 px-3 py-2 text-sm text-seal">{error}</p>
      )}

      <section className="rounded border border-line bg-white p-4 sm:p-5">
        <h2 className="mb-4 text-sm font-medium text-ink-soft">Informasi umum keluarga</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="No. KK">
            <TextInput mono value={form.noKK} onChange={(v) => ubahForm('noKK', v)} />
          </Field>

          <Field label="Kepala keluarga">
            <TextInput value={form.kepalaKeluarga} onChange={(v) => ubahForm('kepalaKeluarga', v)} />
          </Field>

          <Field label="Kelurahan">
            <SelectInput
              value={form.kelurahanId}
              onChange={(v) => ubahForm('kelurahanId', v)}
              placeholder="Pilih kelurahan"
              options={[
                ...daftarKelurahan.map((k) => ({ value: k.id, label: k.nama })),
                { value: KELURAHAN_BARU, label: '+ Tambah kelurahan baru…' },
              ]}
            />
          </Field>

          {form.kelurahanId === KELURAHAN_BARU && (
            <div className="grid grid-cols-1 gap-3 rounded border border-line bg-paper p-3 sm:col-span-2 sm:grid-cols-2">
              <Field label="Nama kelurahan baru">
                <TextInput
                  value={kelurahanBaru.nama}
                  onChange={(v) => setKelurahanBaru((p) => ({ ...p, nama: v }))}
                />
              </Field>
              <Field label="Kecamatan">
                <TextInput
                  value={kelurahanBaru.kecamatan}
                  onChange={(v) => setKelurahanBaru((p) => ({ ...p, kecamatan: v }))}
                />
              </Field>
              <Field label="Kabupaten/Kota">
                <TextInput
                  value={kelurahanBaru.kabupatenKota}
                  onChange={(v) => setKelurahanBaru((p) => ({ ...p, kabupatenKota: v }))}
                />
              </Field>
              <Field label="Provinsi">
                <TextInput
                  value={kelurahanBaru.provinsi}
                  onChange={(v) => setKelurahanBaru((p) => ({ ...p, provinsi: v }))}
                />
              </Field>
              <Field label="Kode pos">
                <TextInput
                  value={kelurahanBaru.kodePos}
                  onChange={(v) => setKelurahanBaru((p) => ({ ...p, kodePos: v }))}
                />
              </Field>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="RT">
              <TextInput value={form.rt} onChange={(v) => ubahForm('rt', v)} placeholder="001" />
            </Field>
            <Field label="RW">
              <TextInput value={form.rw} onChange={(v) => ubahForm('rw', v)} placeholder="001" />
            </Field>
          </div>

          <Field label="Alamat">
            <TextInput
              value={form.alamat}
              onChange={(v) => ubahForm('alamat', v)}
              placeholder="Jl. Mawar No. 12"
            />
          </Field>

          {form.fileAsliPath && (
            <p className="text-xs text-ink-soft sm:col-span-2">
              File KK terlampir: <span className="font-mono">{form.fileAsliPath.split('/').pop()}</span>
            </p>
          )}

          <Field label="Desil (1-10)">
            <input
              type="number"
              min="1"
              max="10"
              value={form.desil}
              placeholder="Isi manual"
              onChange={(e) => ubahForm('desil', e.target.value)}
              className="w-full rounded border border-line px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
            />
          </Field>
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-ink-soft">Anggota keluarga</h2>
          <button
            type="button"
            onClick={tambahAnggota}
            className="rounded border border-line px-3 py-1.5 text-sm text-ink hover:bg-white"
          >
            + Tambah anggota
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {anggota.map((orang, index) => (
            <div key={orang._key} className="rounded border border-line bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-ink">Anggota #{index + 1}</p>
                {anggota.length > 1 && (
                  <button
                    type="button"
                    onClick={() => hapusAnggota(index)}
                    className="text-sm text-seal hover:underline"
                  >
                    Hapus
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Nama lengkap">
                  <TextInput value={orang.namaLengkap} onChange={(v) => ubahAnggota(index, 'namaLengkap', v)} />
                </Field>
                <Field label="NIK">
                  <TextInput mono value={orang.nik} onChange={(v) => ubahAnggota(index, 'nik', v)} />
                </Field>
                <Field label="Jenis kelamin">
                  <SelectInput
                    value={orang.jenisKelamin}
                    onChange={(v) => ubahAnggota(index, 'jenisKelamin', v)}
                    placeholder="Pilih"
                    options={OPSI_JENIS_KELAMIN}
                  />
                </Field>
                <Field label="Tempat lahir">
                  <TextInput value={orang.tempatLahir} onChange={(v) => ubahAnggota(index, 'tempatLahir', v)} />
                </Field>
                <Field label="Tanggal lahir">
                  <input
                    type="date"
                    value={orang.tanggalLahir}
                    onChange={(e) => ubahAnggota(index, 'tanggalLahir', e.target.value)}
                    className="w-full rounded border border-line px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
                  />
                </Field>
                <Field label="Agama">
                  <SelectInput
                    value={orang.agama}
                    onChange={(v) => ubahAnggota(index, 'agama', v)}
                    placeholder="Pilih"
                    options={OPSI_AGAMA.map((a) => ({ value: a, label: a }))}
                  />
                </Field>
                <Field label="Pendidikan terakhir">
                  <TextInput
                    value={orang.pendidikanTerakhir}
                    onChange={(v) => ubahAnggota(index, 'pendidikanTerakhir', v)}
                  />
                </Field>
                <Field label="Pekerjaan">
                  <TextInput value={orang.pekerjaan} onChange={(v) => ubahAnggota(index, 'pekerjaan', v)} />
                </Field>
                <Field label="Status perkawinan">
                  <SelectInput
                    value={orang.statusPerkawinan}
                    onChange={(v) => ubahAnggota(index, 'statusPerkawinan', v)}
                    placeholder="Pilih"
                    options={OPSI_STATUS_PERKAWINAN.map((s) => ({ value: s, label: s }))}
                  />
                </Field>
                <Field label="Status hubungan">
                  <TextInput
                    value={orang.statusHubungan}
                    onChange={(v) => ubahAnggota(index, 'statusHubungan', v)}
                    placeholder="Kepala Keluarga / Istri / Anak / ..."
                  />
                </Field>
                <Field label="Kewarganegaraan">
                  <SelectInput
                    value={orang.kewarganegaraan}
                    onChange={(v) => ubahAnggota(index, 'kewarganegaraan', v)}
                    options={OPSI_KEWARGANEGARAAN.map((k) => ({ value: k, label: k }))}
                  />
                </Field>
                {orang.kewarganegaraan === 'WNA' && (
                  <>
                    <Field label="No. paspor">
                      <TextInput
                        mono
                        value={orang.nomorPaspor}
                        onChange={(v) => ubahAnggota(index, 'nomorPaspor', v)}
                      />
                    </Field>
                    <Field label="No. KITAP/KITAS">
                      <TextInput
                        mono
                        value={orang.nomorKitap}
                        onChange={(v) => ubahAnggota(index, 'nomorKitap', v)}
                      />
                    </Field>
                  </>
                )}
                <Field label="Nama ayah">
                  <TextInput value={orang.namaAyah} onChange={(v) => ubahAnggota(index, 'namaAyah', v)} />
                </Field>
                <Field label="Nama ibu">
                  <TextInput value={orang.namaIbu} onChange={(v) => ubahAnggota(index, 'namaIbu', v)} />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6 flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-ink px-5 py-2 text-sm font-medium text-paper hover:bg-ink-soft disabled:opacity-60"
        >
          {saving ? 'Menyimpan…' : 'Simpan'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin')}
          className="rounded border border-line px-5 py-2 text-sm text-ink hover:bg-white"
        >
          Batal
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-ink-soft">{label}</span>
      {children}
    </label>
  );
}

function TextInput({ value, onChange, placeholder, mono }) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded border border-line px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink ${
        mono ? 'font-mono' : ''
      }`}
    />
  );
}

function SelectInput({ value, onChange, options, placeholder }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded border border-line bg-white px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
