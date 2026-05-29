import { useState, useEffect } from "react";

/**
 * Hook personalizado para leer estados persistidos de Zustand (LocalStorage) de forma segura.
 * Evita el error clásico de Next.js: "Hydration Mismatch Error" retrasando la lectura del
 * almacenamiento del navegador hasta que el componente se monta en el cliente.
 * 
 * @param store El hook del store de Zustand (ej: useOrderStore)
 * @param selector Función selectora del estado (ej: state => state.items)
 * @returns El estado seleccionado o null si el componente no ha sido montado aún
 */
export function useHydratedStore<T, F>(
  store: (callback: (state: T) => F) => F,
  selector: (state: T) => F
): F | null {
  const [data, setData] = useState<F | null>(null);

  useEffect(() => {
    // Se ejecuta únicamente en el navegador tras el montaje del DOM,
    // garantizando que se cargue la información del LocalStorage de forma segura.
    setData(store(selector));
  }, [store, selector]);

  return data;
}
