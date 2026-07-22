'use client'

import { useMemo, useRef, useState } from 'react'
import {
  BarChart3, ChevronDown, CircleUserRound, Download, Filter, Inbox, LayoutDashboard,
  MessageCircle, MoreHorizontal, Paperclip, Phone, Plus, Search, Send, Settings2,
  SlidersHorizontal, Tag, Upload, Users, X,
} from 'lucide-react'

type Stage = { id: string; name: string; color: string }
type Lead = { id: string; name: string; company: string; phone: string; email: string; source: string; stage: string; value: number; tags: string[]; createdAt: string }
type Chat = { id: string; name: string; phone: string; unread: number; time: string; messages: { id: string; text: string; direction: 'in' | 'out'; time: string }[] }

const stages: Stage[] = [
  { id: 'new', name: 'Novos leads', color: '#3B82F6' },
  { id: 'contact', name: 'Em contato', color: '#F59E0B' },
  { id: 'proposal', name: 'Proposta enviada', color: '#8B5CF6' },
  { id: 'won', name: 'Fechados', color: '#10B981' },
]
const initialLeads: Lead[] = [
  { id: '1', name: 'Mariana Costa', company: 'Studio Essência', phone: '+55 11 99832-4201', email: 'mariana@essencia.com', source: 'Instagram', stage: 'new', value: 2400, tags: ['Novo'], createdAt: '2026-07-22' },
  { id: '2', name: 'Ricardo Alves', company: 'RA Produções', phone: '+55 21 98712-3098', email: 'ricardo@raproducoes.com', source: 'Indicação', stage: 'new', value: 1800, tags: ['Prioridade'], createdAt: '2026-07-21' },
  { id: '3', name: 'Camila Rocha', company: 'Igreja Nova Vida', phone: '+55 31 99701-1134', email: 'camila@novavida.org', source: 'Site', stage: 'contact', value: 3200, tags: ['Evento'], createdAt: '2026-07-19' },
  { id: '4', name: 'João Mendes', company: 'JM Eventos', phone: '+55 11 97751-8090', email: 'joao@jmeventos.com', source: 'WhatsApp', stage: 'proposal', value: 5600, tags: ['Quente'], createdAt: '2026-07-16' },
  { id: '5', name: 'Isabela Lima', company: 'Comunidade Plena', phone: '+55 85 99908-2344', email: 'isa@plena.org', source: 'Instagram', stage: 'won', value: 4100, tags: ['Cliente'], createdAt: '2026-07-12' },
]
const initialChats: Chat[] = [
  { id: '1', name: 'Mariana Costa', phone: '+55 11 99832-4201', unread: 2, time: '10:42', messages: [
    { id: '1', text: 'Olá! Vi o trabalho de vocês no Instagram e gostaria de saber mais.', direction: 'in', time: '10:38' },
    { id: '2', text: 'Oi, Mariana! Que bom receber sua mensagem 😊 Como podemos ajudar?', direction: 'out', time: '10:40' },
    { id: '3', text: 'Estamos planejando um evento em setembro. Vocês têm disponibilidade?', direction: 'in', time: '10:42' },
  ] },
  { id: '2', name: 'Ricardo Alves', phone: '+55 21 98712-3098', unread: 0, time: '09:18', messages: [{ id: '1', text: 'Obrigado, vou analisar a proposta.', direction: 'in', time: '09:18' }] },
  { id: '3', name: 'Camila Rocha', phone: '+55 31 99701-1134', unread: 0, time: 'Ontem', messages: [{ id: '1', text: 'Podemos marcar uma conversa amanhã?', direction: 'in', time: '16:23' }] },
]

