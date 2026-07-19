import { supabase } from '../supabaseClient';
import { templateToZpl, resolveDynamic, hasDynamicVars } from './zpl';

// ---- Template CRUD ---------------------------------------------------------
export async function listTemplates() {
  const { data, error } = await supabase
    .from('vista_label_templates')
    .select('*')
    .eq('archived', false)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function saveTemplate(t, by = null) {
  const payload = {
    name: (t.name || 'Untitled').trim(),
    description: t.description || null,
    width: Math.round(t.width || 609),
    height: Math.round(t.height || 406),
    dpi: t.dpi || 203,
    variables: t.variables || [],
    elements: t.elements || [],
    updated_by: by,
    updated_at: new Date().toISOString(),
  };
  if (t.id) {
    const { data, error } = await supabase.from('vista_label_templates').update(payload).eq('id', t.id).select().single();
    if (error) throw new Error(error.message);
    return data;
  }
  const { data, error } = await supabase.from('vista_label_templates').insert([payload]).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function archiveTemplate(id) {
  const { error } = await supabase.from('vista_label_templates').update({ archived: true }).eq('id', id);
  if (error) throw new Error(error.message);
}

// ---- Printing --------------------------------------------------------------
// jobs: [{ values, title }]. One print job per entry, each carrying finished
// ZPL so the agent prints it as-is.
//
// If the template serializes (has a counter/date variable), the run is expanded
// to ONE job per physical label so each gets the next counter value — otherwise
// identical copies are collapsed into a single job with a quantity.
const SERIAL_CAP = 2000;
export async function queueLabelPrints({ template, jobs, quantity = 1, by = null, source = 'web' }) {
  const q = Math.max(1, Math.min(50, quantity | 0 || 1));
  const vars = template.variables || [];
  const mk = (values, title, qty) => ({
    template: 'custom',
    title: title || template.name,
    data: { zpl: templateToZpl(template, values), values, template_id: template.id, template_name: template.name },
    quantity: qty,
    source,
    requested_by: by,
    status: 'queued',
  });

  let rows;
  if (hasDynamicVars(vars)) {
    const now = new Date();
    rows = [];
    let idx = 0;
    for (const { values, title } of jobs) {
      for (let c = 0; c < q && rows.length < SERIAL_CAP; c++) {
        const resolved = resolveDynamic(vars, values, idx, now);
        rows.push(mk(resolved, title, 1));
        idx += 1;
      }
    }
  } else {
    rows = jobs.map(({ values, title }) => mk(values, title, q));
  }

  const { data, error } = await supabase.from('vista_print_jobs').insert(rows).select();
  if (error) throw new Error(error.message);
  return data;
}
