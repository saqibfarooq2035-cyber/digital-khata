import { useQuery } from '@tanstack/react-query';
import { getSales } from '../api/sales';

export function useSales() {
  return useQuery({ queryKey: ['sales'], queryFn: getSales });
}
