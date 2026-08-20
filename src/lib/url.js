// Contacts can have handle_or_url set to a real link (e.g. imported from Find
// Leads) or just a plain "@handle" (typed in manually) — only the former is
// safe to render as a clickable link.
export function isHttpUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim())
}
