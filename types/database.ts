export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type SentinelaTable<Row extends Record<string, unknown>> = {
  Row: Row
  Insert: Partial<Row>
  Update: Partial<Row>
  Relationships: []
}

type SentinelaRecord = {
  id: string
  season_id: string
  created_at: string
  updated_at: string
}


type SentinelaTables = {
  sentinela_seasons: SentinelaTable<Omit<SentinelaRecord, 'season_id'> & { name: string; slug: string; starts_on: string; ends_on: string; status: 'draft' | 'published' | 'active' | 'completed' | 'archived'; is_public: boolean; created_by: string | null }>
  sentinela_memberships: SentinelaTable<SentinelaRecord & { user_id: string; role: 'participant' | 'mentor' | 'journey_admin'; status: 'invited' | 'active' | 'paused' | 'completed' | 'removed'; joined_at: string | null }>
  sentinela_phases: SentinelaTable<SentinelaRecord & { name: string; position: number; starts_on: string | null; ends_on: string | null; description: string | null; status: 'draft' | 'published' | 'completed' }>
  sentinela_weeks: SentinelaTable<SentinelaRecord & { phase_id: string; week_number: number; title: string; starts_on: string; ends_on: string; status: 'draft' | 'published' | 'completed' }>
  sentinela_milestones: SentinelaTable<SentinelaRecord & { name: string; description: string | null; position: number; status: 'draft' | 'published' | 'archived' }>
  sentinela_levels: SentinelaTable<SentinelaRecord & { milestone_id: string; name: string; rank: number; description: string | null; criteria: Json }>
  sentinela_competency_progress: SentinelaTable<SentinelaRecord & { membership_id: string; milestone_id: string; official_level_id: string | null; self_assessment: Json; mentor_assessment: Json; official_updated_by: string | null; official_updated_at: string | null }>
  sentinela_responsibilities: SentinelaTable<SentinelaRecord & { name: string; description: string | null; configuration: Json; active: boolean }>
  sentinela_squads: SentinelaTable<SentinelaRecord & { phase_id: string; name: string; status: 'draft' | 'active' | 'closed' }>
  sentinela_squad_members: SentinelaTable<Omit<SentinelaRecord, 'updated_at'> & { squad_id: string; membership_id: string; responsibility_id: string | null; starts_at: string; ends_at: string | null }>
  sentinela_missions: SentinelaTable<SentinelaRecord & { phase_id: string | null; week_id: string | null; title: string; description: string | null; status: 'draft' | 'published' | 'closed' | 'archived'; assignment_mode: 'individual' | 'squad' | 'either'; due_at: string | null }>
  sentinela_mission_assignments: SentinelaTable<SentinelaRecord & { mission_id: string; membership_id: string | null; squad_id: string | null; status: 'assigned' | 'in_progress' | 'submitted' | 'completed' | 'cancelled'; response: Json; submitted_at: string | null; reviewed_by: string | null; reviewed_at: string | null }>
  sentinela_academy_areas: SentinelaTable<SentinelaRecord & { name: string; description: string | null; status: 'draft' | 'published' | 'archived'; position: number }>
  sentinela_academy_modules: SentinelaTable<SentinelaRecord & { area_id: string; title: string; description: string | null; status: 'draft' | 'published' | 'archived'; position: number }>
  sentinela_academy_lessons: SentinelaTable<SentinelaRecord & { module_id: string; title: string; content: Json; duration_minutes: number | null; status: 'draft' | 'published' | 'archived'; position: number }>
  sentinela_academy_publications: SentinelaTable<Omit<SentinelaRecord, 'updated_at'> & { lesson_id: string; published_by: string | null; published_at: string; available_from: string | null; available_until: string | null }>
  sentinela_education_progress: SentinelaTable<SentinelaRecord & { membership_id: string; lesson_id: string; status: 'not_started' | 'in_progress' | 'completed'; progress_percent: number; started_at: string | null; completed_at: string | null }>
  sentinela_lesson_notes: SentinelaTable<SentinelaRecord & { membership_id: string; lesson_id: string; body: string }>
  sentinela_checkpoints: SentinelaTable<SentinelaRecord & { milestone_id: string | null; title: string; description: string | null; status: 'draft' | 'published' | 'archived' }>
  sentinela_checkpoint_requirements: SentinelaTable<SentinelaRecord & { checkpoint_id: string; title: string; description: string | null; evidence_required: boolean; position: number }>
  sentinela_checkpoint_progress: SentinelaTable<SentinelaRecord & { membership_id: string; checkpoint_id: string; status: 'not_started' | 'in_progress' | 'submitted' | 'validated' | 'rejected'; validated_by: string | null; validated_at: string | null }>
  sentinela_evidence: SentinelaTable<SentinelaRecord & { membership_id: string; checkpoint_progress_id: string; requirement_id: string | null; storage_path: string; media_type: string | null; description: string | null; status: 'submitted' | 'approved' | 'rejected'; approved_by: string | null; approved_at: string | null }>
  sentinela_checkpoint_feedback: SentinelaTable<SentinelaRecord & { checkpoint_progress_id: string; author_membership_id: string; body: string; visibility: 'participant' | 'staff' }>
  sentinela_rehearsals: SentinelaTable<SentinelaRecord & { phase_id: string | null; title: string; starts_at: string; ends_at: string | null; location: string | null; notes: string | null; status: 'scheduled' | 'completed' | 'cancelled' }>
  sentinela_attendance: SentinelaTable<SentinelaRecord & { rehearsal_id: string; membership_id: string; status: 'expected' | 'present' | 'late' | 'absent' | 'excused'; checked_by: string | null; checked_at: string | null; notes: string | null }>
  sentinela_repertoire: SentinelaTable<SentinelaRecord & { title: string; artist: string | null; reference_url: string | null; status: 'active' | 'archived'; metadata: Json }>
  sentinela_rehearsal_repertoire: SentinelaTable<{ rehearsal_id: string; repertoire_id: string; position: number; notes: string | null; created_at: string }>
  sentinela_recordings: SentinelaTable<SentinelaRecord & { owner_membership_id: string; rehearsal_id: string | null; repertoire_id: string | null; storage_path: string; title: string; visibility: 'private' | 'squad' | 'season' }>
  sentinela_journal_entries: SentinelaTable<SentinelaRecord & { membership_id: string; title: string | null; body: string; storage_path: string | null; week_id: string | null; phase_id: string | null; milestone_id: string | null; mission_id: string | null; rehearsal_id: string | null; checkpoint_id: string | null }>
  sentinela_badges: SentinelaTable<SentinelaRecord & { name: string; description: string | null; visual_asset_url: string | null; status: 'active' | 'archived' }>
  sentinela_badge_grants: SentinelaTable<Omit<SentinelaRecord, 'updated_at'> & { membership_id: string; badge_id: string; granted_by: string; reason: string | null; granted_at: string }>
  sentinela_privileges: SentinelaTable<SentinelaRecord & { name: string; description: string | null; configuration: Json; status: 'active' | 'archived' }>
  sentinela_privilege_grants: SentinelaTable<Omit<SentinelaRecord, 'updated_at'> & { membership_id: string; privilege_id: string; granted_by: string; starts_at: string; expires_at: string | null; revoked_at: string | null }>
  sentinela_avatars: SentinelaTable<SentinelaRecord & { membership_id: string; visual_asset_url: string | null; configuration: Json; is_public: boolean }>
  sentinela_onboarding: SentinelaTable<SentinelaRecord & { membership_id: string; status: 'not_started' | 'in_progress' | 'completed'; answers: Json; completed_at: string | null }>
  sentinela_diagnostics: SentinelaTable<SentinelaRecord & { membership_id: string; kind: 'baseline' | 'final'; responses: Json; submitted_at: string | null; reviewed_by: string | null; reviewed_at: string | null }>
}

