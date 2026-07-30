import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import AddCustomerModal from '../components/shared/AddCustomerModal';
import InstallmentCalculator from '../components/shared/InstallmentCalculator';
import { SkeletonTableRows } from '../components/ui/Skeleton';
import { formatCurrency } from '../utils/formatCurrency';
import { notifySuccess, notifyWarning } from '../utils/notify';

const PAYMENT_METHODS = ['Cash', 'Bank', 'EasyPaisa', 'JazzCash'];

const fetchCustomers = async () => {
  const { data } = await api.get('/customers');
  return data || [];
};

const fetchProducts = async () => {
  const { data } = await api.get('/products');
  return data || [];
};

const fetchRecentSales = async () => {
  const { data } = await api.get('/sales', { params: { limit: 10 } });
  return data || [];
};

const createSale = (payload) => api.post('/sales', payload);

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function defaultFormValues() {
  return {
    customerId: '',
    productId: '',
    totalPrice: '',
    downPayment: 0,
    durationMonths: 1,
    firstDueDate: todayIso(),
    paymentMethod: 'Cash',
    notes: '',
  };
}

function paidInstallments(sale) {
  const duration = sale.durationMonths || 0;
  const installment = sale.installmentAmount || 0;
  if (duration <= 0) return 0;
  if (installment <= 0) return sale.remainingAmount <= 0 ? duration : 0;
  const paidViaInstallments = Math.max(0, (sale.totalPrice - sale.downPayment) - sale.remainingAmount);
  const paid = Math.round(paidViaInstallments / installment);
  return Math.min(duration, Math.max(0, paid));
}

