import { create } from "zustand";
import { persist } from "zustand/middleware";
import { OrderStore, OrderCartItem, CustomerProfile } from "@/types/order";

export const useOrderStore = create<OrderStore>()(
  persist(
    (set) => ({
      // 1. Estado Inicial
      customer: null,
      items: [],

      // 2. Acciones del Carrito

      // Configura el cliente de la orden activa
      setCustomer: (customer: CustomerProfile | null) => set({ customer }),

      // Añade una prenda o maquila al carrito, generando un UUID seguro
      addItem: (item: Omit<OrderCartItem, "id">) =>
        set((state) => {
          const uniqueId =
            typeof window !== "undefined" && window.crypto?.randomUUID
              ? window.crypto.randomUUID()
              : `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

          const newItem: OrderCartItem = {
            ...item,
            id: uniqueId,
          };

          return {
            items: [...state.items, newItem],
          };
        }),

      // Elimina una prenda del carrito
      removeItem: (itemId: string) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== itemId),
        })),

      // Actualiza campos específicos de una prenda del carrito (ej: cantidad, notas)
      updateItem: (itemId: string, updates: Partial<OrderCartItem>) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === itemId ? { ...item, ...updates } : item
          ),
        })),

      // Limpia la orden actual completa (usado al enviar a Odoo)
      clearCart: () => set({ customer: null, items: [] }),
    }),
    {
      name: "masbordados-order-store", // Nombre del namespace en el LocalStorage
    }
  )
);

// Exponer en window durante desarrollo para pruebas manuales en consola
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  (window as any).useOrderStore = useOrderStore;
}
