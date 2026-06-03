"use client";

import React, { useState, useCallback, useEffect } from "react";
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
  Upload,
  message,
  DatePicker,
  Modal,
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
  ClockCircleOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useOrderStore } from "@/store/useOrderStore";
import Link from "next/link";
import { CustomerProfile, GarmentProfile } from "@/types/order";

// ─── Zod Schemas ────────────────────────────────────────────────────────────

const itemSchema = z.object({
  quantity: z.number().min(1, "La cantidad mínima es 1"),
  designName: z.string().min(2, "Nombre del diseño de ponchado requerido"),
  usoCfdi: z.string().min(1, "Seleccione un uso de CFDI"),
  ubicacionLogo: z.string().min(1, "Seleccione la ubicación del logo"),
  instruccionesBordado: z.string().optional(),
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

function usePaymentTerms() {
  return useQuery({
    queryKey: ["odoo", "payment-terms"],
    queryFn: async () => {
      const res = await fetch("/api/odoo/payment-terms");
      if (!res.ok) throw new Error("Error al cargar términos de pago");
      const data = await res.json();
      return data.catalog as { id: number; name: string }[];
    },
    staleTime: 24 * 60 * 60 * 1000,
  });
}

function useSatPaymentMethods() {
  return useQuery({
    queryKey: ["odoo", "sat-payment-methods"],
    queryFn: async () => {
      const res = await fetch("/api/odoo/sat/payment_methods");
      if (!res.ok) throw new Error("Error al cargar formas de pago SAT");
      const data = await res.json();
      return data.catalog as { id: number; name: string }[];
    },
    staleTime: 24 * 60 * 60 * 1000,
  });
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function NuevaOrdenPage() {
  const router = useRouter();
  const [api, contextHolder] = notification.useNotification();
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modal, modalContextHolder] = Modal.useModal();

  // Zustand global store
  const { customer, items, setCustomer, addItem, removeItem, clearCart } =
    useOrderStore();

  // Selected Garment state
  const [activeGarment, setActiveGarment] = useState<GarmentProfile | null>(
    null
  );

  // Upload Logo State
  const [logoFile, setLogoFile] = useState<{ base64: string; name: string } | null>(null);

  // Additional Order Fields
  const [validityDate, setValidityDate] = useState<string | null>(null);
  const [commitmentDate, setCommitmentDate] = useState<string | null>(null);
  const [paymentTermId, setPaymentTermId] = useState<number | null>(null);
  const [paymentMethodId, setPaymentMethodId] = useState<number | null>(null);
  const [paymentPolicy, setPaymentPolicy] = useState<string | null>(null);

  // Odoo Catalogs via TanStack Query
  const { data: customersCatalog, isLoading: loadingCustomers } = useCustomers();
  const { data: garmentsCatalog, isLoading: loadingGarments } = useGarments();
  const { data: paymentTermsCatalog, isLoading: loadingPaymentTerms } = usePaymentTerms();
  const { data: usoCfdiCatalog, isLoading: loadingCfdi } = useSatUsoCfdi();
  const { data: paymentMethodsCatalog, isLoading: loadingPaymentMethods } = useSatPaymentMethods();

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
          description: `${selected.displayName} seleccionada.`,
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
    setValue: setItemValue,
    formState: { errors: itemErrors },
  } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      quantity: 1,
      designName: "",
      usoCfdi: "",
      ubicacionLogo: "",
      instruccionesBordado: "",
    },
  });

  useEffect(() => {
    if (customer?.rfc === "XAXX010101000") {
      setItemValue("usoCfdi", "S01");
    }
  }, [customer, setItemValue]);

  const getBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });

  const handleLogoUpload = async (file: File) => {
    const isJpgOrPng = file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/svg+xml";
    if (!isJpgOrPng) {
      messageApi.error("Solo se permiten archivos JPG, PNG o SVG");
      return false;
    }
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      messageApi.error("La imagen debe ser menor a 5MB");
      return false;
    }

    try {
      const base64String = await getBase64(file);
      setLogoFile({
        base64: base64String, // Guardamos el string largo (data:image/...)
        name: file.name,
      });
      messageApi.success("Logo convertido y cargado exitosamente");
    } catch (error) {
      messageApi.error("Error al convertir el archivo a Base64");
    }

    return false; // Prevent default form POST behavior
  };

  const onAddItem = useCallback(
    (data: ItemFormData) => {
      if (!activeGarment) return;

      const newItem: any = {
        garment: activeGarment,
        quantity: data.quantity,
        designName: data.designName,
        usoCfdi: data.usoCfdi,
        ubicacionLogo: data.ubicacionLogo,
        instruccionesBordado: data.instruccionesBordado,
      };

      if (logoFile && logoFile.base64 && logoFile.base64.trim() !== "") {
        newItem.logoBase64 = logoFile.base64;
        newItem.logoName = logoFile.name;
      }

      addItem(newItem);
      resetItemForm();
      setActiveGarment(null); // Reset garment selection for next item
      setLogoFile(null); // Reset logo
      api.success({
        title: "Prenda Agregada al Pedido",
        description: `${data.quantity}x ${activeGarment.displayName} añadida(s) al carrito.`,
        placement: "topRight",
      });
    },
    [activeGarment, addItem, resetItemForm, api, logoFile]
  );

  // ─── Submit Order ───────────────────────────────────────────────────────

  const submitOrderMutation = useMutation({
    mutationFn: async (payload: { customer: any, items: any[], validityDate: string | null, commitmentDate: string | null, paymentTermId: number | null, paymentMethodId: number | null, paymentPolicy: string | null }) => {
      const res = await fetch("/api/odoo/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Error al crear la orden en Odoo");
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      api.success({
        title: "¡Orden Enviada con Éxito!",
        description: `La orden de ${items.length} prenda(s) para ${customer?.name} ha sido registrada en Odoo.`,
        placement: "topRight",
        duration: 5,
      });
      clearCart();
      setTimeout(() => {
        router.push("/dashboard");
      }, 1200);
    },
    onError: (error: any) => {
      api.error({
        title: "Error de Sincronización",
        description: error.message || "No se pudo registrar la orden en Odoo.",
        placement: "topRight",
      });
    },
  });

  const handleSubmitOrder = () => {
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
        description: "Agregue al menos una prenda al carrito antes de enviar la orden.",
        placement: "topRight",
      });
      return;
    }

    const hasItemsWithoutStock = items.some(item => item.garment.qtyAvailable <= 0);

    const proceedWithOrder = () => {
      submitOrderMutation.mutate({
        customer,
        items,
        validityDate,
        commitmentDate,
        paymentTermId,
        paymentMethodId,
        paymentPolicy
      });
    };

    if (hasItemsWithoutStock) {
      modal.confirm({
        title: "Inventario Insuficiente",
        content: "Algunas prendas de esta orden no tienen existencias en bodega. ¿Deseas confirmar la orden bajo pedido?",
        okText: "Proceder de todos modos",
        cancelText: "Cancelar",
        okButtonProps: { danger: true },
        onOk: proceedWithOrder,
      });
    } else {
      proceedWithOrder();
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-[1400px] mx-auto w-full space-y-8 flex-grow">
      {contextHolder}
      {messageContextHolder}
      {modalContextHolder}

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
              Capturar Nueva Orden
            </h1>
          </div>
        </div>

        <Button
          type="primary"
          size="large"
          icon={<SendOutlined />}
          loading={submitOrderMutation.isPending}
          onClick={handleSubmitOrder}
          className="bg-gradient-to-r from-violet-600 to-indigo-600 border-none font-bold shadow-lg shadow-violet-500/10 rounded-xl px-6"
        >
          Guardar en Odoo
        </Button>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl w-full mx-auto px-6 mt-12">
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
                            {item.garment.displayName}
                          </h4>
                          <Tag className="text-xs rounded-md border-slate-200 bg-white font-mono">
                            Stock: {item.garment.qtyAvailable}
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
                            Precio: ${item.garment.listPrice}
                          </Tag>
                          <Tag className="text-xs font-mono rounded-md border-slate-200 bg-white">
                            CFDI: {item.usoCfdi}
                          </Tag>
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex flex-col gap-0.5">
                          {item.ubicacionLogo && (
                            <span className="truncate">📍 {item.ubicacionLogo}</span>
                          )}
                          {item.instruccionesBordado && (
                            <span className="italic truncate text-slate-400">📝 {item.instruccionesBordado}</span>
                          )}
                        </div>
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

            {/* Delivery and Payment Conditions */}
            <Card
              title={
                <span className="flex items-center gap-2 text-slate-800 font-bold">
                  <ClockCircleOutlined className="text-amber-500" />
                  Condiciones Comerciales
                </span>
              }
              className="border-slate-200 rounded-2xl shadow-sm"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold text-xs uppercase tracking-wider mb-2">
                    Fecha de Vigencia
                  </label>
                  <DatePicker
                    size="large"
                    className="w-full rounded-xl"
                    onChange={(_, dateString) => setValidityDate(dateString as string)}
                    placeholder="Vigencia cotización"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold text-xs uppercase tracking-wider mb-2">
                    Fecha Prometida
                  </label>
                  <DatePicker
                    size="large"
                    className="w-full rounded-xl"
                    onChange={(_, dateString) => setCommitmentDate(dateString as string)}
                    placeholder="Seleccione fecha"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold text-xs uppercase tracking-wider mb-2">
                    Términos de Pago
                  </label>
                  <Select
                    size="large"
                    className="w-full"
                    loading={loadingPaymentTerms}
                    placeholder="Seleccione plazo..."
                    options={(paymentTermsCatalog || []).map((pt) => ({
                      value: pt.id,
                      label: pt.name,
                    }))}
                    onChange={(val) => setPaymentTermId(val)}
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold text-xs uppercase tracking-wider mb-2">
                    Forma de Pago (SAT)
                  </label>
                  <Select
                    size="large"
                    className="w-full"
                    loading={loadingPaymentMethods}
                    placeholder="Seleccione forma de pago..."
                    showSearch
                    optionFilterProp="label"
                    options={(paymentMethodsCatalog || []).map((pm) => ({
                      value: pm.id,
                      label: pm.name,
                    }))}
                    onChange={(val) => setPaymentMethodId(val)}
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold text-xs uppercase tracking-wider mb-2">
                    Política de Pago (CFDI)
                  </label>
                  <Select
                    size="large"
                    className="w-full"
                    placeholder="Seleccione política..."
                    options={[
                      { value: "PUE", label: "PUE (Pago en una sola exhibición)" },
                      { value: "PPD", label: "PPD (Pago en parcialidades o diferido)" },
                    ]}
                    onChange={(val) => setPaymentPolicy(val)}
                  />
                </div>
              </div>
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
              className={`border-slate-200 rounded-2xl shadow-sm transition-all duration-300 ${activeGarment
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
                      {activeGarment.displayName}
                    </p>
                    <p className="text-xs text-slate-500">
                      Stock: {activeGarment.qtyAvailable} · Precio Base: ${activeGarment.listPrice}
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
                    placeholder="Buscar prenda (ej. Polo Negra M)"
                    showSearch
                    optionFilterProp="label"
                    filterOption={(input, option) => {
                      const searchTerms = input.toLowerCase().trim().split(' ');
                      const text = String(option?.label ?? '').toLowerCase();
                      return searchTerms.every(term => text.includes(term));
                    }}
                    onChange={onSelectGarment}
                    options={(garmentsCatalog || []).map((g) => ({
                      value: g.id,
                      label: g.displayName,
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
              className={`border-slate-200 rounded-2xl shadow-sm transition-all duration-300 ${!activeGarment
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
                          disabled={customer?.rfc === "XAXX010101000"}
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
                        Logo / Diseño Adjunto (Opcional)
                      </span>
                    }
                  >
                    <Upload
                      name="logo"
                      accept=".jpg,.jpeg,.png,.svg"
                      showUploadList={false}
                      beforeUpload={handleLogoUpload}
                    >
                      <Button icon={<UploadOutlined />} className="w-full h-10 rounded-xl">
                        {logoFile ? `Cambiar: ${logoFile.name}` : "Subir archivo de logo (JPG, PNG, SVG)"}
                      </Button>
                    </Upload>
                  </Form.Item>

                  <Form.Item
                    label={
                      <span className="text-slate-700 font-semibold text-xs uppercase tracking-wider">
                        Ubicación del Logo
                      </span>
                    }
                    validateStatus={itemErrors.ubicacionLogo ? "error" : ""}
                    help={itemErrors.ubicacionLogo?.message}
                  >
                    <Controller
                      name="ubicacionLogo"
                      control={itemControl}
                      render={({ field }) => (
                        <Select
                          {...field}
                          size="large"
                          className="w-full"
                          placeholder="Frente, Espalda, Hombro..."
                          options={[
                            { value: "Frente Izquierdo", label: "Frente Izquierdo" },
                            { value: "Frente Derecho", label: "Frente Derecho" },
                            { value: "Espalda Central", label: "Espalda Central" },
                            { value: "Manga Izquierda", label: "Manga Izquierda" },
                            { value: "Manga Derecha", label: "Manga Derecha" },
                          ]}
                        />
                      )}
                    />
                  </Form.Item>

                  <Form.Item
                    label={
                      <span className="text-slate-700 font-semibold text-xs uppercase tracking-wider">
                        Instrucciones del Taller
                      </span>
                    }
                  >
                    <Controller
                      name="instruccionesBordado"
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
