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
      ambassador_applications: {
        Row: {
          city: string
          commitment: string
          confirmations: Json
          created_at: string
          email: string
          email_status: string
          first_move: string
          id: string
          lanes: string[]
          name: string
          request_ip_hash: string
          status: string
          whatsapp: string | null
          work_link: string | null
        }
        Insert: {
          city: string
          commitment: string
          confirmations: Json
          created_at?: string
          email: string
          email_status?: string
          first_move: string
          id?: string
          lanes: string[]
          name: string
          request_ip_hash: string
          status?: string
          whatsapp?: string | null
          work_link?: string | null
        }
        Update: {
          city?: string
          commitment?: string
          confirmations?: Json
          created_at?: string
          email?: string
          email_status?: string
          first_move?: string
          id?: string
          lanes?: string[]
          name?: string
          request_ip_hash?: string
          status?: string
          whatsapp?: string | null
          work_link?: string | null
        }
        Relationships: []
      }
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
      calculator_runs: {
        Row: {
          calculator_slug: string
          created_at: string
          factor_sources: Json
          id: string
          inputs: Json
          label: string | null
          results: Json
          user_id: string
        }
        Insert: {
          calculator_slug: string
          created_at?: string
          factor_sources?: Json
          id?: string
          inputs: Json
          label?: string | null
          results: Json
          user_id: string
        }
        Update: {
          calculator_slug?: string
          created_at?: string
          factor_sources?: Json
          id?: string
          inputs?: Json
          label?: string | null
          results?: Json
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
          idempotency_key: string | null
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
          idempotency_key?: string | null
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
          idempotency_key?: string | null
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
      compliance_ledger: {
        Row: {
          activity_data: number | null
          activity_unit: string | null
          amount: number | null
          classification_method: string | null
          co2_kg: number
          confidence_score: number | null
          created_at: string | null
          currency: string | null
          document_hash: string
          document_id: string | null
          emission_category: string
          emission_factor: number | null
          emission_id: string | null
          factor_source: string | null
          fiscal_quarter: string | null
          fiscal_year: string | null
          green_category: string | null
          greenwashing_risk: string | null
          gstin: string | null
          hsn_code: string | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          is_green_benefit: boolean | null
          methodology_version: string
          organization_id: string | null
          scope: number
          user_id: string
          validation_failure_reason: string | null
          validation_result: string | null
          vendor: string | null
          verification_id: string | null
          verification_score: number | null
          verification_status: string | null
          verified_at: string | null
        }
        Insert: {
          activity_data?: number | null
          activity_unit?: string | null
          amount?: number | null
          classification_method?: string | null
          co2_kg: number
          confidence_score?: number | null
          created_at?: string | null
          currency?: string | null
          document_hash: string
          document_id?: string | null
          emission_category: string
          emission_factor?: number | null
          emission_id?: string | null
          factor_source?: string | null
          fiscal_quarter?: string | null
          fiscal_year?: string | null
          green_category?: string | null
          greenwashing_risk?: string | null
          gstin?: string | null
          hsn_code?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          is_green_benefit?: boolean | null
          methodology_version: string
          organization_id?: string | null
          scope: number
          user_id: string
          validation_failure_reason?: string | null
          validation_result?: string | null
          vendor?: string | null
          verification_id?: string | null
          verification_score?: number | null
          verification_status?: string | null
          verified_at?: string | null
        }
        Update: {
          activity_data?: number | null
          activity_unit?: string | null
          amount?: number | null
          classification_method?: string | null
          co2_kg?: number
          confidence_score?: number | null
          created_at?: string | null
          currency?: string | null
          document_hash?: string
          document_id?: string | null
          emission_category?: string
          emission_factor?: number | null
          emission_id?: string | null
          factor_source?: string | null
          fiscal_quarter?: string | null
          fiscal_year?: string | null
          green_category?: string | null
          greenwashing_risk?: string | null
          gstin?: string | null
          hsn_code?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          is_green_benefit?: boolean | null
          methodology_version?: string
          organization_id?: string | null
          scope?: number
          user_id?: string
          validation_failure_reason?: string | null
          validation_result?: string | null
          vendor?: string | null
          verification_id?: string | null
          verification_score?: number | null
          verification_status?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_ledger_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_ledger_emission_id_fkey"
            columns: ["emission_id"]
            isOneToOne: false
            referencedRelation: "emissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_ledger_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_ledger_verification_id_fkey"
            columns: ["verification_id"]
            isOneToOne: false
            referencedRelation: "carbon_verifications"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_ledger_duplicates_backup: {
        Row: {
          activity_data: number | null
          activity_unit: string | null
          amount: number | null
          backed_up_at: string
          classification_method: string | null
          co2_kg: number
          confidence_score: number | null
          created_at: string | null
          currency: string | null
          document_hash: string
          document_id: string | null
          emission_category: string
          emission_factor: number | null
          emission_id: string | null
          factor_source: string | null
          fiscal_quarter: string | null
          fiscal_year: string | null
          green_category: string | null
          greenwashing_risk: string | null
          gstin: string | null
          hsn_code: string | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          is_green_benefit: boolean | null
          kept_ledger_id: string | null
          methodology_version: string
          scope: number
          user_id: string
          validation_failure_reason: string | null
          validation_result: string | null
          vendor: string | null
          verification_id: string | null
          verification_score: number | null
          verification_status: string | null
          verified_at: string | null
        }
        Insert: {
          activity_data?: number | null
          activity_unit?: string | null
          amount?: number | null
          backed_up_at?: string
          classification_method?: string | null
          co2_kg: number
          confidence_score?: number | null
          created_at?: string | null
          currency?: string | null
          document_hash: string
          document_id?: string | null
          emission_category: string
          emission_factor?: number | null
          emission_id?: string | null
          factor_source?: string | null
          fiscal_quarter?: string | null
          fiscal_year?: string | null
          green_category?: string | null
          greenwashing_risk?: string | null
          gstin?: string | null
          hsn_code?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          is_green_benefit?: boolean | null
          kept_ledger_id?: string | null
          methodology_version: string
          scope: number
          user_id: string
          validation_failure_reason?: string | null
          validation_result?: string | null
          vendor?: string | null
          verification_id?: string | null
          verification_score?: number | null
          verification_status?: string | null
          verified_at?: string | null
        }
        Update: {
          activity_data?: number | null
          activity_unit?: string | null
          amount?: number | null
          backed_up_at?: string
          classification_method?: string | null
          co2_kg?: number
          confidence_score?: number | null
          created_at?: string | null
          currency?: string | null
          document_hash?: string
          document_id?: string | null
          emission_category?: string
          emission_factor?: number | null
          emission_id?: string | null
          factor_source?: string | null
          fiscal_quarter?: string | null
          fiscal_year?: string | null
          green_category?: string | null
          greenwashing_risk?: string | null
          gstin?: string | null
          hsn_code?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          is_green_benefit?: boolean | null
          kept_ledger_id?: string | null
          methodology_version?: string
          scope?: number
          user_id?: string
          validation_failure_reason?: string | null
          validation_result?: string | null
          vendor?: string | null
          verification_id?: string | null
          verification_score?: number | null
          verification_status?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      credit_signals: {
        Row: {
          asset_id: string | null
          baseline_tco2e: number | null
          central_tco2e: number | null
          checks: Json
          conservative_tco2e: number | null
          created_at: string
          details: Json | null
          eligible_kwh: number
          factor_id: string | null
          id: string
          inputs_hash: string
          method_id: string
          method_version: string
          monitoring_end: string | null
          monitoring_start: string | null
          project_id: string | null
          project_tco2e: number | null
          status: string
          uncertainty_pct: number
        }
        Insert: {
          asset_id?: string | null
          baseline_tco2e?: number | null
          central_tco2e?: number | null
          checks: Json
          conservative_tco2e?: number | null
          created_at?: string
          details?: Json | null
          eligible_kwh?: number
          factor_id?: string | null
          id?: string
          inputs_hash: string
          method_id: string
          method_version: string
          monitoring_end?: string | null
          monitoring_start?: string | null
          project_id?: string | null
          project_tco2e?: number | null
          status: string
          uncertainty_pct: number
        }
        Update: {
          asset_id?: string | null
          baseline_tco2e?: number | null
          central_tco2e?: number | null
          checks?: Json
          conservative_tco2e?: number | null
          created_at?: string
          details?: Json | null
          eligible_kwh?: number
          factor_id?: string | null
          id?: string
          inputs_hash?: string
          method_id?: string
          method_version?: string
          monitoring_end?: string | null
          monitoring_start?: string | null
          project_id?: string | null
          project_tco2e?: number | null
          status?: string
          uncertainty_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "credit_signals_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "solar_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_signals_factor_id_fkey"
            columns: ["factor_id"]
            isOneToOne: false
            referencedRelation: "grid_emission_factors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_signals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "reduction_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      document_extractions: {
        Row: {
          created_at: string
          document_hash: string
          document_id: string
          extraction: Json
          extraction_sha256: string
          id: string
          method_version: string
          model: string | null
          organization_id: string | null
          source_file_path: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          document_hash: string
          document_id: string
          extraction: Json
          extraction_sha256: string
          id?: string
          method_version: string
          model?: string | null
          organization_id?: string | null
          source_file_path?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          document_hash?: string
          document_id?: string
          extraction?: Json
          extraction_sha256?: string
          id?: string
          method_version?: string
          model?: string | null
          organization_id?: string | null
          source_file_path?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_extractions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "documents"
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
      electricity_activities: {
        Row: {
          country: string | null
          country_source: string
          created_at: string
          document_id: string
          grid_region: string | null
          id: string
          kwh: number | null
          line_key: string
          method_version: string
          organization_id: string | null
          period_end: string | null
          period_start: string | null
          quantity_printed: number | null
          reasons: string[]
          source_text: string | null
          status: string
          supplier_ref: string | null
          unit_printed: string | null
          user_id: string
        }
        Insert: {
          country?: string | null
          country_source: string
          created_at?: string
          document_id: string
          grid_region?: string | null
          id?: string
          kwh?: number | null
          line_key: string
          method_version: string
          organization_id?: string | null
          period_end?: string | null
          period_start?: string | null
          quantity_printed?: number | null
          reasons?: string[]
          source_text?: string | null
          status: string
          supplier_ref?: string | null
          unit_printed?: string | null
          user_id: string
        }
        Update: {
          country?: string | null
          country_source?: string
          created_at?: string
          document_id?: string
          grid_region?: string | null
          id?: string
          kwh?: number | null
          line_key?: string
          method_version?: string
          organization_id?: string | null
          period_end?: string | null
          period_start?: string | null
          quantity_printed?: number | null
          reasons?: string[]
          source_text?: string | null
          status?: string
          supplier_ref?: string | null
          unit_printed?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "electricity_activities_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      electricity_allocations: {
        Row: {
          activity_id: string
          created_at: string
          id: string
          instrument_id: string
          is_current: boolean
          kwh: number
          method_version: string
          reporting_year: string
          user_id: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          id?: string
          instrument_id: string
          is_current?: boolean
          kwh: number
          method_version: string
          reporting_year: string
          user_id: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          id?: string
          instrument_id?: string
          is_current?: boolean
          kwh?: number
          method_version?: string
          reporting_year?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "electricity_allocations_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "electricity_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "electricity_allocations_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "electricity_instruments"
            referencedColumns: ["id"]
          },
        ]
      }
      electricity_calculations: {
        Row: {
          activity_id: string
          calculated_at: string
          factor_gases: string | null
          factor_id: string | null
          factor_key: string | null
          factor_kind: string | null
          factor_kwh: number | null
          factor_source: string | null
          factor_value: number | null
          factor_version: string | null
          formula: string | null
          id: string
          inputs_sha256: string
          instrument_kg: number
          instrument_kwh: number
          is_current: boolean
          kg: number | null
          kwh: number
          method: string
          method_version: string
          organization_id: string | null
          period_end: string
          period_start: string
          reasons: string[]
          reporting_year: string
          status: string
          user_id: string
          warnings: string[]
        }
        Insert: {
          activity_id: string
          calculated_at?: string
          factor_gases?: string | null
          factor_id?: string | null
          factor_key?: string | null
          factor_kind?: string | null
          factor_kwh?: number | null
          factor_source?: string | null
          factor_value?: number | null
          factor_version?: string | null
          formula?: string | null
          id?: string
          inputs_sha256: string
          instrument_kg?: number
          instrument_kwh?: number
          is_current?: boolean
          kg?: number | null
          kwh: number
          method: string
          method_version: string
          organization_id?: string | null
          period_end: string
          period_start: string
          reasons?: string[]
          reporting_year: string
          status: string
          user_id: string
          warnings?: string[]
        }
        Update: {
          activity_id?: string
          calculated_at?: string
          factor_gases?: string | null
          factor_id?: string | null
          factor_key?: string | null
          factor_kind?: string | null
          factor_kwh?: number | null
          factor_source?: string | null
          factor_value?: number | null
          factor_version?: string | null
          formula?: string | null
          id?: string
          inputs_sha256?: string
          instrument_kg?: number
          instrument_kwh?: number
          is_current?: boolean
          kg?: number | null
          kwh?: number
          method?: string
          method_version?: string
          organization_id?: string | null
          period_end?: string
          period_start?: string
          reasons?: string[]
          reporting_year?: string
          status?: string
          user_id?: string
          warnings?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "electricity_calculations_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "electricity_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "electricity_calculations_factor_id_fkey"
            columns: ["factor_id"]
            isOneToOne: false
            referencedRelation: "electricity_factors"
            referencedColumns: ["id"]
          },
        ]
      }
      electricity_factors: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          country: string
          created_at: string
          created_by: string
          factor_key: string
          gases: string
          grid_region: string | null
          gwp_basis: string | null
          id: string
          kg_per_kwh: number
          kind: string
          licence_note: string | null
          methodology: string
          publication_year: number
          source_name: string
          source_ref: string
          source_url: string | null
          status: string
          supplier_ref: string | null
          uncertainty_pct: number | null
          valid_from: string
          valid_to: string | null
          version: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          country: string
          created_at?: string
          created_by: string
          factor_key: string
          gases: string
          grid_region?: string | null
          gwp_basis?: string | null
          id?: string
          kg_per_kwh: number
          kind: string
          licence_note?: string | null
          methodology: string
          publication_year: number
          source_name: string
          source_ref: string
          source_url?: string | null
          status?: string
          supplier_ref?: string | null
          uncertainty_pct?: number | null
          valid_from: string
          valid_to?: string | null
          version: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          country?: string
          created_at?: string
          created_by?: string
          factor_key?: string
          gases?: string
          grid_region?: string | null
          gwp_basis?: string | null
          id?: string
          kg_per_kwh?: number
          kind?: string
          licence_note?: string | null
          methodology?: string
          publication_year?: number
          source_name?: string
          source_ref?: string
          source_url?: string | null
          status?: string
          supplier_ref?: string | null
          uncertainty_pct?: number | null
          valid_from?: string
          valid_to?: string | null
          version?: string
        }
        Relationships: []
      }
      electricity_instruments: {
        Row: {
          beneficiary_confirmed: boolean
          certificate_ref: string | null
          created_at: string
          evidence_document_id: string | null
          generation_country: string
          generation_region: string | null
          id: string
          kg_per_kwh: number
          mwh: number
          organization_id: string | null
          retired: boolean
          retirement_ref: string | null
          scheme: string
          type: string
          user_id: string
          vintage_end: string
          vintage_start: string
        }
        Insert: {
          beneficiary_confirmed?: boolean
          certificate_ref?: string | null
          created_at?: string
          evidence_document_id?: string | null
          generation_country: string
          generation_region?: string | null
          id?: string
          kg_per_kwh: number
          mwh: number
          organization_id?: string | null
          retired?: boolean
          retirement_ref?: string | null
          scheme: string
          type: string
          user_id: string
          vintage_end: string
          vintage_start: string
        }
        Update: {
          beneficiary_confirmed?: boolean
          certificate_ref?: string | null
          created_at?: string
          evidence_document_id?: string | null
          generation_country?: string
          generation_region?: string | null
          id?: string
          kg_per_kwh?: number
          mwh?: number
          organization_id?: string | null
          retired?: boolean
          retirement_ref?: string | null
          scheme?: string
          type?: string
          user_id?: string
          vintage_end?: string
          vintage_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "electricity_instruments_evidence_document_id_fkey"
            columns: ["evidence_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
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
      finance_application_documents: {
        Row: {
          application_id: string
          doc_type: string
          file_name: string
          id: string
          mime_type: string
          retain_until: string
          sha256: string
          size_bytes: number
          storage_path: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          application_id: string
          doc_type: string
          file_name: string
          id?: string
          mime_type: string
          retain_until?: string
          sha256: string
          size_bytes: number
          storage_path: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          application_id?: string
          doc_type?: string
          file_name?: string
          id?: string
          mime_type?: string
          retain_until?: string
          sha256?: string
          size_bytes?: number
          storage_path?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_application_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "finance_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_application_events: {
        Row: {
          application_id: string
          created_at: string
          id: string
          note: string | null
          status: string
          user_id: string
        }
        Insert: {
          application_id: string
          created_at?: string
          id?: string
          note?: string | null
          status: string
          user_id: string
        }
        Update: {
          application_id?: string
          created_at?: string
          id?: string
          note?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_application_events_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "finance_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_application_reviews: {
        Row: {
          application_id: string
          created_at: string
          email_status: string
          figures: Json
          summary: Json
          updated_at: string
        }
        Insert: {
          application_id: string
          created_at?: string
          email_status?: string
          figures?: Json
          summary?: Json
          updated_at?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          email_status?: string
          figures?: Json
          summary?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_application_reviews_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "finance_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_applications: {
        Row: {
          application: Json
          carbon_snapshot: Json
          consent_version: string
          consented_at: string
          created_at: string
          id: string
          kind: string
          organization_id: string | null
          retain_until: string
          status: string
          submitted_at: string | null
          update_window_from: string | null
          update_window_to: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          application: Json
          carbon_snapshot?: Json
          consent_version: string
          consented_at: string
          created_at?: string
          id?: string
          kind: string
          organization_id?: string | null
          retain_until?: string
          status?: string
          submitted_at?: string | null
          update_window_from?: string | null
          update_window_to?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          application?: Json
          carbon_snapshot?: Json
          consent_version?: string
          consented_at?: string
          created_at?: string
          id?: string
          kind?: string
          organization_id?: string | null
          retain_until?: string
          status?: string
          submitted_at?: string | null
          update_window_from?: string | null
          update_window_to?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      financial_documents: {
        Row: {
          created_at: string
          doc_kind: string
          figures: Json
          figures_read_at: string | null
          id: string
          mime_type: string
          organization_id: string | null
          sha256: string
          size_bytes: number
          source: string
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          doc_kind: string
          figures?: Json
          figures_read_at?: string | null
          id?: string
          mime_type: string
          organization_id?: string | null
          sha256: string
          size_bytes: number
          source?: string
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          doc_kind?: string
          figures?: Json
          figures_read_at?: string | null
          id?: string
          mime_type?: string
          organization_id?: string | null
          sha256?: string
          size_bytes?: number
          source?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: []
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
      grid_emission_factors: {
        Row: {
          created_at: string
          id: string
          kg_per_kwh: number
          kind: string
          region: string
          source: string
          valid_from: string | null
          version: string
        }
        Insert: {
          created_at?: string
          id?: string
          kg_per_kwh: number
          kind: string
          region: string
          source: string
          valid_from?: string | null
          version: string
        }
        Update: {
          created_at?: string
          id?: string
          kg_per_kwh?: number
          kind?: string
          region?: string
          source?: string
          valid_from?: string | null
          version?: string
        }
        Relationships: []
      }
      intelligence_usage: {
        Row: {
          count: number
          day: string
          kind: string
          subject: string
          updated_at: string
        }
        Insert: {
          count?: number
          day: string
          kind: string
          subject: string
          updated_at?: string
        }
        Update: {
          count?: number
          day?: string
          kind?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoice_credit_packs: {
        Row: {
          amount_paise: number
          base_paise: number
          created_at: string
          credits: number
          expires_at: string | null
          id: string
          packs: number
          paid_at: string | null
          razorpay_order_id: string
          razorpay_payment_id: string | null
          status: string
          used: number
          user_id: string
          validity: string
        }
        Insert: {
          amount_paise: number
          base_paise: number
          created_at?: string
          credits: number
          expires_at?: string | null
          id?: string
          packs: number
          paid_at?: string | null
          razorpay_order_id: string
          razorpay_payment_id?: string | null
          status?: string
          used?: number
          user_id: string
          validity: string
        }
        Update: {
          amount_paise?: number
          base_paise?: number
          created_at?: string
          credits?: number
          expires_at?: string | null
          id?: string
          packs?: number
          paid_at?: string | null
          razorpay_order_id?: string
          razorpay_payment_id?: string | null
          status?: string
          used?: number
          user_id?: string
          validity?: string
        }
        Relationships: []
      }
      invoice_read_counting: {
        Row: {
          created_at: string
          page_counting_from: string
          user_id: string
        }
        Insert: {
          created_at?: string
          page_counting_from: string
          user_id: string
        }
        Update: {
          created_at?: string
          page_counting_from?: string
          user_id?: string
        }
        Relationships: []
      }
      invoice_read_settings: {
        Row: {
          id: boolean
          ledger_started_at: string
        }
        Insert: {
          id?: boolean
          ledger_started_at?: string
        }
        Update: {
          id?: boolean
          ledger_started_at?: string
        }
        Relationships: []
      }
      invoice_reads: {
        Row: {
          counting: string
          created_at: string
          credit_allocations: Json
          credit_units: number
          document_hash: string | null
          document_id: string | null
          id: string
          organization_id: string | null
          pages: number
          plan_units: number
          settled_at: string | null
          status: string
          units: number
          user_id: string
        }
        Insert: {
          counting: string
          created_at?: string
          credit_allocations?: Json
          credit_units?: number
          document_hash?: string | null
          document_id?: string | null
          id?: string
          organization_id?: string | null
          pages: number
          plan_units?: number
          settled_at?: string | null
          status?: string
          units: number
          user_id: string
        }
        Update: {
          counting?: string
          created_at?: string
          credit_allocations?: Json
          credit_units?: number
          document_hash?: string | null
          document_id?: string | null
          id?: string
          organization_id?: string | null
          pages?: number
          plan_units?: number
          settled_at?: string | null
          status?: string
          units?: number
          user_id?: string
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
      ledger_chain_events: {
        Row: {
          chain_key: string
          chain_seq: number
          emission_id: string | null
          event_hash: string
          event_type: string
          ledger_id: string
          prev_hash: string
          recorded_at: string
          row_digest: string
          seq: number
        }
        Insert: {
          chain_key: string
          chain_seq: number
          emission_id?: string | null
          event_hash: string
          event_type: string
          ledger_id: string
          prev_hash: string
          recorded_at: string
          row_digest: string
          seq?: never
        }
        Update: {
          chain_key?: string
          chain_seq?: number
          emission_id?: string | null
          event_hash?: string
          event_type?: string
          ledger_id?: string
          prev_hash?: string
          recorded_at?: string
          row_digest?: string
          seq?: never
        }
        Relationships: []
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
      net_zero_goals: {
        Row: {
          baseline_co2_kg: number
          created_at: string | null
          id: string
          progress_pct: number | null
          roadmap: Json | null
          sector: string | null
          status: string | null
          target_date: string
          target_reduction_pct: number
          tasks: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          baseline_co2_kg: number
          created_at?: string | null
          id?: string
          progress_pct?: number | null
          roadmap?: Json | null
          sector?: string | null
          status?: string | null
          target_date: string
          target_reduction_pct: number
          tasks?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          baseline_co2_kg?: number
          created_at?: string | null
          id?: string
          progress_pct?: number | null
          roadmap?: Json | null
          sector?: string | null
          status?: string | null
          target_date?: string
          target_reduction_pct?: number
          tasks?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      organizations_max_members_backup: {
        Row: {
          backed_up_at: string
          max_members: number | null
          organization_id: string
        }
        Insert: {
          backed_up_at?: string
          max_members?: number | null
          organization_id: string
        }
        Update: {
          backed_up_at?: string
          max_members?: number | null
          organization_id?: string
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
          business_id_checked_at: string | null
          business_id_status: string | null
          business_id_type: string | null
          business_name: string | null
          cin: string | null
          company_pan: string | null
          created_at: string | null
          data_consent: boolean | null
          data_consent_at: string | null
          data_consent_version: string | null
          email: string | null
          enterprise_mode: boolean | null
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
          trust_layer_prefs: Json | null
          updated_at: string | null
        }
        Insert: {
          business_id_checked_at?: string | null
          business_id_status?: string | null
          business_id_type?: string | null
          business_name?: string | null
          cin?: string | null
          company_pan?: string | null
          created_at?: string | null
          data_consent?: boolean | null
          data_consent_at?: string | null
          data_consent_version?: string | null
          email?: string | null
          enterprise_mode?: boolean | null
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
          trust_layer_prefs?: Json | null
          updated_at?: string | null
        }
        Update: {
          business_id_checked_at?: string | null
          business_id_status?: string | null
          business_id_type?: string | null
          business_name?: string | null
          cin?: string | null
          company_pan?: string | null
          created_at?: string | null
          data_consent?: boolean | null
          data_consent_at?: string | null
          data_consent_version?: string | null
          email?: string | null
          enterprise_mode?: boolean | null
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
          trust_layer_prefs?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reduction_periods: {
        Row: {
          created_at: string
          document_id: string | null
          energy_qty: number | null
          evidence: string
          id: string
          new_energy_qty: number | null
          old_fuel_qty: number | null
          output_qty: number | null
          period_end: string
          period_start: string
          phase: string
          project_id: string
        }
        Insert: {
          created_at?: string
          document_id?: string | null
          energy_qty?: number | null
          evidence: string
          id?: string
          new_energy_qty?: number | null
          old_fuel_qty?: number | null
          output_qty?: number | null
          period_end: string
          period_start: string
          phase: string
          project_id: string
        }
        Update: {
          created_at?: string
          document_id?: string | null
          energy_qty?: number | null
          evidence?: string
          id?: string
          new_energy_qty?: number | null
          old_fuel_qty?: number | null
          output_qty?: number | null
          period_end?: string
          period_start?: string
          phase?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reduction_periods_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reduction_periods_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "reduction_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      reduction_projects: {
        Row: {
          additionality: string
          created_at: string
          energy_carrier: string | null
          equipment: string | null
          id: string
          lever: string
          meter_accuracy_pct: number
          name: string
          new_energy: string | null
          old_equipment_retired: boolean | null
          old_fuel: string | null
          output_unit: string | null
          region: string
          registered_elsewhere: boolean | null
          started_on: string
          updated_at: string
          user_id: string
        }
        Insert: {
          additionality?: string
          created_at?: string
          energy_carrier?: string | null
          equipment?: string | null
          id?: string
          lever: string
          meter_accuracy_pct?: number
          name: string
          new_energy?: string | null
          old_equipment_retired?: boolean | null
          old_fuel?: string | null
          output_unit?: string | null
          region?: string
          registered_elsewhere?: boolean | null
          started_on: string
          updated_at?: string
          user_id: string
        }
        Update: {
          additionality?: string
          created_at?: string
          energy_carrier?: string | null
          equipment?: string | null
          id?: string
          lever?: string
          meter_accuracy_pct?: number
          name?: string
          new_energy?: string | null
          old_equipment_retired?: boolean | null
          old_fuel?: string | null
          output_unit?: string | null
          region?: string
          registered_elsewhere?: boolean | null
          started_on?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reporting_frameworks: {
        Row: {
          applicability: Json
          approved_at: string | null
          approved_by: string | null
          code: string
          created_at: string
          created_by: string
          effective_from: string | null
          effective_to: string | null
          id: string
          jurisdiction: string
          kind: string
          name: string
          scope2_rules: Json
          source_name: string
          source_ref: string
          source_url: string
          status: string
          status_note: string | null
          version: string
        }
        Insert: {
          applicability: Json
          approved_at?: string | null
          approved_by?: string | null
          code: string
          created_at?: string
          created_by: string
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          jurisdiction: string
          kind: string
          name: string
          scope2_rules: Json
          source_name: string
          source_ref: string
          source_url: string
          status?: string
          status_note?: string | null
          version: string
        }
        Update: {
          applicability?: Json
          approved_at?: string | null
          approved_by?: string | null
          code?: string
          created_at?: string
          created_by?: string
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          jurisdiction?: string
          kind?: string
          name?: string
          scope2_rules?: Json
          source_name?: string
          source_ref?: string
          source_url?: string
          status?: string
          status_note?: string | null
          version?: string
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
      resource_leads: {
        Row: {
          company: string | null
          consented_at: string
          created_at: string
          delivery_status: string | null
          downloads: number
          email: string
          email_hash: string
          expires_at: string
          first_downloaded_at: string | null
          free_mailbox: boolean
          id: string
          industry: string | null
          last_downloaded_at: string | null
          last_sent_at: string | null
          marketing_consent: boolean
          mx_status: string
          name: string | null
          notice_version: string
          notify_status: string | null
          primary_need: string | null
          request_ip_hash: string | null
          resource: string
          role: string | null
          send_count: number
          send_day: string | null
          sends_on_day: number
          source: string
          updated_at: string
          user_id: string | null
          verified_at: string | null
        }
        Insert: {
          company?: string | null
          consented_at?: string
          created_at?: string
          delivery_status?: string | null
          downloads?: number
          email: string
          email_hash: string
          expires_at?: string
          first_downloaded_at?: string | null
          free_mailbox?: boolean
          id?: string
          industry?: string | null
          last_downloaded_at?: string | null
          last_sent_at?: string | null
          marketing_consent?: boolean
          mx_status?: string
          name?: string | null
          notice_version: string
          notify_status?: string | null
          primary_need?: string | null
          request_ip_hash?: string | null
          resource: string
          role?: string | null
          send_count?: number
          send_day?: string | null
          sends_on_day?: number
          source: string
          updated_at?: string
          user_id?: string | null
          verified_at?: string | null
        }
        Update: {
          company?: string | null
          consented_at?: string
          created_at?: string
          delivery_status?: string | null
          downloads?: number
          email?: string
          email_hash?: string
          expires_at?: string
          first_downloaded_at?: string | null
          free_mailbox?: boolean
          id?: string
          industry?: string | null
          last_downloaded_at?: string | null
          last_sent_at?: string | null
          marketing_consent?: boolean
          mx_status?: string
          name?: string | null
          notice_version?: string
          notify_status?: string | null
          primary_need?: string | null
          request_ip_hash?: string | null
          resource?: string
          role?: string | null
          send_count?: number
          send_day?: string | null
          sends_on_day?: number
          source?: string
          updated_at?: string
          user_id?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      scale_price_quotes: {
        Row: {
          amount_inr: number
          billing_cycle: string
          consumed_at: string | null
          consumed_order_id: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          seats: number | null
          status: string
          user_id: string
          valid_until: string
        }
        Insert: {
          amount_inr: number
          billing_cycle?: string
          consumed_at?: string | null
          consumed_order_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          seats?: number | null
          status?: string
          user_id: string
          valid_until: string
        }
        Update: {
          amount_inr?: number
          billing_cycle?: string
          consumed_at?: string | null
          consumed_order_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          seats?: number | null
          status?: string
          user_id?: string
          valid_until?: string
        }
        Relationships: []
      }
      scope_review_requests: {
        Row: {
          company: string | null
          created_at: string
          email: string
          email_status: string
          estimate_max_inr: number
          estimate_min_inr: number
          id: string
          message: string
          name: string
          phone: string | null
          request_ip_hash: string | null
          scope_input: Json
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          email_status?: string
          estimate_max_inr: number
          estimate_min_inr: number
          id?: string
          message: string
          name: string
          phone?: string | null
          request_ip_hash?: string | null
          scope_input: Json
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          email_status?: string
          estimate_max_inr?: number
          estimate_min_inr?: number
          id?: string
          message?: string
          name?: string
          phone?: string | null
          request_ip_hash?: string | null
          scope_input?: Json
          updated_at?: string
        }
        Relationships: []
      }
      scope3_documents: {
        Row: {
          document_id: string
          duplicate_of: string | null
          extraction_id: string
          id: string
          invoice_key: string | null
          method_version: string
          organization_id: string | null
          owner_scope: string | null
          processed_at: string
          reconciliation: Json
          status: string
          user_id: string
        }
        Insert: {
          document_id: string
          duplicate_of?: string | null
          extraction_id: string
          id?: string
          invoice_key?: string | null
          method_version: string
          organization_id?: string | null
          owner_scope?: string | null
          processed_at?: string
          reconciliation: Json
          status: string
          user_id: string
        }
        Update: {
          document_id?: string
          duplicate_of?: string | null
          extraction_id?: string
          id?: string
          invoice_key?: string | null
          method_version?: string
          organization_id?: string | null
          owner_scope?: string | null
          processed_at?: string
          reconciliation?: Json
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scope3_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scope3_documents_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "scope3_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scope3_documents_extraction_id_fkey"
            columns: ["extraction_id"]
            isOneToOne: false
            referencedRelation: "document_extractions"
            referencedColumns: ["id"]
          },
        ]
      }
      scope3_factors: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          boundary: string
          created_at: string
          created_by: string
          data_class: string
          evidence_document_id: string | null
          factor_key: string
          geography: string
          gwp_basis: string
          id: string
          kg_co2e_per_unit: number
          material_key: string
          publication_year: number
          scope3_category: number
          source_name: string
          source_ref: string
          status: string
          unit: string
          valid_from: string
          valid_to: string | null
          version: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          boundary: string
          created_at?: string
          created_by: string
          data_class: string
          evidence_document_id?: string | null
          factor_key: string
          geography: string
          gwp_basis: string
          id?: string
          kg_co2e_per_unit: number
          material_key: string
          publication_year: number
          scope3_category: number
          source_name: string
          source_ref: string
          status?: string
          unit: string
          valid_from: string
          valid_to?: string | null
          version: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          boundary?: string
          created_at?: string
          created_by?: string
          data_class?: string
          evidence_document_id?: string | null
          factor_key?: string
          geography?: string
          gwp_basis?: string
          id?: string
          kg_co2e_per_unit?: number
          material_key?: string
          publication_year?: number
          scope3_category?: number
          source_name?: string
          source_ref?: string
          status?: string
          unit?: string
          valid_from?: string
          valid_to?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "scope3_factors_evidence_document_id_fkey"
            columns: ["evidence_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      scope3_lines: {
        Row: {
          activity_qty: number | null
          activity_unit: string | null
          calculated_at: string
          checks: Json
          classification_basis: string
          classification_method: string
          confidence: string | null
          data_class: string
          description: string
          document_id: string
          extraction_id: string
          factor_geography: string | null
          factor_id: string | null
          factor_key: string | null
          factor_material: string | null
          factor_source: string | null
          factor_unit: string | null
          factor_value: number | null
          factor_version: string | null
          formula: string | null
          hsn_code: string | null
          id: string
          inputs_sha256: string
          invoice_date: string | null
          invoice_number: string | null
          is_current: boolean
          kg_co2e: number | null
          line_index: number
          line_total: number | null
          logistics: Json | null
          material_key: string | null
          method_version: string
          next_action: string | null
          organization_id: string | null
          quantity: number | null
          reasons: string[]
          scope: number | null
          scope3_category: number | null
          scope3_document_id: string
          source_page: number | null
          source_text: string | null
          status: string
          supplier_gstin: string | null
          supplier_name: string | null
          unit: string | null
          user_id: string
        }
        Insert: {
          activity_qty?: number | null
          activity_unit?: string | null
          calculated_at?: string
          checks?: Json
          classification_basis: string
          classification_method: string
          confidence?: string | null
          data_class: string
          description: string
          document_id: string
          extraction_id: string
          factor_geography?: string | null
          factor_id?: string | null
          factor_key?: string | null
          factor_material?: string | null
          factor_source?: string | null
          factor_unit?: string | null
          factor_value?: number | null
          factor_version?: string | null
          formula?: string | null
          hsn_code?: string | null
          id?: string
          inputs_sha256: string
          invoice_date?: string | null
          invoice_number?: string | null
          is_current?: boolean
          kg_co2e?: number | null
          line_index: number
          line_total?: number | null
          logistics?: Json | null
          material_key?: string | null
          method_version: string
          next_action?: string | null
          organization_id?: string | null
          quantity?: number | null
          reasons?: string[]
          scope?: number | null
          scope3_category?: number | null
          scope3_document_id: string
          source_page?: number | null
          source_text?: string | null
          status: string
          supplier_gstin?: string | null
          supplier_name?: string | null
          unit?: string | null
          user_id: string
        }
        Update: {
          activity_qty?: number | null
          activity_unit?: string | null
          calculated_at?: string
          checks?: Json
          classification_basis?: string
          classification_method?: string
          confidence?: string | null
          data_class?: string
          description?: string
          document_id?: string
          extraction_id?: string
          factor_geography?: string | null
          factor_id?: string | null
          factor_key?: string | null
          factor_material?: string | null
          factor_source?: string | null
          factor_unit?: string | null
          factor_value?: number | null
          factor_version?: string | null
          formula?: string | null
          hsn_code?: string | null
          id?: string
          inputs_sha256?: string
          invoice_date?: string | null
          invoice_number?: string | null
          is_current?: boolean
          kg_co2e?: number | null
          line_index?: number
          line_total?: number | null
          logistics?: Json | null
          material_key?: string | null
          method_version?: string
          next_action?: string | null
          organization_id?: string | null
          quantity?: number | null
          reasons?: string[]
          scope?: number | null
          scope3_category?: number | null
          scope3_document_id?: string
          source_page?: number | null
          source_text?: string | null
          status?: string
          supplier_gstin?: string | null
          supplier_name?: string | null
          unit?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scope3_lines_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scope3_lines_extraction_id_fkey"
            columns: ["extraction_id"]
            isOneToOne: false
            referencedRelation: "document_extractions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scope3_lines_factor_id_fkey"
            columns: ["factor_id"]
            isOneToOne: false
            referencedRelation: "scope3_factors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scope3_lines_scope3_document_id_fkey"
            columns: ["scope3_document_id"]
            isOneToOne: false
            referencedRelation: "scope3_documents"
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
      service_orders: {
        Row: {
          amount_paise: number
          base_paise: number
          created_at: string
          delivered_at: string | null
          due_at: string | null
          id: string
          kind: string
          paid_at: string | null
          quantity: number
          razorpay_order_id: string
          razorpay_payment_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount_paise: number
          base_paise: number
          created_at?: string
          delivered_at?: string | null
          due_at?: string | null
          id?: string
          kind: string
          paid_at?: string | null
          quantity?: number
          razorpay_order_id: string
          razorpay_payment_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount_paise?: number
          base_paise?: number
          created_at?: string
          delivered_at?: string | null
          due_at?: string | null
          id?: string
          kind?: string
          paid_at?: string | null
          quantity?: number
          razorpay_order_id?: string
          razorpay_payment_id?: string | null
          status?: string
          user_id?: string
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
      solar_assets: {
        Row: {
          additionality: string
          capacity_kwp: number
          commissioned_on: string
          created_at: string
          id: string
          meter_accuracy_pct: number
          name: string
          region: string
          registered_elsewhere: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          additionality?: string
          capacity_kwp: number
          commissioned_on: string
          created_at?: string
          id?: string
          meter_accuracy_pct?: number
          name?: string
          region?: string
          registered_elsewhere?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          additionality?: string
          capacity_kwp?: number
          commissioned_on?: string
          created_at?: string
          id?: string
          meter_accuracy_pct?: number
          name?: string
          region?: string
          registered_elsewhere?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      solar_readings: {
        Row: {
          asset_id: string
          created_at: string
          document_id: string | null
          evidence: string
          id: string
          kwh: number
          period_end: string
          period_start: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          document_id?: string | null
          evidence: string
          id?: string
          kwh: number
          period_end: string
          period_start: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          document_id?: string | null
          evidence?: string
          id?: string
          kwh?: number
          period_end?: string
          period_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "solar_readings_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "solar_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solar_readings_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      story_submissions: {
        Row: {
          account_figures: Json | null
          answers: Json | null
          attribution: string
          buyer: string
          consent_text_hash: string
          consent_version: string
          consented_at: string
          contact_email: string | null
          created_at: string
          erase_after: string | null
          id: string
          industry: string
          notify_status: string | null
          publish_consent: boolean
          published_at: string | null
          request_ip_hash: string | null
          review_note: string | null
          review_removals: Json | null
          reviewed_at: string | null
          reviewer_id: string | null
          slug: string | null
          status: string
          story: Json | null
          story_hash: string | null
          updated_at: string
          user_id: string | null
          withdrawn_at: string | null
        }
        Insert: {
          account_figures?: Json | null
          answers?: Json | null
          attribution: string
          buyer: string
          consent_text_hash: string
          consent_version: string
          consented_at?: string
          contact_email?: string | null
          created_at?: string
          erase_after?: string | null
          id?: string
          industry: string
          notify_status?: string | null
          publish_consent?: boolean
          published_at?: string | null
          request_ip_hash?: string | null
          review_note?: string | null
          review_removals?: Json | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          slug?: string | null
          status?: string
          story?: Json | null
          story_hash?: string | null
          updated_at?: string
          user_id?: string | null
          withdrawn_at?: string | null
        }
        Update: {
          account_figures?: Json | null
          answers?: Json | null
          attribution?: string
          buyer?: string
          consent_text_hash?: string
          consent_version?: string
          consented_at?: string
          contact_email?: string | null
          created_at?: string
          erase_after?: string | null
          id?: string
          industry?: string
          notify_status?: string | null
          publish_consent?: boolean
          published_at?: string | null
          request_ip_hash?: string | null
          review_note?: string | null
          review_removals?: Json | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          slug?: string | null
          status?: string
          story?: Json | null
          story_hash?: string | null
          updated_at?: string
          user_id?: string | null
          withdrawn_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount: number
          billing_cycle: string
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
          billing_cycle?: string
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
          billing_cycle?: string
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
      translation_cache: {
        Row: {
          created_at: string
          locale: string
          source: string
          source_hash: string
          translated: string
        }
        Insert: {
          created_at?: string
          locale: string
          source: string
          source_hash: string
          translated: string
        }
        Update: {
          created_at?: string
          locale?: string
          source?: string
          source_hash?: string
          translated?: string
        }
        Relationships: []
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
      case_studies_public: {
        Row: {
          buyer: string | null
          industry: string | null
          published_at: string | null
          slug: string | null
          story: Json | null
        }
        Insert: {
          buyer?: string | null
          industry?: string | null
          published_at?: string | null
          slug?: string | null
          story?: Json | null
        }
        Update: {
          buyer?: string | null
          industry?: string | null
          published_at?: string | null
          slug?: string | null
          story?: Json | null
        }
        Relationships: []
      }
      scope2_totals: {
        Row: {
          instrument_kwh: number | null
          kg: number | null
          kwh: number | null
          method: string | null
          organization_id: string | null
          reporting_year: string | null
          unresolved_kwh: number | null
          user_id: string | null
          warning_rows: number | null
        }
        Relationships: []
      }
      scope3_category_totals: {
        Row: {
          organization_id: string | null
          scope3_category: number | null
          supplier_data_lines: number | null
          user_id: string | null
          verified_kg: number | null
          verified_lines: number | null
        }
        Relationships: []
      }
      scope3_supplier_ledger: {
        Row: {
          needs_data_lines: number | null
          needs_review_lines: number | null
          organization_id: string | null
          primary_lines: number | null
          scope3_lines: number | null
          secondary_lines: number | null
          spend: number | null
          supplier_factor_lines: number | null
          supplier_key: string | null
          supplier_name: string | null
          user_id: string | null
          verified_kg: number | null
          verified_lines: number | null
          verified_spend: number | null
        }
        Relationships: []
      }
      scope3_trail: {
        Row: {
          activity_qty: number | null
          activity_unit: string | null
          calculated_at: string | null
          checks: Json | null
          classification_basis: string | null
          classification_method: string | null
          confidence: string | null
          data_class: string | null
          description: string | null
          document_hash: string | null
          document_id: string | null
          duplicate_of: string | null
          extraction_id: string | null
          extraction_model: string | null
          extraction_sha256: string | null
          factor_geography: string | null
          factor_id: string | null
          factor_key: string | null
          factor_material: string | null
          factor_source: string | null
          factor_unit: string | null
          factor_value: number | null
          factor_version: string | null
          formula: string | null
          hsn_code: string | null
          id: string | null
          inputs_sha256: string | null
          invoice_date: string | null
          invoice_number: string | null
          invoice_status: string | null
          is_current: boolean | null
          kg_co2e: number | null
          line_index: number | null
          line_total: number | null
          logistics: Json | null
          material_key: string | null
          method_version: string | null
          next_action: string | null
          organization_id: string | null
          quantity: number | null
          reasons: string[] | null
          reconciliation: Json | null
          scope: number | null
          scope3_category: number | null
          scope3_document_id: string | null
          sealed_at: string | null
          source_file_path: string | null
          source_page: number | null
          source_text: string | null
          status: string | null
          supplier_gstin: string | null
          supplier_name: string | null
          unit: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scope3_documents_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "scope3_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scope3_lines_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scope3_lines_extraction_id_fkey"
            columns: ["extraction_id"]
            isOneToOne: false
            referencedRelation: "document_extractions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scope3_lines_factor_id_fkey"
            columns: ["factor_id"]
            isOneToOne: false
            referencedRelation: "scope3_factors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scope3_lines_scope3_document_id_fkey"
            columns: ["scope3_document_id"]
            isOneToOne: false
            referencedRelation: "scope3_documents"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      commit_invoice_read: {
        Args: { p_document_id?: string; p_id: string }
        Returns: boolean
      }
      commit_verification: { Args: { p: Json }; Returns: Json }
      create_organization: {
        Args: { p_name: string }
        Returns: {
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
        SetofOptions: {
          from: "*"
          to: "organizations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_secure_session: {
        Args: { fingerprint: string; ip_hash?: string }
        Returns: string
      }
      delete_document_atomic: {
        Args: {
          p_actor: string
          p_allowed: boolean
          p_document_id: string
          p_user_agent?: string
        }
        Returns: Json
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
      intelligence_take: {
        Args: {
          p_day: string
          p_kind: string
          p_limit: number
          p_subject: string
          p_window_start: string
        }
        Returns: {
          allowed: boolean
          used: number
        }[]
      }
      intelligence_usage_purge: { Args: never; Returns: number }
      intelligence_used: {
        Args: {
          p_day: string
          p_kind: string
          p_subject: string
          p_window_start: string
        }
        Returns: number
      }
      invoice_ledger_started_at: { Args: never; Returns: string }
      invoice_pack_usable_until: {
        Args: {
          p_pack: Database["public"]["Tables"]["invoice_credit_packs"]["Row"]
          p_plan_end: string
        }
        Returns: string
      }
      invoice_source_storage_ready: { Args: never; Returns: boolean }
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
      is_trusted_db_writer: { Args: never; Returns: boolean }
      ledger_chain_append: {
        Args: {
          p_chain_key: string
          p_emission_id: string
          p_event_type: string
          p_ledger_id: string
          p_row_digest: string
        }
        Returns: undefined
      }
      ledger_event_hash: {
        Args: {
          p_chain_key: string
          p_chain_seq: number
          p_event_type: string
          p_ledger_id: string
          p_prev_hash: string
          p_recorded_at: string
          p_row_digest: string
        }
        Returns: string
      }
      ledger_row_digest: { Args: { r: Json }; Returns: string }
      my_org_permissions: { Args: { p_organization_id: string }; Returns: Json }
      owner_seat_limit: { Args: { p_owner_id: string }; Returns: number }
      owns_guest_session: { Args: { _session_id: string }; Returns: boolean }
      owns_session: {
        Args: { fingerprint: string; session_uuid: string }
        Returns: boolean
      }
      release_invoice_read: { Args: { p_id: string }; Returns: boolean }
      remove_member: {
        Args: { p_organization_id: string; p_user_id: string }
        Returns: undefined
      }
      reserve_invoice_read: {
        Args: {
          p_hash: string
          p_now?: string
          p_org: string
          p_page_counting_from: string
          p_pages: number
          p_period_start: string
          p_plan_limit: number
          p_user: string
        }
        Returns: Json
      }
      scope2_record: { Args: { p: Json }; Returns: Json }
      scope3_record_document: { Args: { p: Json }; Returns: Json }
      seat_limit_for_tier: { Args: { p_tier: string }; Returns: number }
      service_accept_team_invitation: {
        Args: { p_token: string; p_user_email: string; p_user_id: string }
        Returns: {
          accepted_role: string
          organization_id: string
          organization_name: string
        }[]
      }
      service_create_team_invitation: {
        Args: {
          p_actor_id: string
          p_email: string
          p_organization_id: string
          p_role: string
          p_token: string
        }
        Returns: {
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
        SetofOptions: {
          from: "*"
          to: "team_invitations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      service_org_can: {
        Args: {
          p_capability: string
          p_organization_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      switch_user_context: {
        Args: { p_context_id: string; p_context_type: string }
        Returns: boolean
      }
      update_member_role: {
        Args: { p_organization_id: string; p_role: string; p_user_id: string }
        Returns: {
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
        SetofOptions: {
          from: "*"
          to: "organization_members"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_session_activity: {
        Args: { fingerprint: string; session_uuid: string }
        Returns: boolean
      }
      validate_session_access: {
        Args: { fingerprint: string; session_uuid: string }
        Returns: boolean
      }
      verify_ledger_chain: {
        Args: { p_chain_key: string }
        Returns: {
          at_chain_seq: number
          events: number
          ok: boolean
          problem: string
        }[]
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
