import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { createCustomerLogin, getLoginStatus, removeCustomerLogin, resetCustomerPassword } from '../api/customerPortal';
import { usePendingPaymentRequests } from '../hooks/usePendingPaymentRequests';
import PaymentModal from '../components/shared/PaymentModal';
import CreateLoginModal, { generatePassword } from '../components/shared/CreateLoginModal';
import { SkeletonTableRows } from '../components/ui/Skeleton';
import { useAuthContext } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';
import { notifyError, notifySuccess, notifyWarning } from '../utils/notify';

const PAGE_SIZE = 10;
const STATUS_OPTIONS = ['All', 'Active', 'Overdue', 'Cleared'];

const statusStyles = {
  Overdue: 'badge-danger',
  Active: 'badge-warning',
  Cleared: 'badge-success',
};

const fetchCustomers = async ({ queryKey }) => {
  const [, search = '', status = 'All'] = queryKey;
  const params = { search: search || undefined, status: status === 'All' ? undefined : status.toLowerCase() };
  const { data } = await api.get('/customers', { params });
  return data || [];
};

function PortalStatusCell({ customer, canManage, onCreateLogin, onResetPassword, onRemoveLogin }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['login-status', customer.id],
    queryFn: () => getLoginStatus(customer.id).then((res) => res.data),
  });

  if (isLoading) {
    return <div className="h-6 w-24 animate-pulse rounded-full bg-slate-100" />;
  }

  if (!data?.hasLogin) {
    return (
      <button
        onClick={() => onCreateLogin(customer)}
        className="btn btn-outline btn-sm"
      >
        ➕ Create Login
      </button>
    );
  }

  return (
    <div className="relative inline-block text-left">
      <div className="flex items-center gap-1">
        <span
          title={`Username: ${data.username}`}
          className="badge badge-success"
        >
          ✅ Active
        </span>
        {canManage && (
          <button
            onClick={() => setMenuOpen((value) => !value)}
            onBlur={() => window.setTimeout(() => setMenuOpen(false), 150)}
            className="rounded-lg px-1.5 py-1 text-slate-500 hover:bg-slate-100"
          >
            ⋮
          </button>
        )}
      </div>
      {menuOpen && (
        <div className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          <button
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setMenuOpen(false);
              onResetPassword(customer);
            }}
            className="block w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            🔑 Reset Password
          </button>
          <button
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setMenuOpen(false);
              onRemoveLogin(customer);
            }}
            className="block w-full px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50"
          >
            🗑️ Remove Login
          </button>
        </div>
      )}
    </div>
  );
}

