import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos de validez para los datos en caché
      gcTime: 1000 * 60 * 60 * 24, // 24 horas antes de limpiar la caché
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});
