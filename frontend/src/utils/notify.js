import toast from 'react-hot-toast';

export function notifySuccess(message) {
  return toast.success(message);
}

export function notifyError(message) {
  return toast.error(message || 'Failed to load data');
}

export function notifyWarning(message) {
  return toast(message, {
    icon: '⚠️',
    style: {
      background: '#FEF3C7',
      color: '#92400E',
      border: '1px solid #FDE68A',
    },
  });
}
