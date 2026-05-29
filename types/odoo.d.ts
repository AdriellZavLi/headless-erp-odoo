export interface OdooConfig {
  url: string;
  db: string;
  username: string;
  apiKey: string;
}

export interface OdooVersionResult {
  server_version: string;
  server_version_info: (string | number)[];
  server_serie: string;
  protocol_version: number;
}

export interface OdooPingResponse {
  success: boolean;
  status: "connected" | "mock_mode" | "error";
  message: string;
  mode: "live" | "mock";
  details?: {
    server_version?: string;
    server_serie?: string;
    database?: string;
    username?: string;
    timestamp: string;
  };
  error?: string;
}

export interface OdooJsonRpcRequest<T = any> {
  jsonrpc: "2.0";
  method: "call";
  params: {
    service: "common" | "object";
    method: string;
    args: T;
  };
  id: number;
}

export interface OdooJsonRpcResponse<T = any> {
  jsonrpc: "2.0";
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}