export default function Sales() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [customerQuery, setCustomerQuery] = useState('');
  const [customerOpen, setCustomerOpen] = useState(false);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);

  const [productQuery, setProductQuery] = useState('');
  const [productOpen, setProductOpen] = useState(false);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm({
    defaultValues: defaultFormValues(),
  });

  const { data: customers = [] } = useQuery({ queryKey: ['sales-customers'], queryFn: fetchCustomers });
  const { data: products = [] } = useQuery({ queryKey: ['sales-products'], queryFn: fetchProducts });
  const { data: recentSales = [], isLoading: salesLoading } = useQuery({ queryKey: ['sales', 'recent'], queryFn: fetchRecentSales });

  useEffect(() => {
    const productId = searchParams.get('productId');
    if (!productId || products.length === 0) return;
    const product = products.find((p) => String(p.id) === productId);
    if (product) selectProduct(product);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, products]);

  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    const list = q
      ? customers.filter((c) => c.fullName?.toLowerCase().includes(q) || c.phoneNumber?.includes(q) || c.cnic?.toLowerCase().includes(q))
      : customers;
    return list.slice(0, 8);
  }, [customers, customerQuery]);

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    const list = q ? products.filter((p) => p.name?.toLowerCase().includes(q)) : products;
    return list.slice(0, 8);
  }, [products, productQuery]);

  const totalPrice = watch('totalPrice');
  const downPayment = watch('downPayment');
  const durationMonths = watch('durationMonths');

  function selectCustomer(customer) {
    setValue('customerId', customer.id, { shouldValidate: true });
    setCustomerQuery(customer.fullName);
    setCustomerOpen(false);
    if (customer.status === 'Overdue') notifyWarning('Customer has overdue payments!');
  }

  function selectProduct(product) {
    setValue('productId', product.id, { shouldValidate: true });
    setValue('totalPrice', product.salePrice);
    setProductQuery(product.name);
    setProductOpen(false);
  }

  function handleCustomerCreated(customer) {
    selectCustomer(customer);
  }

  const mutation = useMutation({
    mutationFn: createSale,
    onSuccess: () => {
      notifySuccess('Sale confirmed!');
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      reset(defaultFormValues());
      setCustomerQuery('');
      setProductQuery('');
    },
  });

  const onSubmit = (values) => {
    const remaining = Math.max(0, Number(values.totalPrice || 0) - Number(values.downPayment || 0));
    const duration = Number(values.durationMonths || 0);
    const monthly = duration > 0 ? remaining / duration : remaining;

    mutation.mutate({
      customerId: Number(values.customerId),
      productId: Number(values.productId),
      totalPrice: Number(values.totalPrice),
      downPayment: Number(values.downPayment || 0),
      remainingAmount: remaining,
      installmentAmount: Math.round(monthly),
      durationMonths: duration,
      firstDueDate: values.firstDueDate,
      paymentMethod: values.paymentMethod,
      status: 'Active',
      notes: values.notes || undefined,
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">New Installment Sale</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="relative">
              <label className="mb-1 block text-sm font-medium text-slate-700">Customer *</label>
              <input
                value={customerQuery}
                onChange={(event) => {
                  setCustomerQuery(event.target.value);
                  setValue('customerId', '');
                  setCustomerOpen(true);
                }}
                onFocus={() => setCustomerOpen(true)}
                onBlur={() => window.setTimeout(() => setCustomerOpen(false), 150)}
                placeholder="Search by name, phone, or CNIC"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <input type="hidden" {...register('customerId', { required: 'Please select a customer' })} />
              {errors.customerId && <p className="mt-1 text-xs text-rose-600">{errors.customerId.message}</p>}
              {customerOpen && (
                <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                  <div className="max-h-56 overflow-y-auto">
                    {filteredCustomers.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-slate-500">No customers found</div>
                    ) : (
                      filteredCustomers.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => selectCustomer(customer)}
                          className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-cyan-50"
                        >
                          <div className="font-medium">{customer.fullName}</div>
                          <div className="text-xs text-slate-400">{customer.phoneNumber}</div>
                        </button>
                      ))
                    )}
                  </div>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setAddCustomerOpen(true);
                      setCustomerOpen(false);
                    }}
                    className="block w-full border-t border-slate-100 px-3 py-2 text-left text-sm font-semibold text-cyan-700 hover:bg-cyan-50"
                  >
                    + Add New Customer
                  </button>
                </div>
              )}
            </div>

            <div className="relative">
              <label className="mb-1 block text-sm font-medium text-slate-700">Product *</label>
              <input
                value={productQuery}
                onChange={(event) => {
                  setProductQuery(event.target.value);
                  setValue('productId', '');
                  setProductOpen(true);
                }}
                onFocus={() => setProductOpen(true)}
                onBlur={() => window.setTimeout(() => setProductOpen(false), 150)}
                placeholder="Search by product name"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <input type="hidden" {...register('productId', { required: 'Please select a product' })} />
              {errors.productId && <p className="mt-1 text-xs text-rose-600">{errors.productId.message}</p>}
              {productOpen && (
                <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                  {filteredProducts.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-slate-500">No products found</div>
                  ) : (
                    filteredProducts.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectProduct(product)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-700 hover:bg-cyan-50"
                      >
                        <span className="font-medium">{product.name}</span>
                        <span className="text-xs text-slate-400">{formatCurrency(product.salePrice)}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Sale Price *</label>
                <input type="number" step="0.01" min="0" {...register('totalPrice', { required: 'Sale price is required' })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                {errors.totalPrice && <p className="mt-1 text-xs text-rose-600">{errors.totalPrice.message}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Down Payment</label>
                <input type="number" step="0.01" min="0" {...register('downPayment')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Duration (Months) *</label>
                <input type="number" min="1" {...register('durationMonths', { required: 'Duration is required', min: 1 })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                {errors.durationMonths && <p className="mt-1 text-xs text-rose-600">Duration must be at least 1 month</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">First Due Date *</label>
                <input type="date" {...register('firstDueDate', { required: 'First due date is required' })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                {errors.firstDueDate && <p className="mt-1 text-xs text-rose-600">{errors.firstDueDate.message}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Payment Method</label>
                <select {...register('paymentMethod')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
              <textarea {...register('notes')} rows="2" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={mutation.isPending} className="btn btn-primary btn-lg">
                {mutation.isPending ? 'Saving...' : 'Confirm Sale'}
              </button>
            </div>
          </form>
        </div>

        <InstallmentCalculator totalPrice={totalPrice} downPayment={downPayment} durationMonths={durationMonths} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900">Recent Sales</h3>
        </div>
        <div className="table-container">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {['Customer', 'Product', 'Plan', 'Progress'].map((header) => (
                  <th key={header} className="px-4 py-3 text-left text-sm font-semibold text-slate-600">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {salesLoading ? (
                <SkeletonTableRows columns={4} rows={5} />
              ) : recentSales.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-4 py-10 text-center text-sm text-slate-500">No sales recorded yet.</td>
                </tr>
              ) : (
                recentSales.slice(0, 10).map((sale) => {
                  const paid = paidInstallments(sale);
                  const complete = paid >= sale.durationMonths && sale.durationMonths > 0;
                  return (
                    <tr key={sale.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">{sale.customer?.fullName || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{sale.product?.name || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {formatCurrency(sale.installmentAmount)} × {sale.durationMonths} {sale.durationMonths === 1 ? 'month' : 'months'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${complete ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {paid}/{sale.durationMonths} paid
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddCustomerModal open={addCustomerOpen} onClose={() => setAddCustomerOpen(false)} onCreated={handleCustomerCreated} />
    </div>
  );
}
