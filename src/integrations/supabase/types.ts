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
      billing_addresses: {
        Row: {
          address_line_1: string | null
          address_line_2: string | null
          city: string | null
          country: string | null
          created_at: string | null
          gstin: string | null
          id: string
          is_default: boolean | null
          name: string
          postal_code: string | null
          state: string | null
          updated_at: string | null
          use_company_address: boolean | null
          user_id: string
        }
        Insert: {
          address_line_1?: string | null
          address_line_2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          gstin?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          postal_code?: string | null
          state?: string | null
          updated_at?: string | null
          use_company_address?: boolean | null
          user_id: string
        }
        Update: {
          address_line_1?: string | null
          address_line_2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          gstin?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          postal_code?: string | null
          state?: string | null
          updated_at?: string | null
          use_company_address?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      carbon_verifications: {
        Row: {
          ai_analysis: Json | null
          cbam_compliant: boolean | null
          ccts_eligible: boolean | null
          created_at: string | null
          emission_ids: string[]
          greenwashing_risk: string | null
          id: string
          organization_id: string | null
          session_id: string | null
          total_co2_kg: number
          user_id: string | null
          verification_score: number | null
          verification_status: string | null
          verified_at: string | null
        }
        Insert: {
          ai_analysis?: Json | null
          cbam_compliant?: boolean | null
          ccts_eligible?: boolean | null
          created_at?: string | null
          emission_ids: string[]
          greenwashing_risk?: string | null
          id?: string
          organization_id?: string | null
          session_id?: string | null
          total_co2_kg: number
          user_id?: string | null
          verification_score?: number | null
          verification_status?: string | null
          verified_at?: string | null
        }
        Update: {
          ai_analysis?: Json | null
          cbam_compliant?: boolean | null
          ccts_eligible?: boolean | null
          created_at?: string | null
          emission_ids?: string[]
          greenwashing_risk?: string | null
          id?: string
          organization_id?: string | null
          session_id?: string | null
          total_co2_kg?: number
          user_id?: string | null
          verification_score?: number | null
          verification_status?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "carbon_verifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carbon_verifications_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_history: {
        Row: {
          content: string
          context_type: string | null
          created_at: string | null
          id: string
          language: string | null
          metadata: Json | null
          role: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          context_type?: string | null
          created_at?: string | null
          id?: string
          language?: string | null
          metadata?: Json | null
          role: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          context_type?: string | null
          created_at?: string | null
          id?: string
          language?: string | null
          metadata?: Json | null
          role?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_history_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          amount: number | null
          cache_expires_at: string | null
          cached_result: Json | null
          confidence: number | null
          created_at: string | null
          currency: string | null
          document_hash: string | null
          document_type: string
          file_url: string | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          organization_id: string | null
          raw_ocr_data: Json | null
          session_id: string | null
          subtotal: number | null
          tax_amount: number | null
          user_id: string | null
          vendor: string | null
        }
        Insert: {
          amount?: number | null
          cache_expires_at?: string | null
          cached_result?: Json | null
          confidence?: number | null
          created_at?: string | null
          currency?: string | null
          document_hash?: string | null
          document_type: string
          file_url?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          organization_id?: string | null
          raw_ocr_data?: Json | null
          session_id?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          user_id?: string | null
          vendor?: string | null
        }
        Update: {
          amount?: number | null
          cache_expires_at?: string | null
          cached_result?: Json | null
          confidence?: number | null
          created_at?: string | null
          currency?: string | null
          document_hash?: string | null
          document_type?: string
          file_url?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          organization_id?: string | null
          raw_ocr_data?: Json | null
          session_id?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          user_id?: string | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      emissions: {
        Row: {
          activity_data: number | null
          activity_unit: string | null
          category: string
          co2_kg: number
          created_at: string | null
          data_quality: string | null
          document_id: string | null
          emission_factor: number | null
          id: string
          organization_id: string | null
          scope: number
          session_id: string | null
          user_id: string | null
          verification_notes: string | null
          verified: boolean | null
        }
        Insert: {
          activity_data?: number | null
          activity_unit?: string | null
          category: string
          co2_kg: number
          created_at?: string | null
          data_quality?: string | null
          document_id?: string | null
          emission_factor?: number | null
          id?: string
          organization_id?: string | null
          scope: number
          session_id?: string | null
          user_id?: string | null
          verification_notes?: string | null
          verified?: boolean | null
        }
        Update: {
          activity_data?: number | null
          activity_unit?: string | null
          category?: string
          co2_kg?: number
          created_at?: string | null
          data_quality?: string | null
          document_id?: string | null
          emission_factor?: number | null
          id?: string
          organization_id?: string | null
          scope?: number
          session_id?: string | null
          user_id?: string | null
          verification_notes?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "emissions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emissions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      grant_applications: {
        Row: {
          annual_revenue: string | null
          applicant_name: string
          carbon_focus: string | null
          company_name: string
          company_stage: string
          country: string
          created_at: string
          email: string
          employee_count: string | null
          id: string
          notes: string | null
          phone: string | null
          pitch: string
          reviewed_at: string | null
          reviewed_by: string | null
          sector: string
          status: string
          updated_at: string
          use_case: string
          user_id: string | null
          website: string | null
        }
        Insert: {
          annual_revenue?: string | null
          applicant_name: string
          carbon_focus?: string | null
          company_name: string
          company_stage: string
          country: string
          created_at?: string
          email: string
          employee_count?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          pitch: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sector: string
          status?: string
          updated_at?: string
          use_case: string
          user_id?: string | null
          website?: string | null
        }
        Update: {
          annual_revenue?: string | null
          applicant_name?: string
          carbon_focus?: string | null
          company_name?: string
          company_stage?: string
          country?: string
          created_at?: string
          email?: string
          employee_count?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          pitch?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sector?: string
          status?: string
          updated_at?: string
          use_case?: string
          user_id?: string | null
          website?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          billing_address_id: string | null
          created_at: string | null
          currency: string | null
          due_date: string | null
          id: string
          invoice_number: string
          paid_at: string | null
          pdf_url: string | null
          razorpay_payment_id: string | null
          status: string | null
          subscription_id: string | null
          tax_amount: number | null
          total_amount: number
          user_id: string
        }
        Insert: {
          amount: number
          billing_address_id?: string | null
          created_at?: string | null
          currency?: string | null
          due_date?: string | null
          id?: string
          invoice_number: string
          paid_at?: string | null
          pdf_url?: string | null
          razorpay_payment_id?: string | null
          status?: string | null
          subscription_id?: string | null
          tax_amount?: number | null
          total_amount: number
          user_id: string
        }
        Update: {
          amount?: number
          billing_address_id?: string | null
          created_at?: string | null
          currency?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          paid_at?: string | null
          pdf_url?: string | null
          razorpay_payment_id?: string | null
          status?: string | null
          subscription_id?: string | null
          tax_amount?: number | null
          total_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_billing_address_id_fkey"
            columns: ["billing_address_id"]
            isOneToOne: false
            referencedRelation: "billing_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_listings: {
        Row: {
          created_at: string | null
          credits_available: number
          currency: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          listed_at: string | null
          methodology: string | null
          msme_hash: string
          organization_id: string | null
          price_per_tonne: number | null
          region: string | null
          sdg_alignment: number[] | null
          sector: string | null
          verification_id: string | null
          verification_score: number | null
          vintage: string | null
        }
        Insert: {
          created_at?: string | null
          credits_available: number
          currency?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          listed_at?: string | null
          methodology?: string | null
          msme_hash: string
          organization_id?: string | null
          price_per_tonne?: number | null
          region?: string | null
          sdg_alignment?: number[] | null
          sector?: string | null
          verification_id?: string | null
          verification_score?: number | null
          vintage?: string | null
        }
        Update: {
          created_at?: string | null
          credits_available?: number
          currency?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          listed_at?: string | null
          methodology?: string | null
          msme_hash?: string
          organization_id?: string | null
          price_per_tonne?: number | null
          region?: string | null
          sdg_alignment?: number[] | null
          sector?: string | null
          verification_id?: string | null
          verification_score?: number | null
          vintage?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_listings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_listings_verification_id_fkey"
            columns: ["verification_id"]
            isOneToOne: false
            referencedRelation: "carbon_verifications"
            referencedColumns: ["id"]
          },
        ]
      }
      monetization_pathways: {
        Row: {
          applied_at: string | null
          completed_at: string | null
          created_at: string | null
          currency: string | null
          estimated_value: number | null
          id: string
          partner_details: Json | null
          partner_name: string | null
          pathway_type: string
          session_id: string | null
          status: string | null
          user_id: string | null
          verification_id: string | null
        }
        Insert: {
          applied_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          estimated_value?: number | null
          id?: string
          partner_details?: Json | null
          partner_name?: string | null
          pathway_type: string
          session_id?: string | null
          status?: string | null
          user_id?: string | null
          verification_id?: string | null
        }
        Update: {
          applied_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          estimated_value?: number | null
          id?: string
          partner_details?: Json | null
          partner_name?: string | null
          pathway_type?: string
          session_id?: string | null
          status?: string | null
          user_id?: string | null
          verification_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monetization_pathways_verification_id_fkey"
            columns: ["verification_id"]
            isOneToOne: false
            referencedRelation: "carbon_verifications"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string | null
          id: string
          invite_expires_at: string | null
          invite_token: string | null
          invited_by: string | null
          invited_email: string | null
          joined_at: string | null
          organization_id: string
          role: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          invite_expires_at?: string | null
          invite_token?: string | null
          invited_by?: string | null
          invited_email?: string | null
          joined_at?: string | null
          organization_id: string
          role?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          invite_expires_at?: string | null
          invite_token?: string | null
          invited_by?: string | null
          invited_email?: string | null
          joined_at?: string | null
          organization_id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          logo_url: string | null
          max_members: number | null
          metadata: Json | null
          name: string
          owner_id: string | null
          subscription_tier: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          max_members?: number | null
          metadata?: Json | null
          name: string
          owner_id?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          max_members?: number | null
          metadata?: Json | null
          name?: string
          owner_id?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      partner_access: {
        Row: {
          expires_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          partner_id: string
          role: string | null
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          partner_id: string
          role?: string | null
          user_id: string
        }
        Update: {
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          partner_id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_access_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_applications: {
        Row: {
          contact_email: string
          created_at: string | null
          id: string
          organization_name: string
          organization_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          user_id: string
          website: string | null
        }
        Insert: {
          contact_email: string
          created_at?: string | null
          id?: string
          organization_name: string
          organization_type: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id: string
          website?: string | null
        }
        Update: {
          contact_email?: string
          created_at?: string | null
          id?: string
          organization_name?: string
          organization_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      partner_organizations: {
        Row: {
          contact_email: string | null
          created_at: string | null
          description: string | null
          id: string
          logo_url: string | null
          metadata: Json | null
          name: string
          supported_currencies: string[] | null
          supported_languages: string[] | null
          type: string
          updated_at: string | null
          verified: boolean | null
          website: string | null
        }
        Insert: {
          contact_email?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          metadata?: Json | null
          name: string
          supported_currencies?: string[] | null
          supported_languages?: string[] | null
          type: string
          updated_at?: string | null
          verified?: boolean | null
          website?: string | null
        }
        Update: {
          contact_email?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          metadata?: Json | null
          name?: string
          supported_currencies?: string[] | null
          supported_languages?: string[] | null
          type?: string
          updated_at?: string | null
          verified?: boolean | null
          website?: string | null
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          card_brand: string | null
          card_last_four: string | null
          card_network: string | null
          created_at: string | null
          expires_month: number | null
          expires_year: number | null
          id: string
          is_autopay_enabled: boolean | null
          is_default: boolean | null
          razorpay_token_id: string
          user_id: string
        }
        Insert: {
          card_brand?: string | null
          card_last_four?: string | null
          card_network?: string | null
          created_at?: string | null
          expires_month?: number | null
          expires_year?: number | null
          id?: string
          is_autopay_enabled?: boolean | null
          is_default?: boolean | null
          razorpay_token_id: string
          user_id: string
        }
        Update: {
          card_brand?: string | null
          card_last_four?: string | null
          card_network?: string | null
          created_at?: string | null
          expires_month?: number | null
          expires_year?: number | null
          id?: string
          is_autopay_enabled?: boolean | null
          is_default?: boolean | null
          razorpay_token_id?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          business_name: string | null
          created_at: string | null
          data_consent: boolean | null
          gstin: string | null
          id: string
          location: string | null
          phone: string | null
          preferred_language: string | null
          razorpay_customer_id: string | null
          razorpay_subscription_id: string | null
          role: string | null
          sector: string | null
          size: string | null
          subscription_expires_at: string | null
          subscription_tier: string | null
          updated_at: string | null
        }
        Insert: {
          business_name?: string | null
          created_at?: string | null
          data_consent?: boolean | null
          gstin?: string | null
          id: string
          location?: string | null
          phone?: string | null
          preferred_language?: string | null
          razorpay_customer_id?: string | null
          razorpay_subscription_id?: string | null
          role?: string | null
          sector?: string | null
          size?: string | null
          subscription_expires_at?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Update: {
          business_name?: string | null
          created_at?: string | null
          data_consent?: boolean | null
          gstin?: string | null
          id?: string
          location?: string | null
          phone?: string | null
          preferred_language?: string | null
          razorpay_customer_id?: string | null
          razorpay_subscription_id?: string | null
          role?: string | null
          sector?: string | null
          size?: string | null
          subscription_expires_at?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string | null
          pdf_url: string | null
          period_end: string | null
          period_start: string | null
          report_data: Json | null
          report_type: string
          scope1_total: number | null
          scope2_total: number | null
          scope3_total: number | null
          session_id: string | null
          total_co2_kg: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id?: string | null
          pdf_url?: string | null
          period_end?: string | null
          period_start?: string | null
          report_data?: Json | null
          report_type: string
          scope1_total?: number | null
          scope2_total?: number | null
          scope3_total?: number | null
          session_id?: string | null
          total_co2_kg?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string | null
          pdf_url?: string | null
          period_end?: string | null
          period_start?: string | null
          report_data?: Json | null
          report_type?: string
          scope1_total?: number | null
          scope2_total?: number | null
          scope3_total?: number | null
          session_id?: string | null
          total_co2_kg?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_log: {
        Row: {
          created_at: string | null
          details: Json | null
          event_type: string
          id: string
          ip_address: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          created_at: string | null
          device_fingerprint: string | null
          id: string
          ip_hash: string | null
          is_active: boolean | null
          last_active: string | null
        }
        Insert: {
          created_at?: string | null
          device_fingerprint?: string | null
          id?: string
          ip_hash?: string | null
          is_active?: boolean | null
          last_active?: string | null
        }
        Update: {
          created_at?: string | null
          device_fingerprint?: string | null
          id?: string
          ip_hash?: string | null
          is_active?: boolean | null
          last_active?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          expires_at: string | null
          id: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          starts_at: string | null
          status: string | null
          tier: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          expires_at?: string | null
          id?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          starts_at?: string | null
          status?: string | null
          tier: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          expires_at?: string | null
          id?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          starts_at?: string | null
          status?: string | null
          tier?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      team_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          role: string | null
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          organization_id: string
          role?: string | null
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          role?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_contexts: {
        Row: {
          context_id: string
          context_name: string | null
          context_type: string
          created_at: string | null
          id: string
          is_active: boolean | null
          last_accessed_at: string | null
          user_id: string
        }
        Insert: {
          context_id: string
          context_name?: string | null
          context_type: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_accessed_at?: string | null
          user_id: string
        }
        Update: {
          context_id?: string
          context_name?: string | null
          context_type?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_accessed_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_secure_session: {
        Args: { fingerprint: string; ip_hash?: string }
        Returns: string
      }
      get_active_context: {
        Args: never
        Returns: {
          context_id: string
          context_name: string
          context_type: string
        }[]
      }
      get_own_session: {
        Args: { fingerprint: string; session_uuid: string }
        Returns: {
          created_at: string
          id: string
          is_active: boolean
          last_active: string
        }[]
      }
      get_session_by_fingerprint: {
        Args: { fingerprint: string }
        Returns: string
      }
      has_partner_access: {
        Args: { _partner_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_admin: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_partner_admin: {
        Args: { _partner_id: string; _user_id: string }
        Returns: boolean
      }
      owns_session: {
        Args: { fingerprint: string; session_uuid: string }
        Returns: boolean
      }
      switch_user_context: {
        Args: { p_context_id: string; p_context_type: string }
        Returns: boolean
      }
      update_session_activity: {
        Args: { fingerprint: string; session_uuid: string }
        Returns: boolean
      }
      validate_session_access: {
        Args: { fingerprint: string; session_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
