import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { getWhatsAppStatus, getQRCode, sendSingle, sendBulk, getSendLogs, clearSendLogs, disconnectWhatsApp } from '../api/whatsapp';
import { SkeletonBlock, SkeletonTableRows } from '../components/ui/Skeleton';
import { formatDate } from '../utils/formatDate';
import { notifyError, notifySuccess, notifyWarning } from '../utils/notify';
import * as templates from '../utils/whatsappTemplates';

const TEMPLATE_OPTIONS = [
  { value: 'dueToday', label: 'Due Today' },
  { value: 'dueSoon', label: '3 Days Before' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'paymentReceived', label: 'Payment Received' },
];

const fetchCustomers = async () => {
  const { data } = await api.get('/customers');
  return data || [];
};

const fetchSales = async () => {
  const { data } = await api.get('/sales');
  return data || [];
};

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
  return Math.min(duration, Math.max(0, Math.round(paidViaInstallments / installment)));
}

function formatAmount(value) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(value || 0));
}

function buildTemplateMessage(templateType, entry) {
  if (!entry) return '';
  const name = entry.customer?.fullName || 'Customer';
  const amount = formatAmount(entry.sale?.installmentAmount);
  const remaining = formatAmount(entry.sale?.remainingAmount);
  const date = entry.nextDue ? formatDate(entry.nextDue) : '—';
  const days = entry.daysOverdue ?? 0;

  switch (templateType) {
    case 'dueToday':
      return templates.dueToday(name, amount);
    case 'dueSoon':
      return templates.threeDaysBefore(name, amount, date);
    case 'overdue':
      return templates.overdue(name, amount, days);
    case 'paymentReceived':
      return templates.paymentReceived(name, amount, remaining);
    default:
      return '';
  }
}

