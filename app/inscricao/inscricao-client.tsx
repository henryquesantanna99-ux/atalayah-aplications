/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { AlertCircle, CheckCircle2, QrCode, User, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { criarInscricao } from '@/lib/registrations/actions'
import { classifyAge, paymentLabels } from '@/lib/registrations/types'

type FormState = Record<string, string>
const initialForm: FormState = { tipo_inscricao: 'pra_mim', nome_participante: '', nome_inscrito_por: '', idade: '', telefone_contato: '', email_contato: '', cidade: '', bairro: '', sede_regional: '', lider_responsavel: '', area_desejada: '', instrumentos: '', tem_experiencia: '', tempo_experiencia: '', serve_ministerio: '', disponibilidade: '', ajuda_financeira: '', observacoes: '' }
const ministerios = ['Vocal', 'Teclado', 'Violão', 'Guitarra', 'Baixo', 'Bateria', 'Percussão', 'Dança', 'Mídia', 'Som', 'Outro']
const experiencias = ['Sim', 'Não', 'Estou começando agora']

export function InscricaoClient({ initialId }: { initialId?: string }) {
  const [form, setForm] = useState(initialForm)
  const [step, setStep] = useState(initialId ? 3 : 1)
  const [id, setId] = useState(initialId || '')
  const [status, setStatus] = useState('aguardando_pagamento')
  const [pix, setPix] = useState<{ qr_code?: string; qr_code_base64?: string; payment_id?: string } | null>(null)
  const [groupUrl, setGroupUrl] = useState('')
  const [isPending, startTransition] = useTransition()
  const isYouth = form.tipo_inscricao === 'para_jovem'
  const age = form.idade ? Number(form.idade) : null
  const classification = useMemo(() => classifyAge(age), [age])

  useEffect(() => {
    if (!id) return
    const load = async () => {
      const res = await fetch(`/api/inscricoes/${id}/status`)
      if (res.ok) {
        const data = await res.json()
        setStatus(data.status_pagamento)
        setGroupUrl(data.group_url || '')
      }
    }
    load()
    const timer = setInterval(load, 7000)
    return () => clearInterval(timer)
  }, [id])

  function update(key: string, value: string) {
    setForm((current) => ({ ...current, [key]: value, ...(key === 'tem_experiencia' && value !== 'Sim' ? { tempo_experiencia: '' } : {}) }))
  }

  async function submit() {
    startTransition(async () => {
      const response = await criarInscricao(form)
      if (response.success && response.id) {
        setId(response.id)
        window.history.replaceState(null, '', `/inscricao?id=${response.id}`)
        setStep(3)
        toast.success('Inscrição salva. Gere o Pix para confirmar.')
      } else toast.error(response.message || 'Não foi possível salvar a inscrição.')
    })
  }

  async function generatePix() {
    if (!id) return
    startTransition(async () => {
      const res = await fetch(`/api/inscricoes/${id}/pix`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setPix(data)
        setStatus('processando')
        toast.success('Pix gerado com sucesso.')
      } else toast.error(data.message || 'Não foi possível gerar o Pix.')
    })
  }

  return <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
    <section className="rounded-2xl border border-white/[0.08] bg-navy-900 p-4 sm:p-6">
      {step < 3 ? <>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <Choice active={!isYouth} icon={<User className="h-5 w-5" />} title="Inscrição para mim" onClick={() => update('tipo_inscricao', 'pra_mim')} />
          <Choice active={isYouth} icon={<Users className="h-5 w-5" />} title="Para um jovem" onClick={() => update('tipo_inscricao', 'para_jovem')} />
        </div>
        <div className="space-y-6">
          <Block title="Dados pessoais">
            {isYouth && <Field label="Seu Nome Completo" value={form.nome_inscrito_por} onChange={(v) => update('nome_inscrito_por', v)} required />}
            <Field label={isYouth ? 'Nome do Jovem' : 'Nome Completo'} value={form.nome_participante} onChange={(v) => update('nome_participante', v)} required />
            <Field label={isYouth ? 'Idade (se souber)' : 'Idade'} type="number" value={form.idade} onChange={(v) => update('idade', v)} />
            <ReadOnly label="Classificação automática" value={classification} />
            <Field label={isYouth ? 'Seu WhatsApp' : 'WhatsApp'} value={form.telefone_contato} onChange={(v) => update('telefone_contato', v)} required />
            <Field label={isYouth ? 'Seu Email' : 'Email'} type="email" value={form.email_contato} onChange={(v) => update('email_contato', v)} />
          </Block>
          <Block title="Localização">
            <Field label="Cidade" value={form.cidade} onChange={(v) => update('cidade', v)} required />
            <Field label="Bairro" value={form.bairro} onChange={(v) => update('bairro', v)} required />
            <Field label="Sede Regional" value={form.sede_regional} onChange={(v) => update('sede_regional', v)} required />
            <Field label="Líder Responsável" value={form.lider_responsavel} onChange={(v) => update('lider_responsavel', v)} required />
          </Block>
          <Block title="Área ministerial" hint={isYouth ? 'Todos os campos desta seção são opcionais.' : undefined}>
            <SelectField label="Área desejada" value={form.area_desejada} options={ministerios} onChange={(v) => update('area_desejada', v)} />
            <Field label="Instrumentos / habilidades" value={form.instrumentos} onChange={(v) => update('instrumentos', v)} />
            <SelectField label="Tem experiência?" value={form.tem_experiencia} options={experiencias} onChange={(v) => update('tem_experiencia', v)} />
            {form.tem_experiencia === 'Sim' && <Field label="Quanto tempo?" value={form.tempo_experiencia} onChange={(v) => update('tempo_experiencia', v)} />}
            <Field label="Serve em algum ministério hoje?" value={form.serve_ministerio} onChange={(v) => update('serve_ministerio', v)} />
            <Field label="Disponibilidade" value={form.disponibilidade} onChange={(v) => update('disponibilidade', v)} />
            <TextareaField label="Observações" value={form.observacoes} onChange={(v) => update('observacoes', v)} />
          </Block>
        </div>
        <div className="mt-6 flex justify-end"><Button disabled={isPending} onClick={submit} className="h-12 w-full bg-brand text-base hover:bg-brand/90 sm:w-auto">Enviar inscrição</Button></div>
      </> : <FinalStep id={id} status={status} pix={pix} groupUrl={groupUrl} isPending={isPending} onGeneratePix={generatePix} />}
    </section>
    <aside className="space-y-4">
      <Info icon={<AlertCircle className="h-5 w-5" />} text="Sua inscrição somente será confirmada após o pagamento da taxa de inscrição no valor de R$ 29,00." />
      <Info icon={<CheckCircle2 className="h-5 w-5" />} text="O acesso ao grupo será liberado automaticamente após a confirmação do pagamento." />
    </aside>
  </div>
}

function FinalStep({ id, status, pix, groupUrl, isPending, onGeneratePix }: any) { const paid = status === 'pago'; return <div className="space-y-5 text-center"><CheckCircle2 className={`mx-auto h-14 w-14 ${paid ? 'text-emerald-400' : 'text-brand'}`} /><h2 className="text-2xl font-bold">{paid ? 'Pagamento confirmado.' : 'Inscrição recebida!'}</h2><p className="text-[#CBD5E1]">{paid ? 'Sua inscrição foi confirmada.' : 'Aguardando confirmação do pagamento...'}</p><p className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-[#CBD5E1]">ID da inscrição: <span className="font-mono text-white">{id}</span></p><p className="text-sm text-[#94A3B8]">Status: {paymentLabels[status as keyof typeof paymentLabels] || status}</p>{pix?.qr_code_base64 && <img alt="QR Code Pix" className="mx-auto h-56 w-56 rounded-xl bg-white p-2" src={`data:image/png;base64,${pix.qr_code_base64}`} />}{pix?.qr_code && <textarea readOnly value={pix.qr_code} className="min-h-28 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white" />}{paid && groupUrl && <Button asChild className="h-12 w-full bg-emerald-600 text-base hover:bg-emerald-700 sm:w-auto"><a href={groupUrl} target="_blank" rel="noreferrer">Entrar no grupo</a></Button>}{!paid && <p className="text-sm text-[#94A3B8]">Assim que o pagamento for confirmado, volte para esta página para receber seu acesso.</p>}<Button disabled={isPending || paid} onClick={onGeneratePix} className="h-12 w-full bg-brand text-base hover:bg-brand/90 sm:w-auto"><QrCode className="h-5 w-5" />Gerar Pix</Button></div> }
function Choice({ active, icon, title, onClick }: any) { return <button type="button" onClick={onClick} className={`flex min-h-14 flex-1 items-center gap-3 rounded-xl border p-4 text-left transition ${active ? 'border-brand/50 bg-brand/15 text-white' : 'border-white/10 bg-black/20 text-[#CBD5E1]'}`}>{icon}<span className="font-semibold">{title}</span></button> }
function Block({ title, hint, children }: any) { return <section><h2 className="text-lg font-bold text-white">{title}</h2>{hint && <p className="mt-1 text-sm text-[#94A3B8]">{hint}</p>}<div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div></section> }
function Field({ label, value, onChange, type = 'text', required }: any) { return <div><Label>{label}{required && ' *'}</Label><Input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 h-12 border-white/10 bg-black/20 text-base text-white" /></div> }
function TextareaField({ label, value, onChange }: any) { return <div className="sm:col-span-2"><Label>{label}</Label><Textarea value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 min-h-28 border-white/10 bg-black/20 text-base text-white" /></div> }
function ReadOnly({ label, value }: any) { return <div><Label>{label}</Label><div className="mt-2 flex h-12 items-center rounded-md border border-white/10 bg-black/20 px-3 text-base text-[#CBD5E1]">{value}</div></div> }
function SelectField({ label, value, options, onChange }: any) { return <div><Label>{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger className="mt-2 h-12 border-white/10 bg-black/20 text-base text-white"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{options.map((item: string) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div> }
function Info({ icon, text }: any) { return <div className="rounded-2xl border border-white/[0.08] bg-navy-900 p-4 text-sm text-[#CBD5E1]"><div className="mb-2 text-brand">{icon}</div>{text}</div> }
