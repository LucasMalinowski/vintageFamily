export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          family_id: string
          id: string
          is_system: boolean
          kind: string
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          family_id: string
          id?: string
          is_system?: boolean
          kind: string
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          family_id?: string
          id?: string
          is_system?: boolean
          kind?: string
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      dream_contributions: {
        Row: {
          amount_cents: number
          created_at: string
          date: string
          dream_id: string
          family_id: string
          id: string
          notes: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          date: string
          dream_id: string
          family_id: string
          id?: string
          notes?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          date?: string
          dream_id?: string
          family_id?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dream_contributions_dream_id_fkey"
            columns: ["dream_id"]
            isOneToOne: false
            referencedRelation: "dreams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dream_contributions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      dreams: {
        Row: {
          created_at: string
          family_id: string
          id: string
          name: string
          target_cents: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          family_id: string
          id?: string
          name: string
          target_cents?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          family_id?: string
          id?: string
          name?: string
          target_cents?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dreams_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount_cents: number
          category_id: string | null
          category_name: string
          created_at: string
          date: string
          description: string
          family_id: string
          id: string
          notes: string | null
          payment_method: string | null
          installment_group_id: string | null
          installment_index: number | null
          paid_at: string | null
          status: string
          installments: number | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          category_id?: string | null
          category_name: string
          created_at?: string
          date: string
          description: string
          family_id: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          installment_group_id?: string | null
          installment_index?: number | null
          paid_at?: string | null
          status?: string
          installments?: number | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          category_id?: string | null
          category_name?: string
          created_at?: string
          date?: string
          description?: string
          family_id?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          installment_group_id?: string | null
          installment_index?: number | null
          paid_at?: string | null
          status?: string
          installments?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          created_at: string
          id: string
          name: string
          trial_expires_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          trial_expires_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          trial_expires_at?: string | null
        }
        Relationships: []
      }
      incomes: {
        Row: {
          amount_cents: number
          category_id: string | null
          category_name: string
          created_at: string
          date: string
          description: string
          family_id: string
          id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          category_id?: string | null
          category_name: string
          created_at?: string
          date: string
          description: string
          family_id: string
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          category_id?: string | null
          category_name?: string
          created_at?: string
          date?: string
          description?: string
          family_id?: string
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incomes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incomes_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          accepted: boolean
          created_at: string
          email: string
          expires_at: string
          family_id: string
          id: string
          invited_by: string
          token: string
        }
        Insert: {
          accepted?: boolean
          created_at?: string
          email: string
          expires_at: string
          family_id: string
          id?: string
          invited_by: string
          token: string
        }
        Update: {
          accepted?: boolean
          created_at?: string
          email?: string
          expires_at?: string
          family_id?: string
          id?: string
          invited_by?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          category: string
          created_at: string
          done_at: string | null
          due_date: string | null
          due_time: string | null
          family_id: string
          id: string
          is_done: boolean
          note: string | null
          recurrence: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          done_at?: string | null
          due_date?: string | null
          due_time?: string | null
          family_id: string
          id?: string
          is_done?: boolean
          note?: string | null
          recurrence?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          done_at?: string | null
          due_date?: string | null
          due_time?: string | null
          family_id?: string
          id?: string
          is_done?: boolean
          note?: string | null
          recurrence?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          family_id: string
          id: string
          name: string
          password_hash: string
          role: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          family_id: string
          id?: string
          name: string
          password_hash: string
          role?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          family_id?: string
          id?: string
          name?: string
          password_hash?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
