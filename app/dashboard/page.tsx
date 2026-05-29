import React from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import DashboardHeader from "@/components/DashboardHeader";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  // Severe fallback redirection (in addition to standard middleware)
  if (!session || !session.user) {
    redirect("/login");
  }

  // Sample manufacturing state for embroidery business
  const metrics = [
    {
      id: "metric-orders",
      title: "Órdenes Pendientes",
      value: "18",
      description: "Por programar en máquinas",
      icon: (
        <svg
          className="w-6 h-6 text-violet-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
      bg: "from-violet-50 to-transparent",
      border: "hover:border-violet-200",
    },
    {
      id: "metric-embroideries",
      title: "Diseños Activos",
      value: "6",
      description: "Digitalización de ponchado",
      icon: (
        <svg
          className="w-6 h-6 text-indigo-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
      bg: "from-indigo-50 to-transparent",
      border: "hover:border-indigo-200",
    },
    {
      id: "metric-efficiency",
      title: "Eficiencia de Taller",
      value: "95.8%",
      description: "Bajo consumo y merma mínima",
      icon: (
        <svg
          className="w-6 h-6 text-emerald-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      bg: "from-emerald-50 to-transparent",
      border: "hover:border-emerald-200",
    },
    {
      id: "metric-sat",
      title: "SAT por Timbrar",
      value: "4",
      description: "Pendientes de facturación CFDI 4.0",
      icon: (
        <svg
          className="w-6 h-6 text-amber-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      ),
      bg: "from-amber-50 to-transparent",
      border: "hover:border-amber-200",
    },
  ];

  const machines = [
    {
      id: "m-1",
      name: "Tajima TMEZ-SC1501 (Cabezal Único)",
      status: "Embroidering",
      design: "Logo Corporativo MasBordados - Espalda",
      progress: 74,
      speed: "850 RPM",
    },
    {
      id: "m-2",
      name: "Brother PR1055X (10 Agujas)",
      status: "Embroidering",
      design: "Insignia Deportiva Club - Frente",
      progress: 42,
      speed: "600 RPM",
    },
    {
      id: "m-3",
      name: "Barudan BEXY-S1504C (4 Cabezales)",
      status: "Idle",
      design: "Ninguno",
      progress: 0,
      speed: "0 RPM",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col pb-12">
      <DashboardHeader user={session.user} />

      <main className="max-w-7xl w-full mx-auto px-6 mt-8 flex-grow">
        <section className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1
              id="dashboard-heading"
              className="text-3xl font-extrabold tracking-tight text-slate-900"
            >
              Panel de Control de Producción
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Visualización en tiempo real de operaciones de costura, ponchados
              y cumplimiento tributario.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/dashboard/nueva-orden"
              id="action-new-order-btn"
              className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all duration-150 active:scale-[0.98] shadow-lg shadow-violet-500/10"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M12 6v12m6-6H6"
                />
              </svg>
              Nueva Orden
            </Link>
            <button
              id="action-sat-btn"
              className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-950 font-semibold px-4 py-2.5 rounded-xl text-sm transition-all duration-150 active:scale-[0.98] shadow-sm"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              Catálogos SAT
            </button>
          </div>
        </section>

        {/* Metrics Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metrics.map((metric) => (
            <article
              key={metric.id}
              className={`bg-white border border-slate-200 p-6 rounded-2xl flex flex-col justify-between transition-all duration-300 bg-gradient-to-br ${metric.bg} ${metric.border} shadow-sm`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {metric.title}
                  </p>
                  <h3 className="text-3xl font-extrabold text-slate-900 mt-2">
                    {metric.value}
                  </h3>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 shadow-inner flex items-center justify-center">
                  {metric.icon}
                </div>
              </div>
              <p className="text-xs text-slate-600 mt-4 font-semibold">
                {metric.description}
              </p>
            </article>
          ))}
        </section>

        {/* Embroidery Machines Status */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Monitoreo de Máquinas
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Estado mecánico y progreso de hilado en tiempo real.
              </p>
            </div>
            <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Sincronizado
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider bg-slate-50/70">
                  <th className="py-3 pl-4 rounded-tl-xl">Máquina</th>
                  <th className="py-3">Estado</th>
                  <th className="py-3">Diseño Cargado</th>
                  <th className="py-3">Velocidad</th>
                  <th className="py-3 pr-4 text-right rounded-tr-xl">Progreso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {machines.map((machine) => (
                  <tr key={machine.id} className="hover:bg-slate-50 transition-colors duration-150 group">
                    <td className="py-4 pl-4 font-bold text-slate-800 group-hover:text-violet-700 transition-colors duration-150">
                      {machine.name}
                    </td>
                    <td className="py-4">
                      {machine.status === "Embroidering" ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-violet-100 text-violet-800 border border-violet-200 rounded-lg text-xs font-bold shadow-sm">
                          Bordando
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-bold">
                          Inactiva
                        </span>
                      )}
                    </td>
                    <td className="py-4 text-slate-700 font-semibold">{machine.design}</td>
                    <td className="py-4 text-slate-600 font-mono text-xs font-semibold">{machine.speed}</td>
                    <td className="py-4 pr-4">
                      <div className="flex items-center justify-end gap-3">
                        {machine.status === "Embroidering" ? (
                          <>
                            <div className="w-24 bg-slate-200 h-2.5 rounded-full overflow-hidden shadow-inner hidden xs:block">
                              <div
                                className="bg-gradient-to-r from-violet-600 to-indigo-600 h-full rounded-full transition-all duration-500"
                                style={{ width: `${machine.progress}%` }}
                              />
                            </div>
                            <span className="font-extrabold text-slate-900 font-mono text-xs w-8 text-right">
                              {machine.progress}%
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-400 font-mono text-xs font-bold">
                            —
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
