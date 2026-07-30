import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import PaymentModal from '../components/shared/PaymentModal';
import { SkeletonStatCard, SkeletonTableRows } from '../components/ui/Skeleton';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';

const PAGE_SIZE = 10;

const fetchPayments = async () => {
  const { data } = await api.get('/payments');
  return data || [];
};

const fetchSales = async () => {
  const { data } = await api.get('/sales');
  return data || [];
};

const typeTone = {
  Full: 'badge-success',
  Partial: 'badge-warning',
};

function isSameDay(a, b) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function isSameMonth(a, b) {
  const dateA = new Date(a);
  const dateB = new Date(b);
  return dateA.getFullYear() === dateB.getFullYear() && dateA.getMonth() === dateB.getMonth();
}

export default function Payments() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: payments = [], isLoading: paymentsLoading } = useQuery({ queryKey: ['payments'], queryFn: fetchPayments });
  const { data: sales = [] } = useQuery({ queryKey: ['sales'], queryFn: fetchSales });

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, dateFrom, dateTo]);

  const joinedPayments = useMemo(() => {
    return payments.map((payment) => {
      const sale = sales.find((s) => s.id === payment.saleId);
      return { ...payment, sale };
    });
  }, [payments, sales]);

  const filteredPayments = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return joinedPayments.filter((payment) => {
      if (q) {
        const matches =
          payment.sale?.customer?.fullName?.toLowerCase().includes(q) ||
          payment.notes?.toLowerCase().includes(q) ||
          payment.receivedBy?.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (dateFrom && new Date(payment.paymentDate) < new Date(dateFrom)) return false;
      if (dateTo && new Date(payment.paymentDate) > new Date(`${dateTo}T23:59:59`)) return false;
      return true;
    });
  }, [joinedPayments, debouncedSearch, dateFrom, dateTo]);

  const todayTotal = useMemo(
    () => payments.filter((p) => isSameDay(p.paymentDate, new Date())).reduce((sum, p) => sum + Number(p.amountReceived || 0), 0),
    [payments]
  );

  const monthTotal = useMemo(
    () => payments.filter((p) => isSameMonth(p.paymentDate, new Date())).reduce((sum, p) => sum + Number(p.amountReceived || 0), 0),
    [payments]
  );

  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visiblePayments = filteredPayments.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Payments</h2>
          <p className="text-sm text-slate-500">Track collections and record new installment payments.</p>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by customer or notes"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none"
          />
          <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none" />
          <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none" />
          <button onClick={() => setModalOpen(true)} className="btn btn-primary shrink-0">
            Record Payment
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2">
        {paymentsLoading ? (
          <>
            <SkeletonStatCard />
            <SkeletonStatCard />
          </>
        ) : (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Today's Collection</p>
              <p className="mt-2 text-2xl font-semibold text-cyan-700">{formatCurrency(todayTotal)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">This Month's Collection</p>
              <p className="mt-2 text-2xl font-semibold text-cyan-700">{formatCurrency(monthTotal)}</p>
            </div>
          </>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="table-container">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {['Date', 'Customer', 'Amount', 'Type', 'Method', 'Installment #', 'Notes', 'Receipt'].map((header) => (
                  <th
                    key={header}
                    className={`px-4 py-3 text-left text-sm font-semibold text-slate-600 ${header === 'Notes' ? 'hidden md:table-cell' : ''}`}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paymentsLoading ? (
                <SkeletonTableRows columns={8} rows={6} />
              ) : visiblePayments.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-10 text-center text-sm text-slate-500">No payments found for the chosen filters.</td>
                </tr>
              ) : (
                visiblePayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-700">{formatDate(payment.paymentDate)}</td>
                    <td className="max-w-[160px] truncate px-4 py-3 text-sm font-medium text-slate-900" title={payment.sale?.customer?.fullName || '—'}>{payment.sale?.customer?.fullName || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{formatCurrency(payment.amountReceived)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`badge ${typeTone[payment.paymentType] || 'badge-gray'}`}>
                        {payment.paymentType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{payment.paymentMethod}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{payment.installmentNumber}</td>
                    <td className="hidden px-4 py-3 text-sm text-slate-500 md:table-cell">{payment.notes || '—'}</td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => navigate(`/receipts?paymentId=${payment.id}`)}
                        title="View receipt"
                        className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-cyan-50 hover:text-cyan-700"
                      >
                        🧾
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="text-sm text-slate-500">
          Showing {filteredPayments.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredPayments.length)} of {filteredPayments.length} payments
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

      <PaymentModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
