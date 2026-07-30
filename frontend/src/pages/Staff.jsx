import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import api from '../api/axios';
import { SkeletonTableRows } from '../components/ui/Skeleton';
import { formatDate } from '../utils/formatDate';
import { notifySuccess } from '../utils/notify';
import { useAuthContext } from '../context/AuthContext';

const ROLE_OPTIONS = ['Admin', 'Staff'];

const emptyForm = {
  fullName: '',
  username: '',
  password: '',
  role: 'Staff',
};

const fetchStaff = async () => {
  const { data } = await api.get('/staff');
  return data || [];
};

const createStaff = (payload) => api.post('/staff', payload);

const updateStaff = ({ id, payload }) => api.put(`/staff/${id}`, payload);

export default function Staff() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({ defaultValues: emptyForm });

  const { data: staff = [], isLoading } = useQuery({ queryKey: ['staff'], queryFn: fetchStaff });

  const createMutation = useMutation({
    mutationFn: createStaff,
    onSuccess: () => {
      notifySuccess('Staff added!');
      setModalOpen(false);
      reset(emptyForm);
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: updateStaff,
    onSuccess: (_response, variables) => {
      notifySuccess(variables.payload.isActive ? 'Staff activated!' : 'Staff deactivated!');
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
  });

  function openModal() {
    reset(emptyForm);
    setModalOpen(true);
  }

  function onSubmit(values) {
    createMutation.mutate({
      username: values.username,
      password: values.password,
      fullName: values.fullName,
      role: values.role,
    });
  }

  function handleToggleActive(member) {
    toggleMutation.mutate({
      id: member.id,
      payload: { fullName: member.fullName, role: member.role, isActive: !member.isActive },
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Staff Management</h2>
          <p className="text-sm text-slate-500">Admin-only staff controls, roles, and access.</p>
        </div>
        <button onClick={openModal} className="btn btn-primary">
          Add Staff
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="table-container">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {['Name', 'Username', 'Role', 'Status', 'Last Login', 'Actions'].map((header) => (
                  <th key={header} className="px-4 py-3 text-left text-sm font-semibold text-slate-600">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <SkeletonTableRows columns={6} rows={5} />
              ) : staff.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-10 text-center text-sm text-slate-500">No staff members yet.</td>
                </tr>
              ) : (
                staff.map((member) => {
                  const isSelf = member.username === user?.username;
                  return (
                    <tr key={member.id} className="hover:bg-slate-50">
                      <td className="max-w-[160px] truncate px-4 py-3 text-sm font-medium text-slate-900" title={member.fullName}>{member.fullName}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{member.username}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`badge ${member.role === 'Admin' ? 'badge-info' : 'badge-gray'}`}>
                          {member.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`badge ${member.isActive ? 'badge-success' : 'badge-danger'}`}>
                          {member.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">{member.lastLoginAt ? formatDate(member.lastLoginAt) : 'Never'}</td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => handleToggleActive(member)}
                          disabled={isSelf || toggleMutation.isPending}
                          title={isSelf ? "You can't deactivate your own account" : undefined}
                          className={`btn btn-sm ${member.isActive ? 'btn-danger' : 'btn-success'}`}
                        >
                          {member.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Add Staff</h3>
                <p className="text-sm text-slate-500">Create a login for a new team member.</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-sm font-semibold text-slate-500">Close</button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Full Name *</label>
                <input {...register('fullName', { required: 'Full name is required' })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                {errors.fullName && <p className="mt-1 text-xs text-rose-600">{errors.fullName.message}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Username *</label>
                <input {...register('username', { required: 'Username is required' })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                {errors.username && <p className="mt-1 text-xs text-rose-600">{errors.username.message}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Password *</label>
                <input type="password" {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Password must be at least 6 characters' } })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                {errors.password && <p className="mt-1 text-xs text-rose-600">{errors.password.message}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Role</label>
                <select {...register('role')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                <button type="button" onClick={() => setModalOpen(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" disabled={createMutation.isPending} className="btn btn-primary">
                  {createMutation.isPending ? 'Saving...' : 'Save Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
