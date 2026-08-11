import { GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ModuleHeader } from '../../_components/module-shell'
import { getAcademyData } from '../../_lib/data'
import { saveLessonNote, saveLessonProgress } from '../../actions'

export default async function Page() {
  const { lessons, progress, notes } = await getAcademyData()
  return <><ModuleHeader eyebrow="Formação" title="Academia" description="Aulas, anotações privadas e progresso educacional — independente da avaliação de competências."/>
    <div className="space-y-4">{lessons.map((lesson) => { const current = progress.find((item) => item.lesson_id === lesson.id); const note = notes.find((item) => item.lesson_id === lesson.id)
      return <article key={lesson.id} className="sentinela-card rounded-2xl p-6"><div className="flex gap-4"><GraduationCap className="text-amber-300"/><div className="flex-1"><h2 className="text-lg">{lesson.title}</h2><p className="text-sm text-slate-500">{lesson.duration_minutes ? `${lesson.duration_minutes} minutos` : 'No seu ritmo'} · {current?.progress_percent ?? 0}% concluído</p></div></div>
        <div className="mt-4 h-1 rounded bg-white/10"><div className="h-full bg-blue-300" style={{ width: `${current?.progress_percent ?? 0}%` }}/></div>
        <form action={saveLessonProgress} className="mt-4 flex gap-2"><input type="hidden" name="lessonId" value={lesson.id}/><input type="hidden" name="progress" value="100"/><Button variant="outline">Marcar como concluída</Button></form>
        <form action={saveLessonNote} className="mt-4"><input type="hidden" name="lessonId" value={lesson.id}/><Textarea name="body" required defaultValue={note?.body} placeholder="Minha anotação desta aula…" className="border-white/10 bg-white/5"/><Button className="mt-2 bg-amber-300 text-slate-950">Salvar anotação</Button></form>
      </article> })}{!lessons.length && <p className="sentinela-card rounded-2xl p-6 text-slate-400">Nenhuma aula foi publicada nesta temporada.</p>}</div></>
}