export type TeamMastery =
  | '100% da equipe'
  | 'Apenas a banda'
  | 'Apenas os vocais'
  | 'Só algumas pessoas'

export interface Database {
  public: {
    Tables: {
      user_product_scopes: {
        Row: { user_id: string; product: 'main' | 'sentinela'; created_at: string }
        Insert: { user_id: string; product: 'main' | 'sentinela'; created_at?: string }
        Update: never
        Relationships: []
      }
      sentinela_profiles: {
        Row: { user_id: string; display_name: string | null; created_at: string; updated_at: string }
        Insert: { user_id: string; display_name?: string | null; created_at?: string; updated_at?: string }
        Update: { display_name?: string | null; updated_at?: string }
        Relationships: []
      }
      sentinela_onboarding: {
        Row: { user_id: string; state: 'profile' | 'preferences' | 'complete'; created_at: string; updated_at: string }
        Insert: { user_id: string; state?: 'profile' | 'preferences' | 'complete'; created_at?: string; updated_at?: string }
        Update: { state?: 'profile' | 'preferences' | 'complete'; updated_at?: string }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          birth_date: string | null
          avatar_url: string | null
          role: 'admin' | 'editor' | 'integrante'
          status: 'pending' | 'active' | 'inactive'
          onboarding_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          birth_date?: string | null
          avatar_url?: string | null
          role?: 'admin' | 'editor' | 'integrante'
          status?: 'pending' | 'active' | 'inactive'
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          birth_date?: string | null
          avatar_url?: string | null
          role?: 'admin' | 'editor' | 'integrante'
          status?: 'pending' | 'active' | 'inactive'
          onboarding_completed?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          id: string
          profile_id: string
          teams: string[]
          function_role: 'lider' | 'integrante' | null
          instruments: string[]
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          teams?: string[]
          function_role?: 'lider' | 'integrante' | null
          instruments?: string[]
          is_active?: boolean
          created_at?: string
        }
        Update: {
          teams?: string[]
          function_role?: 'lider' | 'integrante' | null
          instruments?: string[]
          is_active?: boolean
        }
        Relationships: [
          { foreignKeyName: 'team_members_profile_id_fkey'; columns: ['profile_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] }
        ]
      }
      events: {
        Row: {
          id: string
          title: string
          type: 'culto' | 'ensaio' | 'comunhao' | 'evento_externo'
          date: string
          arrival_time: string | null
          start_time: string | null
          notes: string | null
          agenda_topic: string | null
          conductor_id: string | null
          location: string | null
          is_online: boolean
          meet_link: string | null
          google_calendar_event_id: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          type?: 'culto' | 'ensaio' | 'comunhao' | 'evento_externo'
          date: string
          arrival_time?: string | null
          start_time?: string | null
          notes?: string | null
          agenda_topic?: string | null
          conductor_id?: string | null
          location?: string | null
          is_online?: boolean
          meet_link?: string | null
          google_calendar_event_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          type?: 'culto' | 'ensaio' | 'comunhao' | 'evento_externo'
          date?: string
          arrival_time?: string | null
          start_time?: string | null
          notes?: string | null
          agenda_topic?: string | null
          conductor_id?: string | null
          location?: string | null
          is_online?: boolean
          meet_link?: string | null
          google_calendar_event_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      event_members: {
        Row: {
          id: string
          event_id: string
          profile_id: string
          instrument: string | null
          schedule_function_id: string | null
          confirmed: boolean
          confirmed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          profile_id: string
          instrument?: string | null
          schedule_function_id?: string | null
          confirmed?: boolean
          confirmed_at?: string | null
          created_at?: string
        }
        Update: {
          instrument?: string | null
          schedule_function_id?: string | null
          confirmed?: boolean
          confirmed_at?: string | null
        }
        Relationships: [
          { foreignKeyName: 'event_members_event_id_fkey'; columns: ['event_id']; referencedRelation: 'events'; referencedColumns: ['id'] },
          { foreignKeyName: 'event_members_profile_id_fkey'; columns: ['profile_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] },
          { foreignKeyName: 'event_members_schedule_function_id_fkey'; columns: ['schedule_function_id']; referencedRelation: 'schedule_functions'; referencedColumns: ['id'] }
        ]
      }
      schedule_functions: {
        Row: {
          id: string
          display_name: string
          category: 'band' | 'vocal' | 'sound' | 'other'
          is_active: boolean
          created_at: string
        }
        Insert: {
          id: string
          display_name: string
          category: 'band' | 'vocal' | 'sound' | 'other'
          is_active?: boolean
          created_at?: string
        }
        Update: {
          display_name?: string
          category?: 'band' | 'vocal' | 'sound' | 'other'
          is_active?: boolean
        }
        Relationships: []
      }
      setlist_songs: {
        Row: {
          id: string
          event_id: string
          order_index: number
          song_title: string
          artist: string | null
          version: string | null
          reference_link: string | null
          song_id: string | null
          soloist_id: string | null
          key_note: string | null
          vocal_guides: string[]
          instrumental_guides: string[]
          playlist_link: string | null
          moment: 'Prévia' | 'Adoração' | 'Palavra' | 'Celebração' | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          order_index?: number
          song_title: string
          artist?: string | null
          version?: string | null
          reference_link?: string | null
          song_id?: string | null
          soloist_id?: string | null
          key_note?: string | null
          vocal_guides?: string[]
          instrumental_guides?: string[]
          playlist_link?: string | null
          moment?: 'Prévia' | 'Adoração' | 'Palavra' | 'Celebração' | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          order_index?: number
          song_title?: string
          artist?: string | null
          version?: string | null
          reference_link?: string | null
          song_id?: string | null
          soloist_id?: string | null
          key_note?: string | null
          vocal_guides?: string[]
          instrumental_guides?: string[]
          playlist_link?: string | null
          moment?: 'Prévia' | 'Adoração' | 'Palavra' | 'Celebração' | null
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: 'setlist_songs_event_id_fkey'; columns: ['event_id']; referencedRelation: 'events'; referencedColumns: ['id'] },
          { foreignKeyName: 'setlist_songs_song_id_fkey'; columns: ['song_id']; referencedRelation: 'songs'; referencedColumns: ['id'] },
          { foreignKeyName: 'setlist_songs_soloist_id_fkey'; columns: ['soloist_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] }
        ]
      }
      repertoires: {
        Row: {
          id: string
          event_id: string
          name: string
          event_date: string
          status: Database['public']['Enums']['repertoire_status']
          version: number
          archived_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          name: string
          event_date: string
          status?: Database['public']['Enums']['repertoire_status']
          version?: number
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          event_id?: string
          name?: string
          event_date?: string
          status?: Database['public']['Enums']['repertoire_status']
          version?: number
          archived_at?: string | null
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: 'repertoires_event_id_fkey'; columns: ['event_id']; referencedRelation: 'events'; referencedColumns: ['id'] }
        ]
      }
      repertoire_items: {
        Row: {
          id: string
          repertoire_id: string
          song_id: string
          order_index: number
          key_note: string | null
          arrangement_changed: boolean
          arrangement_notes: string | null
          liturgical_moment: 'Prévia' | 'Adoração' | 'Palavra' | 'Celebração' | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          repertoire_id: string
          song_id: string
          order_index?: number
          key_note?: string | null
          arrangement_changed?: boolean
          arrangement_notes?: string | null
          liturgical_moment?: 'Prévia' | 'Adoração' | 'Palavra' | 'Celebração' | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          repertoire_id?: string
          song_id?: string
          order_index?: number
          key_note?: string | null
          arrangement_changed?: boolean
          arrangement_notes?: string | null
          liturgical_moment?: 'Prévia' | 'Adoração' | 'Palavra' | 'Celebração' | null
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: 'repertoire_items_repertoire_id_fkey'; columns: ['repertoire_id']; referencedRelation: 'repertoires'; referencedColumns: ['id'] },
          { foreignKeyName: 'repertoire_items_song_id_fkey'; columns: ['song_id']; referencedRelation: 'songs'; referencedColumns: ['id'] }
        ]
      }
      repertoire_item_analyses: {
        Row: {
          id: string
          repertoire_item_id: string
          recency_days: number | null
          team_mastery: Database['public']['Enums']['repertoire_mastery']
          rotation: Database['public']['Enums']['repertoire_rotation']
          strategic_weight: Database['public']['Enums']['repertoire_strategic_weight']
          ip: number
          ici: number
          ico: number
          kanban_stage: Database['public']['Enums']['repertoire_kanban_stage']
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          repertoire_item_id: string
          recency_days?: number | null
          team_mastery: Database['public']['Enums']['repertoire_mastery']
          rotation: Database['public']['Enums']['repertoire_rotation']
          strategic_weight: Database['public']['Enums']['repertoire_strategic_weight']
          ip: number
          ici: number
          ico: number
          kanban_stage?: Database['public']['Enums']['repertoire_kanban_stage']
          created_at?: string
          updated_at?: string
        }
        Update: {
          repertoire_item_id?: string
          recency_days?: number | null
          team_mastery?: Database['public']['Enums']['repertoire_mastery']
          rotation?: Database['public']['Enums']['repertoire_rotation']
          strategic_weight?: Database['public']['Enums']['repertoire_strategic_weight']
          ip?: number
          ici?: number
          ico?: number
          kanban_stage?: Database['public']['Enums']['repertoire_kanban_stage']
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: 'repertoire_item_analyses_repertoire_item_id_fkey'; columns: ['repertoire_item_id']; referencedRelation: 'repertoire_items'; referencedColumns: ['id'] }
        ]
      }
      songs: {
        Row: {
          id: string
          title: string
          artist: string | null
          team_mastery: TeamMastery
          youtube_video_id: string | null
          youtube_url: string | null
          youtube_thumbnail: string | null
          youtube_duration: string | null
          cifra_club_url: string | null
          default_key: string | null
          bpm: number | null
          lyrics_plain: string | null
          lyrics_synced: string | null
          album_name: string | null
          metadata_source: string | null
          metadata_payload: Json
          metadata_fetched_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          artist?: string | null
          team_mastery?: TeamMastery
          youtube_video_id?: string | null
          youtube_url?: string | null
          youtube_thumbnail?: string | null
          youtube_duration?: string | null
          cifra_club_url?: string | null
          default_key?: string | null
          bpm?: number | null
          lyrics_plain?: string | null
          lyrics_synced?: string | null
          album_name?: string | null
          metadata_source?: string | null
          metadata_payload?: Json
          metadata_fetched_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          artist?: string | null
          team_mastery?: TeamMastery
          youtube_video_id?: string | null
          youtube_url?: string | null
          youtube_thumbnail?: string | null
          youtube_duration?: string | null
          cifra_club_url?: string | null
          default_key?: string | null
          bpm?: number | null
          lyrics_plain?: string | null
          lyrics_synced?: string | null
          album_name?: string | null
          metadata_source?: string | null
          metadata_payload?: Json
          metadata_fetched_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      song_stem_jobs: {
        Row: {
          id: string
          song_id: string | null
          setlist_song_id: string | null
          requested_by: string | null
          status: 'pending' | 'processing' | 'completed' | 'failed'
          stems_requested: string[]
          preprocessing_options: string[]
          musicgpt_task_id: string | null
          musicgpt_conversion_id: string | null
          credit_estimate: number | null
          eta: number | null
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          song_id?: string | null
          setlist_song_id?: string | null
          requested_by?: string | null
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          stems_requested?: string[]
          preprocessing_options?: string[]
          musicgpt_task_id?: string | null
          musicgpt_conversion_id?: string | null
          credit_estimate?: number | null
          eta?: number | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          song_id?: string | null
          setlist_song_id?: string | null
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          stems_requested?: string[]
          preprocessing_options?: string[]
          musicgpt_task_id?: string | null
          musicgpt_conversion_id?: string | null
          credit_estimate?: number | null
          eta?: number | null
          error_message?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      song_stems: {
        Row: {
          id: string
          song_id: string | null
          setlist_song_id: string | null
          job_id: string | null
          stem_type: string
          audio_url: string
          wav_url: string | null
          storage_path: string | null
          original_file_name: string | null
          duration: number | null
          created_at: string
        }
        Insert: {
          id?: string
          song_id?: string | null
          setlist_song_id?: string | null
          job_id?: string | null
          stem_type: string
          audio_url: string
          wav_url?: string | null
          storage_path?: string | null
          original_file_name?: string | null
          duration?: number | null
          created_at?: string
        }
        Update: {
          stem_type?: string
          audio_url?: string
          wav_url?: string | null
          storage_path?: string | null
          original_file_name?: string | null
          duration?: number | null
        }
        Relationships: []
      }
      song_chords: {
        Row: {
          id: string
          song_id: string
          provider: string
          title: string
          artist: string | null
          source_url: string | null
          key_note: string | null
          content_json: Json | null
          plain_text: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          song_id: string
          provider?: string
          title: string
          artist?: string | null
          source_url?: string | null
          key_note?: string | null
          content_json?: Json | null
          plain_text?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          provider?: string
          title?: string
          artist?: string | null
          source_url?: string | null
          key_note?: string | null
          content_json?: Json | null
          plain_text?: string | null
          updated_at?: string
        }
        Relationships: []
      }

      song_variations: {
        Row: {
          id: string
          song_id: string
          artist: string | null
          key_note: string | null
          moment: 'Prévia' | 'Adoração' | 'Palavra' | 'Celebração' | null
          soloist_id: string | null
          version: string | null
          youtube_url: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          song_id: string
          artist?: string | null
          key_note?: string | null
          moment?: 'Prévia' | 'Adoração' | 'Palavra' | 'Celebração' | null
          soloist_id?: string | null
          version?: string | null
          youtube_url?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          song_id?: string
          artist?: string | null
          key_note?: string | null
          moment?: 'Prévia' | 'Adoração' | 'Palavra' | 'Celebração' | null
          soloist_id?: string | null
          version?: string | null
          youtube_url?: string | null
          created_by?: string | null
        }
        Relationships: []
      }

      schedules: {
        Row: {
          id: string
          month: number
          year: number
          event_id: string
          created_at: string
        }
        Insert: {
          id?: string
          month: number
          year: number
          event_id: string
          created_at?: string
        }
        Update: {
          month?: number
          year?: number
          event_id?: string
        }
        Relationships: []
      }
      communion_posts: {
        Row: {
          id: string
          author_id: string
          title: string
          content: string | null
          type: 'estudo' | 'reflexao_texto' | 'reflexao_audio'
          audio_url: string | null
          bible_references: string[]
          meet_link: string | null
          meet_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          author_id: string
          title: string
          content?: string | null
          type?: 'estudo' | 'reflexao_texto' | 'reflexao_audio'
          audio_url?: string | null
          bible_references?: string[]
          meet_link?: string | null
          meet_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          content?: string | null
          type?: 'estudo' | 'reflexao_texto' | 'reflexao_audio'
          audio_url?: string | null
          bible_references?: string[]
          meet_link?: string | null
          meet_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          id: string
          author_id: string
          content: string
          type: 'text' | 'audio'
          audio_url: string | null
          is_laia: boolean
          reply_to: string | null
          created_at: string
        }
        Insert: {
          id?: string
          author_id: string
          content: string
          type?: 'text' | 'audio'
          audio_url?: string | null
          is_laia?: boolean
          reply_to?: string | null
          created_at?: string
        }
        Update: {
          content?: string
          type?: 'text' | 'audio'
          audio_url?: string | null
          is_laia?: boolean
        }
        Relationships: []
      }
      chat_message_reads: {
        Row: {
          id: string
          message_id: string
          profile_id: string
          delivered_at: string
          read_at: string | null
        }
        Insert: {
          id?: string
          message_id: string
          profile_id: string
          delivered_at?: string
          read_at?: string | null
        }
        Update: {
          delivered_at?: string
          read_at?: string | null
        }
        Relationships: []
      }
      laia_messages: {
        Row: {
          id: string
          profile_id: string
          role: 'user' | 'assistant'
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          role: 'user' | 'assistant'
          content: string
          created_at?: string
        }
        Update: {
          content?: string
        }
        Relationships: []
      }
      laia_usage: {
        Row: {
          id: string
          profile_id: string
          used_at: string
          count: number
        }
        Insert: {
          id?: string
          profile_id: string
          used_at?: string
          count?: number
        }
        Update: {
          count?: number
        }
        Relationships: []
      }
      automation_workflows: {
        Row: { id: string; name: string; description: string | null; status: 'draft' | 'active' | 'inactive' | 'archived'; published_version: number | null; created_by: string; created_at: string; updated_at: string }
        Insert: { id?: string; name: string; description?: string | null; status?: 'draft' | 'active' | 'inactive' | 'archived'; published_version?: number | null; created_by: string; created_at?: string; updated_at?: string }
        Update: { name?: string; description?: string | null; status?: 'draft' | 'active' | 'inactive' | 'archived'; published_version?: number | null; updated_at?: string }
        Relationships: []
      }
      automation_workflow_versions: {
        Row: { id: string; workflow_id: string; version: number; graph_snapshot: Json; published_at: string; published_by: string | null }
        Insert: { id?: string; workflow_id: string; version: number; graph_snapshot: Json; published_at?: string; published_by?: string | null }
        Update: Record<string, never>
        Relationships: []
      }
      automation_nodes: {
        Row: { id: string; workflow_id: string; node_key: string; node_type: string; position: Json; configuration: Json; input_ports: Json; output_ports: Json; visual_metadata: Json; created_at: string; updated_at: string }
        Insert: { id?: string; workflow_id: string; node_key: string; node_type: string; position?: Json; configuration?: Json; input_ports?: Json; output_ports?: Json; visual_metadata?: Json; created_at?: string; updated_at?: string }
        Update: { node_key?: string; node_type?: string; position?: Json; configuration?: Json; input_ports?: Json; output_ports?: Json; visual_metadata?: Json; updated_at?: string }
        Relationships: []
      }
      automation_edges: {
        Row: { id: string; workflow_id: string; source_node_id: string; target_node_id: string; source_port_id: string; target_port_id: string; visual_metadata: Json; created_at: string; updated_at: string }
        Insert: { id?: string; workflow_id: string; source_node_id: string; target_node_id: string; source_port_id: string; target_port_id: string; visual_metadata?: Json; created_at?: string; updated_at?: string }
        Update: { source_node_id?: string; target_node_id?: string; source_port_id?: string; target_port_id?: string; visual_metadata?: Json; updated_at?: string }
        Relationships: []
      }
      automation_credentials: {
        Row: { id: string; name: string; provider: string; secret_ref: string; created_by: string; created_at: string; updated_at: string }
        Insert: { id?: string; name: string; provider: string; secret_ref: string; created_by: string; created_at?: string; updated_at?: string }
        Update: { name?: string; provider?: string; secret_ref?: string; updated_at?: string }
        Relationships: []
      }
      automation_executions: {
        Row: { id: string; workflow_id: string; workflow_version_id: string | null; status: 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled'; input: Json | null; output: Json | null; error: Json | null; duration_ms: number | null; is_test: boolean; event_idempotency_key: string | null; started_at: string | null; finished_at: string | null; created_at: string }
        Insert: { id?: string; workflow_id: string; workflow_version_id?: string | null; status?: 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled'; input?: Json | null; output?: Json | null; error?: Json | null; duration_ms?: number | null; is_test?: boolean; event_idempotency_key?: string | null; started_at?: string | null; finished_at?: string | null; created_at?: string }
        Update: { status?: 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled'; input?: Json | null; output?: Json | null; error?: Json | null; duration_ms?: number | null; started_at?: string | null; finished_at?: string | null }
        Relationships: []
      }
      automation_node_executions: {
        Row: { id: string; execution_id: string; node_key: string; status: 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped' | 'cancelled'; input: Json | null; output: Json | null; error: Json | null; duration_ms: number | null; started_at: string | null; finished_at: string | null; created_at: string }
        Insert: { id?: string; execution_id: string; node_key: string; status?: 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped' | 'cancelled'; input?: Json | null; output?: Json | null; error?: Json | null; duration_ms?: number | null; started_at?: string | null; finished_at?: string | null; created_at?: string }
        Update: { status?: 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped' | 'cancelled'; input?: Json | null; output?: Json | null; error?: Json | null; duration_ms?: number | null; started_at?: string | null; finished_at?: string | null }
        Relationships: []
      }
      crm_contacts: {
        Row: { id: string; phone: string; name: string | null; lead_id: string | null; created_at: string }
        Insert: { id?: string; phone: string; name?: string | null; lead_id?: string | null; created_at?: string }
        Update: { phone?: string; name?: string | null; lead_id?: string | null }
        Relationships: []
      }
      crm_messages: {
        Row: { id: string; ycloud_id: string | null; contact_id: string; direction: 'inbound' | 'outbound'; body: string | null; message_type: string; status: string | null; payload: Json; sent_at: string; created_at: string }
        Insert: { id?: string; ycloud_id?: string | null; contact_id: string; direction: 'inbound' | 'outbound'; body?: string | null; message_type?: string; status?: string | null; payload?: Json; sent_at?: string; created_at?: string }
        Update: { ycloud_id?: string | null; contact_id?: string; direction?: 'inbound' | 'outbound'; body?: string | null; message_type?: string; status?: string | null; payload?: Json; sent_at?: string }
        Relationships: []
      }
      ycloud_sync_checkpoints: {
        Row: { sync_key: string; mode: 'initial' | 'recovery' | 'reconcile'; cursor: string | null; window_start: string | null; window_end: string | null; last_success_at: string | null; last_error: string | null; metadata: Json; updated_at: string }
        Insert: { sync_key: string; mode: 'initial' | 'recovery' | 'reconcile'; cursor?: string | null; window_start?: string | null; window_end?: string | null; last_success_at?: string | null; last_error?: string | null; metadata?: Json; updated_at?: string }
        Update: { cursor?: string | null; window_start?: string | null; window_end?: string | null; last_success_at?: string | null; last_error?: string | null; metadata?: Json; updated_at?: string }
        Relationships: []
      }
      ycloud_webhook_events: {
        Row: { id: string; fingerprint: string; payload: Json; status: 'pending' | 'processed' | 'failed'; attempts: number; last_error: string | null; received_at: string; processed_at: string | null }
        Insert: { id?: string; fingerprint: string; payload: Json; status?: 'pending' | 'processed' | 'failed'; attempts?: number; last_error?: string | null; received_at?: string; processed_at?: string | null }
        Update: { status?: 'pending' | 'processed' | 'failed'; attempts?: number; last_error?: string | null; processed_at?: string | null }
        Relationships: []
      }
    } & SentinelaTables
    Views: Record<string, never>
    Functions: {
      complete_sentinela_signup: {
        Args: Record<PropertyKey, never>
        Returns: { product: string; onboarding_state: string }[]
      }
      save_event_scale: {
        Args: { p_event_id: string | null; p_event: Json; p_members: Json; p_songs: Json }
        Returns: string
      }
    }
    Enums: {
      repertoire_status: 'draft' | 'consolidated' | 'archived'
      repertoire_mastery: 'low' | 'medium' | 'high'
      repertoire_rotation: 'low' | 'balanced' | 'high'
      repertoire_strategic_weight: 'low' | 'medium' | 'high'
      repertoire_kanban_stage: 'backlog' | 'analysis' | 'rehearsal' | 'ready' | 'performed'
    }
    CompositeTypes: Record<string, never>
  }
}

// Convenience aliases
export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type TeamMember = Database['public']['Tables']['team_members']['Row']
export type TeamMemberInsert = Database['public']['Tables']['team_members']['Insert']

export type Event = Database['public']['Tables']['events']['Row']
export type EventInsert = Database['public']['Tables']['events']['Insert']
export type EventUpdate = Database['public']['Tables']['events']['Update']

export type EventMember = Database['public']['Tables']['event_members']['Row']
export type EventMemberInsert = Database['public']['Tables']['event_members']['Insert']

export type SetlistSong = Database['public']['Tables']['setlist_songs']['Row']
export type SetlistSongInsert = Database['public']['Tables']['setlist_songs']['Insert']
export type SetlistSongUpdate = Database['public']['Tables']['setlist_songs']['Update']


export type Repertoire = Database['public']['Tables']['repertoires']['Row']
export type RepertoireInsert = Database['public']['Tables']['repertoires']['Insert']
export type RepertoireUpdate = Database['public']['Tables']['repertoires']['Update']
export type RepertoireItem = Database['public']['Tables']['repertoire_items']['Row']
export type RepertoireItemInsert = Database['public']['Tables']['repertoire_items']['Insert']
export type RepertoireItemUpdate = Database['public']['Tables']['repertoire_items']['Update']
export type RepertoireItemAnalysis = Database['public']['Tables']['repertoire_item_analyses']['Row']
export type RepertoireItemAnalysisInsert = Database['public']['Tables']['repertoire_item_analyses']['Insert']
export type RepertoireItemAnalysisUpdate = Database['public']['Tables']['repertoire_item_analyses']['Update']

export type Song = Database['public']['Tables']['songs']['Row']
export type SongInsert = Database['public']['Tables']['songs']['Insert']
export type SongUpdate = Database['public']['Tables']['songs']['Update']
export type SongStemJob = Database['public']['Tables']['song_stem_jobs']['Row']
export type SongStem = Database['public']['Tables']['song_stems']['Row']
export type SongChord = Database['public']['Tables']['song_chords']['Row']

export type SongVariation = Database['public']['Tables']['song_variations']['Row']
export type SongVariationInsert = Database['public']['Tables']['song_variations']['Insert']
export type SongVariationUpdate = Database['public']['Tables']['song_variations']['Update']

export type CommunionPost = Database['public']['Tables']['communion_posts']['Row']
export type CommunionPostInsert = Database['public']['Tables']['communion_posts']['Insert']

export type ChatMessage = Database['public']['Tables']['chat_messages']['Row']
export type ChatMessageInsert = Database['public']['Tables']['chat_messages']['Insert']
export type ChatMessageRead = Database['public']['Tables']['chat_message_reads']['Row']

export type LaiaMessage = Database['public']['Tables']['laia_messages']['Row']
export type LaiaMessageInsert = Database['public']['Tables']['laia_messages']['Insert']

export type LaiaUsage = Database['public']['Tables']['laia_usage']['Row']

export interface SongVariationWithDetails extends SongVariation {
  songs: Pick<Song, 'id' | 'title' | 'artist' | 'team_mastery' | 'youtube_video_id' | 'youtube_url' | 'youtube_thumbnail' | 'youtube_duration' | 'bpm' | 'default_key' | 'album_name' | 'lyrics_plain' | 'lyrics_synced' | 'metadata_source' | 'metadata_payload'>
  profiles: Pick<Profile, 'id' | 'full_name'> | null
  song_stems?: Pick<SongStem, 'id' | 'stem_type' | 'original_file_name'>[]
  is_virtual?: boolean
}

// Extended types with joined data
export type EventWithMembers = Event & {
  event_members: (EventMember & { profiles: Profile })[]
}

export type SetlistSongWithSoloist = SetlistSong & {
  profiles: Profile | null
}

export type ChatMessageWithAuthor = ChatMessage & {
  profiles: Profile
}

export type CommunionPostWithAuthor = CommunionPost & {
  profiles: Profile
}

export type ProfileWithTeam = Profile & {
  team_members: TeamMember[]
}