export default function Customers() {
  const { role } = useAuthContext();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [photoPreview, setPhotoPreview] = useState({ customerPhoto: '', cnicFront: '', cnicBack: '' });
  const [loginModalCustomer, setLoginModalCustomer] = useState(null);
  const [resetPasswordCustomer, setResetPasswordCustomer] = useState(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      fullName: '',
      cnic: '',
      phone: '',
      alternatePhone: '',
      address: '',
      guarantorName: '',
      guarantorPhone: '',
      notes: '',
      createLogin: false,
      loginUsername: '',
      loginPassword: '',
      loginSendWhatsApp: true,
    },
  });

  const createLoginToggle = watch('createLogin');
  const phoneValue = watch('phone');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status]);

  useEffect(() => {
    if (createLoginToggle) {
      setValue('loginUsername', phoneValue || '');
      setValue('loginPassword', generatePassword());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createLoginToggle]);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers', debouncedSearch, status],
    queryFn: fetchCustomers,
  });

  const { data: pendingRequests = [] } = usePendingPaymentRequests();
  const pendingCountByCustomer = useMemo(() => {
    const map = {};
    for (const request of pendingRequests) {
      map[request.customerId] = (map[request.customerId] || 0) + 1;
    }
    return map;
  }, [pendingRequests]);

  const mutation = useMutation({
    mutationFn: async (values) => {
      const { createLogin, loginUsername, loginPassword, loginSendWhatsApp, ...customerPayload } = values;
      const { data: customer } = await api.post('/customers', customerPayload);

      let loginCreated = false;
      if (createLogin) {
        try {
          await createCustomerLogin(customer.id, {
            username: loginUsername || customer.phoneNumber,
            password: loginPassword,
            sendWhatsApp: loginSendWhatsApp,
          });
          loginCreated = true;
        } catch (error) {
          notifyError(error?.response?.data?.message || 'Customer added, but the portal login could not be created.');
        }
      }

      return { customer, loginCreated };
    },
    onSuccess: ({ loginCreated }) => {
      notifySuccess(loginCreated ? 'Customer added! Login created.' : 'Customer added!');
      setModalOpen(false);
      reset();
      setPhotoPreview({ customerPhoto: '', cnicFront: '', cnicBack: '' });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'login-status' });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: () => resetCustomerPassword(resetPasswordCustomer.id, resetPasswordValue),
    onSuccess: () => {
      notifySuccess('Password reset successfully');
      setResetPasswordCustomer(null);
      setResetPasswordValue('');
    },
  });

  const removeLoginMutation = useMutation({
    mutationFn: (customer) => removeCustomerLogin(customer.id),
    onSuccess: (_response, customer) => {
      notifySuccess('Login removed');
      queryClient.invalidateQueries({ queryKey: ['login-status', customer.id] });
    },
  });

  function handleRemoveLogin(customer) {
    if (window.confirm(`Remove portal login for ${customer.fullName}? They will no longer be able to access their customer portal.`)) {
      removeLoginMutation.mutate(customer);
    }
  }

  const totalPages = Math.max(1, Math.ceil(customers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleCustomers = customers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const renderPreview = (file, key) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview((prev) => ({ ...prev, [key]: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = (values) => {
    if (values.createLogin && (!values.loginUsername?.trim() || !values.loginPassword?.trim())) {
      notifyError('Please provide a username and password for the portal login, or turn off Portal Access.');
      return;
    }

    mutation.mutate({
      fullName: values.fullName,
      cnic: values.cnic,
      phoneNumber: values.phone,
      alternatePhone: values.alternatePhone || undefined,
      address: values.address,
      guarantorName: values.guarantorName || undefined,
      guarantorPhone: values.guarantorPhone || undefined,
      notes: values.notes || undefined,
      createLogin: values.createLogin,
      loginUsername: values.loginUsername,
      loginPassword: values.loginPassword,
      loginSendWhatsApp: values.loginSendWhatsApp,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Customers</h2>
          <p className="text-sm text-slate-500">Manage customer accounts, balances, and collection follow-ups.</p>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name / CNIC / phone"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none ring-0 md:w-auto"
          />
          <div className="flex gap-2">
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none md:flex-none"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <button onClick={() => setModalOpen(true)} className="btn btn-primary shrink-0">
              Add Customer
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="table-container">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {['Customer', 'CNIC', 'Phone', 'Address', 'Total Sale', 'Total Paid', 'Remaining Balance', 'Status', 'Portal Access', 'Actions'].map((header) => (
                  <th
                    key={header}
                    className={`px-4 py-3 text-left text-sm font-semibold text-slate-600 ${header === 'Address' ? 'hidden md:table-cell' : ''}`}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <SkeletonTableRows columns={10} rows={6} />
              ) : visibleCustomers.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-4 py-10 text-center text-sm text-slate-500">
                    No customers found for the chosen filters.
                  </td>
                </tr>
              ) : (
                visibleCustomers.map((customer) => {
                  const statusKey = customer.status || 'Active';
                  return (
                    <tr key={customer.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-700">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-100 font-semibold text-cyan-700">
                            {customer.fullName?.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'C'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="max-w-[140px] truncate font-semibold text-slate-900" title={customer.fullName}>{customer.fullName}</span>
                              {pendingCountByCustomer[customer.id] > 0 && (
                                <button
                                  onClick={() => navigate(`/payment-requests?customerId=${customer.id}`)}
                                  className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700"
                                  title="View pending payment requests"
                                >
                                  ⏳ {pendingCountByCustomer[customer.id]} Pending
                                </button>
                              )}
                            </div>
                            <div className="truncate text-xs text-slate-500">Added {formatDate(customer.createdAt)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{customer.cnic}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{customer.phoneNumber}</td>
                      <td className="hidden px-4 py-3 text-sm text-slate-700 md:table-cell">{customer.address || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{formatCurrency(customer.totalSale || 0)}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{formatCurrency(customer.totalPaid || 0)}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{formatCurrency(customer.remainingBalance || 0)}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        <span className={`badge ${statusStyles[statusKey] || 'badge-gray'}`}>
                          {statusKey}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        <PortalStatusCell
                          customer={customer}
                          canManage={role === 'Admin'}
                          onCreateLogin={setLoginModalCustomer}
                          onResetPassword={(c) => {
                            setResetPasswordCustomer(c);
                            setResetPasswordValue(generatePassword());
                          }}
                          onRemoveLogin={handleRemoveLogin}
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => navigate(`/customers/${customer.id}/ledger`)} className="btn btn-outline btn-sm">
                            Khata
                          </button>
                          <button
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setPaymentOpen(true);
                              if (statusKey === 'Overdue') notifyWarning('Customer has overdue payments!');
                            }}
                            className="btn btn-primary btn-sm"
                          >
                            Pay
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="text-sm text-slate-500">
          Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, customers.length)} of {customers.length} customers
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1} className="btn btn-outline btn-sm">
            Prev
          </button>
          <span className="text-sm text-slate-700">{currentPage} / {totalPages}</span>
          <button onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={currentPage === totalPages} className="btn btn-outline btn-sm">
            Next
          </button>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Add Customer</h3>
                <p className="text-sm text-slate-500">Capture the core customer details for ledger tracking.</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-sm font-semibold text-slate-500">Close</button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Full Name *</label>
                  <input {...register('fullName', { required: 'Full name is required' })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                  {errors.fullName && <p className="mt-1 text-xs text-rose-600">{errors.fullName.message}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">CNIC *</label>
                  <input {...register('cnic', { required: 'CNIC is required' })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                  {errors.cnic && <p className="mt-1 text-xs text-rose-600">{errors.cnic.message}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Phone *</label>
                  <input {...register('phone', { required: 'Phone is required' })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                  {errors.phone && <p className="mt-1 text-xs text-rose-600">{errors.phone.message}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Alternate Phone</label>
                  <input {...register('alternatePhone')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Address</label>
                  <textarea {...register('address')} rows="3" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Guarantor Name</label>
                  <input {...register('guarantorName')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Guarantor Phone</label>
                  <input {...register('guarantorPhone')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Customer Photo</label>
                  <input type="file" accept="image/*" onChange={(event) => renderPreview(event.target.files?.[0], 'customerPhoto')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                  {photoPreview.customerPhoto && <img src={photoPreview.customerPhoto} alt="Customer preview" className="mt-2 h-20 w-20 rounded-lg object-cover" />}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">CNIC Front Photo</label>
                  <input type="file" accept="image/*" onChange={(event) => renderPreview(event.target.files?.[0], 'cnicFront')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                  {photoPreview.cnicFront && <img src={photoPreview.cnicFront} alt="CNIC front preview" className="mt-2 h-20 w-20 rounded-lg object-cover" />}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">CNIC Back Photo</label>
                  <input type="file" accept="image/*" onChange={(event) => renderPreview(event.target.files?.[0], 'cnicBack')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                  {photoPreview.cnicBack && <img src={photoPreview.cnicBack} alt="CNIC back preview" className="mt-2 h-20 w-20 rounded-lg object-cover" />}
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
                  <textarea {...register('notes')} rows="3" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <p className="mb-3 text-sm font-semibold text-slate-900">🔐 Portal Access (Optional)</p>
                <label className="mb-3 flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" {...register('createLogin')} />
                  Create login account for this customer
                </label>

                {createLoginToggle && (
                  <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Username</label>
                      <input {...register('loginUsername')} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
                      <input {...register('loginPassword')} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2">
                      <input type="checkbox" {...register('loginSendWhatsApp')} />
                      📲 Send login details via WhatsApp
                    </label>
                    <p className="text-xs text-slate-500 md:col-span-2">
                      This creates the login account automatically when the customer is added — saves extra steps.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                <button type="button" onClick={() => setModalOpen(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" disabled={mutation.isPending} className="btn btn-primary">
                  {mutation.isPending ? 'Saving...' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <CreateLoginModal open={!!loginModalCustomer} onClose={() => setLoginModalCustomer(null)} customer={loginModalCustomer} />

      {resetPasswordCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-1 text-lg font-semibold text-slate-900">🔑 Reset Password</h3>
            <p className="mb-4 text-sm text-slate-500">{resetPasswordCustomer.fullName}'s portal login</p>
            <label className="mb-1 block text-sm font-medium text-slate-700">New Password</label>
            <div className="flex gap-2">
              <input
                value={resetPasswordValue}
                onChange={(event) => setResetPasswordValue(event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => setResetPasswordValue(generatePassword())}
                className="btn btn-outline btn-sm shrink-0"
              >
                Generate
              </button>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setResetPasswordCustomer(null);
                  setResetPasswordValue('');
                }}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                onClick={() => resetPasswordMutation.mutate()}
                disabled={!resetPasswordValue.trim() || resetPasswordMutation.isPending}
                className="btn btn-primary"
              >
                {resetPasswordMutation.isPending ? 'Saving...' : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      <PaymentModal open={paymentOpen} onClose={() => setPaymentOpen(false)} customer={selectedCustomer} />
    </div>
  );
}
