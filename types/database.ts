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

export type CommunionPost = Database['public']['Tables']['communion_posts']['Row']
export type CommunionPostInsert = Database['public']['Tables']['communion_posts']['Insert']

export type ChatMessage = Database['public']['Tables']['chat_messages']['Row']
export type ChatMessageInsert = Database['public']['Tables']['chat_messages']['Insert']
export type ChatMessageRead = Database['public']['Tables']['chat_message_reads']['Row']

export type LaiaMessage = Database['public']['Tables']['laia_messages']['Row']
export type LaiaMessageInsert = Database['public']['Tables']['laia_messages']['Insert']

export type LaiaUsage = Database['public']['Tables']['laia_usage']['Row']

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
