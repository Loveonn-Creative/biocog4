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
      carbon_verifications: {
        Row: {
          ai_analysis: Json | null
          cbam_compliant: boolean | null
          ccts_eligible: boolean | null
          created_at: string | null
          emission_ids: string[]
          greenwashing_risk: string | null
          id: string
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
          session_id?: string | null
          total_co2_kg?: number
          user_id?: string | null
          verification_score?: number | null
          verification_status?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "carbon_verifications_session_id_fkey"
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
          confidence: number | null
          created_at: string | null
          currency: string | null
          document_type: string
          file_url: string | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          raw_ocr_data: Json | null
          session_id: string | null
          subtotal: number | null
          tax_amount: number | null
          user_id: string | null
          vendor: string | null
        }
        Insert: {
          amount?: number | null
          confidence?: number | null
          created_at?: string | null
          currency?: string | null
          document_type: string
          file_url?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          raw_ocr_data?: Json | null
          session_id?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          user_id?: string | null
          vendor?: string | null
        }
        Update: {
          amount?: number | null
          confidence?: number | null
          created_at?: string | null
          currency?: string | null
          document_type?: string
          file_url?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          raw_ocr_data?: Json | null
          session_id?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          user_id?: string | null
          vendor?: string | null
        }
        Relationships: [
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
            foreignKeyName: "emissions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
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
          status: string | null
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
          status?: string | null
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
          status?: string | null
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
      profiles: {
        Row: {
          business_name: string | null
          created_at: string | null
          gstin: string | null
          id: string
          location: string | null
          phone: string | null
          preferred_language: string | null
          sector: string | null
          size: string | null
          updated_at: string | null
        }
        Insert: {
          business_name?: string | null
          created_at?: string | null
          gstin?: string | null
          id: string
          location?: string | null
          phone?: string | null
          preferred_language?: string | null
          sector?: string | null
          size?: string | null
          updated_at?: string | null
        }
        Update: {
          business_name?: string | null
          created_at?: string | null
          gstin?: string | null
          id?: string
          location?: string | null
          phone?: string | null
          preferred_language?: string | null
          sector?: string | null
          size?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string | null
          id: string
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
            foreignKeyName: "reports_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string | null
          device_fingerprint: string | null
          id: string
          last_active: string | null
        }
        Insert: {
          created_at?: string | null
          device_fingerprint?: string | null
          id?: string
          last_active?: string | null
        }
        Update: {
          created_at?: string | null
          device_fingerprint?: string | null
          id?: string
          last_active?: string | null
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
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
