# Progresso — Estudo > Uma música específica

Checklist das fases descritas no plano de implementação. Atualizado a cada fase concluída.

- [x] **Fase 1 — Migration 053 + upload/hash/dedupe global + wizard**
  - Migration `053_song_study_pipeline.sql`: tabelas do pipeline (`song_audio_versions`, `song_study_identifications`, `song_audio_analyses`, `song_chord_events`, `song_structure_segments`, `song_lyric_timestamps`, `song_study_charts`, `song_study_processing_jobs`, `song_study_sessions`, `song_study_recordings`) + buckets `study-song-audio` (compartilhado) e `study-user-recordings` (privado por dono).
  - `lib/music/study-audio.ts` (hash SHA-256, extensão, validação de nível) + testes em `tests/music/study-audio.test.ts`.
  - `POST /api/study/song-analysis/upload`: hash + dedupe **global** (entre usuários) + upsert de `song_study_sessions`.
  - Wizard nível → instrumento → upload em `app/(app)/estudo/musica/` (com prefill do instrumento a partir de `team_members.instruments`).
  - Card "Uma música específica" ativado em `app/(app)/estudo/page.tsx`.
  - Página de status mínima em `app/(app)/estudo/musica/[versionId]/page.tsx` (será expandida na Fase 6).
- [ ] **Fase 2** — Ampliar integração MusicGPT (stems + áudio→MIDI + tom/andamento)
- [ ] **Fase 3** — Identificação da música via trecho curto + Gemini + LRCLIB
- [ ] **Fase 4** — Motor de inferência de acordes (TS puro)
- [ ] **Fase 5** — Estrutura + timestamps de letra + validação Gemini
- [ ] **Fase 6** — Chart builder (3 níveis) + UI Registrar/Estruturar/Guardar
- [ ] **Fase 7** — Upload opcional Exercitar/Realizar (gravações + feedback)
- [ ] **Fase 8** — Benchmark contra músicas de referência + testes unitários

Plano completo: ver histórico da sessão / `docs/` (este arquivo é só o checklist de acompanhamento).
