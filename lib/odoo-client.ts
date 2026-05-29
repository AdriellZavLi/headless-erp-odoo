import { OdooConfig, OdooVersionResult } from "@/types/odoo";

export class OdooClient {
  private config: OdooConfig;
  private isMockMode: boolean = false;
  private uid: number | null = null;

  constructor() {
    this.config = {
      url: process.env.ODOO_URL || "",
      db: process.env.ODOO_DB || "",
      username: process.env.ODOO_USERNAME || "",
      apiKey: process.env.ODOO_API_KEY || "",
    };

    // If ODOO_URL is empty or set to "mock", activate Mock Mode automatically
    if (!this.config.url || this.config.url.toLowerCase() === "mock") {
      this.isMockMode = true;
      console.log("⚠️ [OdooClient] Inicializado en MODO MOCK (Simulación local)");
    } else {
      console.log(`🔌 [OdooClient] Inicializado en MODO LIVE apuntando a: ${this.config.url}`);
    }
  }

  /**
   * Identifica si el cliente está operando en modo simulación.
   */
  public getIsMockMode(): boolean {
    return this.isMockMode;
  }

  /**
   * Obtiene la base de datos configurada.
   */
  public getDbName(): string {
    return this.config.db || "mock_database";
  }

  /**
   * Obtiene el usuario configurado.
   */
  public getUsername(): string {
    return this.config.username || "mock_user";
  }

  /**
   * Realiza una petición JSON-RPC genérica al servidor Odoo.
   */
  private async jsonRpcCall<T>(service: "common" | "object", method: string, args: any[]): Promise<T> {
    if (this.isMockMode) {
      throw new Error("No se pueden realizar llamadas RPC en Modo Mock. Use los métodos públicos que tienen fallback.");
    }

    const endpoint = `${this.config.url}/jsonrpc`;
    const payload = {
      jsonrpc: "2.0",
      method: "call",
      params: {
        service,
        method,
        args,
      },
      id: Math.floor(Math.random() * 1000) + 1,
    };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        // Timeout de 10 segundos
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        console.error("❌ [OdooClient] Error Odoo JSON-RPC:", data.error);
        throw new Error(data.error.data?.message || data.error.message || "Error interno de Odoo");
      }

      return data.result as T;
    } catch (error: any) {
      console.error(`❌ [OdooClient] Error al conectar con Odoo (${service}/${method}):`, error.message);
      throw error;
    }
  }

  /**
   * Obtiene la versión del servidor Odoo.
   */
  public async getVersion(): Promise<OdooVersionResult> {
    if (this.isMockMode) {
      // Retraso artificial de 200ms para simular latencia de red
      await new Promise((resolve) => setTimeout(resolve, 200));
      return {
        server_version: "17.0+e-mock",
        server_version_info: [17, 0, 0, "final", 0, "e"],
        server_serie: "17.0",
        protocol_version: 1,
      };
    }

    return this.jsonRpcCall<OdooVersionResult>("common", "version", []);
  }

  /**
   * Autentica el servidor BFF contra Odoo para obtener el uid.
   * Odoo API Key actúa como la contraseña del usuario en XML-RPC/JSON-RPC en Odoo v14+.
   */
  public async authenticate(): Promise<number> {
    if (this.isMockMode) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      this.uid = 100; // ID estático de simulador
      return this.uid;
    }

    if (this.uid) return this.uid;

    try {
      const uid = await this.jsonRpcCall<number | boolean>("common", "authenticate", [
        this.config.db,
        this.config.username,
        this.config.apiKey,
        {},
      ]);

      if (typeof uid === "boolean" && !uid) {
        throw new Error("Credenciales de Odoo inválidas (Verifique DB, usuario y API Key)");
      }

      this.uid = uid as number;
      return this.uid;
    } catch (error) {
      this.uid = null;
      throw error;
    }
  }

  /**
   * Invoca métodos del modelo ORM de Odoo (execute_kw).
   */
  public async executeKw<T>(
    model: string,
    method: string,
    args: any[],
    kwargs: Record<string, any> = {}
  ): Promise<T> {
    if (this.isMockMode) {
      return this.mockExecuteKw<T>(model, method, args, kwargs);
    }

    // Asegura la autenticación antes de ejecutar operaciones
    const uid = await this.authenticate();

    return this.jsonRpcCall<T>("object", "execute_kw", [
      this.config.db,
      uid,
      this.config.apiKey,
      model,
      method,
      args,
      kwargs,
    ]);
  }

  /**
   * Emulador avanzado de Odoo para desarrollo rápido local sin dependencias.
   */
  private async mockExecuteKw<T>(
    model: string,
    method: string,
    args: any[],
    kwargs: Record<string, any>
  ): Promise<T> {
    await new Promise((resolve) => setTimeout(resolve, 300)); // Latencia realista
    console.log(`🛠️ [OdooClient MOCK] execute_kw en '${model}' para el método '${method}'`, { args, kwargs });

    // Simular catálogos del SAT (Para Fase 3)
    if (model === "sat.catalog.c_claveprodserv" && method === "search_read") {
      return [
        { id: 1, code: "82141502", name: "Servicios de diseño de bordado de prendas" },
        { id: 2, code: "49121508", name: "Hilos industriales para costura de alta resistencia" },
        { id: 3, code: "73151604", name: "Servicio de maquila de bordado industrial" },
        { id: 4, code: "53101602", name: "Camisas tipo polo listas para bordar" },
      ] as unknown as T;
    }

    if (model === "sat.catalog.c_usocfdi" && method === "search_read") {
      return [
        { id: 1, code: "G01", name: "Adquisición de mercancías" },
        { id: 2, code: "G03", name: "Gastos en general" },
        { id: 3, code: "P01", name: "Por definir" },
      ] as unknown as T;
    }

    // Simular órdenes de bordado (Para dashboard / mrp)
    if (model === "mrp.production" && method === "search_read") {
      return [
        {
          id: 101,
          name: "OP-2026-001",
          product_id: [12, "Playera Polo - Bordado Pecho"],
          qty_producing: 150,
          state: "progress",
          date_planned_start: "2026-05-28 08:00:00",
        },
        {
          id: 102,
          name: "OP-2026-002",
          product_id: [14, "Gorra Acrílico - Bordado Frente 3D"],
          qty_producing: 80,
          state: "confirmed",
          date_planned_start: "2026-05-29 09:30:00",
        },
      ] as unknown as T;
    }

    // Retorno estándar genérico
    return { success: true } as unknown as T;
  }
}

// Exportar una instancia única para reutilización en Route Handlers (Singleton)
export const odoo = new OdooClient();
