import React, { useState, useMemo, useCallback } from 'react';
import { Upload, FileSpreadsheet, Database, Table2, Filter, Wand2, Sparkles, Printer, Loader2, Check } from 'lucide-react';
import LabelSvg from './LabelSvg';
import { parseSpreadsheetFile, fetchGoogleSheet, fetchSupabaseTable, autoMapColumns, applyFilter, rowToValues, FILTER_OPS } from '../../lib/labelData';
import { mapDataWithAI } from '../../lib/labelsAi';
import { queueLabelPrints } from '../../lib/labelsApi';

const PRINT_CAP = 500;
const fieldCls = 'w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-[13px] font-semibold text-slate-900 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20';
const SOURCES = [
  { k: 'file', icon: Upload, label: 'Upload file' },
  { k: 'sheet', icon: FileSpreadsheet, label: 'Google Sheet' },
  { k: 'supabase', icon: Database, label: 'Database table' },
];

const DataPanel = ({ template, onToast }) => {
  const [source, setSource] = useState('file');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null); // { columns, rows }
  const [sheetUrl, setSheetUrl] = useState('');
  const [tableName, setTableName] = useState('');
  const [fileName, setFileName] = useState('');
  const [mapping, setMapping] = useState({});
  const [filter, setFilter] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [aiInstruction, setAiInstruction] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [printing, setPrinting] = useState(false);

  const variables = useMemo(() => template?.variables || [], [template]);

  const afterLoad = useCallback(
    (result, label) => {
      if (!result.columns.length) {
        onToast?.('No columns found in that data.', 'error');
        return;
      }
      setData(result);
      setMapping(autoMapColumns(variables, result.columns));
      setFilter(null);
      onToast?.(`${label}: ${result.rows.length} rows, ${result.columns.length} columns`, 'success');
    },
    [variables, onToast],
  );

  const loadFile = async (file) => {
    if (!file) return;
    setLoading(true);
    setFileName(file.name);
    try {
      afterLoad(await parseSpreadsheetFile(file), file.name);
    } catch (e) {
      onToast?.(e.message || 'Could not read file', 'error');
    } finally {
      setLoading(false);
    }
  };
  const loadSheet = async () => {
    setLoading(true);
    try {
      afterLoad(await fetchGoogleSheet(sheetUrl), 'Google Sheet');
    } catch (e) {
      onToast?.(e.message || 'Could not read sheet', 'error');
    } finally {
      setLoading(false);
    }
  };
  const loadTable = async () => {
    setLoading(true);
    try {
      afterLoad(await fetchSupabaseTable(tableName), `Table ${tableName}`);
    } catch (e) {
      onToast?.(e.message || 'Could not read table', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredRows = useMemo(() => (data ? applyFilter(data.rows, filter) : []), [data, filter]);
  const previewValues = useMemo(() => {
    const base = {};
    variables.forEach((v) => (base[v.key] = v.default ?? ''));
    return filteredRows[0] ? { ...base, ...rowToValues(filteredRows[0], mapping) } : base;
  }, [filteredRows, mapping, variables]);

  const runAi = async () => {
    if (!aiInstruction.trim() || !data) return;
    setAiBusy(true);
    try {
      const r = await mapDataWithAI({ instruction: aiInstruction.trim(), columns: data.columns, variables });
      setMapping(r.mapping);
      setFilter(r.filter);
      setQuantity(r.quantity || 1);
      onToast?.('AI set up the merge — review and print', 'success');
    } catch (e) {
      onToast?.(e.message || 'AI mapping failed', 'error');
    } finally {
      setAiBusy(false);
    }
  };

  const printAll = async () => {
    if (!filteredRows.length) return;
    const rows = filteredRows.slice(0, PRINT_CAP);
    const primary = variables[0]?.key;
    setPrinting(true);
    try {
      const jobs = rows.map((row) => {
        const values = { ...rowToValues(row, mapping) };
        const title = `${template.name}${primary && values[primary] ? ` · ${values[primary]}` : ''}`;
        return { values, title };
      });
      await queueLabelPrints({ template, jobs, quantity: Math.max(1, quantity | 0 || 1), by: 'Label Studio', source: 'web' });
      onToast?.(`Queued ${jobs.length * Math.max(1, quantity | 0 || 1)} labels${filteredRows.length > PRINT_CAP ? ` (capped at ${PRINT_CAP} rows)` : ''}`, 'success');
    } catch (e) {
      onToast?.(e.message || 'Could not queue prints', 'error');
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      {/* Left: configure */}
      <div className="space-y-5">
        {/* Source */}
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-soft">
          <h3 className="mb-3 font-fraunces text-[18px] font-medium tracking-tight text-slate-900">Data source</h3>
          <div className="mb-3 flex flex-wrap gap-2">
            {SOURCES.map((s) => {
              const Icon = s.icon;
              const active = source === s.k;
              return (
                <button
                  key={s.k}
                  onClick={() => setSource(s.k)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[13px] font-bold transition ${
                    active ? 'border-slate-900 bg-slate-900 text-white' : 'border-stone-200 bg-white text-slate-500 hover:border-stone-300'
                  }`}
                >
                  <Icon size={15} /> {s.label}
                </button>
              );
            })}
          </div>

          {source === 'file' && (
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-stone-300 bg-[#FBFBFA] px-4 py-6 text-[13px] font-semibold text-slate-500 hover:border-orange-300 hover:text-orange-600">
              <Upload size={16} /> {fileName || 'Choose a CSV or XLSX file…'}
              <input type="file" accept=".csv,.xlsx,.xls,.tsv" className="hidden" onChange={(e) => loadFile(e.target.files?.[0])} />
            </label>
          )}
          {source === 'sheet' && (
            <div className="flex gap-2">
              <input value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} placeholder="Paste a shared Google Sheets link…" className={fieldCls} />
              <button onClick={loadSheet} disabled={loading || !sheetUrl.trim()} className="pk-press shrink-0 rounded-lg bg-slate-900 px-4 py-1.5 text-[13px] font-bold text-white hover:bg-slate-800 disabled:opacity-50">Load</button>
            </div>
          )}
          {source === 'supabase' && (
            <div>
              <div className="flex gap-2">
                <input value={tableName} onChange={(e) => setTableName(e.target.value)} placeholder="Supabase table name, e.g. vista_carts" className={fieldCls} />
                <button onClick={loadTable} disabled={loading || !tableName.trim()} className="pk-press shrink-0 rounded-lg bg-slate-900 px-4 py-1.5 text-[13px] font-bold text-white hover:bg-slate-800 disabled:opacity-50">Load</button>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-400">Reads rows from your connected Supabase project.</p>
            </div>
          )}
          {loading && <p className="mt-3 inline-flex items-center gap-2 text-[12.5px] font-semibold text-slate-500"><Loader2 size={14} className="animate-spin" /> Loading…</p>}
          {data && !loading && (
            <p className="mt-3 inline-flex items-center gap-2 text-[12.5px] font-semibold text-emerald-600"><Check size={14} /> {data.rows.length} rows · {data.columns.length} columns</p>
          )}
        </div>

        {data && (
          <>
            {/* AI */}
            <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4 shadow-soft">
              <div className="mb-2 flex items-center gap-2"><Sparkles size={15} className="text-violet-600" /><span className="text-[12.5px] font-bold text-slate-800">Tell the AI to set it up</span></div>
              <div className="flex gap-2">
                <input value={aiInstruction} onChange={(e) => setAiInstruction(e.target.value)} placeholder="e.g. a label for every row where Status is Ready, using SKU" className={fieldCls} />
                <button onClick={runAi} disabled={aiBusy || !aiInstruction.trim()} className="pk-press inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-violet-600 px-3.5 py-1.5 text-[13px] font-bold text-white hover:bg-violet-700 disabled:opacity-50">
                  {aiBusy ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />} Do it
                </button>
              </div>
            </div>

            {/* Mapping */}
            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-soft">
              <h3 className="mb-3 inline-flex items-center gap-2 text-[13px] font-bold text-slate-700"><Table2 size={15} /> Map columns to the label</h3>
              {variables.length === 0 ? (
                <p className="text-[12.5px] text-slate-400">This template has no variables. Add <code className="text-orange-600">{'${name}'}</code> fields in Design first.</p>
              ) : (
                <div className="space-y-2">
                  {variables.map((v) => (
                    <div key={v.key} className="flex items-center gap-2">
                      <span className="w-[40%] truncate text-[12.5px] font-bold text-slate-600" title={v.key}>{v.label || v.key}</span>
                      <span className="text-slate-300">←</span>
                      <select value={mapping[v.key] || ''} onChange={(e) => setMapping((m) => ({ ...m, [v.key]: e.target.value }))} className={`${fieldCls} flex-1`}>
                        <option value="">— none —</option>
                        {data.columns.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Filter */}
            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-soft">
              <h3 className="mb-3 inline-flex items-center gap-2 text-[13px] font-bold text-slate-700"><Filter size={15} /> Filter rows <span className="font-normal text-slate-400">— optional</span></h3>
              <div className="flex flex-wrap items-center gap-2">
                <select value={filter?.column || ''} onChange={(e) => setFilter(e.target.value ? { column: e.target.value, op: filter?.op || 'not_empty', value: filter?.value || '' } : null)} className={`${fieldCls} flex-1`}>
                  <option value="">All rows</option>
                  {data.columns.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                {filter && (
                  <>
                    <select value={filter.op} onChange={(e) => setFilter((f) => ({ ...f, op: e.target.value }))} className={`${fieldCls} w-auto`}>
                      {FILTER_OPS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                    </select>
                    {!['not_empty'].includes(filter.op) && (
                      <input value={filter.value} onChange={(e) => setFilter((f) => ({ ...f, value: e.target.value }))} placeholder="value" className={`${fieldCls} w-28`} />
                    )}
                  </>
                )}
              </div>
              <p className="mt-2 text-[11.5px] font-semibold text-slate-500">{filteredRows.length} of {data.rows.length} rows selected</p>
            </div>
          </>
        )}
      </div>

      {/* Right: preview + print */}
      <div className="space-y-4">
        {template && (
          <div className="rounded-2xl border border-stone-200 bg-white p-3 shadow-soft">
            <div className="rounded-lg border border-stone-100" style={{ background: '#f5f5f4' }}>
              <LabelSvg template={template} values={previewValues} />
            </div>
            <p className="mt-2 text-center text-[11px] text-slate-400">Preview of the first selected row</p>
          </div>
        )}

        {data && (
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-soft">
            <div className="max-h-52 overflow-auto">
              <table className="w-full text-left text-[11.5px]">
                <thead className="sticky top-0 bg-[#FBFBFA] text-slate-400">
                  <tr>{data.columns.slice(0, 4).map((c) => <th key={c} className="truncate px-2.5 py-1.5 font-bold">{c}</th>)}</tr>
                </thead>
                <tbody>
                  {filteredRows.slice(0, 8).map((r, i) => (
                    <tr key={i} className="border-t border-stone-100">
                      {data.columns.slice(0, 4).map((c) => <td key={c} className="max-w-[90px] truncate px-2.5 py-1.5 text-slate-600">{String(r[c] ?? '')}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-[12px] font-bold text-slate-500">
              Copies
              <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="w-16 rounded-lg border border-stone-200 px-2 py-1.5 text-[14px] font-semibold" />
            </label>
            <button onClick={printAll} disabled={printing || !filteredRows.length} className="pk-press ml-auto inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-[13px] font-bold text-white shadow-glow hover:bg-orange-700 disabled:opacity-50">
              {printing ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />} Print {filteredRows.length || ''} labels
            </button>
          </div>
          {filteredRows.length > PRINT_CAP && <p className="mt-2 text-[11px] font-semibold text-amber-600">Only the first {PRINT_CAP} rows will print.</p>}
        </div>
      </div>
    </div>
  );
};

export default DataPanel;
