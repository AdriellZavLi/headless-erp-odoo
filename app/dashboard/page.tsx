"use client";

import React from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notification, Button, Tag, Skeleton } from "antd";
import { 
  PlayCircleOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined, 
  SyncOutlined,
  DashboardOutlined 
} from "@ant-design/icons";
import DashboardHeader from "@/components/DashboardHeader";

// ─── Tipos ──────────────────────────────────────────────────────────────────
interface ProductionOrder {
  id: number;
  name: string;
  product_id: [number, string];
  qty_producing: number;
  state: string; // 'confirmed', 'progress', 'done'
  date_planned_start: string;
}

// ─── API Fetchers ───────────────────────────────────────────────────────────
const fetchProductionOrders = async (): Promise<ProductionOrder[]> => {
  const res = await fetch("/api/odoo/production");
  if (!res.ok) throw new Error("Error cargando órdenes de producción");
  const data = await res.json();
  return data.data;
};

const updateOrderState = async ({ orderId, action }: { orderId: number; action: string }) => {
  const res = await fetch("/api/odoo/production", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId, action }),
  });
  if (!res.ok) throw new Error("Error actualizando el estado de la orden");
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data;
};

// ─── Componente de Tarjeta (Kanban Card) ────────────────────────────────────
const OrderCard = ({ 
  order, 
  onMove 
}: { 
  order: ProductionOrder; 
  onMove: (id: number, action: string) => void 
}) => {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 mb-3 flex flex-col gap-3">
      <div className="flex justify-between items-start">
        <span className="font-bold text-slate-800 text-sm bg-slate-100 px-2 py-1 rounded-md font-mono">
          {order.name}
        </span>
        <Tag color="purple" className="m-0 font-bold border-none bg-violet-100 text-violet-700">
          {order.qty_producing} pzs
        </Tag>
      </div>
      
      <p className="text-sm font-semibold text-slate-600 line-clamp-2">
        {Array.isArray(order.product_id) ? order.product_id[1] : "Prenda sin diseño"}
      </p>
      
      <div className="text-xs text-slate-400 font-mono">
        Inicio: {new Date(order.date_planned_start).toLocaleString('es-MX', {
          month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'
        })}
      </div>

      {/* Botones de Acción */}
      <div className="mt-2 pt-3 border-t border-slate-100 flex gap-2">
        {order.state === "confirmed" && (
          <Button 
            type="primary" 
            size="small" 
            icon={<PlayCircleOutlined />} 
            className="w-full bg-indigo-600 shadow-sm rounded-lg text-xs font-semibold"
            onClick={() => onMove(order.id, "start_production")}
          >
            Iniciar Prod.
          </Button>
        )}
        {order.state === "progress" && (
          <Button 
            type="primary" 
            size="small" 
            icon={<CheckCircleOutlined />} 
            className="w-full bg-emerald-600 shadow-sm rounded-lg text-xs font-semibold"
            onClick={() => onMove(order.id, "mark_done")}
          >
            Marcar Terminado
          </Button>
        )}
      </div>
    </div>
  );
};

