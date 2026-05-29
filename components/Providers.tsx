"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
// Importar el store para que el módulo se ejecute en el cliente
// (necesario para que el código de exposición en window funcione en desarrollo)
import "@/store/useOrderStore";

export default function Providers({ children }: { children: React.ReactNode }) {
  // Inicializamos el QueryClient dentro de un useState
  // para evitar que se comparta la caché de consultas entre diferentes peticiones SSR
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutos estándar
            refetchOnWindowFocus: false, // Evita refetch molesto al cambiar de ventana
            retry: 1, // Reintento máximo de 1 vez para evitar saturación
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
