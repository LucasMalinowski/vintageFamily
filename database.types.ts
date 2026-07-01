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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      annual_events: {
        Row: {
          category_id: string | null
          category_name: string | null
          confirmed_at: string
          created_at: string
          description: string
          family_id: string
          id: string
          is_active: boolean
          typical_amount_cents: number
          typical_month: number
        }
        Insert: {
          category_id?: string | null
          category_name?: string | null
          confirmed_at?: string
          created_at?: string
          description: string
          family_id: string
          id?: string
          is_active?: boolean
          typical_amount_cents: number
          typical_month: number
        }
        Update: {
          category_id?: string | null
          category_name?: string | null
          confirmed_at?: string
          created_at?: string
          description?: string
          family_id?: string
          id?: string
          is_active?: boolean
          typical_amount_cents?: number
          typical_month?: number
        }
        Relationships: [
          {
            foreignKeyName: "annual_events_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annual_events_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      app_config: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      bank_statement_import_batches: {
        Row: {
          created_at: string
          family_id: string
          file_hash: string
          file_name: string | null
          id: string
          page_count: number
          source_bank: string
          source_type: string
          status: string
          summary: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          family_id: string
          file_hash: string
          file_name?: string | null
          id?: string
          page_count?: number
          source_bank: string
          source_type?: string
          status?: string
          summary?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          family_id?: string
          file_hash?: string
          file_name?: string | null
          id?: string
          page_count?: number
          source_bank?: string
          source_type?: string
          status?: string
          summary?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_statement_import_batches_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statement_import_batches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_events: {
        Row: {
          id: string
          processed_at: string
          provider: string
          provider_event_id: string | null
          stripe_event_id: string
          type: string | null
        }
        Insert: {
          id?: string
          processed_at?: string
          provider?: string
          provider_event_id?: string | null
          stripe_event_id: string
          type?: string | null
        }
        Update: {
          id?: string
          processed_at?: string
          provider?: string
          provider_event_id?: string | null
          stripe_event_id?: string
          type?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          family_id: string
          icon: string | null
          id: string
          is_system: boolean
          kind: string
          monthly_limit_cents: number | null
          name: string
          name_en: string | null
          name_es: string | null
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          family_id: string
          icon?: string | null
          id?: string
          is_system?: boolean
          kind: string
          monthly_limit_cents?: number | null
          name: string
          name_en?: string | null
          name_es?: string | null
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          family_id?: string
          icon?: string | null
          id?: string
          is_system?: boolean
          kind?: string
          monthly_limit_cents?: number | null
          name?: string
          name_en?: string | null
          name_es?: string | null
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_limit_silences: {
        Row: {
          billing_period_key: string
          category_id: string
          created_at: string
          family_id: string
        }
        Insert: {
          billing_period_key: string
          category_id: string
          created_at?: string
          family_id: string
        }
        Update: {
          billing_period_key?: string
          category_id?: string
          created_at?: string
          family_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_limit_silences_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_limit_silences_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          stripe_coupon_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          stripe_coupon_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          stripe_coupon_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount_cents: number
          attachment_path: string | null
          category_id: string | null
          category_name: string
          created_at: string
          created_by: string | null
          date: string
          description: string
          family_id: string
          id: string
          import_batch_id: string | null
          import_hash: string | null
          imported_at: string | null
          installment_group_id: string | null
          installment_index: number | null
          installments: number
          low_confidence: boolean
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          raw_description: string | null
          raw_line: string | null
          raw_payload: Json | null
          recurring_pattern_id: string | null
          source: string | null
          source_bank: string | null
          source_type: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          attachment_path?: string | null
          category_id?: string | null
          category_name: string
          created_at?: string
          created_by?: string | null
          date: string
          description: string
          family_id: string
          id?: string
          import_batch_id?: string | null
          import_hash?: string | null
          imported_at?: string | null
          installment_group_id?: string | null
          installment_index?: number | null
          installments?: number
          low_confidence?: boolean
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          raw_description?: string | null
          raw_line?: string | null
          raw_payload?: Json | null
          recurring_pattern_id?: string | null
          source?: string | null
          source_bank?: string | null
          source_type?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          attachment_path?: string | null
          category_id?: string | null
          category_name?: string
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string
          family_id?: string
          id?: string
          import_batch_id?: string | null
          import_hash?: string | null
          imported_at?: string | null
          installment_group_id?: string | null
          installment_index?: number | null
          installments?: number
          low_confidence?: boolean
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          raw_description?: string | null
          raw_line?: string | null
          raw_payload?: Json | null
          recurring_pattern_id?: string | null
          source?: string | null
          source_bank?: string | null
          source_type?: string | null
          status?: string
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
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "bank_statement_import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_recurring_pattern_id_fkey"
            columns: ["recurring_pattern_id"]
            isOneToOne: false
            referencedRelation: "recurring_patterns"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          founders_enabled: boolean
          id: string
          lifetime_access: boolean
          name: string
          trial_expires_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          founders_enabled?: boolean
          id?: string
          lifetime_access?: boolean
          name: string
          trial_expires_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          founders_enabled?: boolean
          id?: string
          lifetime_access?: boolean
          name?: string
          trial_expires_at?: string | null
        }
        Relationships: []
      }
      family_job_locks: {
        Row: {
          family_id: string
          job_type: string
          locked_at: string
          period: string
        }
        Insert: {
          family_id: string
          job_type: string
          locked_at?: string
          period: string
        }
        Update: {
          family_id?: string
          job_type?: string
          locked_at?: string
          period?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_job_locks_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          created_at: string | null
          description: string
          email: string | null
          family_id: string | null
          id: string
          location: string | null
          name: string | null
          phone: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          description: string
          email?: string | null
          family_id?: string | null
          id?: string
          location?: string | null
          name?: string | null
          phone?: string | null
          type?: string
        }
        Update: {
          created_at?: string | null
          description?: string
          email?: string | null
          family_id?: string | null
          id?: string
          location?: string | null
          name?: string | null
          phone?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      founders_allowlist: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      incomes: {
        Row: {
          amount_cents: number
          attachment_path: string | null
          category_id: string | null
          category_name: string
          created_at: string
          created_by: string | null
          date: string
          description: string
          family_id: string
          id: string
          import_batch_id: string | null
          import_hash: string | null
          imported_at: string | null
          low_confidence: boolean
          notes: string | null
          raw_description: string | null
          raw_line: string | null
          raw_payload: Json | null
          recurring_pattern_id: string | null
          source: string | null
          source_bank: string | null
          source_type: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          attachment_path?: string | null
          category_id?: string | null
          category_name: string
          created_at?: string
          created_by?: string | null
          date: string
          description: string
          family_id: string
          id?: string
          import_batch_id?: string | null
          import_hash?: string | null
          imported_at?: string | null
          low_confidence?: boolean
          notes?: string | null
          raw_description?: string | null
          raw_line?: string | null
          raw_payload?: Json | null
          recurring_pattern_id?: string | null
          source?: string | null
          source_bank?: string | null
          source_type?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          attachment_path?: string | null
          category_id?: string | null
          category_name?: string
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string
          family_id?: string
          id?: string
          import_batch_id?: string | null
          import_hash?: string | null
          imported_at?: string | null
          low_confidence?: boolean
          notes?: string | null
          raw_description?: string | null
          raw_line?: string | null
          raw_payload?: Json | null
          recurring_pattern_id?: string | null
          source?: string | null
          source_bank?: string | null
          source_type?: string | null
          status?: string
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
            foreignKeyName: "incomes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incomes_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incomes_recurring_pattern_id_fkey"
            columns: ["recurring_pattern_id"]
            isOneToOne: false
            referencedRelation: "recurring_patterns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incomes_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "bank_statement_import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      insights: {
        Row: {
          content: string
          created_at: string
          family_id: string
          id: string
          period: string | null
          prompt_question: string | null
          sent_channels: string[]
          type: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          family_id: string
          id?: string
          period?: string | null
          prompt_question?: string | null
          sent_channels?: string[]
          type: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          family_id?: string
          id?: string
          period?: string | null
          prompt_question?: string | null
          sent_channels?: string[]
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insights_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insights_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
          token_hash: string | null
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
          token_hash?: string | null
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
          token_hash?: string | null
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
      ip_rate_limit_counters: {
        Row: {
          count: number
          endpoint: string
          key: string
          window_start: string
        }
        Insert: {
          count?: number
          endpoint: string
          key: string
          window_start: string
        }
        Update: {
          count?: number
          endpoint?: string
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      pending_whatsapp_actions: {
        Row: {
          action_type: string
          confirmed_at: string | null
          created_at: string
          expires_at: string
          family_id: string
          id: string
          payload: Json
          phone: string
          rejected_at: string | null
          source_message_id: string
          status: string
          summary_text: string
          transcript: string
          user_id: string
        }
        Insert: {
          action_type: string
          confirmed_at?: string | null
          created_at?: string
          expires_at: string
          family_id: string
          id?: string
          payload: Json
          phone: string
          rejected_at?: string | null
          source_message_id: string
          status?: string
          summary_text: string
          transcript: string
          user_id: string
        }
        Update: {
          action_type?: string
          confirmed_at?: string | null
          created_at?: string
          expires_at?: string
          family_id?: string
          id?: string
          payload?: Json
          phone?: string
          rejected_at?: string | null
          source_message_id?: string
          status?: string
          summary_text?: string
          transcript?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_whatsapp_actions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_whatsapp_actions_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_message_log"
            referencedColumns: ["message_id"]
          },
          {
            foreignKeyName: "pending_whatsapp_actions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_settings: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_visible: boolean
          plan_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_visible?: boolean
          plan_code: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_visible?: boolean
          plan_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_limit_counters: {
        Row: {
          count: number
          endpoint: string
          user_id: string
          window_start: string
        }
        Insert: {
          count?: number
          endpoint: string
          user_id: string
          window_start: string
        }
        Update: {
          count?: number
          endpoint?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      recurring_patterns: {
        Row: {
          amount_is_fixed: boolean
          category_id: string | null
          created_at: string
          day_of_month: number | null
          description_pattern: string
          estimated_amount_cents: number | null
          family_id: string
          frequency: string
          id: string
          is_active: boolean
          kind: string
          last_occurrence_date: string | null
          next_expected_date: string | null
          source: string
          tolerance_days: number
          updated_at: string
        }
        Insert: {
          amount_is_fixed?: boolean
          category_id?: string | null
          created_at?: string
          day_of_month?: number | null
          description_pattern: string
          estimated_amount_cents?: number | null
          family_id: string
          frequency?: string
          id?: string
          is_active?: boolean
          kind?: string
          last_occurrence_date?: string | null
          next_expected_date?: string | null
          source?: string
          tolerance_days?: number
          updated_at?: string
        }
        Update: {
          amount_is_fixed?: boolean
          category_id?: string | null
          created_at?: string
          day_of_month?: number | null
          description_pattern?: string
          estimated_amount_cents?: number | null
          family_id?: string
          frequency?: string
          id?: string
          is_active?: boolean
          kind?: string
          last_occurrence_date?: string | null
          next_expected_date?: string | null
          source?: string
          tolerance_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_patterns_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_patterns_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
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
          hidden_on_dashboard: boolean
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
          hidden_on_dashboard?: boolean
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
          hidden_on_dashboard?: boolean
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
      savings: {
        Row: {
          created_at: string
          family_id: string
          icon: string | null
          id: string
          is_system: boolean
          name: string
          parent_id: string | null
          target_cents: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          family_id: string
          icon?: string | null
          id?: string
          is_system?: boolean
          name: string
          parent_id?: string | null
          target_cents?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          family_id?: string
          icon?: string | null
          id?: string
          is_system?: boolean
          name?: string
          parent_id?: string | null
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
          {
            foreignKeyName: "dreams_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "savings"
            referencedColumns: ["id"]
          },
        ]
      }
      savings_contributions: {
        Row: {
          amount_cents: number
          created_at: string
          created_by: string | null
          date: string
          family_id: string
          id: string
          notes: string | null
          saving_id: string
          type: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          created_by?: string | null
          date: string
          family_id: string
          id?: string
          notes?: string | null
          saving_id: string
          type?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          created_by?: string | null
          date?: string
          family_id?: string
          id?: string
          notes?: string | null
          saving_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "dream_contributions_dream_id_fkey"
            columns: ["saving_id"]
            isOneToOne: false
            referencedRelation: "savings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dream_contributions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "savings_contributions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_customers: {
        Row: {
          created_at: string
          family_id: string
          stripe_customer_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          family_id: string
          stripe_customer_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          family_id?: string
          stripe_customer_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_customers_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          family_id: string
          id: string
          last_stripe_event_created: string | null
          plan_code: string | null
          price_id: string | null
          provider: string
          revenuecat_app_user_id: string | null
          status: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          family_id: string
          id?: string
          last_stripe_event_created?: string | null
          plan_code?: string | null
          price_id?: string | null
          provider?: string
          revenuecat_app_user_id?: string | null
          status?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          family_id?: string
          id?: string
          last_stripe_event_created?: string | null
          plan_code?: string | null
          price_id?: string | null
          provider?: string
          revenuecat_app_user_id?: string | null
          status?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_counters: {
        Row: {
          ai_queries: number
          audio_messages: number
          created_at: string
          export_import_count: number
          family_id: string
          on_demand_insights: number
          period: string
          updated_at: string
          whatsapp_recordings: number
        }
        Insert: {
          ai_queries?: number
          audio_messages?: number
          created_at?: string
          export_import_count?: number
          family_id: string
          on_demand_insights?: number
          period: string
          updated_at?: string
          whatsapp_recordings?: number
        }
        Update: {
          ai_queries?: number
          audio_messages?: number
          created_at?: string
          export_import_count?: number
          family_id?: string
          on_demand_insights?: number
          period?: string
          updated_at?: string
          whatsapp_recordings?: number
        }
        Relationships: [
          {
            foreignKeyName: "usage_counters_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          analytics_consent: boolean | null
          avatar_url: string | null
          billing_cycle_day: number
          created_at: string
          email: string
          family_id: string
          id: string
          insight_channels: string[]
          insight_interval_days: number
          insights_enabled: boolean
          locale: string
          name: string
          password_hash: string | null
          phone_number: string | null
          phone_number_pending: string | null
          phone_otp_hour_count: number
          phone_otp_hour_start: string | null
          phone_otp_sent_at: string | null
          phone_verification_attempts: number
          phone_verification_code: string | null
          phone_verification_expires_at: string | null
          role: string
          super_admin: boolean
        }
        Insert: {
          analytics_consent?: boolean | null
          avatar_url?: string | null
          billing_cycle_day?: number
          created_at?: string
          email: string
          family_id: string
          id?: string
          insight_channels?: string[]
          insight_interval_days?: number
          insights_enabled?: boolean
          locale?: string
          name: string
          password_hash?: string | null
          phone_number?: string | null
          phone_number_pending?: string | null
          phone_otp_hour_count?: number
          phone_otp_hour_start?: string | null
          phone_otp_sent_at?: string | null
          phone_verification_attempts?: number
          phone_verification_code?: string | null
          phone_verification_expires_at?: string | null
          role?: string
          super_admin?: boolean
        }
        Update: {
          analytics_consent?: boolean | null
          avatar_url?: string | null
          billing_cycle_day?: number
          created_at?: string
          email?: string
          family_id?: string
          id?: string
          insight_channels?: string[]
          insight_interval_days?: number
          insights_enabled?: boolean
          locale?: string
          name?: string
          password_hash?: string | null
          phone_number?: string | null
          phone_number_pending?: string | null
          phone_otp_hour_count?: number
          phone_otp_hour_start?: string | null
          phone_otp_sent_at?: string | null
          phone_verification_attempts?: number
          phone_verification_code?: string | null
          phone_verification_expires_at?: string | null
          role?: string
          super_admin?: boolean
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
      web_handoff_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          id: string
          token: string
          token_hash: string | null
          used: boolean
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          token_hash?: string | null
          used?: boolean
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          token_hash?: string | null
          used?: boolean
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_context: {
        Row: {
          context_items: Json
          expires_at: string
          family_id: string
          phone: string
        }
        Insert: {
          context_items?: Json
          expires_at: string
          family_id: string
          phone: string
        }
        Update: {
          context_items?: Json
          expires_at?: string
          family_id?: string
          phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_context_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_message_log: {
        Row: {
          created_at: string | null
          family_id: string | null
          media_id: string | null
          message_id: string
          message_type: string
          transcript: string | null
          transcription_error: string | null
          transcription_model: string | null
          transcription_status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          family_id?: string | null
          media_id?: string | null
          message_id: string
          message_type?: string
          transcript?: string | null
          transcription_error?: string | null
          transcription_model?: string | null
          transcription_status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          family_id?: string | null
          media_id?: string | null
          message_id?: string
          message_type?: string
          transcript?: string | null
          transcription_error?: string | null
          transcription_model?: string | null
          transcription_status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_message_log_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_message_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_ip_rate_limit: {
        Args: {
          p_endpoint: string
          p_key: string
          p_max_count: number
          p_window_seconds?: number
        }
        Returns: boolean
      }
      check_rate_limit: {
        Args: {
          p_endpoint: string
          p_max_count: number
          p_user_id: string
          p_window_seconds?: number
        }
        Returns: boolean
      }
      consume_web_handoff_token: {
        Args: { p_token_hash: string }
        Returns: {
          id: string
          user_id: string
        }[]
      }
      current_family_id: { Args: never; Returns: string }
      delete_user_profile_for_account_deletion: {
        Args: { p_new_admin_id?: string; p_user_id: string }
        Returns: {
          deleted_family: boolean
          family_id: string
        }[]
      }
      increment_usage_counter: {
        Args: {
          p_counter: string
          p_family_id: string
          p_limit: number
          p_period: string
        }
        Returns: {
          allowed: boolean
          new_value: number
        }[]
      }
      is_super_admin: { Args: { check_user?: string }; Returns: boolean }
      remove_family_member_profile: {
        Args: { p_actor_id: string; p_member_id: string }
        Returns: undefined
      }
      rename_my_family: { Args: { p_name: string }; Returns: undefined }
      update_family_currency: {
        Args: { p_currency: string }
        Returns: undefined
      }
      update_family_member_role: {
        Args: { p_member_id: string; p_role: string }
        Returns: undefined
      }
      upsert_subscription_from_revenuecat: {
        Args: {
          p_cancel_at_period_end: boolean
          p_current_period_end: string
          p_current_period_start: string
          p_event_created: string
          p_family_id: string
          p_product_id: string
          p_revenuecat_app_user_id: string
          p_status: string
          p_user_id: string
        }
        Returns: undefined
      }
      upsert_subscription_from_stripe: {
        Args: {
          p_cancel_at_period_end: boolean
          p_current_period_end: string
          p_current_period_start: string
          p_event_created: string
          p_family_id: string
          p_plan_code: string
          p_price_id: string
          p_status: string
          p_stripe_subscription_id: string
          p_user_id: string
        }
        Returns: undefined
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
