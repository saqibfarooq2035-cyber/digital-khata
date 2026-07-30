export const PAYMENT_REQUEST_STATUS = {
  Pending: { label: '⏳ زیر غور / Pending Approval', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  Approved: { label: '✅ منظور / Approved', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Rejected: { label: '❌ مسترد / Rejected', className: 'bg-rose-50 text-rose-700 border-rose-200' },
};

export function getPaymentRequestStatusMeta(status) {
  return PAYMENT_REQUEST_STATUS[status] || PAYMENT_REQUEST_STATUS.Pending;
}
