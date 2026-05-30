"use client";

import React, { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, Tag, Button, Spin, Empty, Skeleton } from "antd";
import { 
  ArrowLeftOutlined, 
  ScissorOutlined, 
  DownloadOutlined, 
  ClockCircleOutlined,
  PictureOutlined,
  ShoppingOutlined
} from "@ant-design/icons";
import Link from "next/link";

interface OrderLine {
  id: number;
  name: string;
  product_id: [number, string];
  product_uom_qty: number;
  price_unit: number;
}

interface OrderDetail {
  order: {
    id: number;
    name: string;
    state: string;
    date_order: string;
    tag_ids: number[];
    lines: OrderLine[];
  };
  attachments: {
    id: number;
    name: string;
    mimetype: string;
    datas: string; // Base64
  }[];
}

const fetchOrderDetails = async (id: string): Promise<OrderDetail> => {
  const res = await fetch(`/api/odoo/orders/${id}`);
  if (!res.ok) throw new Error("Error cargando detalles de la orden");
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
};

export default function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["odoo", "order", id],
    queryFn: () => fetchOrderDetails(id),
  });

  if (isLoading) {
    return (
      <div className="p-8 max-w-[1000px] mx-auto w-full space-y-8 flex-grow">
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-8 max-w-[1000px] mx-auto flex-grow flex items-center justify-center">
        <Empty 
          description={
            <span className="text-slate-500 font-medium">
              No se pudo cargar la orden. {error?.message}
            </span>
          } 
        />
      </div>
    );
  }

  const { order, attachments } = data;

  const getTagStatus = (tagIds: number[]) => {
    if (tagIds.includes(3)) return <Tag color="green" className="font-bold border-none px-3 py-1">Terminado</Tag>;
    if (tagIds.includes(2)) return <Tag color="blue" className="font-bold border-none px-3 py-1">Bordando</Tag>;
    if (tagIds.includes(1)) return <Tag color="orange" className="font-bold border-none px-3 py-1">Pendiente</Tag>;
    return <Tag className="font-bold border-none px-3 py-1">{order.state}</Tag>;
  };

  const totalItems = order.lines?.reduce((sum, line) => sum + line.product_uom_qty, 0) || 0;

  return (
    <div className="p-8 max-w-[1000px] mx-auto w-full space-y-8 flex-grow">
      {/* Header Bar */}
      <header className="w-full bg-white rounded-2xl p-6 flex items-center justify-between border border-slate-200 shadow-sm">
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-slate-500 hover:text-violet-600 transition-colors duration-200 font-medium text-sm bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 hover:border-violet-200"
          >
            <ArrowLeftOutlined />
            Regresar
          </Link>
          <div className="w-px h-8 bg-slate-200" />
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              <ScissorOutlined className="text-violet-600" />
              Orden {order.name}
            </h1>
          </div>
        </div>
        {getTagStatus(order.tag_ids || [])}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Main Details */}
        <Card className="border-slate-200 shadow-sm rounded-2xl flex flex-col" title={<span className="font-bold text-slate-800">Prendas a Bordar</span>}>
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <span className="text-slate-500 font-medium">Prendas Totales</span>
              <span className="font-bold text-violet-600 text-lg">{totalItems} pzs</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <span className="text-slate-500 font-medium">Fecha de Solicitud</span>
              <span className="font-semibold text-slate-700 flex items-center gap-2">
                <ClockCircleOutlined className="text-amber-500" />
                {new Date(order.date_order || new Date()).toLocaleString('es-MX')}
              </span>
            </div>
            
            <div className="mt-4">
              <h3 className="font-bold text-slate-700 mb-3 text-sm uppercase tracking-wider">Desglose de Líneas</h3>
              {order.lines && order.lines.length > 0 ? (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                  {order.lines.map(line => (
                    <div key={line.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 text-sm">
                          {Array.isArray(line.product_id) ? line.product_id[1] : 'Producto'}
                        </span>
                        <span className="text-xs text-slate-500 line-clamp-1" title={line.name}>
                          {line.name}
                        </span>
                      </div>
                      <Tag color="purple" className="m-0 font-bold border-none bg-violet-100 text-violet-700 shrink-0">
                        {line.product_uom_qty} pzs
                      </Tag>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty description="No hay líneas en la orden" />
              )}
            </div>
          </div>
        </Card>

        {/* Attachments */}
        <Card className="border-slate-200 shadow-sm rounded-2xl" title={<span className="font-bold text-slate-800">Archivos Adjuntos</span>}>
          {attachments.length > 0 ? (
            <div className="space-y-4">
              {attachments.map((att) => (
                <div key={att.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-100 text-violet-600 rounded-lg flex items-center justify-center text-lg shadow-inner">
                      <PictureOutlined />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm truncate max-w-[150px]">{att.name}</p>
                      <p className="text-xs text-slate-500 uppercase">{att.mimetype}</p>
                    </div>
                  </div>
                  <a 
                    href={`data:${att.mimetype};base64,${att.datas}`} 
                    download={att.name}
                  >
                    <Button 
                      type="primary" 
                      icon={<DownloadOutlined />} 
                      className="bg-violet-600 hover:!bg-violet-500 shadow-md rounded-lg font-semibold"
                    >
                      Descargar
                    </Button>
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <Empty 
              image={Empty.PRESENTED_IMAGE_SIMPLE} 
              description={<span className="text-slate-500 text-sm">No hay logos ni diseños adjuntos</span>}
            />
          )}
        </Card>
      </div>
    </div>
  );
}
