export function formatMoney(cents, currency = 'USD') {
  return `${currency} ${(cents / 100).toFixed(2)}`;
}

export function formatDate(iso) {
  const date = new Date(iso);
  return date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

export function createEl(tag, className, children = []) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  children.forEach((child) => {
    if (typeof child === 'string') {
      el.appendChild(document.createTextNode(child));
    } else if (child) {
      el.appendChild(child);
    }
  });
  return el;
}
