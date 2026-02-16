/** Types Supabase pour Credit Flow (alignés sur le projet original) */
export type Json
  = | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type LoanStatus = 'en_attente' | 'valide' | 'en_cours' | 'rembourse' | 'en_retard' | 'defaut'
export type PaymentStatus = 'pending' | 'paid' | 'partial' | 'overdue'
/** Rôles alignés sur la référence Credit Flow (enum app_role en base) */
export type AppRole = 'admin' | 'directeur' | 'agent_credit' | 'caissier' | 'recouvrement'

export interface Database {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string
          full_name: string
          phone: string
          id_number: string
          id_type: string
          email: string | null
          address: string | null
          profession: string | null
          monthly_income: number | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
      loans: {
        Row: {
          id: string
          client_id: string
          amount: number
          interest_rate: number
          duration_months: number
          status: LoanStatus
          total_amount: number | null
          monthly_payment: number | null
          purpose: string | null
          disbursement_date: string | null
          validation_date: string | null
          validated_by: string | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
      payments: {
        Row: {
          id: string
          loan_id: string
          amount: number
          payment_date: string
          payment_method: string
          notes: string | null
          reference: string | null
          schedule_id: string | null
          recorded_by: string | null
          created_at: string
        }
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: AppRole
          created_at: string
        }
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
      app_settings: {
        Row: {
          id: string
          key: string
          value: Json
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
    }
    Enums: {
      loan_status: LoanStatus
      payment_status: PaymentStatus
      app_role: AppRole
    }
  }
}
