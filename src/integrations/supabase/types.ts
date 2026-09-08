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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      allocations: {
        Row: {
          allocation_date: string
          allocation_officer: string | null
          allocation_reference: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          document_id: string | null
          estate_id: string | null
          id: string
          notes: string | null
          property_id: string | null
          ref: string
          sale_id: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allocation_date?: string
          allocation_officer?: string | null
          allocation_reference?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          document_id?: string | null
          estate_id?: string | null
          id?: string
          notes?: string | null
          property_id?: string | null
          ref?: string
          sale_id: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allocation_date?: string
          allocation_officer?: string | null
          allocation_reference?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          document_id?: string | null
          estate_id?: string | null
          id?: string
          notes?: string | null
          property_id?: string | null
          ref?: string
          sale_id?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "allocations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_estate_id_fkey"
            columns: ["estate_id"]
            isOneToOne: false
            referencedRelation: "estates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          new_value: Json | null
          previous_value: Json | null
          record_id: string | null
          table_name: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
          record_id?: string | null
          table_name: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
          record_id?: string | null
          table_name?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      automation_rules: {
        Row: {
          action: string
          created_at: string
          delay_hours: number
          id: string
          is_active: boolean
          name: string
          template_code: string | null
          trigger_event: string
          updated_at: string
        }
        Insert: {
          action: string
          created_at?: string
          delay_hours?: number
          id?: string
          is_active?: boolean
          name: string
          template_code?: string | null
          trigger_event: string
          updated_at?: string
        }
        Update: {
          action?: string
          created_at?: string
          delay_hours?: number
          id?: string
          is_active?: boolean
          name?: string
          template_code?: string | null
          trigger_event?: string
          updated_at?: string
        }
        Relationships: []
      }
      closing_checklist_templates: {
        Row: {
          code: string
          created_at: string
          is_active: boolean
          is_required: boolean
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          is_active?: boolean
          is_required?: boolean
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          is_active?: boolean
          is_required?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      commission_accrual_issues: {
        Row: {
          created_at: string
          detail: string | null
          estate_id: string | null
          id: string
          realtor_id: string | null
          reason: string
          referral_type: Database["public"]["Enums"]["referral_type"]
          resolved_at: string | null
          resolved_by: string | null
          sale_id: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          estate_id?: string | null
          id?: string
          realtor_id?: string | null
          reason: string
          referral_type: Database["public"]["Enums"]["referral_type"]
          resolved_at?: string | null
          resolved_by?: string | null
          sale_id: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          estate_id?: string | null
          id?: string
          realtor_id?: string | null
          reason?: string
          referral_type?: Database["public"]["Enums"]["referral_type"]
          resolved_at?: string | null
          resolved_by?: string | null
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_accrual_issues_estate_id_fkey"
            columns: ["estate_id"]
            isOneToOne: false
            referencedRelation: "estates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_accrual_issues_realtor_id_fkey"
            columns: ["realtor_id"]
            isOneToOne: false
            referencedRelation: "realtors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_accrual_issues_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_rules: {
        Row: {
          created_at: string
          created_by: string | null
          effective_from: string | null
          effective_to: string | null
          estate_id: string | null
          fixed_amount: number
          id: string
          is_active: boolean
          name: string
          notes: string | null
          priority: number
          property_type: string | null
          rate: number
          realtor_id: string | null
          referral_type: Database["public"]["Enums"]["referral_type"] | null
          sales_channel: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effective_from?: string | null
          effective_to?: string | null
          estate_id?: string | null
          fixed_amount?: number
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          priority?: number
          property_type?: string | null
          rate?: number
          realtor_id?: string | null
          referral_type?: Database["public"]["Enums"]["referral_type"] | null
          sales_channel?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effective_from?: string | null
          effective_to?: string | null
          estate_id?: string | null
          fixed_amount?: number
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          priority?: number
          property_type?: string | null
          rate?: number
          realtor_id?: string | null
          referral_type?: Database["public"]["Enums"]["referral_type"] | null
          sales_channel?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_rules_estate_id_fkey"
            columns: ["estate_id"]
            isOneToOne: false
            referencedRelation: "estates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_rules_realtor_id_fkey"
            columns: ["realtor_id"]
            isOneToOne: false
            referencedRelation: "realtors"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          amount: number
          amount_paid: number
          approved_at: string | null
          approved_by: string | null
          beneficiary_snapshot: Json | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          estate_id: string | null
          fixed_component: number
          id: string
          is_auto: boolean
          notes: string | null
          paid_at: string | null
          payable_at: string | null
          property_id: string | null
          rate: number
          realtor_id: string
          ref: string
          referral_type: Database["public"]["Enums"]["referral_type"]
          reversed_at: string | null
          rule_id: string | null
          sale_id: string
          sale_value: number
          split_percent: number
          status: Database["public"]["Enums"]["commission_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount?: number
          amount_paid?: number
          approved_at?: string | null
          approved_by?: string | null
          beneficiary_snapshot?: Json | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          estate_id?: string | null
          fixed_component?: number
          id?: string
          is_auto?: boolean
          notes?: string | null
          paid_at?: string | null
          payable_at?: string | null
          property_id?: string | null
          rate?: number
          realtor_id: string
          ref?: string
          referral_type?: Database["public"]["Enums"]["referral_type"]
          reversed_at?: string | null
          rule_id?: string | null
          sale_id: string
          sale_value?: number
          split_percent?: number
          status?: Database["public"]["Enums"]["commission_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number
          amount_paid?: number
          approved_at?: string | null
          approved_by?: string | null
          beneficiary_snapshot?: Json | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          estate_id?: string | null
          fixed_component?: number
          id?: string
          is_auto?: boolean
          notes?: string | null
          paid_at?: string | null
          payable_at?: string | null
          property_id?: string | null
          rate?: number
          realtor_id?: string
          ref?: string
          referral_type?: Database["public"]["Enums"]["referral_type"]
          reversed_at?: string | null
          rule_id?: string | null
          sale_id?: string
          sale_value?: number
          split_percent?: number
          status?: Database["public"]["Enums"]["commission_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_estate_id_fkey"
            columns: ["estate_id"]
            isOneToOne: false
            referencedRelation: "estates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_realtor_id_fkey"
            columns: ["realtor_id"]
            isOneToOne: false
            referencedRelation: "realtors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "commission_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          country: string | null
          created_at: string
          created_by: string | null
          email: string | null
          full_name: string
          id: string
          id_number: string | null
          id_type: string | null
          is_test: boolean
          location: string | null
          next_of_kin: string | null
          next_of_kin_phone: string | null
          notes: string | null
          phone: string | null
          realtor_id: string | null
          ref: string
          status: string
          updated_at: string
          updated_by: string | null
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name: string
          id?: string
          id_number?: string | null
          id_type?: string | null
          is_test?: boolean
          location?: string | null
          next_of_kin?: string | null
          next_of_kin_phone?: string | null
          notes?: string | null
          phone?: string | null
          realtor_id?: string | null
          ref?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string
          id?: string
          id_number?: string | null
          id_type?: string | null
          is_test?: boolean
          location?: string | null
          next_of_kin?: string | null
          next_of_kin_phone?: string | null
          notes?: string | null
          phone?: string | null
          realtor_id?: string | null
          ref?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_realtor_id_fkey"
            columns: ["realtor_id"]
            isOneToOne: false
            referencedRelation: "realtors"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          date_issued: string | null
          document_group_id: string
          document_type: string
          estate_id: string | null
          expiry_date: string | null
          file_name: string | null
          file_size: number | null
          id: string
          is_current: boolean
          is_test: boolean
          mime_type: string | null
          property_id: string | null
          ref: string
          sale_id: string | null
          status: string
          storage_path: string | null
          superseded_at: string | null
          title: string | null
          updated_at: string
          updated_by: string | null
          uploaded_at: string
          uploaded_by: string | null
          version: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          date_issued?: string | null
          document_group_id?: string
          document_type: string
          estate_id?: string | null
          expiry_date?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          is_current?: boolean
          is_test?: boolean
          mime_type?: string | null
          property_id?: string | null
          ref?: string
          sale_id?: string | null
          status?: string
          storage_path?: string | null
          superseded_at?: string | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          date_issued?: string | null
          document_group_id?: string
          document_type?: string
          estate_id?: string | null
          expiry_date?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          is_current?: boolean
          is_test?: boolean
          mime_type?: string | null
          property_id?: string | null
          ref?: string
          sale_id?: string | null
          status?: string
          storage_path?: string | null
          superseded_at?: string | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_estate_id_fkey"
            columns: ["estate_id"]
            isOneToOne: false
            referencedRelation: "estates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      error_reports: {
        Row: {
          action_attempted: string | null
          created_at: string
          error_summary: string | null
          id: string
          page_path: string | null
          status: string
          technical_context: Json
          updated_at: string
          user_email: string | null
          user_id: string | null
          user_role: string | null
        }
        Insert: {
          action_attempted?: string | null
          created_at?: string
          error_summary?: string | null
          id?: string
          page_path?: string | null
          status?: string
          technical_context?: Json
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Update: {
          action_attempted?: string | null
          created_at?: string
          error_summary?: string | null
          id?: string
          page_path?: string | null
          status?: string
          technical_context?: Json
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Relationships: []
      }
      estates: {
        Row: {
          created_at: string
          created_by: string | null
          default_plot_size: string | null
          default_price: number
          description: string | null
          id: string
          image_url: string | null
          lga: string | null
          location: string | null
          name: string
          project_id: string | null
          promo_price: number | null
          ref: string
          state: string | null
          status: string
          title_documentation: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          default_plot_size?: string | null
          default_price?: number
          description?: string | null
          id?: string
          image_url?: string | null
          lga?: string | null
          location?: string | null
          name: string
          project_id?: string | null
          promo_price?: number | null
          ref?: string
          state?: string | null
          status?: string
          title_documentation?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          default_plot_size?: string | null
          default_price?: number
          description?: string | null
          id?: string
          image_url?: string | null
          lga?: string | null
          location?: string | null
          name?: string
          project_id?: string | null
          promo_price?: number | null
          ref?: string
          state?: string | null
          status?: string
          title_documentation?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          approved_by: string | null
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          estate_id: string | null
          expense_date: string
          id: string
          method: string | null
          project_id: string | null
          receipt_path: string | null
          ref: string
          status: string
          updated_at: string
          updated_by: string | null
          vendor: string | null
        }
        Insert: {
          amount?: number
          approved_by?: string | null
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          estate_id?: string | null
          expense_date?: string
          id?: string
          method?: string | null
          project_id?: string | null
          receipt_path?: string | null
          ref?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          vendor?: string | null
        }
        Update: {
          amount?: number
          approved_by?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          estate_id?: string | null
          expense_date?: string
          id?: string
          method?: string | null
          project_id?: string | null
          receipt_path?: string | null
          ref?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_estate_id_fkey"
            columns: ["estate_id"]
            isOneToOne: false
            referencedRelation: "estates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          page_path: string | null
          resolution_note: string | null
          screenshot_path: string | null
          status: string
          technical_context: Json
          updated_at: string
          user_email: string | null
          user_id: string | null
          user_role: string | null
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          id?: string
          page_path?: string | null
          resolution_note?: string | null
          screenshot_path?: string | null
          status?: string
          technical_context?: Json
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          page_path?: string | null
          resolution_note?: string | null
          screenshot_path?: string | null
          status?: string
          technical_context?: Json
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Relationships: []
      }
      inspections: {
        Row: {
          attendees: number
          created_at: string
          created_by: string | null
          customer_id: string | null
          escort: string | null
          estate_id: string | null
          followup_date: string | null
          id: string
          is_test: boolean
          lead_id: string | null
          notes: string | null
          outcome: string | null
          realtor_id: string | null
          ref: string
          scheduled_date: string
          scheduled_time: string | null
          status: Database["public"]["Enums"]["inspection_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attendees?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          escort?: string | null
          estate_id?: string | null
          followup_date?: string | null
          id?: string
          is_test?: boolean
          lead_id?: string | null
          notes?: string | null
          outcome?: string | null
          realtor_id?: string | null
          ref?: string
          scheduled_date: string
          scheduled_time?: string | null
          status?: Database["public"]["Enums"]["inspection_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attendees?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          escort?: string | null
          estate_id?: string | null
          followup_date?: string | null
          id?: string
          is_test?: boolean
          lead_id?: string | null
          notes?: string | null
          outcome?: string | null
          realtor_id?: string | null
          ref?: string
          scheduled_date?: string
          scheduled_time?: string | null
          status?: Database["public"]["Enums"]["inspection_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspections_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_estate_id_fkey"
            columns: ["estate_id"]
            isOneToOne: false
            referencedRelation: "estates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_realtor_id_fkey"
            columns: ["realtor_id"]
            isOneToOne: false
            referencedRelation: "realtors"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activities: {
        Row: {
          activity_type: string
          created_at: string
          created_by: string | null
          id: string
          lead_id: string
          next_action: string | null
          next_action_at: string | null
          occurred_at: string
          outcome: string | null
          status: string
          summary: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id: string
          next_action?: string | null
          next_action_at?: string | null
          occurred_at?: string
          outcome?: string | null
          status?: string
          summary: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string
          next_action?: string | null
          next_action_at?: string | null
          occurred_at?: string
          outcome?: string | null
          status?: string
          summary?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_sources: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          ai_recommendation: string | null
          ai_score: number | null
          ai_summary: string | null
          budget: number | null
          campaign: string | null
          country: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          email: string | null
          estate_id: string | null
          full_name: string
          id: string
          is_test: boolean
          last_contact_at: string | null
          location: string | null
          next_followup_at: string | null
          notes: string | null
          phone: string | null
          preferred_plot_size: string | null
          property_id: string | null
          purchase_intent: string | null
          realtor_id: string | null
          ref: string
          sales_officer: string | null
          source: string | null
          status: Database["public"]["Enums"]["lead_status"]
          temperature: Database["public"]["Enums"]["lead_temperature"]
          updated_at: string
          updated_by: string | null
          whatsapp: string | null
        }
        Insert: {
          ai_recommendation?: string | null
          ai_score?: number | null
          ai_summary?: string | null
          budget?: number | null
          campaign?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          email?: string | null
          estate_id?: string | null
          full_name: string
          id?: string
          is_test?: boolean
          last_contact_at?: string | null
          location?: string | null
          next_followup_at?: string | null
          notes?: string | null
          phone?: string | null
          preferred_plot_size?: string | null
          property_id?: string | null
          purchase_intent?: string | null
          realtor_id?: string | null
          ref?: string
          sales_officer?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          temperature?: Database["public"]["Enums"]["lead_temperature"]
          updated_at?: string
          updated_by?: string | null
          whatsapp?: string | null
        }
        Update: {
          ai_recommendation?: string | null
          ai_score?: number | null
          ai_summary?: string | null
          budget?: number | null
          campaign?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          email?: string | null
          estate_id?: string | null
          full_name?: string
          id?: string
          is_test?: boolean
          last_contact_at?: string | null
          location?: string | null
          next_followup_at?: string | null
          notes?: string | null
          phone?: string | null
          preferred_plot_size?: string | null
          property_id?: string | null
          purchase_intent?: string | null
          realtor_id?: string | null
          ref?: string
          sales_officer?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          temperature?: Database["public"]["Enums"]["lead_temperature"]
          updated_at?: string
          updated_by?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_estate_id_fkey"
            columns: ["estate_id"]
            isOneToOne: false
            referencedRelation: "estates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_realtor_id_fkey"
            columns: ["realtor_id"]
            isOneToOne: false
            referencedRelation: "realtors"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          body: string
          channel: string
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          body: string
          channel?: string
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          body?: string
          channel?: string
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          status: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          status?: string
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          status?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payment_plans: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          estate_id: string | null
          grace_period_days: number
          id: string
          initial_deposit: number
          installment_amount: number
          installment_count: number
          installment_frequency: string
          interest_rate: number
          is_active: boolean
          name: string
          penalty_rule: string | null
          plan_type: string
          ref: string
          status: string
          total_payable: number
          total_price: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          estate_id?: string | null
          grace_period_days?: number
          id?: string
          initial_deposit?: number
          installment_amount?: number
          installment_count?: number
          installment_frequency?: string
          interest_rate?: number
          is_active?: boolean
          name: string
          penalty_rule?: string | null
          plan_type?: string
          ref?: string
          status?: string
          total_payable?: number
          total_price?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          estate_id?: string | null
          grace_period_days?: number
          id?: string
          initial_deposit?: number
          installment_amount?: number
          installment_count?: number
          installment_frequency?: string
          interest_rate?: number
          is_active?: boolean
          name?: string
          penalty_rule?: string | null
          plan_type?: string
          ref?: string
          status?: string
          total_payable?: number
          total_price?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_plans_estate_id_fkey"
            columns: ["estate_id"]
            isOneToOne: false
            referencedRelation: "estates"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_schedule: {
        Row: {
          amount_due: number
          amount_paid: number
          created_at: string
          created_by: string | null
          customer_id: string | null
          due_date: string
          id: string
          installment_no: number
          label: string | null
          sale_id: string
          status: string
          status_refreshed_at: string | null
          updated_at: string
          updated_by: string | null
          waived_at: string | null
        }
        Insert: {
          amount_due?: number
          amount_paid?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          due_date: string
          id?: string
          installment_no: number
          label?: string | null
          sale_id: string
          status?: string
          status_refreshed_at?: string | null
          updated_at?: string
          updated_by?: string | null
          waived_at?: string | null
        }
        Update: {
          amount_due?: number
          amount_paid?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          due_date?: string
          id?: string
          installment_no?: number
          label?: string | null
          sale_id?: string
          status?: string
          status_refreshed_at?: string | null
          updated_at?: string
          updated_by?: string | null
          waived_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_schedule_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_schedule_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          bank_account: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          is_test: boolean
          method: string
          narration: string | null
          payment_date: string
          property_id: string | null
          receipt_number: string | null
          ref: string
          sale_id: string | null
          schedule_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          transaction_reference: string | null
          updated_at: string
          updated_by: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          bank_account?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          is_test?: boolean
          method?: string
          narration?: string | null
          payment_date?: string
          property_id?: string | null
          receipt_number?: string | null
          ref?: string
          sale_id?: string | null
          schedule_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          transaction_reference?: string | null
          updated_at?: string
          updated_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          bank_account?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          is_test?: boolean
          method?: string
          narration?: string | null
          payment_date?: string
          property_id?: string | null
          receipt_number?: string | null
          ref?: string
          sale_id?: string | null
          schedule_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          transaction_reference?: string | null
          updated_at?: string
          updated_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "payment_schedule"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "v_receivables"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_milestones: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          progress: number
          project_id: string
          status: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          progress?: number
          project_id: string
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          progress?: number
          project_id?: string
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          actual_cost: number | null
          budget: number | null
          created_at: string
          created_by: string | null
          id: string
          land_size: string | null
          location: string | null
          manager_name: string | null
          name: string
          notes: string | null
          progress: number
          project_type: string | null
          ref: string
          start_date: string | null
          status: string
          target_completion: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          actual_cost?: number | null
          budget?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          land_size?: string | null
          location?: string | null
          manager_name?: string | null
          name: string
          notes?: string | null
          progress?: number
          project_type?: string | null
          ref?: string
          start_date?: string | null
          status?: string
          target_completion?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          actual_cost?: number | null
          budget?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          land_size?: string | null
          location?: string | null
          manager_name?: string | null
          name?: string
          notes?: string | null
          progress?: number
          project_type?: string | null
          ref?: string
          start_date?: string | null
          status?: string
          target_completion?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      properties: {
        Row: {
          allocation_status: string | null
          block: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          estate_id: string
          id: string
          is_demo: boolean
          notes: string | null
          plot_number: string
          plot_size: string | null
          price: number
          promo_price: number | null
          property_type: string
          realtor_id: string | null
          ref: string
          reservation_date: string | null
          sale_date: string | null
          status: Database["public"]["Enums"]["property_status"]
          title_documentation: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allocation_status?: string | null
          block?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          estate_id: string
          id?: string
          is_demo?: boolean
          notes?: string | null
          plot_number: string
          plot_size?: string | null
          price?: number
          promo_price?: number | null
          property_type?: string
          realtor_id?: string | null
          ref?: string
          reservation_date?: string | null
          sale_date?: string | null
          status?: Database["public"]["Enums"]["property_status"]
          title_documentation?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allocation_status?: string | null
          block?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          estate_id?: string
          id?: string
          is_demo?: boolean
          notes?: string | null
          plot_number?: string
          plot_size?: string | null
          price?: number
          promo_price?: number | null
          property_type?: string
          realtor_id?: string | null
          ref?: string
          reservation_date?: string | null
          sale_date?: string | null
          status?: Database["public"]["Enums"]["property_status"]
          title_documentation?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_customer_fk"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_estate_id_fkey"
            columns: ["estate_id"]
            isOneToOne: false
            referencedRelation: "estates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_realtor_id_fkey"
            columns: ["realtor_id"]
            isOneToOne: false
            referencedRelation: "realtors"
            referencedColumns: ["id"]
          },
        ]
      }
      realtor_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          created_at: string
          id: string
          lead_id: string | null
          note: string | null
          realtor_id: string | null
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          note?: string | null
          realtor_id?: string | null
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          note?: string | null
          realtor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "realtor_assignments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "realtor_assignments_realtor_id_fkey"
            columns: ["realtor_id"]
            isOneToOne: false
            referencedRelation: "realtors"
            referencedColumns: ["id"]
          },
        ]
      }
      realtors: {
        Row: {
          commission_rate: number
          created_at: string
          created_by: string | null
          date_joined: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          location: string | null
          manager_id: string | null
          notes: string | null
          phone: string | null
          ref: string
          registration_status: string
          status: string
          updated_at: string
          updated_by: string | null
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          commission_rate?: number
          created_at?: string
          created_by?: string | null
          date_joined?: string
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          location?: string | null
          manager_id?: string | null
          notes?: string | null
          phone?: string | null
          ref?: string
          registration_status?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          commission_rate?: number
          created_at?: string
          created_by?: string | null
          date_joined?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          location?: string | null
          manager_id?: string | null
          notes?: string | null
          phone?: string | null
          ref?: string
          registration_status?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "realtors_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "realtors"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          channel: string
          created_at: string
          customer_id: string | null
          delivery_status: string
          error: string | null
          id: string
          message: string | null
          provider: string | null
          provider_message_id: string | null
          realtor_id: string | null
          recipient_address: string | null
          recipient_name: string | null
          reminder_type: string
          sale_id: string | null
          schedule_id: string | null
          scheduled_at: string
          sent_at: string | null
          template_code: string | null
          updated_at: string
        }
        Insert: {
          channel?: string
          created_at?: string
          customer_id?: string | null
          delivery_status?: string
          error?: string | null
          id?: string
          message?: string | null
          provider?: string | null
          provider_message_id?: string | null
          realtor_id?: string | null
          recipient_address?: string | null
          recipient_name?: string | null
          reminder_type: string
          sale_id?: string | null
          schedule_id?: string | null
          scheduled_at?: string
          sent_at?: string | null
          template_code?: string | null
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          customer_id?: string | null
          delivery_status?: string
          error?: string | null
          id?: string
          message?: string | null
          provider?: string | null
          provider_message_id?: string | null
          realtor_id?: string | null
          recipient_address?: string | null
          recipient_name?: string | null
          reminder_type?: string
          sale_id?: string | null
          schedule_id?: string | null
          scheduled_at?: string
          sent_at?: string | null
          template_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_realtor_id_fkey"
            columns: ["realtor_id"]
            isOneToOne: false
            referencedRelation: "realtors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "payment_schedule"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "v_receivables"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_expiry_log: {
        Row: {
          action: string
          created_at: string
          customer_id: string | null
          detail: string | null
          expiry_date: string | null
          id: string
          property_id: string | null
          property_released: boolean
          realtor_id: string | null
          reservation_id: string | null
          reservation_ref: string | null
        }
        Insert: {
          action: string
          created_at?: string
          customer_id?: string | null
          detail?: string | null
          expiry_date?: string | null
          id?: string
          property_id?: string | null
          property_released?: boolean
          realtor_id?: string | null
          reservation_id?: string | null
          reservation_ref?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          customer_id?: string | null
          detail?: string | null
          expiry_date?: string | null
          id?: string
          property_id?: string | null
          property_released?: boolean
          realtor_id?: string | null
          reservation_id?: string | null
          reservation_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservation_expiry_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_expiry_log_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_expiry_log_realtor_id_fkey"
            columns: ["realtor_id"]
            isOneToOne: false
            referencedRelation: "realtors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_expiry_log_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          estate_id: string | null
          expired_at: string | null
          expiry_date: string | null
          id: string
          is_test: boolean
          notes: string | null
          payment_status: string
          property_id: string
          realtor_id: string | null
          ref: string
          released_at: string | null
          reservation_date: string
          reservation_fee: number
          sale_id: string | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          estate_id?: string | null
          expired_at?: string | null
          expiry_date?: string | null
          id?: string
          is_test?: boolean
          notes?: string | null
          payment_status?: string
          property_id: string
          realtor_id?: string | null
          ref?: string
          released_at?: string | null
          reservation_date?: string
          reservation_fee?: number
          sale_id?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          estate_id?: string | null
          expired_at?: string | null
          expiry_date?: string | null
          id?: string
          is_test?: boolean
          notes?: string | null
          payment_status?: string
          property_id?: string
          realtor_id?: string | null
          ref?: string
          released_at?: string | null
          reservation_date?: string
          reservation_fee?: number
          sale_id?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_estate_id_fkey"
            columns: ["estate_id"]
            isOneToOne: false
            referencedRelation: "estates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_realtor_id_fkey"
            columns: ["realtor_id"]
            isOneToOne: false
            referencedRelation: "realtors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_closing_checklist: {
        Row: {
          created_at: string
          done_at: string | null
          done_by: string | null
          id: string
          is_done: boolean
          item_code: string
          notes: string | null
          sale_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          done_at?: string | null
          done_by?: string | null
          id?: string
          is_done?: boolean
          item_code: string
          notes?: string | null
          sale_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          done_at?: string | null
          done_by?: string | null
          id?: string
          is_done?: boolean
          item_code?: string
          notes?: string | null
          sale_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_closing_checklist_item_code_fkey"
            columns: ["item_code"]
            isOneToOne: false
            referencedRelation: "closing_checklist_templates"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "sale_closing_checklist_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_referrals: {
        Row: {
          created_at: string
          created_by: string | null
          direct_realtor_id: string
          indirect_realtor_id: string | null
          locked_at: string | null
          notes: string | null
          sale_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          direct_realtor_id: string
          indirect_realtor_id?: string | null
          locked_at?: string | null
          notes?: string | null
          sale_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          direct_realtor_id?: string
          indirect_realtor_id?: string | null
          locked_at?: string | null
          notes?: string | null
          sale_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_referrals_direct_realtor_id_fkey"
            columns: ["direct_realtor_id"]
            isOneToOne: false
            referencedRelation: "realtors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_referrals_indirect_realtor_id_fkey"
            columns: ["indirect_realtor_id"]
            isOneToOne: false
            referencedRelation: "realtors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_referrals_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: true
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          allocation_status: string
          closed_at: string | null
          closed_by: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          deposit: number
          discount: number
          documentation_status: string
          estate_id: string | null
          expected_completion: string | null
          id: string
          is_test: boolean
          notes: string | null
          payment_plan_id: string | null
          price: number
          property_id: string
          realtor_id: string | null
          ref: string
          sale_date: string
          sales_channel: string
          sales_officer: string | null
          stage: string
          status: string
          total_payable: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allocation_status?: string
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          deposit?: number
          discount?: number
          documentation_status?: string
          estate_id?: string | null
          expected_completion?: string | null
          id?: string
          is_test?: boolean
          notes?: string | null
          payment_plan_id?: string | null
          price?: number
          property_id: string
          realtor_id?: string | null
          ref?: string
          sale_date?: string
          sales_channel?: string
          sales_officer?: string | null
          stage?: string
          status?: string
          total_payable?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allocation_status?: string
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          deposit?: number
          discount?: number
          documentation_status?: string
          estate_id?: string | null
          expected_completion?: string | null
          id?: string
          is_test?: boolean
          notes?: string | null
          payment_plan_id?: string | null
          price?: number
          property_id?: string
          realtor_id?: string | null
          ref?: string
          sale_date?: string
          sales_channel?: string
          sales_officer?: string | null
          stage?: string
          status?: string
          total_payable?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_estate_id_fkey"
            columns: ["estate_id"]
            isOneToOne: false
            referencedRelation: "estates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_payment_plan_id_fkey"
            columns: ["payment_plan_id"]
            isOneToOne: false
            referencedRelation: "payment_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_realtor_id_fkey"
            columns: ["realtor_id"]
            isOneToOne: false
            referencedRelation: "realtors"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_realtor_id: string | null
          assigned_to: string | null
          category: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          description: string | null
          due_date: string | null
          id: string
          lead_id: string | null
          priority: string
          ref: string
          sale_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          assigned_realtor_id?: string | null
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string | null
          priority?: string
          ref?: string
          sale_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          assigned_realtor_id?: string | null
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string | null
          priority?: string
          ref?: string
          sale_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_realtor_id_fkey"
            columns: ["assigned_realtor_id"]
            isOneToOne: false
            referencedRelation: "realtors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      uat_checklist: {
        Row: {
          code: string
          created_at: string
          done_at: string | null
          done_by: string | null
          is_done: boolean
          label: string
          notes: string | null
          section: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          done_at?: string | null
          done_by?: string | null
          is_done?: boolean
          label: string
          notes?: string | null
          section: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          done_at?: string | null
          done_by?: string | null
          is_done?: boolean
          label?: string
          notes?: string | null
          section?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_onboarding: {
        Row: {
          completed_at: string | null
          created_at: string
          dismissed_at: string | null
          last_seen_role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          dismissed_at?: string | null
          last_seen_role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          dismissed_at?: string | null
          last_seen_role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_receivables: {
        Row: {
          ageing_bucket: string | null
          amount_due: number | null
          amount_paid: number | null
          balance: number | null
          customer_id: string | null
          days_overdue: number | null
          due_date: string | null
          id: string | null
          installment_no: number | null
          label: string | null
          sale_id: string | null
          status: string | null
        }
        Insert: {
          ageing_bucket?: never
          amount_due?: number | null
          amount_paid?: number | null
          balance?: never
          customer_id?: string | null
          days_overdue?: never
          due_date?: string | null
          id?: string | null
          installment_no?: number | null
          label?: string | null
          sale_id?: string | null
          status?: string | null
        }
        Update: {
          ageing_bucket?: never
          amount_due?: number | null
          amount_paid?: number | null
          balance?: never
          customer_id?: string | null
          days_overdue?: never
          due_date?: string | null
          id?: string | null
          installment_no?: number | null
          label?: string | null
          sale_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_schedule_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_schedule_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accrue_commission_for: {
        Args: {
          _realtor_id: string
          _sale_id: string
          _type: Database["public"]["Enums"]["referral_type"]
        }
        Returns: undefined
      }
      can_docs: { Args: { _user_id: string }; Returns: boolean }
      can_finance: { Args: { _user_id: string }; Returns: boolean }
      can_payout: { Args: { _user_id: string }; Returns: boolean }
      can_projects: { Args: { _user_id: string }; Returns: boolean }
      can_read_document: {
        Args: {
          _category: string
          _customer_id: string
          _document_type: string
        }
        Returns: boolean
      }
      can_read_document_path: { Args: { _path: string }; Returns: boolean }
      can_view_money: { Args: { _user_id: string }; Returns: boolean }
      close_sale: {
        Args: { _sale_id: string }
        Returns: {
          allocation_status: string
          closed_at: string | null
          closed_by: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          deposit: number
          discount: number
          documentation_status: string
          estate_id: string | null
          expected_completion: string | null
          id: string
          is_test: boolean
          notes: string | null
          payment_plan_id: string | null
          price: number
          property_id: string
          realtor_id: string | null
          ref: string
          sale_date: string
          sales_channel: string
          sales_officer: string | null
          stage: string
          status: string
          total_payable: number
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "sales"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      expire_due_reservations: { Args: never; Returns: number }
      gen_ref: { Args: { prefix: string }; Returns: string }
      generate_payment_reminders: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_crm_staff: { Args: { _user_id: string }; Returns: boolean }
      is_my_customer: { Args: { _customer_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      my_realtor_id: { Args: never; Returns: string }
      pilot_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          last_sign_in_at: string
          onboarding_completed_at: string
          onboarding_dismissed_at: string
          roles: string[]
          user_id: string
        }[]
      }
      purge_test_data: { Args: never; Returns: Json }
      refresh_schedule_statuses: { Args: never; Returns: number }
      resolve_commission_rule:
        | {
            Args: {
              _channel: string
              _estate_id: string
              _on_date: string
              _property_type: string
              _realtor_id: string
            }
            Returns: {
              created_at: string
              created_by: string | null
              effective_from: string | null
              effective_to: string | null
              estate_id: string | null
              fixed_amount: number
              id: string
              is_active: boolean
              name: string
              notes: string | null
              priority: number
              property_type: string | null
              rate: number
              realtor_id: string | null
              referral_type: Database["public"]["Enums"]["referral_type"] | null
              sales_channel: string | null
              updated_at: string
              updated_by: string | null
            }
            SetofOptions: {
              from: "*"
              to: "commission_rules"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: {
              _channel: string
              _estate_id: string
              _on_date: string
              _property_type: string
              _realtor_id: string
              _referral_type: Database["public"]["Enums"]["referral_type"]
            }
            Returns: {
              created_at: string
              created_by: string | null
              effective_from: string | null
              effective_to: string | null
              estate_id: string | null
              fixed_amount: number
              id: string
              is_active: boolean
              name: string
              notes: string | null
              priority: number
              property_type: string | null
              rate: number
              realtor_id: string | null
              referral_type: Database["public"]["Enums"]["referral_type"] | null
              sales_channel: string | null
              updated_at: string
              updated_by: string | null
            }
            SetofOptions: {
              from: "*"
              to: "commission_rules"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      run_nightly_operations: { Args: never; Returns: Json }
      sale_timeline: {
        Args: { _sale_id: string }
        Returns: {
          actor: string
          category: string
          detail: string
          event: string
          occurred_at: string
        }[]
      }
      schedule_status: {
        Args: { _due: string; _due_amt: number; _paid: number }
        Returns: string
      }
      test_data_report: { Args: never; Returns: Json }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "management"
        | "sales_manager"
        | "realtor"
        | "accounts"
        | "documentation"
        | "project_manager"
        | "customer"
      commission_status:
        | "pending"
        | "approved"
        | "paid"
        | "cancelled"
        | "payable"
        | "reversed"
      inspection_status:
        | "scheduled"
        | "confirmed"
        | "completed"
        | "rescheduled"
        | "cancelled"
        | "no_show"
      lead_status:
        | "new"
        | "contacted"
        | "qualified"
        | "interested"
        | "inspection_scheduled"
        | "inspection_completed"
        | "negotiation"
        | "reservation"
        | "payment_started"
        | "documentation"
        | "allocation"
        | "closed_won"
        | "closed_lost"
        | "nurture"
      lead_temperature: "hot" | "warm" | "cold"
      payment_status: "pending" | "verified" | "reversed" | "failed"
      property_status:
        | "available"
        | "reserved"
        | "sold"
        | "allocated"
        | "on_hold"
        | "blocked"
      referral_type: "direct" | "indirect"
      task_status: "todo" | "in_progress" | "completed" | "overdue"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "super_admin",
        "management",
        "sales_manager",
        "realtor",
        "accounts",
        "documentation",
        "project_manager",
        "customer",
      ],
      commission_status: [
        "pending",
        "approved",
        "paid",
        "cancelled",
        "payable",
        "reversed",
      ],
      inspection_status: [
        "scheduled",
        "confirmed",
        "completed",
        "rescheduled",
        "cancelled",
        "no_show",
      ],
      lead_status: [
        "new",
        "contacted",
        "qualified",
        "interested",
        "inspection_scheduled",
        "inspection_completed",
        "negotiation",
        "reservation",
        "payment_started",
        "documentation",
        "allocation",
        "closed_won",
        "closed_lost",
        "nurture",
      ],
      lead_temperature: ["hot", "warm", "cold"],
      payment_status: ["pending", "verified", "reversed", "failed"],
      property_status: [
        "available",
        "reserved",
        "sold",
        "allocated",
        "on_hold",
        "blocked",
      ],
      referral_type: ["direct", "indirect"],
      task_status: ["todo", "in_progress", "completed", "overdue"],
    },
  },
} as const
