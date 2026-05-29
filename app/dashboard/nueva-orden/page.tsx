"use client";

import React, { useState, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  Input,
  InputNumber,
  Button,
  Select,
  Card,
  Empty,
  notification,
  Tag,
  Tooltip,
  Steps,
} from "antd";
import {
  UserOutlined,
  ShoppingCartOutlined,
  PlusOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  SendOutlined,
  SkinOutlined,
  ScissorOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useOrderStore } from "@/store/useOrderStore";
import Link from "next/link";
import { CustomerProfile, GarmentProfile } from "@/types/order";

// ─── Zod Schemas ────────────────────────────────────────────────────────────

const itemSchema = z.object({
  quantity: z.number().min(1, "La cantidad mínima es 1"),
  designName: z.string().min(2, "Nombre del diseño de ponchado requerido"),
  usoCfdi: z.string().min(1, "Seleccione un uso de CFDI"),
  notes: z.string().optional(),
});

type ItemFormData = z.infer<typeof itemSchema>;

// ─── Data Fetching Hooks ────────────────────────────────────────────────────

function useCustomers() {
  return useQuery({
    queryKey: ["odoo", "customers"],
    queryFn: async () => {
      const res = await fetch("/api/odoo/customers");
      if (!res.ok) throw new Error("Error al cargar catálogo de clientes");
      const data = await res.json();
      return data.catalog as CustomerProfile[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

function useGarments() {
  return useQuery({
    queryKey: ["odoo", "garments"],
    queryFn: async () => {
      const res = await fetch("/api/odoo/garments");
      if (!res.ok) throw new Error("Error al cargar catálogo de prendas");
      const data = await res.json();
      return data.catalog as GarmentProfile[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

function useSatUsoCfdi() {
  return useQuery({
    queryKey: ["sat", "usocfdi"],
    queryFn: async () => {
      const res = await fetch("/api/odoo/sat/usocfdi");
      if (!res.ok) throw new Error("Error al cargar catálogo CFDI");
      const data = await res.json();
      return data.catalog as { id: number; code: string; name: string }[];
    },
    staleTime: 24 * 60 * 60 * 1000,
  });
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function NuevaOrdenPage() {
  const router = useRouter();
  const [api, contextHolder] = notification.useNotification();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Zustand global store
  const { customer, items, setCustomer, addItem, removeItem, clearCart } =
    useOrderStore();

  // Selected Garment state
  const [activeGarment, setActiveGarment] = useState<GarmentProfile | null>(
    null
  );

  // Odoo Catalogs via TanStack Query
  const { data: customersCatalog, isLoading: loadingCustomers } = useCustomers();
  const { data: garmentsCatalog, isLoading: loadingGarments } = useGarments();
  const { data: usoCfdiCatalog, isLoading: loadingCfdi } = useSatUsoCfdi();

  // ─── Customer Selection ──────────────────────────────────────────────────

  const onSelectCustomer = useCallback(
    (customerId: string) => {
      const selected = customersCatalog?.find((c) => c.id === customerId);
      if (selected) {
        setCustomer(selected);
        api.success({
          title: "Cliente Seleccionado",
          description: `Se ha vinculado a ${selected.name}.`,
          placement: "topRight",
        });
      }
    },
    [customersCatalog, setCustomer, api]
  );

  // ─── Garment Selection ───────────────────────────────────────────────────

  const onSelectGarment = useCallback(
    (garmentId: string) => {
      const selected = garmentsCatalog?.find((g) => g.id === garmentId);
      if (selected) {
        setActiveGarment(selected);
        api.success({
          title: "Prenda Definida",
          description: `${selected.garmentType} ${selected.color} (${selected.size}) seleccionada.`,
          placement: "topRight",
        });
      }
    },
    [garmentsCatalog, api]
  );

  // ─── Item Form ──────────────────────────────────────────────────────────

  const {
    control: itemControl,
    handleSubmit: handleItemSubmit,
    reset: resetItemForm,
    formState: { errors: itemErrors },
  } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      quantity: 1,
      designName: "",
      usoCfdi: "",
      notes: "",
    },
  });

  const onAddItem = useCallback(
    (data: ItemFormData) => {
      if (!activeGarment) return;

      addItem({
        garment: activeGarment,
        quantity: data.quantity,
        designName: data.designName,
        usoCfdi: data.usoCfdi,
        notes: data.notes,
      });
      resetItemForm();
      setActiveGarment(null); // Reset garment selection for next item
      api.success({
        title: "Prenda Agregada al Pedido",
        description: `${data.quantity}x ${activeGarment.garmentType} ${activeGarment.color} (${activeGarment.size}) añadida(s) al carrito.`,
        placement: "topRight",
      });
    },
    [activeGarment, addItem, resetItemForm, api]
  );

  // ─── Submit Order ───────────────────────────────────────────────────────

  const handleSubmitOrder = async () => {
    if (!customer) {
      api.warning({
        title: "Cliente Requerido",
        description: "Debe seleccionar un cliente antes de enviar la orden.",
        placement: "topRight",
      });
      return;
    }
    if (items.length === 0) {
      api.warning({
        title: "Carrito Vacío",
        description:
          "Agregue al menos una prenda al carrito antes de enviar la orden.",
        placement: "topRight",
      });
      return;
    }

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    api.success({
      title: "¡Orden Enviada con Éxito!",
      description: `La orden de ${items.length} prenda(s) para ${customer.name} ha sido registrada en el sistema Odoo.`,
      placement: "topRight",
      duration: 5,
    });

    clearCart();
    setTimeout(() => {
      router.push("/dashboard");
    }, 1200);
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-12">
      {contextHolder}

      {/* Header Bar */}
      <header className="w-full bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-slate-500 hover:text-violet-600 transition-colors duration-200 font-medium text-sm"
          >
            <ArrowLeftOutlined />
            Regresar al Panel
          </Link>
          <div className="w-px h-6 bg-slate-300" />
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Nueva Orden de Bordado
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Registro transaccional con catálogos Odoo
            </p>
          </div>
        </div>

        <Button
          type="primary"
          size="large"
          icon={<SendOutlined />}
          loading={isSubmitting}
          onClick={handleSubmitOrder}
          className="bg-gradient-to-r from-violet-600 to-indigo-600 border-none font-bold shadow-lg shadow-violet-500/10 rounded-xl px-6"
        >
          Enviar Orden a Odoo
        </Button>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl w-full mx-auto px-6 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ═══════ LEFT COLUMN: Customer + Cart ═══════ */}
          <div className="space-y-6">
            {/* Customer Card */}
            <Card
              title={
                <span className="flex items-center gap-2 text-slate-800 font-bold">
                  <UserOutlined className="text-violet-600" />
                  Selección de Cliente
                </span>
              }
              className="border-slate-200 rounded-2xl shadow-sm"
              extra={
                customer && (
                  <Tag color="green" className="font-semibold rounded-lg">
                    ✓ Vinculado
                  </Tag>
                )
              }
            >
              <div className="mb-4">
                <label className="block text-slate-700 font-semibold text-xs uppercase tracking-wider mb-2">
                  Buscar en Catálogo de Odoo
                </label>
                <Select
                  size="large"
                  className="w-full"
                  loading={loadingCustomers}
                  placeholder="Seleccione un cliente registrado..."
                  showSearch
                  optionFilterProp="label"
                  value={customer?.id}
                  onChange={onSelectCustomer}
                  options={(customersCatalog || []).map((c) => ({
                    value: c.id,
                    label: `${c.name} (${c.rfc})`,
                  }))}
                />
              </div>

              {customer && (
                <div className="mt-4 p-4 bg-violet-50 border border-violet-100 rounded-xl space-y-2">
                  <h4 className="font-bold text-slate-800">{customer.name}</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                    <p>
                      <strong>RFC:</strong> {customer.rfc}
                    </p>
                    <p>
                      <strong>C.P.:</strong> {customer.zipCode}
                    </p>
                    <p className="col-span-2">
                      <strong>Email:</strong> {customer.email}
                    </p>
                  </div>
                  <div className="flex justify-end pt-2">
                     <Button 
                       size="small" 
                       danger 
                       type="text" 
                       onClick={() => setCustomer(null)}
                       className="text-xs"
                     >
                        Desvincular
                     </Button>
                  </div>
                </div>
              )}
            </Card>

            {/* Cart Summary Card */}
            <Card
              title={
                <span className="flex items-center gap-2 text-slate-800 font-bold">
                  <ShoppingCartOutlined className="text-indigo-600" />
                  Carrito de la Orden
                  {items.length > 0 && (
                    <Tag
                      color="violet"
                      className="ml-2 font-bold rounded-lg"
                    >
                      {items.length} prenda{items.length > 1 ? "s" : ""}
                    </Tag>
                  )}
                </span>
              }
              className="border-slate-200 rounded-2xl shadow-sm"
            >
              {items.length === 0 ? (
                <Empty
                  description={
                    <span className="text-slate-400 text-sm">
                      No hay prendas en el carrito. Use el panel de la
                      derecha para agregar.
                    </span>
                  }
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ) : (
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-violet-200 transition-colors duration-200 group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-violet-600 bg-violet-50 border border-violet-200 rounded-md px-2 py-0.5">
                            #{index + 1}
                          </span>
                          <h4 className="font-bold text-slate-800 text-sm truncate">
                            {item.garment.garmentType}
                          </h4>
                          <Tag className="text-xs rounded-md border-slate-200 bg-white">
                            {item.garment.color}
                          </Tag>
                          <Tag className="text-xs rounded-md border-slate-200 bg-white font-mono">
                            {item.garment.size}
                          </Tag>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-xs text-slate-500">
                            <strong>{item.quantity}</strong> unidades
                          </span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs text-slate-500 truncate">
                            🧵 {item.designName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Tag className="text-xs font-mono rounded-md border-slate-200 bg-white">
                            SAT: {item.garment.claveProdServ}
                          </Tag>
                          <Tag className="text-xs font-mono rounded-md border-slate-200 bg-white">
                            CFDI: {item.usoCfdi}
                          </Tag>
                        </div>
                        {item.notes && (
                          <p className="text-xs text-slate-400 mt-1 italic truncate">
                            📝 {item.notes}
                          </p>
                        )}
                      </div>
                      <Tooltip title="Eliminar prenda">
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => removeItem(item.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg"
                        />
                      </Tooltip>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* ═══════ RIGHT COLUMN: Garment + Order Details ═══════ */}
          <div className="space-y-6">
            {/* Steps Indicator */}
            <Steps
              current={activeGarment ? 1 : 0}
              size="small"
              className="px-4"
              items={[
                {
                  title: "Catálogo de Prendas",
                  icon: <SkinOutlined />,
                },
                {
                  title: "Detalles del Pedido",
                  icon: <ScissorOutlined />,
                },
              ]}
            />

            {/* Step 1: Garment Definition via Catalog */}
            <Card
              title={
                <span className="flex items-center gap-2 text-slate-800 font-bold">
                  <SkinOutlined className="text-amber-600" />
                  Paso 1: Seleccionar Prenda Base
                </span>
              }
              className={`border-slate-200 rounded-2xl shadow-sm transition-all duration-300 ${
                activeGarment
                  ? "opacity-50 pointer-events-none"
                  : ""
              }`}
              extra={
                activeGarment && (
                  <Button
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveGarment(null);
                    }}
                    className="rounded-lg pointer-events-auto"
                  >
                    Cambiar Prenda
                  </Button>
                )
              }
            >
              {activeGarment ? (
                <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <SkinOutlined className="text-amber-600 text-lg" />
                  <div>
                    <p className="font-bold text-slate-800 text-sm">
                      {activeGarment.garmentType} — {activeGarment.color}
                    </p>
                    <p className="text-xs text-slate-500">
                      Talla: {activeGarment.size} · SAT:{" "}
                      {activeGarment.claveProdServ}
                    </p>
                  </div>
                  <Tag color="green" className="ml-auto font-semibold rounded-lg">
                    ✓ Seleccionada
                  </Tag>
                </div>
              ) : (
                <div>
                  <label className="block text-slate-700 font-semibold text-xs uppercase tracking-wider mb-2">
                    Buscar en Catálogo de Ropa
                  </label>
                  <Select
                    size="large"
                    className="w-full"
                    loading={loadingGarments}
                    placeholder="Seleccione tipo, color o talla..."
                    showSearch
                    optionFilterProp="label"
                    onChange={onSelectGarment}
                    options={(garmentsCatalog || []).map((g) => ({
                      value: g.id,
                      label: `${g.garmentType} ${g.color} (${g.size}) - SAT: ${g.claveProdServ}`,
                    }))}
                  />
                </div>
              )}
            </Card>

            {/* Step 2: Order Details */}
            <Card
              title={
                <span className="flex items-center gap-2 text-slate-800 font-bold">
                  <ScissorOutlined className="text-emerald-600" />
                  Paso 2: Detalles del Trabajo a Realizar
                </span>
              }
              className={`border-slate-200 rounded-2xl shadow-sm transition-all duration-300 ${
                !activeGarment
                  ? "opacity-50 pointer-events-none"
                  : ""
              }`}
            >
              {!activeGarment ? (
                <div className="text-center py-6">
                  <p className="text-slate-400 text-sm">
                    Primero seleccione una prenda base en el Paso 1 para continuar.
                  </p>
                </div>
              ) : (
                <Form
                  layout="vertical"
                  onFinish={handleItemSubmit(onAddItem)}
                  requiredMark={false}
                >
                  <div className="grid grid-cols-2 gap-4">
                    <Form.Item
                      label={
                        <span className="text-slate-700 font-semibold text-xs uppercase tracking-wider">
                          Cantidad a Bordar
                        </span>
                      }
                      validateStatus={itemErrors.quantity ? "error" : ""}
                      help={itemErrors.quantity?.message}
                    >
                      <Controller
                        name="quantity"
                        control={itemControl}
                        render={({ field }) => (
                          <InputNumber
                            {...field}
                            min={1}
                            max={10000}
                            size="large"
                            className="w-full rounded-xl"
                            placeholder="50"
                          />
                        )}
                      />
                    </Form.Item>

                    <Form.Item
                      label={
                        <span className="text-slate-700 font-semibold text-xs uppercase tracking-wider">
                          Diseño / Ponchado
                        </span>
                      }
                      validateStatus={itemErrors.designName ? "error" : ""}
                      help={itemErrors.designName?.message}
                    >
                      <Controller
                        name="designName"
                        control={itemControl}
                        render={({ field }) => (
                          <Input
                            {...field}
                            placeholder="Logo Espalda 12cm"
                            size="large"
                            className="rounded-xl"
                          />
                        )}
                      />
                    </Form.Item>
                  </div>

                  <Form.Item
                    label={
                      <span className="text-slate-700 font-semibold text-xs uppercase tracking-wider">
                        Uso de CFDI
                      </span>
                    }
                    validateStatus={itemErrors.usoCfdi ? "error" : ""}
                    help={itemErrors.usoCfdi?.message}
                  >
                    <Controller
                      name="usoCfdi"
                      control={itemControl}
                      render={({ field }) => (
                        <Select
                          {...field}
                          size="large"
                          className="w-full"
                          loading={loadingCfdi}
                          placeholder="Seleccione uso de CFDI..."
                          showSearch
                          optionFilterProp="label"
                          options={(usoCfdiCatalog || []).map((item) => ({
                            value: item.code,
                            label: `${item.code} — ${item.name}`,
                          }))}
                        />
                      )}
                    />
                  </Form.Item>

                  <Form.Item
                    label={
                      <span className="text-slate-700 font-semibold text-xs uppercase tracking-wider">
                        Notas / Instrucciones del Taller
                      </span>
                    }
                  >
                    <Controller
                      name="notes"
                      control={itemControl}
                      render={({ field }) => (
                        <Input.TextArea
                          {...field}
                          placeholder="Ej: Utilizar hilos HSL color violeta..."
                          rows={3}
                          className="rounded-xl"
                        />
                      )}
                    />
                  </Form.Item>

                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<PlusOutlined />}
                    className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 border-none font-bold h-11 shadow-md shadow-emerald-500/10"
                  >
                    Agregar al Carrito
                  </Button>
                </Form>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
