import type { NodeDefinition, ProducedVariable } from "./types";

/** Canonical expression syntax: `{{trigger.contact.phone}}`. */
export const INTERPOLATION_SYNTAX = /\{\{\s*([a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*)\s*\}\}/g;

export function interpolationPaths(value: string): string[] {
  return Array.from(value.matchAll(INTERPOLATION_SYNTAX), (match) => match[1]);
}

function readPath(values: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) =>
    current && typeof current === "object" ? (current as Record<string, unknown>)[key] : undefined,
  values);
}

export function interpolate(value: string, variables: Record<string, unknown>): unknown {
  const exact = value.match(/^\{\{\s*([a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*)\s*\}\}$/);
  if (exact) return readPath(variables, exact[1]);
  return value.replace(INTERPOLATION_SYNTAX, (_, path: string) => {
    const resolved = readPath(variables, path);
    return resolved == null ? "" : typeof resolved === "string" ? resolved : JSON.stringify(resolved);
  });
}

export function interpolateDeep(value: unknown, variables: Record<string, unknown>): unknown {
  if (typeof value === "string") return interpolate(value, variables);
  if (Array.isArray(value)) return value.map((item) => interpolateDeep(item, variables));
  if (value && typeof value === "object") return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, interpolateDeep(item, variables)]),
  );
  return value;
}

export type GraphNode = { id: string; type: string };
export type GraphEdge = { source: string; target: string };

/** Returns only variables produced by ancestors of `nodeId`; disconnected/future nodes are excluded. */
export function variablesAvailableAt(
  nodeId: string,
  graph: { nodes: readonly GraphNode[]; edges: readonly GraphEdge[] },
  registry: ReadonlyMap<string, NodeDefinition>,
): ProducedVariable[] {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const incoming = new Map<string, string[]>();
  for (const edge of graph.edges) incoming.set(edge.target, [...(incoming.get(edge.target) ?? []), edge.source]);
  const visited = new Set<string>();
  const visit = (id: string) => {
    for (const parent of incoming.get(id) ?? []) if (!visited.has(parent)) { visited.add(parent); visit(parent); }
  };
  visit(nodeId);
  return Array.from(visited).flatMap((id) => registry.get(byId.get(id)?.type ?? "")?.produces ?? []);
}

export function invalidInterpolationPaths(value: string, available: readonly ProducedVariable[]): string[] {
  const allowed = new Set(available.map(({ path }) => path));
  return interpolationPaths(value).filter((path) => !allowed.has(path));
}
