/**
 * Signature Directory & Auto-Fetch Helper
 * Allows any document workflow to auto-fetch saved employee signatures by email address.
 */

export async function fetchSignatureForEmail(email) {
  if (!email || typeof email !== 'string') return null;
  const cleanEmail = email.trim().toLowerCase();

  try {
    // 1. Try dedicated by-email endpoint
    const res = await fetch(`http://localhost:5000/api/documents/employees/by-email/${encodeURIComponent(cleanEmail)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.employee) {
        return data.employee;
      }
    }
  } catch (e) {}

  try {
    // 2. Try fetching all signatures and finding match
    const res2 = await fetch('http://localhost:5000/api/documents/employees/signatures');
    if (res2.ok) {
      const data2 = await res2.json();
      if (data2.success && Array.isArray(data2.employees)) {
        const found = data2.employees.find(e => (e.employee_email || '').trim().toLowerCase() === cleanEmail);
        if (found) return found;
      }
    }
  } catch (e) {}

  try {
    // 3. Fallback to localStorage cache
    const cached = localStorage.getItem('bexsign_employee_signatures_cache');
    if (cached) {
      const list = JSON.parse(cached);
      if (Array.isArray(list)) {
        const found = list.find(e => (e.employee_email || '').trim().toLowerCase() === cleanEmail);
        if (found) return found;
      }
    }
  } catch (e) {}

  return null;
}
