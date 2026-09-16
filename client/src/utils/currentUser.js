/**
 * The logged-in user (saved by the login page) and document ownership.
 * A document's owner is the user who created it; the server returns it as owner / owner_email / owner_company.
 */

export function getLoggedInUser() {
  try {
    const u = JSON.parse(localStorage.getItem('user') || 'null');
    if (u && (u.email || u.id)) {
      const name = (u.name || `${u.first_name || u.firstName || ''} ${u.last_name || u.lastName || ''}`).trim();
      return {
        id: u.id || null,
        name: name || (u.email ? u.email.split('@')[0] : ''),
        email: u.email || '',
        company: u.company || ''
      };
    }
  } catch (e) {}
  return null;
}

/** Owner shown for a document; documents without owner data (e.g. unsaved) belong to the logged-in user. */
export function getDocumentOwner(doc) {
  if (doc?.owner || doc?.owner_email) {
    return {
      name: doc.owner || String(doc.owner_email).split('@')[0],
      email: doc.owner_email || '',
      company: doc.owner_company || ''
    };
  }
  const me = getLoggedInUser();
  return { name: me?.name || '-', email: me?.email || '', company: me?.company || '' };
}
