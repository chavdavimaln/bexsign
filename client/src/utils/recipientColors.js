/**
 * Recipient colours (same palette as the document editor): recipients are coloured by their position in the
 * request, and a field belongs to a recipient by email, recipient id or name.
 */
export const RECIPIENT_COLORS = ['#00a884', '#0284c7', '#f97316', '#8b5cf6', '#ec4899', '#10b981'];

export const recipientColorAt = (index) => RECIPIENT_COLORS[((index % RECIPIENT_COLORS.length) + RECIPIENT_COLORS.length) % RECIPIENT_COLORS.length];

export function fieldBelongsTo(field, recipient) {
  if (!field || !recipient) return false;
  const email = String(recipient.email || '').trim().toLowerCase();
  if (field.assigneeEmail && email) return String(field.assigneeEmail).trim().toLowerCase() === email;
  if (field.assigneeId && recipient.id) return String(field.assigneeId) === String(recipient.id);
  return Boolean(field.assignee && recipient.name && field.assignee === recipient.name);
}
