'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useRef, useState } from 'react'
import { BarChart3, Bot, CalendarDays, Download, GripVertical, LayoutDashboard, Loader2, MessageCircle, MoreHorizontal, Paperclip, Pencil, Phone, Plus, Search, Send, Settings2, Tag as TagIcon, Trash2, Upload, UserRound, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { contactDisplayName } from '@/lib/ycloud/phone'
import { Automations } from './automations/automations'
import { useProfile } from '@/components/layout/profile-context'

type Board = { id: string; name: string }
type Stage = { id: string; board_id: string; name: string; color: string; position: number }
type Source = { id: string; board_id: string; name: string; color: string }
type Tag = { id: string; board_id: string; name: string; color: string }
type CustomField = { id: string; board_id: string; name: string; field_type: 'text'|'number'|'phone'|'currency'|'date'|'email'|'select'; options: string[]; position: number }
type Lead = { id: string; board_id: string; stage_id: string|null; name: string; company: string|null; phone: string|null; email: string|null; source_id: string|null; value: number|null; tag_ids: string[]; custom_fields: Record<string,string|number>; assignee_id: string|null; due_date: string|null; position: number; created_at: string }
type TeamUser = { id: string; full_name: string|null; email: string; avatar_url: string|null }
type Contact = { id: string; phone: string; name: string|null; lead_id: string|null }
type Message = { id: string; contact_id: string; direction: 'inbound'|'outbound'; body: string|null; sent_at: string; status: string|null }
type Tab = 'overview'|'crm'|'chats'|'automations'
type Entity = 'stage'|'source'|'tag'|'field'
type QueryError = { table: string; code?: string; message: string }
type RealtimeStatus = 'connecting'|'connected'|'error'|'timed_out'|'closed'

const colors = ['#3B82F6','#8B5CF6','#EC4899','#F59E0B','#10B981','#06B6D4','#EF4444','#64748B']
const db = createClient() as any

export function CommercialDashboard() {
  const profile = useProfile()
  const canManage = profile.role === 'admin'
  const [tab,setTab] = useState<Tab>('overview')
  const [boards,setBoards] = useState<Board[]>([]); const [boardId,setBoardId] = useState('')
  const [stages,setStages] = useState<Stage[]>([]); const [sources,setSources] = useState<Source[]>([]); const [tags,setTags] = useState<Tag[]>([]); const [fields,setFields] = useState<CustomField[]>([]); const [leads,setLeads] = useState<Lead[]>([])
  const [contacts,setContacts] = useState<Contact[]>([]); const [messages,setMessages] = useState<Message[]>([])
  const [team,setTeam] = useState<TeamUser[]>([]); const [assigneeFilter,setAssigneeFilter] = useState(canManage?'all':profile.id)
  const [selectedContact,setSelectedContact] = useState(''); const [query,setQuery] = useState(''); const [loading,setLoading] = useState(true)
  const [chatErrors,setChatErrors] = useState<QueryError[]>([]); const [realtimeStatus,setRealtimeStatus] = useState<RealtimeStatus>('connecting')
  const [leadModal,setLeadModal] = useState<{open:boolean;lead?:Lead;stageId?:string}>({open:false})
  const [entityModal,setEntityModal] = useState<{open:boolean;type:Entity;initial?:Stage}>({open:false,type:'stage'})
  const fileRef = useRef<HTMLInputElement>(null)
  const messagesRef = useRef<Message[]>([])

  useEffect(()=>{ messagesRef.current=messages },[messages])

  const reportQueryError = useCallback((table:string,error:{code?:string;message:string}|null|undefined) => {
    if (!error) return null
    const safeError={table,code:error.code,message:error.message}
    console.error('Supabase query failed',safeError)
    return safeError
  },[])

  const load = useCallback(async () => {
    setLoading(true)
    const [boardsResult,stagesResult,sourcesResult,tagsResult,fieldsResult,leadsResult,contactsResult,messagesResult,teamResult] = await Promise.all([
      db.from('crm_boards').select('id,name').order('created_at'), db.from('crm_stages').select('*').order('position'),
      db.from('crm_sources').select('*').order('created_at'), db.from('crm_tags').select('*').order('created_at'),
      db.from('crm_custom_fields').select('*').order('position'), db.from('crm_leads').select('*').order('position'),
      db.from('crm_contacts').select('*').order('created_at',{ascending:false}), db.from('crm_messages').select('*').order('sent_at'),
      db.from('profiles').select('id,full_name,email,avatar_url').eq('status','active').order('full_name'),
    ])
    const results=[
      ['crm_boards',boardsResult],['crm_stages',stagesResult],['crm_sources',sourcesResult],['crm_tags',tagsResult],
      ['crm_custom_fields',fieldsResult],['crm_leads',leadsResult],['crm_contacts',contactsResult],
      ['crm_messages',messagesResult],['profiles',teamResult],
    ] as const
    results.forEach(([table,result])=>reportQueryError(table,result.error))
    setChatErrors(([['crm_contacts',contactsResult.error],['crm_messages',messagesResult.error]] as const)
      .filter(([,error])=>Boolean(error))
      .map(([table,error])=>({table,code:error!.code,message:error!.message})))
    if(!boardsResult.error)setBoards(boardsResult.data||[]); if(!stagesResult.error)setStages(stagesResult.data||[]); if(!sourcesResult.error)setSources(sourcesResult.data||[]); if(!tagsResult.error)setTags(tagsResult.data||[]); if(!fieldsResult.error)setFields(fieldsResult.data||[]); if(!leadsResult.error)setLeads(leadsResult.data||[]); if(!contactsResult.error)setContacts(contactsResult.data||[]); if(!messagesResult.error)setMessages(messagesResult.data||[]); if(!teamResult.error)setTeam(teamResult.data||[])
    setBoardId(current => current || boardsResult.data?.[0]?.id || ''); setSelectedContact(current=>current||contactsResult.data?.[0]?.id||''); setLoading(false)
  },[reportQueryError])
  useEffect(()=>{ void load() },[load])
  useEffect(() => {
    let hasSubscribed=false
    const loadMissedMessages=async()=>{
      const cursor=messagesRef.current.reduce<Message|undefined>((latest,message)=>!latest||message.sent_at>latest.sent_at||(message.sent_at===latest.sent_at&&message.id>latest.id)?message:latest,undefined)
      if(!cursor)return
      const {data,error}=await db.from('crm_messages').select('*').gte('sent_at',cursor.sent_at).order('sent_at').order('id')
      const safeError=reportQueryError('crm_messages',error)
      if(safeError){setChatErrors(current=>[...current.filter(item=>item.table!=='crm_messages'),safeError]);return}
      const missed=(data||[]).filter((message:Message)=>message.sent_at>cursor.sent_at||(message.sent_at===cursor.sent_at&&message.id>cursor.id))
      setChatErrors(current=>current.filter(item=>item.table!=='crm_messages'))
      setMessages(current=>{
        const byId=new Map(current.map(message=>[message.id,message]))
        missed.forEach((message:Message)=>byId.set(message.id,message))
        return Array.from(byId.values()).sort((a,b)=>a.sent_at.localeCompare(b.sent_at)||a.id.localeCompare(b.id))
      })
    }
    const channel = db.channel('commercial-crm-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_contacts' }, (event: { eventType: string; new: Contact }) => {
        if (!event.new?.id) return
        setContacts(current => {
          const exists = current.some(contact => contact.id === event.new.id)
          return exists ? current.map(contact => contact.id === event.new.id ? event.new : contact) : [event.new, ...current]
        })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_messages' }, (event: { eventType: string; new: Message }) => {
        if (!event.new?.id) return
        setMessages(current => {
          const exists = current.some(message => message.id === event.new.id)
          const next = exists ? current.map(message => message.id === event.new.id ? event.new : message) : [...current, event.new]
          return next.sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime())
        })
      }).subscribe((status: string) => {
        if(status==='SUBSCRIBED'){
          setRealtimeStatus('connected')
          if(hasSubscribed)void loadMissedMessages()
          hasSubscribed=true
        }else if(status==='CHANNEL_ERROR'){
          setRealtimeStatus('error'); toast.error('Não foi possível atualizar as conversas em tempo real')
        }else if(status==='TIMED_OUT'){
          setRealtimeStatus('timed_out')
        }else if(status==='CLOSED'){
          setRealtimeStatus('closed')
        }
      })
    return () => { void db.removeChannel(channel) }
  }, [reportQueryError])

  const boardSources=sources.filter(x=>x.board_id===boardId), boardTags=tags.filter(x=>x.board_id===boardId), boardFields=fields.filter(x=>x.board_id===boardId)
  const boardLeads=leads.filter(x=>x.board_id===boardId&&(assigneeFilter==='all'||x.assignee_id===assigneeFilter))
  const allBoardStages=stages.filter(x=>x.board_id===boardId)
  const boardStages=canManage?allBoardStages:allBoardStages.filter(stage=>boardLeads.some(lead=>lead.stage_id===stage.id))
  const sourceStats=boardSources.map(source=>({source,count:boardLeads.filter(l=>l.source_id===source.id).length}))
  const activeContact=contacts.find(c=>c.id===selectedContact); const activeMessages=messages.filter(m=>m.contact_id===selectedContact)
  const chatContacts=[...contacts].sort((a,b)=>{
    const aLast=messages.filter(m=>m.contact_id===a.id).at(-1)?.sent_at||''
    const bLast=messages.filter(m=>m.contact_id===b.id).at(-1)?.sent_at||''
    return bLast.localeCompare(aLast)
  })

  async function createBoard() { const name=prompt('Nome do novo pipeline'); if(!name?.trim())return; const {data,error}=await db.from('crm_boards').insert({name:name.trim()}).select('id,name').single(); if(error)return toast.error(error.message); setBoards((x:Board[])=>[...x,data]);setBoardId(data.id);toast.success('Pipeline criado') }
  async function deleteBoard(){ if(!boardId||!confirm('Excluir este pipeline e todos os seus dados?'))return; await db.from('crm_boards').delete().eq('id',boardId);setBoardId('');await load() }
  async function moveLead(id:string,stage_id:string){ const position=boardLeads.filter(l=>l.stage_id===stage_id).length; setLeads(x=>x.map(l=>l.id===id?{...l,stage_id,position}:l)); const {error}=await db.from('crm_leads').update({stage_id,position}).eq('id',id);if(error){toast.error(error.message);void load()} }
  async function removeEntity(type:Entity,id:string){ const table={stage:'crm_stages',source:'crm_sources',tag:'crm_tags',field:'crm_custom_fields'}[type];if(!confirm('Excluir este item?'))return;const {error}=await db.from(table).delete().eq('id',id);if(error)toast.error(error.message);else void load() }
  function exportCsv(){const head=['nome','empresa','telefone','email','origem','etapa','tags',...boardFields.map(f=>f.name)];const rows=boardLeads.map(l=>[l.name,l.company||'',l.phone||'',l.email||'',boardSources.find(x=>x.id===l.source_id)?.name||'',boardStages.find(x=>x.id===l.stage_id)?.name||'',l.tag_ids.map(id=>boardTags.find(t=>t.id===id)?.name).filter(Boolean).join('|'),...boardFields.map(f=>String(l.custom_fields[f.id]??''))]);const csv=[head,...rows].map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download=`${boards.find(b=>b.id===boardId)?.name||'pipeline'}.csv`;a.click();URL.revokeObjectURL(a.href)}
  async function importCsv(file?:File){if(!file||!boardId||!boardStages[0])return toast.error('Crie ao menos uma etapa antes de importar');const text=await file.text();const lines=text.split(/\r?\n/).slice(1).filter(Boolean);const rows=lines.map(line=>{const c=line.split(',').map(v=>v.replace(/^"|"$/g,''));return {board_id:boardId,stage_id:boardStages[0].id,name:c[0]||'Sem nome',company:c[1]||null,phone:c[2]||null,email:c[3]||null,position:0}});const {error}=await db.from('crm_leads').insert(rows);if(error)toast.error(error.message);else{toast.success(`${rows.length} cards importados`);void load()}}

  if(loading)return <div className="h-screen bg-[#07101d] grid place-items-center text-slate-400"><Loader2 className="animate-spin"/></div>
  return <div className="h-screen w-full min-w-0 overflow-hidden bg-[#07101d] text-white flex flex-col">
    <header className="h-16 shrink-0 border-b border-white/[.07] px-5 lg:px-8 flex items-center justify-between bg-[#091525]"><div><h1 className="font-semibold text-lg">Gestão Comercial</h1><p className="text-xs text-slate-500">Central de leads, vendas e relacionamento</p></div><Settings2 size={18} className="text-slate-500"/></header>
    <nav className="h-14 shrink-0 px-5 lg:px-8 flex gap-1 overflow-x-auto overscroll-x-contain md:overflow-x-hidden border-b border-white/[.07] bg-[#091525]">{([{id:'overview',label:'Overview',icon:LayoutDashboard},{id:'crm',label:'CRM Kanban',icon:BarChart3},{id:'chats',label:'Chats',icon:MessageCircle},{id:'automations',label:'Automações',icon:Bot}] as const).map(x=><button key={x.id} onClick={()=>setTab(x.id)} className={`flex shrink-0 items-center gap-2 px-4 text-sm border-b-2 ${tab===x.id?'border-blue-500 text-white':'border-transparent text-slate-500'}`}><x.icon size={16}/>{x.label}</button>)}</nav>

    {tab!=='chats'&&tab!=='automations'&&<div className="shrink-0 px-5 lg:px-8 py-3 border-b border-white/[.06] flex flex-wrap items-center gap-2 bg-[#081321]"><span className="text-xs text-slate-500">Pipeline</span><select className="control min-w-44" value={boardId} onChange={e=>setBoardId(e.target.value)}><option value="">Nenhum pipeline</option>{boards.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select>{canManage&&<button className="primary" onClick={createBoard}><Plus size={14}/>Novo pipeline</button>}{canManage&&boardId&&<button className="control text-red-400" onClick={deleteBoard}><Trash2 size={14}/></button>}</div>}

    {tab==='overview'&&<main className="flex-1 overflow-y-auto p-5 lg:p-8">{!boardId?<Empty text={canManage?'Crie seu primeiro pipeline para visualizar os indicadores.':'Você ainda não possui tarefas atribuídas.'} onClick={canManage?createBoard:undefined}/>:<><h2 className="text-xl font-semibold">{boards.find(b=>b.id===boardId)?.name}</h2><p className="text-sm text-slate-500 mt-1 mb-6">Indicadores gerados exclusivamente pelos dados deste pipeline.</p><div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-7"><Metric label="Total de cards" value={boardLeads.length}/>{boardStages.map(s=><Metric key={s.id} label={s.name} value={boardLeads.filter(l=>l.stage_id===s.id).length} color={s.color}/>)}</div><div className="grid xl:grid-cols-2 gap-5"><Panel title="Cards por etapa">{boardStages.length?boardStages.map(s=><Bar key={s.id} name={s.name} count={boardLeads.filter(l=>l.stage_id===s.id).length} total={boardLeads.length} color={s.color}/>):<SmallEmpty text="Nenhuma etapa criada."/>}</Panel><Panel title="Cards por origem">{sourceStats.length?sourceStats.map(({source,count})=><Bar key={source.id} name={source.name} count={count} total={boardLeads.length} color={source.color}/>):<SmallEmpty text="Nenhuma origem criada."/>}</Panel></div></>}</main>}

    {tab==='crm'&&<main className="flex flex-1 flex-col min-w-0 min-h-0 overflow-hidden">{!boardId?<div className="flex-1 overflow-y-auto p-8"><Empty text={canManage?'Crie um pipeline para começar.':'Você ainda não possui tarefas atribuídas.'} onClick={canManage?createBoard:undefined}/></div>:<><div className="w-full shrink-0 overflow-hidden p-3 px-5 flex flex-wrap gap-2 border-b border-white/[.06] bg-[#07101d] z-10"><div className="search"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar cards..."/></div>{canManage&&<><button className="control" onClick={()=>setEntityModal({open:true,type:'stage'})}><Plus size={14}/>Etapa</button><button className="control" onClick={()=>setEntityModal({open:true,type:'source'})}><Plus size={14}/>Origem</button><button className="control" onClick={()=>setEntityModal({open:true,type:'tag'})}><TagIcon size={14}/>Tag</button><button className="control" onClick={()=>setEntityModal({open:true,type:'field'})}><Plus size={14}/>Campo personalizado</button></>}<label className="control"><UserRound size={14}/><span className="sr-only">Filtrar por responsável</span><select className="bg-transparent outline-none" value={assigneeFilter} onChange={e=>setAssigneeFilter(e.target.value)} disabled={!canManage}>{canManage&&<option className="bg-[#0d1b2e]" value="all">Todos os responsáveis</option>}<option className="bg-[#0d1b2e]" value={profile.id}>Minhas tarefas</option>{canManage&&team.filter(user=>user.id!==profile.id).map(user=><option className="bg-[#0d1b2e]" key={user.id} value={user.id}>{user.full_name||user.email}</option>)}</select></label><span className="flex-1"/>{canManage&&<><input ref={fileRef} hidden type="file" accept=".csv" onChange={e=>void importCsv(e.target.files?.[0])}/><button className="control" onClick={()=>fileRef.current?.click()}><Upload size={14}/>CSV</button><button className="control" onClick={exportCsv}><Download size={14}/></button></>}</div><div className="commercial-kanban-scroll flex-1 min-w-0 min-h-0 overflow-x-auto overflow-y-auto"><div className="flex w-max min-w-full gap-4 p-4 min-h-full items-start">{boardStages.map(stage=>{const cards=boardLeads.filter(l=>l.stage_id===stage.id&&(l.name+(l.company||'')).toLowerCase().includes(query.toLowerCase()));return <section key={stage.id} className="w-[310px] min-h-full flex flex-col rounded-xl bg-[#0a1727] border border-white/[.06]" onDragOver={e=>e.preventDefault()} onDrop={e=>void moveLead(e.dataTransfer.getData('lead'),stage.id)}><header className="shrink-0 p-3 flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{background:stage.color}}/><b className="text-sm flex-1 truncate">{stage.name}</b><span className="text-xs text-slate-500">{cards.length}</span>{canManage&&<button title="Editar etapa" onClick={()=>setEntityModal({open:true,type:'stage',initial:stage})}><Pencil size={13} className="text-slate-600 hover:text-blue-400"/></button>}{canManage&&<button onClick={()=>void removeEntity('stage',stage.id)}><Trash2 size={13} className="text-slate-600 hover:text-red-400"/></button>}</header><div className="flex-1 px-3">{cards.map(lead=><LeadCard key={lead.id} lead={lead} tags={boardTags} fields={boardFields} team={team} onOpen={()=>setLeadModal({open:true,lead})}/>)}</div>{canManage&&<button className="shrink-0 m-3 mt-2 py-2 text-xs text-slate-500 hover:text-white border border-dashed border-white/10 rounded-lg" onClick={()=>setLeadModal({open:true,stageId:stage.id})}><Plus size={13} className="inline"/> Adicionar card</button>}</section>})}{canManage&&<button onClick={()=>setEntityModal({open:true,type:'stage'})} className="w-[280px] h-12 shrink-0 border border-dashed border-white/10 rounded-xl text-sm text-slate-500 hover:text-white"><Plus size={15} className="inline mr-1"/>Nova etapa</button>}</div></div></>}</main>}

    {tab==='automations'&&<Automations/>}
    {tab==='chats'&&<main className="flex-1 min-h-0 grid md:grid-cols-[340px_1fr] overflow-hidden"><aside className="min-h-0 border-r border-white/[.07] flex flex-col"><div className="shrink-0 p-4 border-b border-white/[.07]"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold">Conversas</h2><RealtimeIndicator status={realtimeStatus}/></div><p className="text-xs text-slate-500 mt-1">Mensagens armazenadas pela YCloud</p></div><div className="flex-1 overflow-y-auto">{chatErrors.length?<ChatLoadError errors={chatErrors} loading={loading} onRetry={()=>void load()}/>:chatContacts.length?chatContacts.map(c=>{const last=messages.filter(m=>m.contact_id===c.id).at(-1);const displayName=contactDisplayName(c);return <button key={c.id} onClick={()=>setSelectedContact(c.id)} className={`w-full p-4 flex gap-3 text-left border-b border-white/[.05] ${selectedContact===c.id?'bg-blue-500/[.08] border-l-2 border-l-blue-500':''}`}><div className="w-10 h-10 shrink-0 rounded-full bg-slate-700 grid place-items-center text-xs">{displayName.slice(0,2).toUpperCase()}</div><div className="min-w-0"><b className="text-sm block truncate">{displayName}</b>{c.name?.trim()&&<p className="text-[10px] text-slate-600 truncate">{c.phone}</p>}<p className="text-xs text-slate-500 truncate mt-1">{last?.body||'Sem mensagens'}</p></div></button>}):<SmallEmpty text="Nenhuma conversa recebida."/>}</div></aside><ChatDetail contact={activeContact} messages={activeMessages} onSent={message=>setMessages(current=>current.some(item=>item.id===message.id)?current:[...current,message])}/></main>}
    {leadModal.open&&<LeadModal boardId={boardId} stages={boardStages} sources={boardSources} tags={boardTags} fields={boardFields} team={team} initial={leadModal.lead} stageId={leadModal.stageId} onClose={()=>setLeadModal({open:false})} onSaved={()=>{setLeadModal({open:false});void load()}}/>}
    {entityModal.open&&<EntityModal type={entityModal.type} boardId={boardId} position={allBoardStages.length} initial={entityModal.initial} onClose={()=>setEntityModal(x=>({...x,open:false}))} onSaved={()=>{setEntityModal(x=>({...x,open:false}));void load()}}/>}
  </div>
}

function LeadCard({lead,tags,fields,team,onOpen}:{lead:Lead;tags:Tag[];fields:CustomField[];team:TeamUser[];onOpen:()=>void}){const assignee=team.find(user=>user.id===lead.assignee_id);return <article draggable onDragStart={e=>e.dataTransfer.setData('lead',lead.id)} onClick={onOpen} className="bg-[#101f32] border border-white/[.07] rounded-lg p-3 mb-3 cursor-pointer hover:border-blue-500/40"><div className="flex gap-2"><GripVertical size={15} className="text-slate-600 cursor-grab"/><b className="text-sm flex-1">{lead.name}</b><MoreHorizontal size={15} className="text-slate-600"/></div>{lead.company&&<p className="text-xs text-slate-500 mt-1 ml-6">{lead.company}</p>}<div className="flex flex-wrap gap-1 mt-3">{lead.tag_ids.map(id=>{const t=tags.find(x=>x.id===id);return t?<span key={id} className="text-[10px] px-2 py-1 rounded" style={{background:`${t.color}22`,color:t.color}}>{t.name}</span>:null})}</div>{(assignee||lead.due_date)&&<div className="flex flex-wrap gap-3 mt-3 text-[10px] text-slate-400">{assignee&&<span className="inline-flex items-center gap-1"><UserRound size={11}/>{assignee.full_name||assignee.email}</span>}{lead.due_date&&<span className={`inline-flex items-center gap-1 ${new Date(`${lead.due_date}T23:59:59`).getTime()<Date.now()?'text-red-400':''}`}><CalendarDays size={11}/>{new Date(`${lead.due_date}T12:00:00`).toLocaleDateString('pt-BR')}</span>}</div>}<div className="mt-2 space-y-1.5">{fields.map(f=>lead.custom_fields[f.id]!==undefined&&lead.custom_fields[f.id]!==''?<p key={f.id} className="rounded bg-white/[.025] px-2 py-1.5 text-[10px] text-slate-500"><span>{f.name}:</span> <b className="text-slate-300">{String(lead.custom_fields[f.id])}</b></p>:null)}</div></article>}
function Metric({label,value,color='#3B82F6'}:{label:string;value:number;color?:string}){return <div className="bg-[#0b192b] border border-white/[.07] rounded-xl p-5"><span className="w-2 h-2 rounded-full block mb-4" style={{background:color}}/><p className="text-xs text-slate-500 truncate">{label}</p><strong className="text-3xl block mt-2">{value}</strong></div>}
function Panel({title,children}:{title:string;children:React.ReactNode}){return <section className="bg-[#0b192b] border border-white/[.07] rounded-xl p-5 max-h-[430px] overflow-y-auto"><h3 className="font-medium sticky top-0 bg-[#0b192b] pb-4">{title}</h3><div className="space-y-5">{children}</div></section>}
function Bar({name,count,total,color}:{name:string;count:number;total:number;color:string}){const pct=total?count/total*100:0;return <div><div className="flex justify-between text-sm mb-2"><span className="text-slate-300">{name}</span><b>{count} <span className="font-normal text-slate-600">({Math.round(pct)}%)</span></b></div><div className="h-2 bg-white/5 rounded-full"><div className="h-full rounded-full" style={{width:`${pct}%`,background:color}}/></div></div>}
function Empty({text,onClick}:{text:string;onClick?:()=>void}){return <div className="h-72 border border-dashed border-white/10 rounded-xl grid place-items-center text-center"><div><BarChart3 className="mx-auto text-slate-700 mb-3"/><p className="text-sm text-slate-400">{text}</p>{onClick&&<button className="primary mt-4" onClick={onClick}><Plus size={14}/>Criar pipeline</button>}</div></div>}
function SmallEmpty({text}:{text:string}){return <p className="text-sm text-slate-600 p-6 text-center">{text}</p>}
function ChatLoadError({errors,loading,onRetry}:{errors:QueryError[];loading:boolean;onRetry:()=>void}){const tables=errors.map(error=>error.table).join(' e ');return <div className="m-4 rounded-lg border border-red-400/20 bg-red-400/[.06] p-4 text-center"><p className="text-sm text-red-200">Não foi possível consultar {tables}.</p><p className="mt-1 text-xs text-slate-500">Verifique a conexão e tente novamente.</p><button className="control mt-4" disabled={loading} onClick={onRetry}>{loading&&<Loader2 size={14} className="animate-spin"/>}Tentar novamente</button></div>}
function RealtimeIndicator({status}:{status:RealtimeStatus}){const labels:Record<RealtimeStatus,string>={connecting:'Conectando',connected:'Ao vivo',error:'Com falha',timed_out:'Tempo esgotado',closed:'Desconectado'};const healthy=status==='connected';return <span title={`Atualização em tempo real: ${labels[status]}`} className={`inline-flex items-center gap-1.5 text-[10px] ${healthy?'text-emerald-400':'text-slate-500'}`}><span className={`h-1.5 w-1.5 rounded-full ${healthy?'bg-emerald-400':'bg-slate-500'}`}/>{labels[status]}</span>}

function EntityModal({type,boardId,position,initial,onClose,onSaved}:{type:Entity;boardId:string;position:number;initial?:Stage;onClose:()=>void;onSaved:()=>void}){
  const [name,setName]=useState(initial?.name||'');const [color,setColor]=useState(initial?.color||colors[0]);const [fieldType,setFieldType]=useState<CustomField['field_type']>('text');const [options,setOptions]=useState('');const labels={stage:initial?'Editar etapa':'Nova etapa',source:'Nova origem',tag:'Nova tag',field:'Novo campo personalizado'}
  async function save(e:React.FormEvent){e.preventDefault();const table={stage:'crm_stages',source:'crm_sources',tag:'crm_tags',field:'crm_custom_fields'}[type];const value=type==='field'?{board_id:boardId,name,field_type:fieldType,position,options:options.split(',').map(value=>value.trim()).filter(Boolean)}:{board_id:boardId,name,color,...(type==='stage'?{position:initial?.position??position}: {})};const query=initial?db.from(table).update(value).eq('id',initial.id):db.from(table).insert(value);const {error}=await query;if(error)toast.error(error.message);else onSaved()}
  return <Modal title={labels[type]} onClose={onClose}><form onSubmit={save}><label className="field">Nome<input autoFocus required value={name} onChange={e=>setName(e.target.value)}/></label>{type==='field'?<><label className="field">Tipo<select value={fieldType} onChange={e=>setFieldType(e.target.value as CustomField['field_type'])}><option value="text">Texto</option><option value="number">Número</option><option value="phone">Telefone</option><option value="currency">Moeda / faturamento</option><option value="date">Data</option><option value="email">E-mail</option><option value="select">Seleção</option></select></label>{fieldType==='select'&&<label className="field">Opções <span className="text-slate-600">(separadas por vírgula)</span><input required value={options} onChange={e=>setOptions(e.target.value)} placeholder="Ex.: Quente, Morno, Frio"/></label>}</>:<label className="field">Cor<div className="flex gap-2 mt-2">{colors.map(c=><button type="button" aria-label={c} key={c} onClick={()=>setColor(c)} className={`w-7 h-7 rounded-full ${color===c?'ring-2 ring-white ring-offset-2 ring-offset-[#0d1b2e]':''}`} style={{background:c}}/>)}</div></label>}<Actions onClose={onClose} editing={Boolean(initial)}/></form></Modal>
}
function LeadModal({boardId,stages,sources,tags,fields,team,initial,stageId,onClose,onSaved}:{boardId:string;stages:Stage[];sources:Source[];tags:Tag[];fields:CustomField[];team:TeamUser[];initial?:Lead;stageId?:string;onClose:()=>void;onSaved:()=>void}){
  const [name,setName]=useState(initial?.name||'');const [company,setCompany]=useState(initial?.company||'');const [phone,setPhone]=useState(initial?.phone||'');const [email,setEmail]=useState(initial?.email||'');const [stage,setStage]=useState(initial?.stage_id||stageId||stages[0]?.id||'');const [source,setSource]=useState(initial?.source_id||'');const [assignee,setAssignee]=useState(initial?.assignee_id||'');const [dueDate,setDueDate]=useState(initial?.due_date||'');const [tagIds,setTagIds]=useState<string[]>(initial?.tag_ids||[]);const [custom,setCustom]=useState<Record<string,string|number>>(initial?.custom_fields||{});const [saving,setSaving]=useState(false)
  async function save(e:React.FormEvent){e.preventDefault();setSaving(true);const value={board_id:boardId,name,company:company||null,phone:phone||null,email:email||null,stage_id:stage||null,source_id:source||null,assignee_id:assignee||null,due_date:dueDate||null,tag_ids:tagIds,custom_fields:custom,position:initial?.position||0};const q=initial?db.from('crm_leads').update(value).eq('id',initial.id):db.from('crm_leads').insert(value);const {error}=await q;setSaving(false);if(error)toast.error(error.message);else onSaved()}
  async function remove(){if(!initial||!confirm('Excluir este card?'))return;const {error}=await db.from('crm_leads').delete().eq('id',initial.id);if(error)toast.error(error.message);else onSaved()}
  return <Modal title={initial?'Editar card':'Novo card'} onClose={onClose} wide><form onSubmit={save} className="grid sm:grid-cols-2 gap-x-4"><label className="field">Nome do card<input autoFocus required value={name} onChange={e=>setName(e.target.value)}/></label><label className="field">Empresa<input value={company} onChange={e=>setCompany(e.target.value)}/></label><label className="field">Telefone<input type="tel" value={phone} onChange={e=>setPhone(e.target.value)}/></label><label className="field">E-mail<input type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><label className="field">Etapa<select value={stage} onChange={e=>setStage(e.target.value)}>{stages.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label className="field">Origem<select value={source} onChange={e=>setSource(e.target.value)}><option value="">Sem origem</option>{sources.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label className="field">Responsável<select value={assignee} onChange={e=>setAssignee(e.target.value)}><option value="">Sem responsável</option>{team.map(user=><option key={user.id} value={user.id}>{user.full_name||user.email}</option>)}</select></label><label className="field">Prazo<input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}/></label>{fields.map(f=><label className="field" key={f.id}>{f.name}{f.field_type==='select'?<select value={custom[f.id]??''} onChange={e=>setCustom(x=>({...x,[f.id]:e.target.value}))}><option value="">Selecione</option>{f.options.map(option=><option key={option} value={option}>{option}</option>)}</select>:<input type={f.field_type==='date'?'date':f.field_type==='email'?'email':f.field_type==='phone'?'tel':['number','currency'].includes(f.field_type)?'number':'text'} step={f.field_type==='currency'?'0.01':undefined} value={custom[f.id]??''} onChange={e=>setCustom(x=>({...x,[f.id]:['number','currency'].includes(f.field_type)?Number(e.target.value):e.target.value}))}/>}</label>)}<fieldset className="sm:col-span-2 mt-5"><legend className="text-xs text-slate-400 mb-2">Tags</legend><div className="flex flex-wrap gap-2">{tags.map(t=><button type="button" key={t.id} onClick={()=>setTagIds(x=>x.includes(t.id)?x.filter(id=>id!==t.id):[...x,t.id])} className={`text-xs px-3 py-1.5 rounded-full border ${tagIds.includes(t.id)?'ring-1 ring-white/50':'opacity-50'}`} style={{borderColor:t.color,color:t.color,background:`${t.color}18`}}>{t.name}</button>)}</div></fieldset><div className="sm:col-span-2 flex items-center mt-6">{initial&&<button type="button" onClick={remove} className="control text-red-400"><Trash2 size={14}/>Excluir</button>}<span className="flex-1"/><button type="button" className="control mr-2" onClick={onClose}>Cancelar</button><button className="primary" disabled={saving}>{saving&&<Loader2 size={14} className="animate-spin"/>}Salvar</button></div></form></Modal>
}
function Modal({title,onClose,wide,children}:{title:string;onClose:()=>void;wide?:boolean;children:React.ReactNode}){return <div className="fixed inset-0 z-50 bg-black/75 grid place-items-center p-4"><div className={`w-full ${wide?'max-w-2xl':'max-w-md'} max-h-[90vh] overflow-y-auto bg-[#0d1b2e] border border-white/10 rounded-xl p-6`}><header className="flex justify-between"><h2 className="font-semibold">{title}</h2><button onClick={onClose}><X size={18}/></button></header>{children}</div></div>}
function Actions({onClose,editing=false}:{onClose:()=>void;editing?:boolean}){return <div className="flex justify-end gap-2 mt-6"><button type="button" className="control" onClick={onClose}>Cancelar</button><button className="primary">{editing?'Salvar':'Criar'}</button></div>}
function ChatDetail({contact,messages,onSent}:{contact?:Contact;messages:Message[];onSent:(message:Message)=>void}){const [text,setText]=useState('');const [sending,setSending]=useState(false);if(!contact)return <div className="grid place-items-center text-sm text-slate-600">Selecione uma conversa</div>;const displayName=contactDisplayName(contact);async function send(){if(!text.trim()||sending)return;setSending(true);try{const response=await fetch('/api/ycloud/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contactId:contact!.id,text:text.trim()})});const result=await response.json();if(!response.ok)throw new Error(result.error||'Não foi possível enviar');onSent(result.message);setText('')}catch(error){toast.error(error instanceof Error?error.message:'Não foi possível enviar')}finally{setSending(false)}}return <section className="min-h-0 flex flex-col"><header className="h-[72px] shrink-0 border-b border-white/[.07] px-5 flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-slate-700 grid place-items-center text-xs">{displayName.slice(0,2).toUpperCase()}</div><div className="flex-1"><b className="text-sm">{displayName}</b>{contact.name?.trim()&&<p className="text-xs text-slate-500">{contact.phone}</p>}</div><a href={`tel:${contact.phone}`}><Phone size={18} className="text-slate-400"/></a></header><div className="flex-1 overflow-y-auto p-5 lg:p-7 space-y-3 bg-[#07111f]">{messages.map(m=><div key={m.id} className={`flex ${m.direction==='outbound'?'justify-end':'justify-start'}`}><div className={`max-w-[72%] px-4 py-2.5 rounded-xl text-sm ${m.direction==='outbound'?'bg-blue-600 rounded-br-sm':'bg-[#17263a] rounded-bl-sm'}`}><p>{m.body||`Mensagem ${m.status||''}`}</p><p className="text-[9px] opacity-60 text-right mt-1">{new Date(m.sent_at).toLocaleString('pt-BR',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'})}</p></div></div>)}</div><div className="shrink-0 p-4 border-t border-white/[.07] flex gap-3"><button disabled title="Envio de anexos ainda não disponível"><Paperclip size={19} className="text-slate-600"/></button><input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void send()}}} className="flex-1 bg-white/[.04] border border-white/[.07] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500/50" placeholder="Digite uma mensagem..."/><button onClick={()=>void send()} disabled={sending||!text.trim()} className="p-2.5 rounded-lg bg-blue-600 disabled:opacity-40">{sending?<Loader2 size={17} className="animate-spin"/>:<Send size={17}/>}</button></div></section>}
