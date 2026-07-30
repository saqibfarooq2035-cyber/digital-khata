import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuthContext } from '../../context/AuthContext';
import { formatCurrency } from '../../utils/formatCurrency';
import { notifyError, notifySuccess, notifyWarning } from '../../utils/notify';

const PAYMENT_METHODS = ['Cash', 'Bank', 'EasyPaisa', 'JazzCash'];

const fetchCustomers = async () => {
  const { data } = await api.get('/customers');
  return data || [];
};

const fetchSales = async () => {
  const { data } = await api.get('/sales');
  return data || [];
};

const createPayment = (payload) => api.post('/payments', payload);

function paidInstallments(sale) {
  const duration = sale.durationMonths || 0;
  const installment = sale.installmentAmount || 0;
  if (duration <= 0) return 0;
  if (installment <= 0) return sale.remainingAmount <= 0 ? duration : 0;
  const paidViaInstallments = Math.max(0, (sale.totalPrice - sale.downPayment) - sale.remainingAmount);
  const paid = Math.round(paidViaInstallments / installment);
  return Math.min(duration, Math.max(0, paid));
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function defaultValues() {
  return {
    amountReceived: '',
    paymentType: 'Partial',
    paymentMethod: 'Cash',
    paymentDate: todayIso(),
    notes: '',
  };
}

export default function PaymentModal({ open, onClose, customer = null, sale = null }) {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [customerQuery, setCustomerQuery] = useState('');
  const [customerOpen, setCustomerOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [selectedSaleId, setSelectedSaleId] = useState(null);
  const [completedPayment, setCompletedPayment] = useState(null);

  const needsCustomerPicker = !sale && !customer;

  const { data: customers = [] } = useQuery({
    queryKey: ['payment-modal-customers'],
    queryFn: fetchCustomers,
    enabled: open && needsCustomerPicker,
  });

  const { data: sales = [] } = useQuery({
    queryKey: ['payment-modal-sales'],
    queryFn: fetchSales,
    enabled: open && !sale,
  });

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm({ defaultValues: defaultValues() });

  useEffect(() => {
    if (!open) return;
    setCompletedPayment(null);
    reset(defaultValues());

    if (sale) {
      setSelectedCustomerId(sale.customerId ?? sale.customer?.id ?? null);
      setSelectedSaleId(sale.id);
      setCustomerQuery(sale.customer?.fullName || '');
    } else if (customer) {
      setSelectedCustomerId(customer.id);
      setCustomerQuery(customer.fullName || '');
      setSelectedSaleId(null);
    } else {
      setSelectedCustomerId(null);
      setSelectedSaleId(null);
      setCustomerQuery('');
    }
  }, [open, sale, customer, reset]);

  const customerOutstandingSales = sales.filter((s) => s.customerId === selectedCustomerId && s.remainingAmount > 0);

  useEffect(() => {
    if (sale || !selectedCustomerId || selectedSaleId) return;
    if (customerOutstandingSales.length === 1) setSelectedSaleId(customerOutstandingSales[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales, selectedCustomerId, sale]);

  const activeSale = sale || sales.find((s) => s.id === selectedSaleId) || null;

  const paymentType = watch('paymentType');
  useEffect(() => {
    if (!activeSale) return;
    setValue('amountReceived', paymentType === 'Full' ? activeSale.remainingAmount : activeSale.installmentAmount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentType, activeSale?.id]);

  const filteredCustomers = (() => {
    const q = customerQuery.trim().toLowerCase();
    const list = q
      ? customers.filter((c) => c.fullName?.toLowerCase().includes(q) || c.phoneNumber?.includes(q) || c.cnic?.toLowerCase().includes(q))
      : customers;
    return list.slice(0, 8);
  })();

  const mutation = useMutation({
    mutationFn: createPayment,
    onSuccess: ({ data }) => {
      setCompletedPayment(data);
      queryClient.invalidateQueries({ predicate: (query) => ['payments', 'sales', 'dashboard', 'customers'].some((key) => String(query.queryKey[0]).toLowerCase().includes(key)) });
    },
  });

  if (!open) return null;

  function selectCustomer(c) {
    setSelectedCustomerId(c.id);
    setCustomerQuery(c.fullName);
    setSelectedSaleId(null);
    setCustomerOpen(false);
    if (c.status === 'Overdue') notifyWarning('Customer has overdue payments!');
  }

  function submitPayment(values, print) {
    if (!activeSale) {
      notifyError('Please select a customer and an installment plan');
      return;
    }

    mutation.mutate(
      {
        saleId: activeSale.id,
        installmentNumber: paidInstallments(activeSale) + 1,
        amountReceived: Number(values.amountReceived),
        paymentDate: values.paymentDate,
        paymentType: values.paymentType,
        paymentMethod: values.paymentMethod,
        notes: values.notes || undefined,
        receivedBy: user?.username || 'Staff',
      },
      {
        onSuccess: ({ data }) => {
          notifySuccess('Payment recorded!');
          if (print) {
            onClose();
            navigate(`/receipts?paymentId=${data.id}&print=1`);
          }
        },
      }
    );
  }

  function handleClose() {
    setCompletedPayment(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Record Payment</h3>
            <p className="text-sm text-slate-500">Collect an installment payment for a customer.</p>
          </div>
          <button onClick={handleClose} className="text-sm font-semibold text-slate-500">✕</button>
        </div>

        {completedPayment ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              Payment of <span className="font-semibold">{formatCurrency(completedPayment.amountReceived)}</span> recorded successfully.
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={handleClose} className="btn btn-outline">
                Close
              </button>
              <button
                onClick={() => {
                  const paymentId = completedPayment.id;
                  handleClose();
                  navigate(`/receipts?paymentId=${paymentId}`);
                }}
                className="btn btn-primary"
              >
                View Receipt
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit((values) => submitPayment(values, false))} className="space-y-4">
            {needsCustomerPicker ? (
              <div className="relative">
                <label className="mb-1 block text-sm font-medium text-slate-700">Customer *</label>
                <input
                  value={customerQuery}
                  onChange={(event) => {
                    setCustomerQuery(event.target.value);
                    setCustomerOpen(true);
                  }}
                  onFocus={() => setCustomerOpen(true)}
                  onBlur={() => window.setTimeout(() => setCustomerOpen(false), 150)}
                  placeholder="Search by name, phone, or CNIC"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                {customerOpen && (
                  <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                    {filteredCustomers.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-slate-500">No customers found</div>
                    ) : (
                      filteredCustomers.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => selectCustomer(c)}
                          className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-cyan-50"
                        >
                          <div className="font-medium">{c.fullName}</div>
                          <div className="text-xs text-slate-400">{c.phoneNumber}</div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Customer</label>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {sale?.customer?.fullName || customer?.fullName || 'Selected customer'}
                </div>
              </div>
            )}

            {!sale && selectedCustomerId && customerOutstandingSales.length > 1 && (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Installment Plan *</label>
                <select
                  value={selectedSaleId || ''}
                  onChange={(event) => setSelectedSaleId(Number(event.target.value))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">Choose a plan</option>
                  {customerOutstandingSales.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.product?.name || `Sale #${s.id}`} — {formatCurrency(s.remainingAmount)} remaining
                    </option>
                  ))}
                </select>
              </div>
            )}

            {!sale && selectedCustomerId && customerOutstandingSales.length === 0 && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                This customer has no outstanding installment plans.
              </p>
            )}

            {activeSale && (
              <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-semibold text-cyan-700">Outstanding Balance</span>
                  <span className="text-base font-bold text-cyan-700">{formatCurrency(activeSale.remainingAmount)}</span>
                </div>
                <div className="grid grid-cols-2 gap-y-1 text-slate-600">
                  <span>Total Price</span>
                  <span className="text-right">{formatCurrency(activeSale.totalPrice)}</span>
                  <span>Installment Amount</span>
                  <span className="text-right">{formatCurrency(activeSale.installmentAmount)}</span>
                  <span>Next Installment #</span>
                  <span className="text-right">{paidInstallments(activeSale) + 1}</span>
                </div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Amount Received *</label>
                <input type="number" step="0.01" min="1" {...register('amountReceived', { required: 'Amount is required' })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                {errors.amountReceived && <p className="mt-1 text-xs text-rose-600">{errors.amountReceived.message}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Payment Type</label>
                <select {...register('paymentType')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <option value="Partial">Partial</option>
                  <option value="Full">Full</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Payment Method</label>
                <select {...register('paymentMethod')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Date</label>
                <input type="date" {...register('paymentDate', { required: true })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
              <textarea {...register('notes')} rows="2" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <div className="flex flex-wrap justify-end gap-3">
              <button type="button" onClick={handleClose} className="btn btn-outline">
                Cancel
              </button>
              <button
                type="button"
                disabled={mutation.isPending}
                onClick={handleSubmit((values) => submitPayment(values, true))}
                className="btn btn-outline"
              >
                Record & Print Receipt
              </button>
              <button type="submit" disabled={mutation.isPending} className="btn btn-primary">
                {mutation.isPending ? 'Saving...' : 'Record Payment'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
