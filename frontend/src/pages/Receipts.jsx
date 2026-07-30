import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import ReceiptCard from '../components/shared/ReceiptCard';
import { SkeletonListRows } from '../components/ui/Skeleton';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';
import { notifyError } from '../utils/notify';

const fetchPayments = async () => {
  const { data } = await api.get('/payments');
  return data || [];
};

const fetchSales = async () => {
  const { data } = await api.get('/sales');
  return data || [];
};

const fetchCustomers = async () => {
  const { data } = await api.get('/customers');
  return data || [];
};

function printNow() {
  window.print();
}

export default function Receipts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedPaymentId, setSelectedPaymentId] = useState(() => {
    const raw = searchParams.get('paymentId');
    return raw ? Number(raw) : null;
  });
  const [statementQuery, setStatementQuery] = useState('');
  const [statementOpen, setStatementOpen] = useState(false);
  const [statementCustomer, setStatementCustomer] = useState(null);
  const [statementData, setStatementData] = useState(null);
  const hasAutoPrinted = useRef(false);

  const { data: payments = [], isLoading: paymentsLoading } = useQuery({ queryKey: ['payments'], queryFn: fetchPayments });
  const { data: sales = [] } = useQuery({ queryKey: ['sales'], queryFn: fetchSales });
  const { data: customers = [] } = useQuery({ queryKey: ['customers-for-statement'], queryFn: fetchCustomers });

  const joinedPayments = useMemo(
    () => payments.map((payment) => ({ ...payment, sale: sales.find((s) => s.id === payment.saleId) })),
    [payments, sales]
  );

  const recentReceipts = joinedPayments.slice(0, 10);
  const selectedPayment = joinedPayments.find((p) => p.id === selectedPaymentId) || joinedPayments[0] || null;
  const selectedSale = selectedPayment?.sale;

  useEffect(() => {
    const raw = searchParams.get('paymentId');
    if (raw) setSelectedPaymentId(Number(raw));
  }, [searchParams]);

  useEffect(() => {
    if (hasAutoPrinted.current) return;
    if (searchParams.get('print') === '1' && selectedPayment) {
      hasAutoPrinted.current = true;
      window.setTimeout(printNow, 300);
      const next = new URLSearchParams(searchParams);
      next.delete('print');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, selectedPayment, setSearchParams]);

  const filteredStatementCustomers = useMemo(() => {
    const q = statementQuery.trim().toLowerCase();
    const list = q ? customers.filter((c) => c.fullName?.toLowerCase().includes(q) || c.phoneNumber?.includes(q)) : customers;
    return list.slice(0, 8);
  }, [customers, statementQuery]);

  const ledgerMutation = useMutation({
    mutationFn: (customerId) => api.get(`/customers/${customerId}/ledger`).then((res) => res.data),
    onSuccess: (data) => setStatementData(data),
    onError: () => notifyError('Unable to load customer statement'),
  });

  function handleDownloadPdf() {
    toast('Choose "Save as PDF" as the destination in the print dialog', { icon: '🖨️' });
    printNow();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className={`space-y-4 ${statementData ? 'hidden' : ''}`}>
        <div id="printable-receipt" className="print-surface">
          {paymentsLoading ? (
            <div className="h-96 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
          ) : (
            <ReceiptCard payment={selectedPayment} sale={selectedSale} />
          )}
        </div>
        {selectedPayment && (
          <div className="flex gap-3 print:hidden">
            <button onClick={printNow} className="flex-1 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white">
              Print Receipt
            </button>
            <button onClick={handleDownloadPdf} className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
              Download PDF
            </button>
          </div>
        )}
      </div>

      <div className="space-y-6 print:hidden">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-slate-900">Recent Receipts</h3>
          </div>
          <div className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto">
            {paymentsLoading ? (
              <SkeletonListRows rows={4} />
            ) : recentReceipts.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-slate-500">No receipts yet.</p>
            ) : (
              recentReceipts.map((payment) => (
                <button
                  key={payment.id}
                  onClick={() => setSelectedPaymentId(payment.id)}
                  className={`block w-full px-6 py-3 text-left hover:bg-slate-50 ${selectedPayment?.id === payment.id ? 'bg-cyan-50' : ''}`}
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-900">{payment.sale?.customer?.fullName || '—'}</span>
                    <span className="font-semibold text-cyan-700">{formatCurrency(payment.amountReceived)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                    <span>#{String(payment.id).padStart(6, '0')}</span>
                    <span>{formatDate(payment.paymentDate)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-1 text-lg font-semibold text-slate-900">Customer Statement</h3>
          <p className="mb-3 text-sm text-slate-500">Generate a full ledger statement for a customer.</p>
          <div className="relative">
            <input
              value={statementQuery}
              onChange={(event) => {
                setStatementQuery(event.target.value);
                setStatementCustomer(null);
                setStatementOpen(true);
              }}
              onFocus={() => setStatementOpen(true)}
              onBlur={() => window.setTimeout(() => setStatementOpen(false), 150)}
              placeholder="Search customer by name or phone"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            {statementOpen && (
              <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                {filteredStatementCustomers.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-slate-500">No customers found</div>
                ) : (
                  filteredStatementCustomers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setStatementCustomer(c);
                        setStatementQuery(c.fullName);
                        setStatementOpen(false);
                      }}
                      className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-cyan-50"
                    >
                      {c.fullName}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <button
            disabled={!statementCustomer || ledgerMutation.isPending}
            onClick={() => statementCustomer && ledgerMutation.mutate(statementCustomer.id)}
            className="mt-3 w-full rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {ledgerMutation.isPending ? 'Generating...' : 'Generate Statement'}
          </button>
        </div>
      </div>

      {statementData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 print:bg-transparent">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl print-surface">
            <div className="mb-4 flex items-center justify-between print:hidden">
              <h3 className="text-xl font-semibold text-slate-900">Customer Statement</h3>
              <button onClick={() => setStatementData(null)} className="text-sm font-semibold text-slate-500">Close</button>
            </div>
            <div id="printable-statement">
              <div className="mb-4 text-center">
                <h2 className="text-xl font-bold text-cyan-700">Digital Khata</h2>
                <p className="text-sm text-slate-500">Customer Statement</p>
              </div>
              <div className="mb-4 rounded-xl border border-slate-200 p-4 text-sm">
                <p className="font-semibold text-slate-900">{statementData.customer?.fullName}</p>
                <p className="text-slate-500">{statementData.customer?.phoneNumber}</p>
                <p className="text-slate-500">{statementData.customer?.address}</p>
              </div>
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead>
                  <tr>
                    {['Sale', 'Total', 'Remaining', 'Status'].map((header) => (
                      <th key={header} className="px-3 py-2 text-left font-semibold text-slate-600">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(statementData.sales || []).map((s) => (
                    <tr key={s.id}>
                      <td className="px-3 py-2">#{s.id}</td>
                      <td className="px-3 py-2">{formatCurrency(s.totalPrice)}</td>
                      <td className="px-3 py-2">{formatCurrency(s.remainingAmount)}</td>
                      <td className="px-3 py-2">{s.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 flex items-center justify-between rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm font-semibold text-cyan-700">
                <span>Total Outstanding Balance</span>
                <span>{formatCurrency(statementData.balance)}</span>
              </div>
            </div>
            <div className="mt-4 flex gap-3 print:hidden">
              <button onClick={printNow} className="flex-1 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white">
                Print Statement
              </button>
              <button onClick={() => setStatementData(null)} className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
