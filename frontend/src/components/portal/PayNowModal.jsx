import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getShopAccounts, submitPaymentRequest } from '../../api/paymentRequest';
import ImageUpload from '../ui/ImageUpload';
import { SkeletonListRows } from '../ui/Skeleton';
import { formatCurrency } from '../../utils/formatCurrency';
import { notifyError } from '../../utils/notify';

const ACCOUNT_ICON = {
  EasyPaisa: '📱',
  JazzCash: '📱',
  'Bank Transfer': '🏦',
};

function AccountCard({ account, onSelect }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="font-semibold text-slate-900">
        {ACCOUNT_ICON[account.accountType] || '💳'} {account.accountType === 'Bank Transfer' && account.bankName ? `Bank Transfer (${account.bankName})` : account.accountType}
      </p>
      <div className="mt-2 space-y-0.5 text-sm text-slate-600">
        <p>Account: {account.accountTitle}</p>
        {account.iban && <p>IBAN: {account.iban}</p>}
        {account.accountNumber && <p>Number: {account.accountNumber}</p>}
        {account.instructions && <p className="text-xs text-slate-400">{account.instructions}</p>}
      </div>
      <button
        onClick={() => onSelect(account)}
        className="mt-3 w-full rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white"
      >
        Select This Method
      </button>
    </div>
  );
}

export default function PayNowModal({ installmentNumber, amount, onClose, onSuccess }) {
  const [step, setStep] = useState('select'); // select | form | success
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [transactionId, setTransactionId] = useState('');
  const [amountPaid, setAmountPaid] = useState(amount);
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState(null);

  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ['shop-accounts'],
    queryFn: () => getShopAccounts().then((res) => res.data),
    enabled: step === 'select',
  });

  const mutation = useMutation({
    mutationFn: (formData) => submitPaymentRequest(formData),
    onSuccess: () => {
      setStep('success');
      onSuccess?.();
    },
    onError: (error) => {
      notifyError(error?.response?.data?.message || 'Unable to submit payment request');
    },
  });

  function handleSubmit() {
    if (!transactionId.trim()) {
      notifyError('Transaction ID / Reference Number is required');
      return;
    }
    if (!file) {
      notifyError('Please upload a receipt / screenshot');
      return;
    }
    if (!amountPaid || Number(amountPaid) <= 0) {
      notifyError('Please enter a valid amount');
      return;
    }

    const formData = new FormData();
    formData.append('installmentNumber', installmentNumber);
    formData.append('amount', amountPaid);
    formData.append('paymentMethod', selectedAccount.accountType);
    formData.append('transactionId', transactionId.trim());
    if (notes.trim()) formData.append('notes', notes.trim());
    formData.append('receiptImage', file);

    mutation.mutate(formData);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        {step !== 'success' && (
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900" dir="auto">💳 قسط ادا کریں (Pay Installment)</h3>
              <p className="text-sm text-slate-500">Installment #{installmentNumber} — {formatCurrency(amount)}</p>
            </div>
            <button onClick={onClose} className="text-sm font-semibold text-slate-500">✕</button>
          </div>
        )}

        {step === 'select' && (
          accountsLoading ? (
            <SkeletonListRows rows={3} />
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  onSelect={(acc) => {
                    setSelectedAccount(acc);
                    setStep('form');
                  }}
                />
              ))}
            </div>
          )
        )}

        {step === 'form' && selectedAccount && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-cyan-50 p-4 text-sm text-cyan-800" dir="auto">
              <p className="font-semibold">✅ آپ نے {selectedAccount.accountType} منتخب کیا</p>
              <p className="mt-1">Send {formatCurrency(amount)} to: {selectedAccount.accountNumber || selectedAccount.iban}</p>
              <p className="mt-1 text-xs text-cyan-600">After sending, fill the form below</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Transaction ID / Reference Number *</label>
              <input
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="e.g. TXN123456789"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-slate-400" dir="auto">یہ نمبر آپ کی {selectedAccount.accountType} receipt پر ہے</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Upload Receipt / Screenshot *</label>
              <ImageUpload label="Upload Receipt" maxSizeMB={5} onImageSelect={setFile} />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Amount Paid (Rs.) *</label>
              <input
                type="number"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="کوئی نوٹ لکھیں... e.g. Paid from wife's account"
                dir="auto"
                rows={2}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={mutation.isPending}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 px-4 py-3 text-sm font-semibold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-60"
            >
              {mutation.isPending ? 'Submitting...' : '📤 درخواست جمع کریں (Submit Request)'}
            </button>
          </div>
        )}

        {step === 'success' && (
          <div className="space-y-4 rounded-2xl bg-emerald-50 p-5 text-center">
            <p className="text-2xl">✅</p>
            <p className="font-semibold text-emerald-700" dir="auto">درخواست جمع ہو گئی! (Request Submitted!)</p>
            <p className="text-sm text-emerald-700" dir="auto">آپ کی ادائیگی کی درخواست ایڈمن کو بھیج دی گئی ہے۔</p>
            <p className="text-sm text-emerald-700">Your payment request has been sent to admin.</p>
            <p className="text-sm text-emerald-700">Admin will verify and approve within a few hours.</p>
            <p className="text-sm text-emerald-700" dir="auto">آپ کو WhatsApp پر اطلاع ملے گی۔</p>
            <button onClick={onClose} className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
