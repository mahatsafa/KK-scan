'use client';

function aksenDesil(desil) {
  if (desil <= 3) return 'border-seal';
  if (desil <= 7) return 'border-seal-soft';
  return 'border-line';
}

export default function KKRow({ kk, onLihatDetail }) {
  return (
    <div
      className={`flex flex-col gap-3 border-l-[6px] p-4 sm:flex-row sm:items-center sm:justify-between ${aksenDesil(
        kk.desil
      )}`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-8">
        <div>
          <p className="text-xs text-ink-soft">No. KK</p>
          <p className="font-mono text-sm text-ink">{kk.noKK}</p>
        </div>
        <div>
          <p className="text-xs text-ink-soft">Kepala keluarga</p>
          <p className="text-sm font-medium text-ink">{kk.kepalaKeluarga}</p>
        </div>
        <div>
          <p className="text-xs text-ink-soft">Desil</p>
          <p className="text-sm text-ink">{kk.desil}</p>
        </div>
      </div>

      <button
        onClick={() => onLihatDetail(kk)}
        className="shrink-0 rounded bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-ink-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
      >
        Tampilkan KK
      </button>
    </div>
  );
}
