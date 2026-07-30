export function formatPKR(amount) {
  const value = Number(amount || 0);
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(value);
  return `Rs. ${formatted}`;
}

export function formatCurrency(value) {
  return formatPKR(value);
}
