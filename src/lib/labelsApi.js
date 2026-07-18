import { supabase } from '../supabaseClient';
import { templateToZpl } from './zpl';

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
export async function queueLabelPrints({ template, jobs, quantity = 1, by = null, source = 'web' }) {
  const rows = jobs.map(({ values, title }) => ({
    template: 'custom',
    title: title || template.name,
    data: {
      zpl: templateToZpl(template, values),
      values,
      template_id: template.id,
      template_name: template.name,
    },
    quantity: Math.max(1, Math.min(50, quantity | 0 || 1)),
    source,
    requested_by: by,
    status: 'queued',
  }));
  const { data, error } = await supabase.from('vista_print_jobs').insert(rows).select();
  if (error) throw new Error(error.message);
  return data;
}
