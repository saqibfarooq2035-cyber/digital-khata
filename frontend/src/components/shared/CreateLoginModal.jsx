import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCustomerLogin } from '../../api/customerPortal';
import { notifyError, notifySuccess } from '../../utils/notify';

export function generatePassword() {
  return `DK@${Math.floor(1000 + Math.random() * 9000)}`;
}

export default function CreateLoginModal({ open, onClose, customer }) {
  const queryClient = useQueryClient();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);

  useEffect(() => {
    if (open && customer) {
      setUsername(customer.phoneNumber || '');
      setPassword(generatePassword());
      setSendWhatsApp(true);
      setShowPassword(false);
    }
  }, [open, customer]);

  const mutation = useMutation({
    mutationFn: () => createCustomerLogin(customer.id, { username, password, sendWhatsApp }),
    onSuccess: ({ data }) => {
      if (sendWhatsApp && data.whatsAppSent) {
        notifySuccess('✅ Login created! Customer notified via WhatsApp');
      } else if (sendWhatsApp && !data.whatsAppSent) {
        notifySuccess('✅ Login created! (WhatsApp message could not be delivered)');
      } else {
        notifySuccess('✅ Login created!');
      }
      queryClient.invalidateQueries({ queryKey: ['login-status', customer.id] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      onClose();
    },
    onError: (error) => {
      notifyError(error?.response?.data?.message || 'Unable to create login');
    },
  });

  if (!open || !customer) return null;

  const message = `السلام علیکم ${customer.fullName} صاحب!\n\nآپ کا Digital Khata account بن گیا ہے۔\n\nYour Digital Khata login:\nUsername: ${username}\nPassword: ${password}\n\nLogin here: http://localhost:5173/login\n\n— Digital Khata 📒`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">🔐 Create Customer Login — {customer.fullName}</h3>
          <button onClick={onClose} className="text-sm font-semibold text-slate-500">✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Username (Login ID)</label>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="03XXXXXXXXX"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-10 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-sm"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                👁️
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={sendWhatsApp} onChange={(event) => setSendWhatsApp(event.target.checked)} />
            📲 Send login details to customer via WhatsApp
          </label>

          {sendWhatsApp && (
            <div className="rounded-2xl bg-emerald-50 p-4">
              <div className="ml-auto max-w-full whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-emerald-500 px-4 py-3 text-sm text-white shadow-sm">
                {message}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="btn btn-outline">
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !username.trim() || !password.trim()}
            className="btn btn-primary"
          >
            {mutation.isPending ? 'Creating...' : '✅ Create Login'}
          </button>
        </div>
      </div>
    </div>
  );
}