// ─── Dashboard Kanban Principal ─────────────────────────────────────────────
export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [api, contextHolder] = notification.useNotification();

  const { data: orders = [], isLoading, isError } = useQuery({
    queryKey: ["odoo", "production"],
    queryFn: fetchProductionOrders,
    refetchInterval: 15000, // Refrescar cada 15 segundos automáticamente
  });

  const mutation = useMutation({
    mutationFn: updateOrderState,
    onSuccess: () => {
      api.success({
        title: "Estado Actualizado",
        description: "La orden se ha movido exitosamente en Odoo.",
        placement: "bottomRight",
      });
      queryClient.invalidateQueries({ queryKey: ["odoo", "production"] });
    },
    onError: (error: any) => {
      api.error({
        title: "Error de Sincronización",
        description: error.message || "No se pudo actualizar la orden.",
        placement: "bottomRight",
      });
    },
  });

  const handleMoveOrder = (orderId: number, action: string) => {
    mutation.mutate({ orderId, action });
  };

  // Filtrar órdenes por estado
  const pendingOrders = orders.filter(o => o.state === "confirmed");
  const inProgressOrders = orders.filter(o => o.state === "progress");
  const doneOrders = orders.filter(o => o.state === "done");

  return (
    <div className="flex flex-col pb-12 flex-grow">
      {contextHolder}

      <main className="max-w-[1400px] w-full mx-auto px-6 mt-8 flex-grow flex flex-col">
        {/* Cabecera del Dashboard */}
        <section className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 shrink-0">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
              <DashboardOutlined className="text-indigo-600" />
              Tablero de Producción
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Control de órdenes de bordado
            </p>
          </div>
          
          <div className="flex gap-3">
            <Link
              href="/dashboard/nueva-orden"
              className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all duration-150 active:scale-[0.98] shadow-lg shadow-violet-500/10"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v12m6-6H6" />
              </svg>
              Nueva Orden
            </Link>
            <Link
              href="/dashboard/customers"
              className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold px-4 py-2.5 rounded-xl text-sm transition-all shadow-sm"
            >
              Clientes
            </Link>
            <Link
              href="/dashboard/suppliers"
              className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold px-4 py-2.5 rounded-xl text-sm transition-all shadow-sm"
            >
              Proveedores
            </Link>
          </div>
        </section>

        {/* Tablero Kanban */}
        <section className="flex gap-6 overflow-x-auto pb-4 flex-grow">
          {/* Columna: Pendiente */}
          <div className="flex-1 min-w-[320px] bg-slate-100/50 border border-slate-200 rounded-2xl p-4 flex flex-col shadow-inner">
            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="font-bold text-slate-700 flex items-center gap-2">
                <ClockCircleOutlined className="text-amber-500" />
                Pendiente de Asignar
              </h2>
              <Tag className="rounded-full bg-slate-200 text-slate-600 border-none font-bold">
                {pendingOrders.length}
              </Tag>
            </div>
            <div className="flex-grow overflow-y-auto pr-1 custom-scrollbar">
              {isLoading ? (
                <Skeleton active paragraph={{ rows: 2 }} className="bg-white p-4 rounded-xl" />
              ) : pendingOrders.length > 0 ? (
                pendingOrders.map(order => (
                  <OrderCard key={order.id} order={order} onMove={handleMoveOrder} />
                ))
              ) : (
                <div className="h-24 flex items-center justify-center text-slate-400 text-sm font-medium border-2 border-dashed border-slate-200 rounded-xl">
                  No hay órdenes pendientes
                </div>
              )}
            </div>
          </div>

          {/* Columna: En Producción */}
          <div className="flex-1 min-w-[320px] bg-slate-100/50 border border-slate-200 rounded-2xl p-4 flex flex-col shadow-inner">
            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="font-bold text-slate-700 flex items-center gap-2">
                <SyncOutlined spin className="text-indigo-500" />
                En Producción (Bordando)
              </h2>
              <Tag className="rounded-full bg-indigo-100 text-indigo-700 border-none font-bold">
                {inProgressOrders.length}
              </Tag>
            </div>
            <div className="flex-grow overflow-y-auto pr-1 custom-scrollbar">
              {isLoading ? (
                <Skeleton active paragraph={{ rows: 2 }} className="bg-white p-4 rounded-xl" />
              ) : inProgressOrders.length > 0 ? (
                inProgressOrders.map(order => (
                  <OrderCard key={order.id} order={order} onMove={handleMoveOrder} />
                ))
              ) : (
                <div className="h-24 flex items-center justify-center text-slate-400 text-sm font-medium border-2 border-dashed border-slate-200 rounded-xl">
                  Sin máquinas activas
                </div>
              )}
            </div>
          </div>

          {/* Columna: Terminado */}
          <div className="flex-1 min-w-[320px] bg-slate-100/50 border border-slate-200 rounded-2xl p-4 flex flex-col shadow-inner">
            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="font-bold text-slate-700 flex items-center gap-2">
                <CheckCircleOutlined className="text-emerald-500" />
                Terminado / Listo
              </h2>
              <Tag className="rounded-full bg-emerald-100 text-emerald-700 border-none font-bold">
                {doneOrders.length}
              </Tag>
            </div>
            <div className="flex-grow overflow-y-auto pr-1 custom-scrollbar">
              {isLoading ? (
                <Skeleton active paragraph={{ rows: 2 }} className="bg-white p-4 rounded-xl" />
              ) : doneOrders.length > 0 ? (
                doneOrders.map(order => (
                  <OrderCard key={order.id} order={order} onMove={handleMoveOrder} />
                ))
              ) : (
                <div className="h-24 flex items-center justify-center text-slate-400 text-sm font-medium border-2 border-dashed border-slate-200 rounded-xl">
                  No hay órdenes terminadas
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 20px;
        }
      `}} />
    </div>
  );
}
