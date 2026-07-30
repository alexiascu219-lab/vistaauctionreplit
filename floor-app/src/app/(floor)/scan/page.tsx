import Link from 'next/link';

/**
 * Camera scanning — build step 4, not built yet.
 *
 * Placeholder rather than a stub implementation: a scanner that half works is
 * worse than one that is visibly absent, because someone will trust it.
 *
 * When it lands: native BarcodeDetector where available as a progressive
 * enhancement, zxing-js as the fallback for Safari, resolving against the
 * IndexedDB cache from step 5 so a scan answers with zero network.
 */
export default function ScanPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold text-slate-50">Scan</h1>

      <div className="card border-dashed">
        <p className="text-field font-bold text-slate-300">Camera scanning not built yet</p>
        <p className="mt-3 text-base leading-relaxed text-slate-400">
          This is build step 4. Until then, use manual entry — it takes the same code
          path and gives the same answer.
        </p>
      </div>

      <Link href="/lookup" className="btn-primary">
        Type a VALPN instead
      </Link>
    </div>
  );
}
