import { useQuery } from '@tanstack/react-query';
import { getPendingRequests } from '../api/paymentRequest';

export function usePendingPaymentRequests() {
  return useQuery({
    queryKey: ['payment-requests-pending'],
    queryFn: () => getPendingRequests().then((res) => res.data),
    refetchInterval: 60000,
  });
}