export function CommercialDashboard() {
  const [tab, setTab] = useState<'overview' | 'crm' | 'chats'>('overview')
  const [leads, setLeads] = useState(initialLeads)
  const [chats, setChats] = useState(initialChats)
  const [selectedChat, setSelectedChat] = useState('1')
  const [message, setMessage] = useState('')
  const [query, setQuery] = useState('')
  const [showNew, setShowNew] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const sourceCounts = useMemo(() => Object.entries(leads.reduce<Record<string, number>>((a, l) => ({ ...a, [l.source]: (a[l.source] || 0) + 1 }), {})), [leads])
  const money = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
  const activeChat = chats.find(c => c.id === selectedChat)!

  function moveLead(id: string, stage: string) { setLeads(old => old.map(l => l.id === id ? { ...l, stage } : l)) }
  function exportCsv() {
    const rows = [['Nome','Empresa','Telefone','Email','Origem','Etapa','Valor','Criado em'], ...leads.map(l => [l.name,l.company,l.phone,l.email,l.source,stages.find(s=>s.id===l.stage)?.name || l.stage,String(l.value),l.createdAt])]
    const blob = new Blob([rows.map(r => r.map(v => `"${v.replaceAll('"','""')}"`).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'leads.csv'; a.click(); URL.revokeObjectURL(a.href)
  }
  function importCsv(file?: File) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const lines = String(reader.result).split(/\r?\n/).slice(1).filter(Boolean)
      const added = lines.map((line, i) => { const c = line.split(',').map(x => x.replace(/^"|"$/g, '').trim()); return { id: `csv-${Date.now()}-${i}`, name: c[0] || 'Sem nome', company: c[1] || '', phone: c[2] || '', email: c[3] || '', source: c[4] || 'Importação', stage: stages.find(s => s.name === c[5])?.id || 'new', value: Number(c[6]) || 0, tags: ['Importado'], createdAt: c[7] || new Date().toISOString().slice(0,10) } })
      setLeads(old => [...old, ...added])
    }
    reader.readAsText(file)
  }
  function sendMessage() {
    if (!message.trim()) return
    setChats(old => old.map(c => c.id === selectedChat ? { ...c, time: 'agora', messages: [...c.messages, { id: crypto.randomUUID(), text: message.trim(), direction: 'out', time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }] } : c)); setMessage('')
  }

  return <div className="min-h-screen bg-[#07101d] text-white">
    <header className="h-16 border-b border-white/[.07] px-6 lg:px-8 flex items-center justify-between bg-[#091525]">
      <div><h1 className="font-semibold text-lg">Gestão Comercial</h1><p className="text-xs text-slate-500">Central de leads, vendas e relacionamento</p></div>
      <div className="flex items-center gap-3"><button className="p-2.5 rounded-lg border border-white/10 text-slate-400"><Settings2 size={17}/></button><div className="h-8 w-px bg-white/10"/><span className="text-xs text-slate-400">Atualizado agora</span></div>
    </header>
    <div className="px-5 lg:px-8 py-6">
      <nav className="flex gap-1 border-b border-white/[.07] mb-7">
        {([{id:'overview',label:'Overview',icon:LayoutDashboard},{id:'crm',label:'CRM Kanban',icon:BarChart3},{id:'chats',label:'Chats',icon:MessageCircle}] as const).map(x => <button key={x.id} onClick={()=>setTab(x.id)} className={`flex items-center gap-2 px-4 py-3 text-sm border-b-2 transition ${tab===x.id?'border-blue-500 text-white':'border-transparent text-slate-500 hover:text-slate-300'}`}><x.icon size={16}/>{x.label}{x.id==='chats'&&<span className="bg-blue-600 text-[10px] rounded-full px-1.5">2</span>}</button>)}
      </nav>

      {tab === 'overview' && <section>
        <div className="flex justify-between items-end mb-5"><div><h2 className="text-xl font-semibold">Visão geral</h2><p className="text-sm text-slate-500 mt-1">Acompanhe o desempenho da sua operação comercial.</p></div><button className="control"><span>Últimos 30 dias</span><ChevronDown size={14}/></button></div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-7">
          <Metric title="Total de leads" value={String(leads.length)} note="+12,5% no período" icon={<Users/>} color="blue"/>
          <Metric title="Em negociação" value={String(leads.filter(l=>['contact','proposal'].includes(l.stage)).length)} note="Leads ativos" icon={<BarChart3/>} color="amber"/>
          <Metric title="Convertidos" value={String(leads.filter(l=>l.stage==='won').length)} note="20% de conversão" icon={<CircleUserRound/>} color="green"/>
          <Metric title="Valor em pipeline" value={money(leads.filter(l=>l.stage!=='won').reduce((a,l)=>a+l.value,0))} note="Potencial estimado" icon={<Inbox/>} color="violet"/>
        </div>
        <div className="grid xl:grid-cols-2 gap-5">
          <Panel title="Leads por origem" subtitle="Distribuição dos canais de aquisição"><div className="space-y-5 mt-6">{sourceCounts.map(([name,count],i)=><div key={name}><div className="flex justify-between text-sm mb-2"><span className="text-slate-300">{name}</span><b>{count} <span className="font-normal text-slate-600">({Math.round(count/leads.length*100)}%)</span></b></div><div className="h-2 bg-white/5 rounded-full"><div className="h-full rounded-full bg-blue-500" style={{width:`${count/leads.length*100}%`,opacity:1-i*.12}}/></div></div>)}</div></Panel>
          <Panel title="Leads por etapa do funil" subtitle="Conversão ao longo do processo"><div className="space-y-4 mt-5">{stages.map(s=>{const count=leads.filter(l=>l.stage===s.id).length;return <div key={s.id} className="flex items-center gap-4 p-3 rounded-lg bg-white/[.025] border border-white/[.05]"><span className="w-2.5 h-2.5 rounded-full" style={{background:s.color}}/><span className="text-sm text-slate-300 flex-1">{s.name}</span><b>{count}</b><span className="text-xs text-slate-600 w-8">{Math.round(count/leads.length*100)}%</span></div>})}</div></Panel>
        </div>
      </section>}

      {tab === 'crm' && <section>
        <div className="flex flex-wrap gap-3 justify-between mb-5"><div><h2 className="text-xl font-semibold">Pipeline comercial</h2><p className="text-sm text-slate-500 mt-1">Arraste os cards para atualizar a etapa.</p></div><div className="flex gap-2"><input ref={fileRef} type="file" accept=".csv" hidden onChange={e=>importCsv(e.target.files?.[0])}/><button className="control" onClick={()=>fileRef.current?.click()}><Upload size={15}/> Importar CSV</button><button className="control" onClick={exportCsv}><Download size={15}/> Exportar</button><button className="primary" onClick={()=>setShowNew(true)}><Plus size={16}/> Novo lead</button></div></div>
        <div className="flex flex-wrap gap-2 mb-5"><div className="search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar lead, empresa..."/></div><button className="control"><Filter size={15}/> Filtros</button><button className="control"><SlidersHorizontal size={15}/> Campos</button></div>
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-4 items-start overflow-x-auto">
          {stages.map(stage=>{const items=leads.filter(l=>l.stage===stage.id&&(l.name+l.company).toLowerCase().includes(query.toLowerCase()));return <div key={stage.id} onDragOver={e=>e.preventDefault()} onDrop={e=>moveLead(e.dataTransfer.getData('lead'),stage.id)} className="rounded-xl bg-[#0a1727] border border-white/[.06] min-h-[480px] p-3"><div className="flex items-center gap-2 px-1 pb-3"><span className="w-2.5 h-2.5 rounded-full" style={{background:stage.color}}/><b className="text-sm flex-1">{stage.name}</b><span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">{items.length}</span><MoreHorizontal size={16} className="text-slate-600"/></div>{items.map(l=><article draggable onDragStart={e=>e.dataTransfer.setData('lead',l.id)} key={l.id} className="bg-[#101f32] border border-white/[.07] rounded-lg p-4 mb-3 cursor-grab hover:border-blue-500/30 transition"><div className="flex justify-between"><div className="w-9 h-9 bg-blue-500/10 text-blue-400 rounded-full grid place-items-center text-xs font-bold">{l.name.split(' ').map(n=>n[0]).slice(0,2)}</div><MoreHorizontal size={16} className="text-slate-600"/></div><h3 className="font-medium text-sm mt-3">{l.name}</h3><p className="text-xs text-slate-500 mt-0.5">{l.company}</p><div className="flex gap-1 mt-3">{l.tags.map(t=><span key={t} className="text-[10px] text-blue-300 bg-blue-500/10 px-2 py-1 rounded"><Tag size={9} className="inline mr-1"/>{t}</span>)}</div><div className="border-t border-white/[.06] mt-3 pt-3 flex justify-between"><b className="text-xs">{money(l.value)}</b><span className="text-[10px] text-slate-600">{new Date(l.createdAt+'T12:00').toLocaleDateString('pt-BR')}</span></div></article>)}<button className="w-full py-2 text-xs text-slate-500 hover:text-white"><Plus size={13} className="inline mr-1"/>Adicionar lead</button></div>})}
        </div>
      </section>}

      {tab === 'chats' && <section className="h-[calc(100vh-165px)] min-h-[600px] border border-white/[.07] rounded-xl overflow-hidden grid md:grid-cols-[340px_1fr] bg-[#091525]">
        <aside className="border-r border-white/[.07] flex flex-col"><div className="p-4 border-b border-white/[.07]"><div className="flex justify-between items-center mb-4"><div><h2 className="font-semibold">Conversas</h2><p className="text-xs text-slate-500">WhatsApp • YCloud</p></div><button className="p-2 bg-blue-600 rounded-lg"><Plus size={16}/></button></div><div className="search w-full"><Search size={15}/><input placeholder="Buscar conversa..."/></div></div><div className="overflow-y-auto">{chats.map(c=><button key={c.id} onClick={()=>{setSelectedChat(c.id);setChats(x=>x.map(v=>v.id===c.id?{...v,unread:0}:v))}} className={`w-full text-left flex gap-3 p-4 border-b border-white/[.05] hover:bg-white/[.03] ${selectedChat===c.id?'bg-blue-500/[.08] border-l-2 border-l-blue-500':'border-l-2 border-l-transparent'}`}><div className="w-10 h-10 rounded-full bg-slate-700 grid place-items-center text-xs font-semibold">{c.name.split(' ').map(n=>n[0]).slice(0,2)}</div><div className="min-w-0 flex-1"><div className="flex justify-between"><b className="text-sm">{c.name}</b><span className="text-[10px] text-slate-500">{c.time}</span></div><p className="text-xs text-slate-500 truncate mt-1">{c.messages.at(-1)?.text}</p></div>{c.unread>0&&<span className="text-[10px] bg-blue-600 rounded-full w-5 h-5 grid place-items-center">{c.unread}</span>}</button>)}</div></aside>
        <div className="flex flex-col min-w-0"><header className="h-[72px] px-5 border-b border-white/[.07] flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-slate-700 grid place-items-center text-xs font-semibold">{activeChat.name.split(' ').map(n=>n[0]).slice(0,2)}</div><div className="flex-1"><b className="text-sm">{activeChat.name}</b><p className="text-xs text-emerald-400">● online</p></div><a href={`tel:${activeChat.phone}`} className="p-2 text-slate-400"><Phone size={18}/></a><button className="p-2 text-slate-400"><MoreHorizontal size={19}/></button></header><div className="bg-blue-500/[.04] border-b border-white/[.06] px-5 py-2.5 flex items-center gap-2 text-xs text-slate-400"><CircleUserRound size={15}/><b className="text-slate-300">{activeChat.name}</b><span>•</span><span>{activeChat.phone}</span><span className="ml-auto bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded">Lead no CRM</span></div><div className="flex-1 overflow-y-auto p-6 space-y-3 bg-[#07111f]"><div className="text-center"><span className="text-[10px] text-slate-500 bg-white/5 px-3 py-1 rounded-full">Hoje</span></div>{activeChat.messages.map(m=><div key={m.id} className={`flex ${m.direction==='out'?'justify-end':'justify-start'}`}><div className={`max-w-[70%] px-4 py-2.5 rounded-xl text-sm ${m.direction==='out'?'bg-blue-600 rounded-br-sm':'bg-[#17263a] rounded-bl-sm'}`}><p>{m.text}</p><p className={`text-[9px] text-right mt-1 ${m.direction==='out'?'text-blue-200':'text-slate-500'}`}>{m.time}{m.direction==='out'?'  ✓✓':''}</p></div></div>)}</div><div className="p-4 border-t border-white/[.07] flex items-center gap-3"><button className="text-slate-500"><Paperclip size={19}/></button><input className="flex-1 bg-white/[.04] border border-white/[.07] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500/50" placeholder="Digite uma mensagem..." value={message} onChange={e=>setMessage(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMessage()}/><button onClick={sendMessage} className="p-2.5 rounded-lg bg-blue-600"><Send size={17}/></button></div></div>
      </section>}
    </div>
    {showNew&&<NewLead onClose={()=>setShowNew(false)} onSave={l=>{setLeads(x=>[...x,l]);setShowNew(false)}}/>}
  </div>
}

function Metric({title,value,note,icon,color}:{title:string;value:string;note:string;icon:React.ReactNode;color:string}) { const colors:Record<string,string>={blue:'bg-blue-500/10 text-blue-400',amber:'bg-amber-500/10 text-amber-400',green:'bg-emerald-500/10 text-emerald-400',violet:'bg-violet-500/10 text-violet-400'}; return <div className="bg-[#0b192b] border border-white/[.07] rounded-xl p-5"><div className="flex justify-between"><p className="text-xs text-slate-500">{title}</p><span className={`p-2 rounded-lg [&>svg]:w-4 [&>svg]:h-4 ${colors[color]}`}>{icon}</span></div><strong className="text-2xl block mt-2">{value}</strong><p className="text-[11px] text-slate-500 mt-2">{note}</p></div> }
function Panel({title,subtitle,children}:{title:string;subtitle:string;children:React.ReactNode}) { return <div className="bg-[#0b192b] border border-white/[.07] rounded-xl p-5"><h3 className="font-medium">{title}</h3><p className="text-xs text-slate-500 mt-1">{subtitle}</p>{children}</div> }
function NewLead({onClose,onSave}:{onClose:()=>void;onSave:(l:Lead)=>void}) { const [name,setName]=useState(''); const [company,setCompany]=useState(''); const [source,setSource]=useState('Instagram'); return <div className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-4"><form onSubmit={e=>{e.preventDefault();if(name)onSave({id:crypto.randomUUID(),name,company,phone:'',email:'',source,stage:'new',value:0,tags:['Novo'],createdAt:new Date().toISOString().slice(0,10)})}} className="w-full max-w-md bg-[#0d1b2e] border border-white/10 rounded-xl p-6"><div className="flex justify-between"><div><h2 className="font-semibold">Novo lead</h2><p className="text-xs text-slate-500 mt-1">Adicione uma oportunidade ao pipeline.</p></div><button type="button" onClick={onClose}><X size={18}/></button></div><label className="field">Nome<input autoFocus value={name} onChange={e=>setName(e.target.value)} required/></label><label className="field">Empresa<input value={company} onChange={e=>setCompany(e.target.value)}/></label><label className="field">Origem<select value={source} onChange={e=>setSource(e.target.value)}><option>Instagram</option><option>WhatsApp</option><option>Site</option><option>Indicação</option></select></label><div className="flex justify-end gap-2 mt-6"><button type="button" className="control" onClick={onClose}>Cancelar</button><button className="primary">Criar lead</button></div></form></div> }
