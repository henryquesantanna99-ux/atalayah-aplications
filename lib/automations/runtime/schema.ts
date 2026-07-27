import type { Json, JsonSchema } from './types'

export class SchemaValidationError extends Error {
  readonly issues: string[]
  constructor(issues: string[]) { super(`Schema inválido: ${issues.join(', ')}`); this.issues = issues }
}

export function validateSchema(schema: JsonSchema | undefined, value: Json, path = '$'): void {
  if (!schema) return
  const issues: string[] = []
  const visit = (s: JsonSchema, v: Json, p: string) => {
    const actual = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v
    if (s.type && (s.type === 'integer' ? !(typeof v === 'number' && Number.isInteger(v)) : actual !== s.type)) {
      issues.push(`${p} deveria ser ${s.type}`); return
    }
    if (s.enum && !s.enum.some(item => JSON.stringify(item) === JSON.stringify(v))) issues.push(`${p} fora do enum`)
    if (s.type === 'object' && v && !Array.isArray(v) && typeof v === 'object') {
      const obj = v as Record<string, Json>
      for (const key of s.required ?? []) if (!(key in obj)) issues.push(`${p}.${key} é obrigatório`)
      for (const [key, child] of Object.entries(s.properties ?? {})) if (key in obj) visit(child, obj[key], `${p}.${key}`)
      if (s.additionalProperties === false) for (const key of Object.keys(obj)) if (!s.properties?.[key]) issues.push(`${p}.${key} não permitido`)
    }
    if (s.type === 'array' && Array.isArray(v) && s.items) v.forEach((item, index) => visit(s.items!, item, `${p}[${index}]`))
  }
  visit(schema, value, path)
  if (issues.length) throw new SchemaValidationError(issues)
}
