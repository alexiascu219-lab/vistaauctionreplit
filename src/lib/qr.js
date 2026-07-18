// Real QR matrix for the on-screen preview. The printed sticker's QR is produced
// by the Zebra from ^BQ ZPL; this mirrors it so the Label Studio preview shows a
// genuine, scannable code instead of a decorative pattern.
import qrcode from 'qrcode-generator';

const cache = new Map();

// Returns { count, cells } where cells[r][c] is true for a dark module.
// ecc 'L' matches the ^BQ default ("LA") used in zpl.js.
export function qrMatrix(value, ecc = 'L') {
  const data = String(value == null || value === '' ? ' ' : value);
  const key = `${ecc}|${data}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const qr = qrcode(0, ecc); // typeNumber 0 = auto-fit to the data
  qr.addData(data);
  qr.make();
  const count = qr.getModuleCount();
  const cells = [];
  for (let r = 0; r < count; r++) {
    const row = [];
    for (let c = 0; c < count; c++) row.push(qr.isDark(r, c));
    cells.push(row);
  }
  const m = { count, cells };
  cache.set(key, m);
  return m;
}
