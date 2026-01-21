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
      admin_notifications: {
        Row: {
          admin_user_id: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          notification_type: string
          related_user_id: string | null
          related_user_name: string | null
        }
        Insert: {
          admin_user_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          notification_type: string
          related_user_id?: string | null
          related_user_name?: string | null
        }
        Update: {
          admin_user_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          notification_type?: string
          related_user_id?: string | null
          related_user_name?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          created_at: string
          created_by: string | null
          email: string | null
          full_name: string
          id: string
          id_number: string
          id_type: string
          monthly_income: number | null
          phone: string
          profession: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name: string
          id?: string
          id_number: string
          id_type?: string
          monthly_income?: number | null
          phone: string
          profession?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string
          id?: string
          id_number?: string
          id_type?: string
          monthly_income?: number | null
          phone?: string
          profession?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      company_funds: {
        Row: {
          created_at: string
          current_balance: number
          id: string
          initial_capital: number
          notes: string | null
          total_interest_earned: number | null
          total_loans_disbursed: number | null
          total_payments_received: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          current_balance?: number
          id?: string
          initial_capital?: number
          notes?: string | null
          total_interest_earned?: number | null
          total_loans_disbursed?: number | null
          total_payments_received?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          current_balance?: number
          id?: string
          initial_capital?: number
          notes?: string | null
          total_interest_earned?: number | null
          total_loans_disbursed?: number | null
          total_payments_received?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      company_funds_history: {
        Row: {
          change_amount: number
          change_type: string
          created_at: string
          fund_id: string
          id: string
          new_balance: number
          notes: string | null
          previous_balance: number
          updated_by: string | null
        }
        Insert: {
          change_amount: number
          change_type: string
          created_at?: string
          fund_id: string
          id?: string
          new_balance: number
          notes?: string | null
          previous_balance: number
          updated_by?: string | null
        }
        Update: {
          change_amount?: number
          change_type?: string
          created_at?: string
          fund_id?: string
          id?: string
          new_balance?: number
          notes?: string | null
          previous_balance?: number
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_funds_history_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "company_funds"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          created_by: string | null
          disbursement_date: string | null
          duration_months: number
          id: string
          interest_rate: number
          monthly_payment: number | null
          purpose: string | null
          status: Database["public"]["Enums"]["loan_status"]
          total_amount: number | null
          updated_at: string
          validated_by: string | null
          validation_date: string | null
        }
        Insert: {
          amount: number
          client_id: string
          created_at?: string
          created_by?: string | null
          disbursement_date?: string | null
          duration_months: number
          id?: string
          interest_rate?: number
          monthly_payment?: number | null
          purpose?: string | null
          status?: Database["public"]["Enums"]["loan_status"]
          total_amount?: number | null
          updated_at?: string
          validated_by?: string | null
          validation_date?: string | null
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          created_by?: string | null
          disbursement_date?: string | null
          duration_months?: number
          id?: string
          interest_rate?: number
          monthly_payment?: number | null
          purpose?: string | null
          status?: Database["public"]["Enums"]["loan_status"]
          total_amount?: number | null
          updated_at?: string
          validated_by?: string | null
          validation_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          attempted_at: string
          email: string
          id: string
          ip_address: string | null
          was_successful: boolean
        }
        Insert: {
          attempted_at?: string
          email: string
          id?: string
          ip_address?: string | null
          was_successful?: boolean
        }
        Update: {
          attempted_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          was_successful?: boolean
        }
        Relationships: []
      }
      payment_schedule: {
        Row: {
          amount_due: number
          amount_paid: number | null
          created_at: string
          due_date: string
          id: string
          installment_number: number
          interest: number
          loan_id: string
          payment_date: string | null
          principal: number
          status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          amount_due: number
          amount_paid?: number | null
          created_at?: string
          due_date: string
          id?: string
          installment_number: number
          interest: number
          loan_id: string
          payment_date?: string | null
          principal: number
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          amount_due?: number
          amount_paid?: number | null
          created_at?: string
          due_date?: string
          id?: string
          installment_number?: number
          interest?: number
          loan_id?: string
          payment_date?: string | null
          principal?: number
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payment_schedule_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          loan_id: string
          notes: string | null
          payment_date: string
          payment_method: string
          recorded_by: string | null
          reference: string | null
          schedule_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          loan_id: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          recorded_by?: string | null
          reference?: string | null
          schedule_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          loan_id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          recorded_by?: string | null
          reference?: string | null
          schedule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "payment_schedule"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
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
      user_suspensions: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          lifted_at: string | null
          lifted_by: string | null
          reason: string | null
          suspended_at: string
          suspended_by: string
          suspended_until: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          lifted_at?: string | null
          lifted_by?: string | null
          reason?: string | null
          suspended_at?: string
          suspended_by: string
          suspended_until: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          lifted_at?: string | null
          lifted_by?: string | null
          reason?: string | null
          suspended_at?: string
          suspended_by?: string
          suspended_until?: string
          user_id?: string
        }
        Relationships: []
      }
      work_schedule: {
        Row: {
          created_at: string
          created_by: string | null
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          day_of_week: number
          end_time?: string
          id?: string
          is_active?: boolean
          start_time?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      work_sessions: {
        Row: {
          closed_at: string | null
          created_at: string
          final_cash: number | null
          id: string
          initial_cash: number | null
          is_late: boolean | null
          late_minutes: number | null
          notes: string | null
          opened_at: string
          status: string
          updated_at: string
          user_id: string
          work_date: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          final_cash?: number | null
          id?: string
          initial_cash?: number | null
          is_late?: boolean | null
          late_minutes?: number | null
          notes?: string | null
          opened_at?: string
          status?: string
          updated_at?: string
          user_id: string
          work_date?: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          final_cash?: number | null
          id?: string
          initial_cash?: number | null
          is_late?: boolean | null
          late_minutes?: number | null
          notes?: string | null
          opened_at?: string
          status?: string
          updated_at?: string
          user_id?: string
          work_date?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_login_attempts: { Args: never; Returns: undefined }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_suspension: {
        Args: { _user_id: string }
        Returns: {
          reason: string
          suspended_until: string
        }[]
      }
      has_any_role: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_account_locked: {
        Args: { check_email: string }
        Returns: {
          failed_attempts: number
          is_locked: boolean
          locked_until: string
        }[]
      }
      is_user_suspended: { Args: { _user_id: string }; Returns: boolean }
      record_login_attempt: {
        Args: {
          attempt_email: string
          attempt_ip?: string
          attempt_successful?: boolean
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "directeur"
        | "agent_credit"
        | "caissier"
        | "recouvrement"
      loan_status:
        | "en_attente"
        | "en_cours_validation"
        | "approuve"
        | "rejete"
        | "en_cours"
        | "rembourse"
        | "en_retard"
        | "defaut"
      payment_status: "en_attente" | "paye" | "en_retard" | "partiel"
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
      app_role: [
        "admin",
        "directeur",
        "agent_credit",
        "caissier",
        "recouvrement",
      ],
      loan_status: [
        "en_attente",
        "en_cours_validation",
        "approuve",
        "rejete",
        "en_cours",
        "rembourse",
        "en_retard",
        "defaut",
      ],
      payment_status: ["en_attente", "paye", "en_retard", "partiel"],
    },
  },
} as const
