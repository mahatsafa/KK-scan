'use client';

import { useState } from 'react';
import KKForm from './KKForm';

export default function TambahKKClient({ daftarKelurahan }) {
  const [file, setFile] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [errorUpload, setErrorUpload] = useState('');
  const [extractedData, setExtractedData] = useState(null);
  const [formKey, setFormKey] = useState(0);

  async function handleEkstrak() {
    if (!file) return;
    setExtracting(true);
    setErrorUpload('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/kk/ekstrak', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        setErrorUpload(data.message || 'Gagal membaca file.');
        return;
      }

      setExtractedData(data);
      setFormKey((k) => k + 1);
    } catch (err) {
      setErrorUpload('Terjadi kesalahan saat memproses file.');
    } finally {
      setExtracting(false);
    }
  }

  return (
    <div>
      <section className="mb-6 rounded border border-line bg-white p-4 sm:p-5">
        <h2 className="mb-1 text-sm font-medium text-ink-soft">Upload file KK (opsional)</h2>
        <p className="mb-3 text-xs text-ink-soft">
          Format JPG, PNG, atau PDF (PDF hanya yang teksnya bisa dibaca langsung, bukan hasil scan).
          Data yang terbaca akan mengisi form di bawah. Hasil OCR bisa salah baca, jadi periksa dulu
          sebelum disimpan.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-sm text-ink"
          />
          <button
            type="button"
            onClick={handleEkstrak}
            disabled={!file || extracting}
            className="rounded bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink-soft disabled:opacity-60"
          >
            {extracting ? 'Membaca file…' : 'Baca & isi otomatis'}
          </button>
        </div>

        {extracting && (
          <p className="mt-3 text-xs text-ink-soft">
            Sedang membaca. Pemakaian pertama bisa lebih lama karena model bahasa OCR diunduh dulu.
          </p>
        )}
        {errorUpload && (
          <p className="mt-3 rounded border border-seal/30 bg-seal/5 px-3 py-2 text-sm text-seal">
            {errorUpload}
          </p>
        )}
        {extractedData && (
          <p className="mt-3 text-sm text-ink">
            {extractedData.anggota.length} anggota terbaca. Lengkapi kolom yang masih kosong, lalu simpan.
          </p>
        )}
      </section>

      <KKForm key={formKey} daftarKelurahan={daftarKelurahan} initialData={extractedData} />
    </div>
  );
}
