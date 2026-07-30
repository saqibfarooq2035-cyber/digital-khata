import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../api/axios';
import StatCard from '../components/ui/StatCard';
import { SkeletonStatCard } from '../components/ui/Skeleton';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';

const LOG_KEY = 'digital-khata-sms-log';
const TEMPLATE_KEY = 'digital-khata-sms-templates';

const DEFAULT_TEMPLATES = {
  dueSoon: 'Dear [Name], your installment of Rs. [Amount] is due on [Date]. Please pay on time to avoid late fees. - Digital Khata',
  onDue: 'Dear [Name], today is the due date for your installment of Rs. [Amount]. Kindly pay today. - Digital Khata',
  overdue: 'Dear [Name], your installment of Rs. [Amount] was due on [Date] and is now overdue. Please clear your balance as soon as possible. - Digital Khata',
};

const CARD_META = {
  dueSoon: { title: '3 Days Before Due', tone: 'border-amber-200 bg-amber-50 text-amber-700' },
  onDue: { title: 'On Due Date', tone: 'border-sky-200 bg-sky-50 text-sky-700' },
  overdue: { title: 'Overdue Notice', tone: 'border-rose-200 bg-rose-50 text-rose-700' },
};

const fetchCustomers = async () => {
  const { data } = await api.get('/customers');
  return data || [];
};

const fetchSales = async () => {
  const { data } = await api.get('/sales');
  return data || [];
};

const fetchPayments = async () => {
  const { data } = await api.get('/payments');
  return data || [];
};

function loadLog() {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLog(log) {
  localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(0, 50)));
}

function loadTemplates() {
  try {
    return { ...DEFAULT_TEMPLATES, ...JSON.parse(localStorage.getItem(TEMPLATE_KEY) || '{}') };
  } catch {
    return DEFAULT_TEMPLATES;
  }
}

function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
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

function normalizePhone(phone) {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('92')) return digits;
  if (digits.startsWith('0')) return `92${digits.slice(1)}`;
  return `92${digits}`;
}

function fillTemplate(template, entry) {
  return template
    .replaceAll('[Name]', entry.sale.customer?.fullName || 'Customer')
    .replaceAll('[Amount]', formatCurrency(entry.sale.installmentAmount))
    .replaceAll('[Date]', formatDate(entry.nextDue));
}

