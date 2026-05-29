// ─── Perfil del Cliente / Facturación ───────────────────────────────────────

export interface CustomerProfile {
  id: string;
  name: string;
  rfc: string;
  email: string;
  zipCode: string;
}

// ─── Perfil de Prenda (Definición del producto físico) ──────────────────────

export interface GarmentProfile {
  id: string;
  garmentType: string;    // "Camisa de Vestir", "Polo", "Pantalón", etc.
  color: string;          // "Negro", "Blanco", "Azul Marino", etc.
  size: string;           // "S", "M", "L", "XL", "2XL", etc.
  claveProdServ: string;  // Código SAT del producto (ej: "53101602")
}

// ─── Ítem del Carrito de Orden (Trabajo a realizar sobre una prenda) ────────

export interface OrderCartItem {
  id: string;               // ID único auto-generado (UUID)
  garment: GarmentProfile;  // Datos de la prenda física
  quantity: number;         // Cantidad de prendas a bordar
  designName: string;       // Nombre del ponchado / diseño
  usoCfdi: string;          // Código SAT Uso CFDI (ej: "G03")
  stitchCount?: number;     // Puntadas estimadas (opcional)
  threadColors?: string[];  // Colores de hilo en HSL o Hex
  notes?: string;           // Instrucciones del taller
}

// ─── Estado y Acciones del Store ────────────────────────────────────────────

export interface OrderState {
  customer: CustomerProfile | null;
  items: OrderCartItem[];
}

export interface OrderActions {
  setCustomer: (customer: CustomerProfile | null) => void;
  addItem: (item: Omit<OrderCartItem, "id">) => void;
  removeItem: (itemId: string) => void;
  updateItem: (itemId: string, updates: Partial<OrderCartItem>) => void;
  clearCart: () => void;
}

// Tipo completo expuesto por el Hook de Zustand
export type OrderStore = OrderState & OrderActions;
