export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          birth_date: string | null
          avatar_url: string | null
          role: 'admin' | 'integrante'
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
          role?: 'admin' | 'integrante'
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
          role?: 'admin' | 'integrante'
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
        Relationships: []
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
          confirmed: boolean
          confirmed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          profile_id: string
          instrument?: string | null
          confirmed?: boolean
          confirmed_at?: string | null
          created_at?: string
        }
        Update: {
          instrument?: string | null
          confirmed?: boolean
          confirmed_at?: string | null
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
        Relationships: []
      }
      songs: {
        Row: {
          id: string
          title: string
          artist: string | null
          youtube_video_id: string | null
          youtube_url: string | null
          youtube_thumbnail: string | null
          youtube_duration: string | null
          cifra_club_url: string | null
          default_key: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          artist?: string | null
          youtube_video_id?: string | null
          youtube_url?: string | null
          youtube_thumbnail?: string | null
          youtube_duration?: string | null
          cifra_club_url?: string | null
          default_key?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          artist?: string | null
          youtube_video_id?: string | null
          youtube_url?: string | null
          youtube_thumbnail?: string | null
          youtube_duration?: string | null
          cifra_club_url?: string | null
          default_key?: string | null
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
          duration?: number | null
          created_at?: string
        }
        Update: {
          stem_type?: string
          audio_url?: string
          wav_url?: string | null
          storage_path?: string | null
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
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
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

export type Song = Database['public']['Tables']['songs']['Row']
export type SongInsert = Database['public']['Tables']['songs']['Insert']
export type SongUpdate = Database['public']['Tables']['songs']['Update']
export type SongStemJob = Database['public']['Tables']['song_stem_jobs']['Row']
export type SongStem = Database['public']['Tables']['song_stems']['Row']
export type SongChord = Database['public']['Tables']['song_chords']['Row']

export type CommunionPost = Database['public']['Tables']['communion_posts']['Row']
export type CommunionPostInsert = Database['public']['Tables']['communion_posts']['Insert']

export type ChatMessage = Database['public']['Tables']['chat_messages']['Row']
export type ChatMessageInsert = Database['public']['Tables']['chat_messages']['Insert']
export type ChatMessageRead = Database['public']['Tables']['chat_message_reads']['Row']

export type LaiaMessage = Database['public']['Tables']['laia_messages']['Row']
export type LaiaMessageInsert = Database['public']['Tables']['laia_messages']['Insert']

export type LaiaUsage = Database['public']['Tables']['laia_usage']['Row']

// Song variation (catalog entry)
export interface SongVariation {
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

export interface SongVariationWithDetails extends SongVariation {
  songs: Pick<Song, 'id' | 'title' | 'artist' | 'youtube_url'>
  profiles: Pick<Profile, 'id' | 'full_name'> | null
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