export default function SMS() {
  const [templates, setTemplates] = useState(loadTemplates);
  const [editingKey, setEditingKey] = useState(null);
  const [draftTemplate, setDraftTemplate] = useState('');
  const [log, setLog] = useState(loadLog);

  const [waQuery, setWaQuery] = useState('');
  const [waOpen, setWaOpen] = useState(false);
  const [waCustomer, setWaCustomer] = useState(null);

  const { data: customers = [], isLoading: customersLoading } = useQuery({ queryKey: ['sms-customers'], queryFn: fetchCustomers });
  const { data: sales = [], isLoading: salesLoading } = useQuery({ queryKey: ['sms-sales'], queryFn: fetchSales });
  const { data: payments = [] } = useQuery({ queryKey: ['sms-payments'], queryFn: fetchPayments });
  const statsLoading = customersLoading || salesLoading;

  const groups = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueSoon = [];
    const onDue = [];
    const overdue = [];

    sales.forEach((sale) => {
      if (!sale.remainingAmount || sale.remainingAmount <= 0) return;
      const paid = paidInstallments(sale);
      const nextDue = addMonths(sale.firstDueDate, paid);
      nextDue.setHours(0, 0, 0, 0);
      const diffDays = Math.round((nextDue - today) / 86400000);
      const entry = { sale, nextDue, diffDays };
      if (diffDays === 3) dueSoon.push(entry);
      else if (diffDays === 0) onDue.push(entry);
      else if (diffDays < 0) overdue.push(entry);
    });

    return { dueSoon, onDue, overdue };
  }, [sales]);

  const filteredWaCustomers = useMemo(() => {
    const q = waQuery.trim().toLowerCase();
    const list = q ? customers.filter((c) => c.fullName?.toLowerCase().includes(q) || c.phoneNumber?.includes(q)) : customers;
    return list.slice(0, 8);
  }, [customers, waQuery]);

  const waSale = waCustomer ? sales.find((s) => s.customerId === waCustomer.id && s.remainingAmount > 0) : null;

  const waMessage = useMemo(() => {
    if (!waCustomer) return '';
    if (waSale) {
      const nextDue = formatDate(addMonths(waSale.firstDueDate, paidInstallments(waSale)));
      const amount = formatCurrency(waSale.installmentAmount);
      const en = `Dear ${waCustomer.fullName}, your installment of ${amount} is due on ${nextDue}. Please pay on time. - Digital Khata`;
      const ur = `پیارے ${waCustomer.fullName}, آپ کی قسط ${amount} کی ادائیگی ${nextDue} کو واجب الادا ہے۔ براہ کرم بروقت ادائیگی کریں۔ - ڈیجیٹل کھاتہ`;
      return `${en}\n\n${ur}`;
    }
    const en = `Dear ${waCustomer.fullName}, thank you for being our valued customer. You currently have no outstanding balance. - Digital Khata`;
    const ur = `پیارے ${waCustomer.fullName}, ہمارے قابل قدر گاہک بننے کا شکریہ۔ اس وقت آپ پر کوئی بقایا رقم نہیں ہے۔ - ڈیجیٹل کھاتہ`;
    return `${en}\n\n${ur}`;
  }, [waCustomer, waSale]);

  function appendLog(entries) {
    const nextLog = [...entries, ...log];
    setLog(nextLog);
    saveLog(nextLog);
  }

  function handleSendAll(key) {
    const group = groups[key];
    if (!group || group.length === 0) {
      toast('No customers in this group right now.', { icon: 'ℹ️' });
      return;
    }
    const now = new Date().toISOString();
    const entries = group.map((entry) => ({
      id: `${Date.now()}-${entry.sale.id}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'SMS',
      category: key,
      customerId: entry.sale.customerId,
      customerName: entry.sale.customer?.fullName || 'Customer',
      message: fillTemplate(templates[key], entry),
      timestamp: now,
      status: 'Sent',
    }));
    appendLog(entries);
    toast.success(`SMS queued for ${group.length} customer${group.length === 1 ? '' : 's'}`);
  }

  function handleSaveTemplate(key) {
    const next = { ...templates, [key]: draftTemplate };
    setTemplates(next);
    localStorage.setItem(TEMPLATE_KEY, JSON.stringify(next));
    setEditingKey(null);
    toast.success('Template updated');
  }

  function handleOpenWhatsApp() {
    if (!waCustomer) return;
    const phone = normalizePhone(waCustomer.phoneNumber);
    if (!phone) {
      toast.error('This customer has no valid phone number');
      return;
    }
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(waMessage)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    appendLog([{
      id: `${Date.now()}-wa-${waCustomer.id}`,
      type: 'WhatsApp',
      category: waSale ? 'reminder' : 'general',
      customerId: waCustomer.id,
      customerName: waCustomer.fullName,
      message: waMessage,
      timestamp: new Date().toISOString(),
      status: 'Sent',
    }]);
  }

  const todayStr = new Date().toDateString();
  const smsToday = log.filter((l) => l.type === 'SMS' && new Date(l.timestamp).toDateString() === todayStr).length;
  const waToday = log.filter((l) => l.type === 'WhatsApp' && new Date(l.timestamp).toDateString() === todayStr).length;
  const overdueNotifiedToday = new Set(
    log.filter((l) => l.category === 'overdue' && new Date(l.timestamp).toDateString() === todayStr).map((l) => l.customerId)
  ).size;
  const notifiedTodayIds = new Set(log.filter((l) => new Date(l.timestamp).toDateString() === todayStr).map((l) => l.customerId));
  const paymentsAfterSmsToday = payments.filter((p) => {
    if (new Date(p.paymentDate).toDateString() !== todayStr) return false;
    const sale = sales.find((s) => s.id === p.saleId);
    return sale && notifiedTodayIds.has(sale.customerId);
  }).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, index) => <SkeletonStatCard key={index} />)
        ) : (
          <>
            <StatCard title="SMS Sent Today" value={smsToday} icon="📩" iconClassName="bg-cyan-100 text-cyan-700" />
            <StatCard title="WhatsApp Sent Today" value={waToday} icon="🟢" iconClassName="bg-emerald-100 text-emerald-700" />
            <StatCard title="Overdue Notified" value={overdueNotifiedToday} icon="⚠️" iconClassName="bg-rose-100 text-rose-700" />
            <StatCard title="Payments After SMS" value={paymentsAfterSmsToday} hint="Collected today" icon="💰" iconClassName="bg-amber-100 text-amber-700" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3">
        {['dueSoon', 'onDue', 'overdue'].map((key) => {
          const meta = CARD_META[key];
          const group = groups[key];
          const isEditing = editingKey === key;
          return (
            <div key={key} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">{meta.title}</h3>
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.tone}`}>{group.length} customers</span>
              </div>
              {isEditing ? (
                <textarea
                  value={draftTemplate}
                  onChange={(event) => setDraftTemplate(event.target.value)}
                  rows="5"
                  className="mb-3 w-full flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              ) : (
                <p className="mb-3 flex-1 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  {templates[key]}
                </p>
              )}
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <button onClick={() => handleSaveTemplate(key)} className="flex-1 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white">
                      Save
                    </button>
                    <button onClick={() => setEditingKey(null)} className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => handleSendAll(key)} className="flex-1 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white">
                      Send to All ({group.length})
                    </button>
                    <button
                      onClick={() => {
                        setEditingKey(key);
                        setDraftTemplate(templates[key]);
                      }}
                      className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
                    >
                      Edit Template
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-1 text-lg font-semibold text-slate-900">WhatsApp One-Click</h3>
          <p className="mb-3 text-sm text-slate-500">Send a bilingual reminder directly over WhatsApp.</p>

          <div className="relative">
            <input
              value={waQuery}
              onChange={(event) => {
                setWaQuery(event.target.value);
                setWaCustomer(null);
                setWaOpen(true);
              }}
              onFocus={() => setWaOpen(true)}
              onBlur={() => window.setTimeout(() => setWaOpen(false), 150)}
              placeholder="Search customer by name or phone"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            {waOpen && (
              <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                {filteredWaCustomers.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-slate-500">No customers found</div>
                ) : (
                  filteredWaCustomers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setWaCustomer(c);
                        setWaQuery(c.fullName);
                        setWaOpen(false);
                      }}
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

          {waCustomer && (
            <>
              <div className="mt-4 rounded-2xl bg-emerald-50 p-4">
                <div className="ml-auto max-w-full whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-emerald-500 px-4 py-3 text-sm text-white shadow-sm">
                  {waMessage}
                </div>
              </div>
              <button
                onClick={handleOpenWhatsApp}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                🟢 Open in WhatsApp
              </button>
            </>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-slate-900">Send Log</h3>
          </div>
          <div className="table-container">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {['Type', 'Customer', 'Message', 'Time', 'Status'].map((header) => (
                    <th key={header} className="px-4 py-3 text-left text-sm font-semibold text-slate-600">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {log.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-10 text-center text-sm text-slate-500">No messages sent yet.</td>
                  </tr>
                ) : (
                  log.slice(0, 10).map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${entry.type === 'WhatsApp' ? 'bg-emerald-100 text-emerald-700' : 'bg-cyan-100 text-cyan-700'}`}>
                          {entry.type}
                        </span>
                      </td>
                      <td className="max-w-[140px] truncate px-4 py-3 text-sm font-medium text-slate-900" title={entry.customerName}>{entry.customerName}</td>
                      <td className="max-w-xs truncate px-4 py-3 text-sm text-slate-500" title={entry.message}>{entry.message}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{new Date(entry.timestamp).toLocaleString('en-GB')}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">{entry.status}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
