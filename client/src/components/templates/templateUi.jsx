import React from 'react';
import {
  Briefcase,
  Users,
  ShoppingCart,
  Home,
  Scale,
  Landmark,
  HeartPulse,
  GraduationCap,
  Truck,
  FileText,
  AlertTriangle,
  ShieldAlert,
  Info
} from 'lucide-react';
import { TEMPLATE_CATEGORIES, getCategory } from '../../utils/templateLibrary';
import { API_BASE } from '../../utils/api';
export { API_BASE };

const ICONS = {
  briefcase: Briefcase,
  users: Users,
  cart: ShoppingCart,
  home: Home,
  scale: Scale,
  finance: Landmark,
  health: HeartPulse,
  education: GraduationCap,
  truck: Truck
};


// Saved templates (My templates) use the look of the category they were saved under
const CUSTOM_CATEGORY = {
  id: 'custom',
  label: 'My templates',
  badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  iconTone: 'bg-emerald-100 text-[#007355]'
};

export const categoryMeta = (id) => getCategory(id) || CUSTOM_CATEGORY;

export function CategoryIcon({ category, size = 16, className = '' }) {
  const meta = categoryMeta(category);
  const Icon = ICONS[meta.icon] || FileText;
  return (
    <span className={`inline-flex items-center justify-center rounded-lg shrink-0 ${meta.iconTone} ${className}`}>
      <Icon size={size} />
    </span>
  );
}

/** A saved template (templates table) in the shape of a library template. */
export function toSavedTemplateItem(row) {
  const meta = categoryMeta(row.category);
  return {
    id: `saved-${row.id}`,
    dbId: row.id,
    source: 'saved',
    name: row.title || row.template_name || 'Untitled template',
    category: getCategory(row.category) ? row.category : 'custom',
    categoryLabel: meta.label,
    kind: 'custom',
    kindLabel: 'My template',
    description: row.description || (row.file_path ? 'Uploaded template file' : 'Saved template'),
    parties: [],
    notice: meta.notice || '',
    content: row.content || '',
    filePath: row.file_path || null,
    isShared: row.isShared !== false,
    usageCount: row.usageCount || 0,
    ownerName: row.ownerName || '',
    userId: row.userId,
    updatedAt: row.updated_at || row.last_modified || row.created_at || null,
    sourceTemplate: row.sourceTemplate || null
  };
}

/** Saved templates visible to the user; resolves to [] when the server is unreachable. */
export async function fetchSavedTemplates(userId) {
  const res = await fetch(`${API_BASE}/templates${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw new Error(data.error || `Templates could not be loaded (HTTP ${res.status}).`);
  return (Array.isArray(data.templates) ? data.templates : []).map(toSavedTemplateItem);
}

/** Records that a saved template was used (library templates are not counted). */
export function countTemplateUse(template) {
  if (template?.source !== 'saved' || !template.dbId) return;
  fetch(`${API_BASE}/templates/${template.dbId}/use`, { method: 'POST' }).catch(() => {});
}

/** Documents for a request from chosen templates (the text stays editable before sending). */
export function templatesToDocuments(templates) {
  return templates.map((t, i) => ({
    id: Date.now() + i + Math.floor(Math.random() * 1000),
    name: /\.pdf$/i.test(t.name) ? t.name : `${t.name}.pdf`,
    pages: 1,
    status: 'Ready',
    file: null,
    filePath: t.filePath || null,
    documentText: t.content || '',
    fromTemplate: t.id
  }));
}

export const countPlaceholders = (text) => (String(text || '').match(/\[[^\]\n]{1,80}\]/g) || []).length;

// [Placeholder] text is highlighted so the sender sees what to fill in
function withPlaceholders(text, keyPrefix) {
  return String(text)
    .split(/(\[[^\]\n]{1,80}\])/g)
    .map((part, i) => (/^\[[^\]\n]{1,80}\]$/.test(part)
      ? <mark key={`${keyPrefix}-${i}`} className="bg-amber-100 text-amber-900 rounded px-0.5">{part}</mark>
      : part));
}

const HEADING = /^([0-9]+\.\s+[A-Z][A-Z\s&,'()-]*|[A-Z][A-Z\s&,'()/-]{4,})$/;

/** Plain-text template rendered like a document page: title, bold headings, highlighted placeholders. */
export function TemplateDocument({ content, compact = false }) {
  const blocks = String(content || '').replace(/\r\n?/g, '\n').split(/\n{2,}/).filter((b) => b.trim());
  if (blocks.length === 0) {
    return <p className="text-xs text-slate-400 italic">This template has no text. It uses the uploaded file.</p>;
  }
  return (
    <div className={`text-slate-700 ${compact ? 'text-[11px] leading-relaxed space-y-2' : 'text-[13px] leading-relaxed space-y-3'}`}>
      {blocks.map((block, bi) => {
        const [first, ...rest] = block.split('\n');
        if (bi === 0 && HEADING.test(first.trim()) && rest.length === 0) {
          return (
            <h3 key={bi} className={`font-black text-slate-900 tracking-tight text-center ${compact ? 'text-sm' : 'text-base sm:text-lg'}`}>
              {first}
            </h3>
          );
        }
        const isHeading = HEADING.test(first.trim());
        return (
          <p key={bi} className="whitespace-pre-line break-words">
            {isHeading ? <strong className="text-slate-900">{first}</strong> : withPlaceholders(first, `${bi}-h`)}
            {rest.length > 0 && '\n'}
            {withPlaceholders(rest.join('\n'), `${bi}-b`)}
          </p>
        );
      })}
    </div>
  );
}

/** Legal, finance and healthcare notices shown with a template or category. */
export function TemplateNotice({ category, className = '' }) {
  const meta = getCategory(category);
  if (!meta?.notice) return null;
  const tone = category === 'healthcare'
    ? { box: 'bg-rose-50 border-rose-200 text-rose-900', icon: <ShieldAlert size={15} className="text-rose-600 shrink-0 mt-0.5" />, title: 'Sensitive health information' }
    : category === 'legal'
      ? { box: 'bg-amber-50 border-amber-200 text-amber-900', icon: <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />, title: 'Example templates' }
      : { box: 'bg-sky-50 border-sky-200 text-sky-900', icon: <Info size={15} className="text-sky-600 shrink-0 mt-0.5" />, title: 'Protect payment details' };
  return (
    <div role="note" className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-[11px] leading-relaxed ${tone.box} ${className}`}>
      {tone.icon}
      <p><strong>{tone.title}.</strong> {meta.notice}</p>
    </div>
  );
}

export { TEMPLATE_CATEGORIES };
