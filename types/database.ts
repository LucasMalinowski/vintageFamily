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
      families: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
      }
      users: {
        Row: {
          id: string
          family_id: string
          name: string
          email: string
          avatar_url: string | null
          password_hash: string
          role: 'admin' | 'member'
          created_at: string
        }
        Insert: {
          id?: string
          family_id: string
          name: string
          email: string
          avatar_url?: string | null
          password_hash: string
          role?: 'admin' | 'member'
          created_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          name?: string
          email?: string
          avatar_url?: string | null
          password_hash?: string
          role?: 'admin' | 'member'
          created_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          family_id: string
          kind: 'expense' | 'income' | 'dream'
          name: string
          is_system: boolean
          created_at: string
        }
        Insert: {
          id?: string
          family_id: string
          kind: 'expense' | 'income' | 'dream'
          name: string
          is_system?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          kind?: 'expense' | 'income' | 'dream'
          name?: string
          is_system?: boolean
          created_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          family_id: string
          category_id: string | null
          category_name: string
          description: string
          amount_cents: number
          date: string
          status: 'open' | 'paid'
          paid_at: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          family_id: string
          category_id?: string | null
          category_name: string
          description: string
          amount_cents: number
          date: string
          status?: 'open' | 'paid'
          paid_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          category_id?: string | null
          category_name?: string
          description?: string
          amount_cents?: number
          date?: string
          status?: 'open' | 'paid'
          paid_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      incomes: {
        Row: {
          id: string
          family_id: string
          category_id: string | null
          category_name: string
          description: string
          amount_cents: number
          date: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          family_id: string
          category_id?: string | null
          category_name: string
          description: string
          amount_cents: number
          date: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          category_id?: string | null
          category_name?: string
          description?: string
          amount_cents?: number
          date?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      dreams: {
        Row: {
          id: string
          family_id: string
          name: string
          target_cents: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          family_id: string
          name: string
          target_cents?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          name?: string
          target_cents?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      dream_contributions: {
        Row: {
          id: string
          family_id: string
          dream_id: string
          amount_cents: number
          date: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          family_id: string
          dream_id: string
          amount_cents: number
          date: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          dream_id?: string
          amount_cents?: number
          date?: string
          notes?: string | null
          created_at?: string
        }
      }
      reminders: {
        Row: {
          id: string
          family_id: string
          title: string
          note: string | null
          due_date: string | null
          due_time: string | null
          recurrence: 'none' | 'weekly' | 'monthly'
          category: 'Casa' | 'Contas' | 'Família' | 'Sonhos' | 'Outros'
          is_done: boolean
          done_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          family_id: string
          title: string
          note?: string | null
          due_date?: string | null
          due_time?: string | null
          recurrence?: 'none' | 'weekly' | 'monthly'
          category?: 'Casa' | 'Contas' | 'Família' | 'Sonhos' | 'Outros'
          is_done?: boolean
          done_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          title?: string
          note?: string | null
          due_date?: string | null
          due_time?: string | null
          recurrence?: 'none' | 'weekly' | 'monthly'
          category?: 'Casa' | 'Contas' | 'Família' | 'Sonhos' | 'Outros'
          is_done?: boolean
          done_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      invites: {
        Row: {
          id: string
          family_id: string
          email: string
          invited_by: string
          token: string
          accepted: boolean
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          family_id: string
          email: string
          invited_by: string
          token: string
          accepted?: boolean
          created_at?: string
          expires_at: string
        }
        Update: {
          id?: string
          family_id?: string
          email?: string
          invited_by?: string
          token?: string
          accepted?: boolean
          created_at?: string
          expires_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
