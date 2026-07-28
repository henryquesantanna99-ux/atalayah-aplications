export type WorkflowStatus = 'active' | 'inactive' | 'archived'
export type NodeCategory = 'Gatilhos'|'Lógica'|'CRM'|'Comunicação'|'IA'|'Agenda'|'Marketing'|'Dados'|'Utilitários'
export type NodeKind = 'trigger'|'condition'|'create-lead'|'message'|'ai'|'schedule'|'campaign'|'http'|'delay'

export type WorkflowNode = {
  id: string; kind: NodeKind; category: NodeCategory; label: string
  x: number; y: number; config: Record<string,string>; requiresCredential?: boolean
}
export type WorkflowEdge = { id:string; from:string; to:string }
export type Workflow = {
  id:string; name:string; status:WorkflowStatus; lastRun?:string
  nodes:WorkflowNode[]; edges:WorkflowEdge[]; published?:{nodes:WorkflowNode[];edges:WorkflowEdge[]}
}

export const palette: Array<{category:NodeCategory;items:Array<{kind:NodeKind;label:string;credential?:boolean}>}> = [
  {category:'Gatilhos',items:[{kind:'trigger',label:'Lead criado'}]},
  {category:'Lógica',items:[{kind:'condition',label:'Condição'},{kind:'delay',label:'Aguardar'}]},
  {category:'CRM',items:[{kind:'create-lead',label:'Criar card'}]},
  {category:'Comunicação',items:[{kind:'message',label:'Enviar WhatsApp',credential:true}]},
  {category:'IA',items:[{kind:'ai',label:'Gerar com IA',credential:true}]},
  {category:'Agenda',items:[{kind:'schedule',label:'Criar evento',credential:true}]},
  {category:'Marketing',items:[{kind:'campaign',label:'Adicionar à campanha'}]},
  {category:'Dados',items:[{kind:'http',label:'Requisição HTTP'}]},
  {category:'Utilitários',items:[{kind:'delay',label:'Formatar texto'}]},
]
