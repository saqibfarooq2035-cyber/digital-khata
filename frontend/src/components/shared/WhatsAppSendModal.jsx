import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getWhatsAppStatus, sendSingle } from '../../api/whatsapp';
import { notifyError, notifySuccess, notifyWarning } from '../../utils/notify';
import { overdue as overdueTemplate } from '../../utils/whatsappTemplates';

function formatAmount(value) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(value || 0));
}

export default function WhatsAppSendModal({ open, onClose, customer }) {
  const [message, setMessage] = useState('');

  const { data: statusData } = useQuery({
    queryKey: ['wa-status'],
    queryFn: () => getWhatsAppStatus().then((res) => res.data),
    enabled: open,
    retry: false,
  });

  const connected = statusData?.connected ?? false;

  useEffect(() => {
    if (!open || !customer) return;
    const name = customer.customerName || customer.name || customer.fullName || 'Customer';
    const amount = formatAmount(customer.installmentAmount || customer.remainingAmount);
    const days = customer.daysOverdue ?? 0;
    setMessage(overdueTemplate(name, amount, days));
  }, [open, customer]);

  const mutation = useMutation({
    mutationFn: () =>
      sendSingle(customer.phoneNumber, message, {
        customerName: customer.customerName || customer.name || customer.fullName,
        messageType: 'Overdue',
      }),
    onSuccess: () => {
      notifySuccess('WhatsApp message sent!');
      onClose();
    },
    onError: (error) => {
      notifyError(error?.response?.data?.error || 'Failed to send WhatsApp message');
    },
  });

  if (!open || !customer) return null;

  function handleSend() {
    if (!customer.phoneNumber) {
      notifyWarning('This customer has no phone number on file.');
      return;
    }
    if (!connected) {
      notifyWarning('Connect WhatsApp first from the WhatsApp page.');
      return;
    }
    mutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Send WhatsApp Reminder</h3>
            <p className="text-sm text-slate-500">
              {customer.customerName || customer.name} · {customer.phoneNumber || 'no phone on file'}
            </p>
          </div>
          <button onClick={onClose} className="text-sm font-semibold text-slate-500">✕</button>
        </div>

        {!connected && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            WhatsApp isn't connected. Visit the WhatsApp page to scan the QR code first.
          </div>
        )}

        <div className="mb-4 rounded-2xl bg-emerald-50 p-4">
          <div className="ml-auto max-w-full whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-emerald-500 px-4 py-3 text-sm text-white shadow-sm">
            {message}
          </div>
        </div>

        <label className="mb-1 block text-sm font-medium text-slate-700">Edit Message</label>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows="8"
          className="mb-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          dir="auto"
        />

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn btn-outline">
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={mutation.isPending}
            className="btn btn-success"
          >
            {mutation.isPending ? 'Sending...' : '💬 Send WhatsApp'}
          </button>
        </div>
      </div>
    </div>
  );
}
