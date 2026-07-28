import type { ZodType } from "zod";

export type NodeCategory =
  | "trigger"
  | "http"
  | "logic"
  | "crm"
  | "communication"
  | "ai"
  | "calendar"
  | "marketing"
  | "data";

export type Port = { id: string; label: string; multiple?: boolean };
export type ProducedVariable = {
  path: string;
  label: string;
  type: "string" | "number" | "boolean" | "object" | "array" | "date" | "unknown";
  description?: string;
};

export type FormField = {
  key: string;
  label: string;
  control: "text" | "textarea" | "number" | "select" | "boolean" | "json" | "key-value" | "expression";
  options?: readonly string[];
  placeholder?: string;
  help?: string;
};

export interface ExecutionContext {
  /** Secrets are resolved on the server and must never be stored in node config. */
  secrets: Record<string, string | undefined>;
  variables: Record<string, unknown>;
  signal?: AbortSignal;
  now: () => Date;
  adapters: {
    http?: (request: Record<string, unknown>) => Promise<unknown>;
    crm?: (operation: string, input: unknown) => Promise<unknown>;
    communication?: (provider: string, operation: string, input: unknown) => Promise<unknown>;
    ai?: (operation: string, input: unknown) => Promise<unknown>;
    calendar?: (operation: string, input: unknown) => Promise<unknown>;
    marketing?: (operation: string, input: unknown) => Promise<unknown>;
    trigger?: (operation: string, input: unknown) => Promise<unknown>;
  };
}

export interface NodeDefinition<Config = unknown, Output = unknown> {
  id: string;
  label: string;
  category: NodeCategory;
  version: number;
  configSchema: ZodType<Config>;
  inputs: readonly Port[];
  outputs: readonly Port[];
  produces: readonly ProducedVariable[];
  form: readonly FormField[];
  /** This function is invoked only by the server-side workflow runner. */
  execute(config: Config, context: ExecutionContext): Promise<Output>;
}

export function defineNode<const T extends NodeDefinition>(definition: T): T {
  return definition;
}
