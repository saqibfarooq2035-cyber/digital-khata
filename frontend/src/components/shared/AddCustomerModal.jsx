import { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import { notifySuccess } from '../../utils/notify';

const createCustomer = (payload) => api.post('/customers', payload);

export default function AddCustomerModal({ open, onClose, onCreated }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      fullName: '',
      cnic: '',
      phone: '',
      address: '',
      guarantorName: '',
      guarantorPhone: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  const mutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: ({ data }) => {
      notifySuccess('Customer added!');
      queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).toLowerCase().includes('customer') });
      onCreated?.(data);
      onClose();
    },
  });

  if (!open) return null;

  const onSubmit = (values) => {
    mutation.mutate({
      fullName: values.fullName,
      cnic: values.cnic,
      phoneNumber: values.phone,
      address: values.address || '',
      guarantorName: values.guarantorName || undefined,
      guarantorPhone: values.guarantorPhone || undefined,
      notes: values.notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Add New Customer</h3>
            <p className="text-sm text-slate-500">Quickly create a customer without leaving the sale form.</p>
          </div>
          <button onClick={onClose} className="text-sm font-semibold text-slate-500">Close</button>
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
              <label className="mb-1 block text-sm font-medium text-slate-700">Guarantor Name</label>
              <input {...register('guarantorName')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Address</label>
              <textarea {...register('address')} rows="2" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
              <textarea {...register('notes')} rows="2" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button type="button" onClick={onClose} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending} className="btn btn-primary">
              {mutation.isPending ? 'Saving...' : 'Save Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
