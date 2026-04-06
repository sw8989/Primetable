/**
 * Type definitions for @smithery/sdk
 */

declare module '@smithery/sdk' {
  export interface SmitherySDKOptions {
    apiKey?: string;
    baseUrl?: string;
  }

  export interface RequestOptions {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    path: string;
    body?: any;
    params?: Record<string, string>;
    headers?: Record<string, string>;
  }

  export class SmitherySDK {
    constructor(options: SmitherySDKOptions);
    request(options: RequestOptions): Promise<any>;
    getTools(): Promise<any[]>;
    invokeTool(name: string, parameters: Record<string, any>): Promise<any>;
  }
}

/**
 * Type definitions for @modelcontextprotocol/sdk
 */

declare module '@modelcontextprotocol/sdk' {
  export interface MCPClientOptions {
    apiKey?: string;
    baseUrl?: string;
  }

  export interface Resource {
    id: string;
    content: string;
    mimetype: string;
  }

  export interface ToolCall {
    name: string;
    parameters: Record<string, any>;
  }

  export interface ToolResult {
    name: string;
    result: any;
  }

  export interface MessageContent {
    text: string;
    resources?: Resource[];
  }

  export interface Message {
    role: 'user' | 'system' | 'assistant';
    content: MessageContent | string;
    tool_calls?: ToolCall[];
    tool_results?: ToolResult[];
  }

  export interface CompletionOptions {
    messages: Message[];
    tools?: Array<{
      name: string;
      description?: string;
      parameters: Record<string, any>;
    }>;
    resources?: Resource[];
    temperature?: number;
    max_tokens?: number;
  }

  export class MCPClient {
    constructor(options: MCPClientOptions);
    createCompletion(options: CompletionOptions): Promise<Message>;
    registerTool(tool: any): void;
  }
}