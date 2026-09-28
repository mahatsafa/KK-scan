'use client';

export default function WilayahFilter({
  daftarKelurahan,
  kelurahanId,
  rt,
  rw,
  daftarRT,
  daftarRW,
  onKelurahanChange,
  onRtChange,
  onRwChange,
}) {
  return (
    <section className="grid grid-cols-1 gap-4 rounded border border-line bg-white p-4 sm:grid-cols-3 sm:p-5">
      <Dropdown
        label="Kelurahan"
        placeholder="Pilih kelurahan"
        value={kelurahanId}
        onChange={onKelurahanChange}
        options={daftarKelurahan.map((k) => ({ value: k.id, label: k.nama }))}
      />
      <Dropdown
        label="RT"
        placeholder="Pilih RT"
        value={rt}
        onChange={onRtChange}
        disabled={!kelurahanId}
        options={daftarRT.map((v) => ({ value: v, label: `RT ${v}` }))}
      />
      <Dropdown
        label="RW"
        placeholder="Pilih RW"
        value={rw}
        onChange={onRwChange}
        disabled={!rt}
        options={daftarRW.map((v) => ({ value: v, label: `RW ${v}` }))}
      />
    </section>
  );
}

function Dropdown({ label, placeholder, value, onChange, options, disabled }) {
  const listId = `list-${label}`;
  const opsiTerpilih = options.find((opt) => opt.value === value);

  function handleInput(teks) {
    const cocok = options.find(
      (opt) => opt.label.toLowerCase() === teks.trim().toLowerCase()
    );
    onChange(cocok ? cocok.value : '');
  }

  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-ink-soft">{label}</span>
      <input
        list={listId}
        defaultValue={opsiTerpilih ? opsiTerpilih.label : ''}
        key={value} // reset tampilan teks saat value berubah dari luar (mis. reset RT/RW)
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => handleInput(e.target.value)}
        className="w-full rounded border border-line bg-white px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink disabled:cursor-not-allowed disabled:bg-paper disabled:text-ink-soft"
      />
      <datalist id={listId}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.label} />
        ))}
      </datalist>
    </label>
  );
}
