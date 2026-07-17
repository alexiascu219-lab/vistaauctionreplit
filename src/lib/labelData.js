import * as XLSX from 'xlsx';
import { supabase } from '../supabaseClient';

// Turn any data source into a common { columns: string[], rows: object[] } shape
// so the Label Studio can merge it onto a template — one label per row.

function sheetToTable(ws) {
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' });
  if (!aoa.length) return { columns: [], rows: [] };
  const headers = aoa[0].map((h, i) => String(h ?? '').trim() || `col${i + 1}`);
  const rows = aoa
    .slice(1)
    .filter((r) => r.some((c) => String(c).trim() !== ''))
    .map((r) => {
      const o = {};
      headers.forEach((h, i) => (o[h] = r[i] != null ? r[i] : ''));
      return o;
    });
  return { columns: headers, rows };
}

// CSV / XLSX / XLS uploaded from the browser.
export async function parseSpreadsheetFile(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  if (!wb.SheetNames.length) throw new Error('That file has no sheets.');
  return sheetToTable(wb.Sheets[wb.SheetNames[0]]);
}

// A shared Google Sheet ("Anyone with the link") via the gviz CSV export.
export async function fetchGoogleSheet(url) {
  const id = String(url).match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1];
  if (!id) throw new Error("That doesn't look like a Google Sheets link.");
  const gid = String(url).match(/[#&?]gid=(\d+)/)?.[1] || '0';
  const csvUrl = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=${gid}`;
  const res = await fetch(csvUrl);
  if (!res.ok) throw new Error('Could not read that sheet — share it as “Anyone with the link”.');
  const text = await res.text();
  if (/<html/i.test(text)) throw new Error('Sheet is not public — set sharing to “Anyone with the link”.');
  const wb = XLSX.read(text, { type: 'string' });
  return sheetToTable(wb.Sheets[wb.SheetNames[0]]);
}

// Any table in the connected Supabase project.
export async function fetchSupabaseTable(table, { limit = 500 } = {}) {
  const clean = String(table || '').trim();
  if (!clean) throw new Error('Enter a table name.');
  const { data, error } = await supabase.from(clean).select('*').limit(limit);
  if (error) throw new Error(error.message);
  const rows = data || [];
  const columns = rows.length ? Object.keys(rows[0]) : [];
  return { columns, rows };
}

// ---- Merge helpers ---------------------------------------------------------
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export function autoMapColumns(variables, columns) {
  const map = {};
  const ncols = columns.map((c) => ({ c, n: norm(c) }));
  for (const v of variables) {
    const nk = norm(v.key);
    const nl = norm(v.label);
    const hit =
      ncols.find((x) => x.n === nk || x.n === nl) ||
      ncols.find((x) => (nk && (x.n.includes(nk) || nk.includes(x.n))) || (nl && (x.n.includes(nl) || nl.includes(x.n))));
    if (hit) map[v.key] = hit.c;
  }
  return map;
}

export const FILTER_OPS = [
  { key: 'not_empty', label: 'is not empty' },
  { key: 'equals', label: 'equals' },
  { key: 'not_equals', label: 'does not equal' },
  { key: 'contains', label: 'contains' },
  { key: 'gt', label: '> (number)' },
  { key: 'lt', label: '< (number)' },
];

export function applyFilter(rows, filter) {
  if (!filter || !filter.column || !filter.op) return rows;
  const { column, op, value } = filter;
  const val = String(value ?? '').toLowerCase();
  return rows.filter((r) => {
    const cell = String(r[column] ?? '');
    const lc = cell.toLowerCase();
    switch (op) {
      case 'equals': return lc === val;
      case 'not_equals': return lc !== val;
      case 'contains': return lc.includes(val);
      case 'not_empty': return cell.trim() !== '';
      case 'gt': return parseFloat(cell) > parseFloat(value);
      case 'lt': return parseFloat(cell) < parseFloat(value);
      default: return true;
    }
  });
}

export function rowToValues(row, mapping) {
  const v = {};
  for (const [key, col] of Object.entries(mapping || {})) {
    if (col && row[col] != null) v[key] = String(row[col]);
  }
  return v;
}