export default function WhatsApp() {
  const queryClient = useQueryClient();
  const [sendingGroup, setSendingGroup] = useState(null);

  const [previewTemplate, setPreviewTemplate] = useState('dueToday');
  const [previewCustomerId, setPreviewCustomerId] = useState('');
  const [messageText, setMessageText] = useState('');

  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: fetchCustomers });
  const { data: sales = [], isLoading: salesLoading } = useQuery({ queryKey: ['sales'], queryFn: fetchSales });

  const {
    data: statusData,
    isError: statusError,
  } = useQuery({
    queryKey: ['wa-status'],
    queryFn: () => getWhatsAppStatus().then((res) => res.data),
    refetchInterval: 4000,
    retry: false,
  });

  const connected = statusData?.connected ?? false;

  const { data: qrData, isLoading: qrLoading } = useQuery({
    queryKey: ['wa-qr'],
    queryFn: () => getQRCode().then((res) => res.data),
    refetchInterval: 3000,
    enabled: !connected,
    retry: false,
  });

  const {
    data: logsData,
    isLoading: logsLoading,
    refetch: refetchLogs,
  } = useQuery({
    queryKey: ['wa-logs'],
    queryFn: () => getSendLogs().then((res) => res.data),
    refetchInterval: 10000,
    retry: false,
  });

  const logs = (logsData?.logs || []).slice(0, 50);

  const groups = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueToday = [];
    const dueSoon = [];
    const overdue = [];

    sales.forEach((sale) => {
      if (!sale.remainingAmount || sale.remainingAmount <= 0 || !sale.customer) return;
      const paid = paidInstallments(sale);
      const nextDue = addMonths(sale.firstDueDate, paid);
      nextDue.setHours(0, 0, 0, 0);
      const diffDays = Math.round((nextDue - today) / 86400000);
      const entry = { sale, customer: sale.customer, nextDue, diffDays, daysOverdue: diffDays < 0 ? Math.abs(diffDays) : 0 };

      if (diffDays === 0) dueToday.push(entry);
      else if (diffDays === 3) dueSoon.push(entry);
      else if (diffDays < 0) overdue.push(entry);
    });

    return { dueToday, dueSoon, overdue };
  }, [sales]);

  const previewEntry = useMemo(() => {
    if (!previewCustomerId) return null;
    const customerId = Number(previewCustomerId);
    const withBalance = sales.find((s) => s.customerId === customerId && s.remainingAmount > 0);
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return null;

    if (withBalance) {
      const paid = paidInstallments(withBalance);
      const nextDue = addMonths(withBalance.firstDueDate, paid);
      nextDue.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffDays = Math.round((nextDue - today) / 86400000);
      return { sale: withBalance, customer, nextDue, diffDays, daysOverdue: diffDays < 0 ? Math.abs(diffDays) : 0 };
    }

    return { sale: { installmentAmount: 0, remainingAmount: 0 }, customer, nextDue: null, diffDays: null, daysOverdue: 0 };
  }, [previewCustomerId, sales, customers]);

  useEffect(() => {
    setMessageText(buildTemplateMessage(previewTemplate, previewEntry));
  }, [previewTemplate, previewEntry]);

  const bulkMutation = useMutation({
    mutationFn: ({ customersPayload }) => sendBulk(customersPayload),
    onSuccess: ({ data }) => {
      notifySuccess(`Sent ${data.sent} message${data.sent === 1 ? '' : 's'}${data.failed ? `, ${data.failed} failed` : ''}`);
      refetchLogs();
    },
    onError: (error) => {
      notifyError(error?.response?.data?.error || 'Failed to send WhatsApp messages');
    },
    onSettled: () => setSendingGroup(null),
  });

  const singleMutation = useMutation({
    mutationFn: ({ phone, message, meta }) => sendSingle(phone, message, meta),
    onSuccess: () => {
      notifySuccess('Message sent!');
      refetchLogs();
    },
    onError: (error) => {
      notifyError(error?.response?.data?.error || 'Failed to send message');
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectWhatsApp,
    onSuccess: () => {
      notifySuccess('WhatsApp disconnected');
      queryClient.invalidateQueries({ queryKey: ['wa-status'] });
    },
    onError: () => notifyError('Failed to disconnect WhatsApp'),
  });

  const clearLogsMutation = useMutation({
    mutationFn: clearSendLogs,
    onSuccess: () => {
      notifySuccess('Send log cleared');
      refetchLogs();
    },
    onError: () => notifyError('Failed to clear logs'),
  });

  function handleSendGroup(templateType, group, label) {
    if (!connected) {
      notifyWarning('Connect WhatsApp first by scanning the QR code.');
      return;
    }
    if (group.length === 0) {
      notifyWarning(`No customers ${label.toLowerCase()} right now.`);
      return;
    }

    const customersPayload = group.map((entry) => ({
      phone: entry.customer.phoneNumber,
      message: buildTemplateMessage(templateType, entry),
      customerName: entry.customer.fullName,
      messageType: label,
    }));

    setSendingGroup(templateType);
    bulkMutation.mutate({ customersPayload });
  }

  function handleSendPreview() {
    if (!previewEntry) {
      notifyWarning('Select a customer first.');
      return;
    }
    if (!connected) {
      notifyWarning('Connect WhatsApp first by scanning the QR code.');
      return;
    }
    if (!messageText.trim()) {
      notifyWarning('Message cannot be empty.');
      return;
    }

    singleMutation.mutate({
      phone: previewEntry.customer.phoneNumber,
      message: messageText,
      meta: {
        customerName: previewEntry.customer.fullName,
        messageType: TEMPLATE_OPTIONS.find((t) => t.value === previewTemplate)?.label,
      },
    });
  }

  function handleDisconnect() {
    if (window.confirm('Disconnect WhatsApp? You will need to scan the QR code again to reconnect.')) {
      disconnectMutation.mutate();
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {statusError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            Couldn't reach the WhatsApp service at localhost:3001. Make sure <code>whatsapp-service</code> is running.
          </div>
        ) : connected ? (
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">
                ✅ WhatsApp Connected
              </span>
              <span className="text-sm text-slate-500">+{statusData?.phone || 'unknown number'}</span>
            </div>
            <button
              onClick={handleDisconnect}
              disabled={disconnectMutation.isPending}
              className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {disconnectMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 text-center">
            {qrLoading || !qrData?.qr ? (
              <SkeletonBlock className="h-56 w-56" />
            ) : (
              <img
                src={qrData.qr}
                alt="WhatsApp QR code"
                className="qr-pulse h-56 w-56 rounded-xl border-4 border-cyan-400 p-2"
              />
            )}
            <p className="text-sm text-slate-600">
              Open WhatsApp on your phone → <span className="font-semibold">Linked Devices</span> → Scan QR Code
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3">
        <ActionCard
          icon="📅"
          title="Due Today"
          entries={groups.dueToday}
          loading={salesLoading}
          buttonLabel={(count) => `Send to All Due Today (${count})`}
          buttonClassName="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white"
          pending={sendingGroup === 'dueToday' && bulkMutation.isPending}
          onSend={() => handleSendGroup('dueToday', groups.dueToday, 'Due Today')}
        />
        <ActionCard
          icon="⏰"
          title="Due in 3 Days"
          entries={groups.dueSoon}
          loading={salesLoading}
          buttonLabel={(count) => `Send Reminders (${count})`}
          buttonClassName="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white"
          pending={sendingGroup === 'dueSoon' && bulkMutation.isPending}
          onSend={() => handleSendGroup('dueSoon', groups.dueSoon, 'Due in 3 Days')}
        />
        <ActionCard
          icon="🔴"
          title="Overdue Customers"
          entries={groups.overdue}
          loading={salesLoading}
          showDaysOverdue
          buttonLabel={(count) => `Send Overdue Notice (${count})`}
          buttonClassName="bg-rose-600 text-white"
          pending={sendingGroup === 'overdue' && bulkMutation.isPending}
          onSend={() => handleSendGroup('overdue', groups.overdue, 'Overdue')}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Message Preview</h3>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Template</label>
              <select
                value={previewTemplate}
                onChange={(event) => setPreviewTemplate(event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                {TEMPLATE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Customer</label>
              <select
                value={previewCustomerId}
                onChange={(event) => setPreviewCustomerId(event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Select a customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>{customer.fullName}</option>
                ))}
              </select>
            </div>

            {previewCustomerId && (
              <div className="rounded-2xl bg-emerald-50 p-4">
                <div className="ml-auto max-w-full whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-emerald-500 px-4 py-3 text-sm text-white shadow-sm">
                  {messageText || 'Message preview will appear here.'}
                </div>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Edit Message</label>
              <textarea
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
                rows="8"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                dir="auto"
              />
            </div>

            <button
              onClick={handleSendPreview}
              disabled={!previewCustomerId || singleMutation.isPending}
              className="w-full rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {singleMutation.isPending ? 'Sending...' : 'Send to This Customer'}
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h3 className="text-lg font-semibold text-slate-900">Send Log</h3>
            <div className="flex gap-2">
              <button onClick={() => refetchLogs()} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700">
                Refresh
              </button>
              <button
                onClick={() => clearLogsMutation.mutate()}
                disabled={clearLogsMutation.isPending}
                className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Clear Logs
              </button>
            </div>
          </div>
          <div className="table-container max-h-[520px] overflow-y-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  {['Time', 'Customer', 'Phone', 'Type', 'Status'].map((header) => (
                    <th key={header} className="px-4 py-3 text-left text-sm font-semibold text-slate-600">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {logsLoading ? (
                  <SkeletonTableRows columns={5} rows={6} />
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-10 text-center text-sm text-slate-500">No messages sent yet.</td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-500">{new Date(log.timestamp).toLocaleString('en-GB')}</td>
                      <td className="max-w-[140px] truncate px-4 py-3 text-sm font-medium text-slate-900" title={log.customerName || '—'}>{log.customerName || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{log.phone}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{log.messageType || '—'}</td>
                      <td className="px-4 py-3 text-sm">
                        {log.status === 'sent' ? (
                          <span className="badge badge-success">✅ Sent</span>
                        ) : (
                          <span className="badge badge-danger">❌ Failed</span>
                        )}
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

function ActionCard({ icon, title, entries, loading, showDaysOverdue, buttonLabel, buttonClassName, pending, onSend }) {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">{icon} {title}</h3>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">{entries.length}</span>
      </div>

      <div className="mb-4 flex-1 space-y-2">
        {loading ? (
          <SkeletonBlock className="h-20 w-full" />
        ) : entries.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-500">
            No customers right now.
          </p>
        ) : (
          entries.slice(0, 3).map((entry) => (
            <div key={entry.sale.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <span className="font-medium text-slate-800">{entry.customer.fullName}</span>
              <span className="text-slate-500">
                {formatAmount(entry.sale.installmentAmount)}
                {showDaysOverdue ? ` · ${entry.daysOverdue}d` : ''}
              </span>
            </div>
          ))
        )}
      </div>

      <button
        onClick={onSend}
        disabled={pending}
        className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${buttonClassName}`}
      >
        {pending ? 'Sending...' : buttonLabel(entries.length)}
      </button>
    </div>
  );
}
