import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // 4xx nicht wiederholen - das Ergebnis aendert sich nicht.
        if (error instanceof ApiError && error.problem.status < 500) return false;
        return failureCount < 2;
      },
    },
  },
});
