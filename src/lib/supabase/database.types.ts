export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      account_credit_config: {
        Row: {
          account_id: string
          annual_fee: number | null
          annual_rate: number | null
          created_at: string
          credit_limit: number | null
          cutoff_day: number | null
          minimum_payment_floor: number | null
          minimum_payment_rate: number | null
          payment_due_day: number | null
          updated_at: string
        }
        Insert: {
          account_id: string
          annual_fee?: number | null
          annual_rate?: number | null
          created_at?: string
          credit_limit?: number | null
          cutoff_day?: number | null
          minimum_payment_floor?: number | null
          minimum_payment_rate?: number | null
          payment_due_day?: number | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          annual_fee?: number | null
          annual_rate?: number | null
          created_at?: string
          credit_limit?: number | null
          cutoff_day?: number | null
          minimum_payment_floor?: number | null
          minimum_payment_rate?: number | null
          payment_due_day?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_credit_config_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "account_totals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_credit_config_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      account_rate_history: {
        Row: {
          account_id: string
          created_at: string
          effective_from: string
          gross_annual_rate: number
          id: string
          note: string | null
        }
        Insert: {
          account_id: string
          created_at?: string
          effective_from?: string
          gross_annual_rate: number
          id?: string
          note?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string
          effective_from?: string
          gross_annual_rate?: number
          id?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_rate_history_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_totals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_rate_history_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      account_yield_config: {
        Row: {
          account_id: string
          accrued_remainder: number
          applies_isr: boolean
          auto_renew: boolean
          compounding: Database["public"]["Enums"]["compounding_frequency"]
          created_at: string
          day_count_basis: number
          destination: Database["public"]["Enums"]["yield_destination"]
          early_withdrawal_penalty_rate: number
          gross_annual_rate: number
          isr_remainder: number
          last_accrued_on: string | null
          matures_on: string | null
          pending_interest: number
          pending_isr: number
          starts_on: string | null
          term_days: number | null
          updated_at: string
          withdrawal_lock: Database["public"]["Enums"]["lock_type"]
        }
        Insert: {
          account_id: string
          accrued_remainder?: number
          applies_isr?: boolean
          auto_renew?: boolean
          compounding?: Database["public"]["Enums"]["compounding_frequency"]
          created_at?: string
          day_count_basis?: number
          destination?: Database["public"]["Enums"]["yield_destination"]
          early_withdrawal_penalty_rate?: number
          gross_annual_rate: number
          isr_remainder?: number
          last_accrued_on?: string | null
          matures_on?: string | null
          pending_interest?: number
          pending_isr?: number
          starts_on?: string | null
          term_days?: number | null
          updated_at?: string
          withdrawal_lock?: Database["public"]["Enums"]["lock_type"]
        }
        Update: {
          account_id?: string
          accrued_remainder?: number
          applies_isr?: boolean
          auto_renew?: boolean
          compounding?: Database["public"]["Enums"]["compounding_frequency"]
          created_at?: string
          day_count_basis?: number
          destination?: Database["public"]["Enums"]["yield_destination"]
          early_withdrawal_penalty_rate?: number
          gross_annual_rate?: number
          isr_remainder?: number
          last_accrued_on?: string | null
          matures_on?: string | null
          pending_interest?: number
          pending_isr?: number
          starts_on?: string | null
          term_days?: number | null
          updated_at?: string
          withdrawal_lock?: Database["public"]["Enums"]["lock_type"]
        }
        Relationships: [
          {
            foreignKeyName: "account_yield_config_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "account_totals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_yield_config_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          balance: number
          color: string | null
          created_at: string
          currency: string
          display_order: number
          icon: string | null
          id: string
          institution_id: string | null
          is_archived: boolean
          kind: Database["public"]["Enums"]["account_kind"]
          name: string
          nature: Database["public"]["Enums"]["account_nature"]
          notes: string | null
          opened_on: string
          parent_account_id: string | null
          target_amount: number | null
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          color?: string | null
          created_at?: string
          currency?: string
          display_order?: number
          icon?: string | null
          id?: string
          institution_id?: string | null
          is_archived?: boolean
          kind?: Database["public"]["Enums"]["account_kind"]
          name: string
          nature?: Database["public"]["Enums"]["account_nature"]
          notes?: string | null
          opened_on?: string
          parent_account_id?: string | null
          target_amount?: number | null
          target_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          color?: string | null
          created_at?: string
          currency?: string
          display_order?: number
          icon?: string | null
          id?: string
          institution_id?: string | null
          is_archived?: boolean
          kind?: Database["public"]["Enums"]["account_kind"]
          name?: string
          nature?: Database["public"]["Enums"]["account_nature"]
          notes?: string | null
          opened_on?: string
          parent_account_id?: string | null
          target_amount?: number | null
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_parent_account_id_fkey"
            columns: ["parent_account_id"]
            isOneToOne: false
            referencedRelation: "account_totals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_parent_account_id_fkey"
            columns: ["parent_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      accrual_runs: {
        Row: {
          accounts_processed: number
          duration_ms: number | null
          id: string
          ran_at: string
          run_date: string
          total_gross: number
          total_withheld: number
          transactions_created: number
        }
        Insert: {
          accounts_processed?: number
          duration_ms?: number | null
          id?: string
          ran_at?: string
          run_date: string
          total_gross?: number
          total_withheld?: number
          transactions_created?: number
        }
        Update: {
          accounts_processed?: number
          duration_ms?: number | null
          id?: string
          ran_at?: string
          run_date?: string
          total_gross?: number
          total_withheld?: number
          transactions_created?: number
        }
        Relationships: []
      }
      budgets: {
        Row: {
          category_id: string
          created_at: string
          id: string
          limit_amount: number
          month: string
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          limit_amount: number
          month: string
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          limit_amount?: number
          month?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string
          created_at: string
          display_order: number
          icon: string
          id: string
          is_archived: boolean
          kind: Database["public"]["Enums"]["category_kind"]
          name: string
          parent_id: string | null
          user_id: string | null
        }
        Insert: {
          color?: string
          created_at?: string
          display_order?: number
          icon?: string
          id?: string
          is_archived?: boolean
          kind?: Database["public"]["Enums"]["category_kind"]
          name: string
          parent_id?: string | null
          user_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string
          display_order?: number
          icon?: string
          id?: string
          is_archived?: boolean
          kind?: Database["public"]["Enums"]["category_kind"]
          name?: string
          parent_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      institutions: {
        Row: {
          brand_color: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          kind: Database["public"]["Enums"]["institution_kind"]
          name: string
          protection_limit_udis: number | null
          protection_scheme: string | null
          reference_rate: number | null
          reference_rate_as_of: string | null
          reference_rate_note: string | null
          short_name: string | null
          slug: string
          website: string | null
        }
        Insert: {
          brand_color: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          kind: Database["public"]["Enums"]["institution_kind"]
          name: string
          protection_limit_udis?: number | null
          protection_scheme?: string | null
          reference_rate?: number | null
          reference_rate_as_of?: string | null
          reference_rate_note?: string | null
          short_name?: string | null
          slug: string
          website?: string | null
        }
        Update: {
          brand_color?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["institution_kind"]
          name?: string
          protection_limit_udis?: number | null
          protection_scheme?: string | null
          reference_rate?: number | null
          reference_rate_as_of?: string | null
          reference_rate_note?: string | null
          short_name?: string | null
          slug?: string
          website?: string | null
        }
        Relationships: []
      }
      msi_plans: {
        Row: {
          category_id: string | null
          created_at: string
          credit_account_id: string
          description: string
          first_payment_on: string
          id: string
          installments: number
          installments_paid: number
          monthly_amount: number
          purchased_on: string
          total_amount: number
          user_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          credit_account_id: string
          description: string
          first_payment_on: string
          id?: string
          installments: number
          installments_paid?: number
          monthly_amount: number
          purchased_on?: string
          total_amount: number
          user_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          credit_account_id?: string
          description?: string
          first_payment_on?: string
          id?: string
          installments?: number
          installments_paid?: number
          monthly_amount?: number
          purchased_on?: string
          total_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "msi_plans_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "msi_plans_credit_account_id_fkey"
            columns: ["credit_account_id"]
            isOneToOne: false
            referencedRelation: "account_totals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "msi_plans_credit_account_id_fkey"
            columns: ["credit_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          currency: string
          display_name: string | null
          id: string
          is_demo: boolean
          onboarded_at: string | null
          time_zone: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          currency?: string
          display_name?: string | null
          id: string
          is_demo?: boolean
          onboarded_at?: string | null
          time_zone?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          currency?: string
          display_name?: string | null
          id?: string
          is_demo?: boolean
          onboarded_at?: string | null
          time_zone?: string
          updated_at?: string
        }
        Relationships: []
      }
      recurring_rules: {
        Row: {
          amount: number
          auto_post: boolean
          category_id: string | null
          created_at: string
          day_of_month: number | null
          ends_on: string | null
          frequency: Database["public"]["Enums"]["recurrence_frequency"]
          from_account_id: string | null
          id: string
          is_active: boolean
          name: string
          next_run_on: string
          second_day_of_month: number | null
          starts_on: string
          to_account_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Insert: {
          amount: number
          auto_post?: boolean
          category_id?: string | null
          created_at?: string
          day_of_month?: number | null
          ends_on?: string | null
          frequency: Database["public"]["Enums"]["recurrence_frequency"]
          from_account_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          next_run_on: string
          second_day_of_month?: number | null
          starts_on?: string
          to_account_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Update: {
          amount?: number
          auto_post?: boolean
          category_id?: string | null
          created_at?: string
          day_of_month?: number | null
          ends_on?: string | null
          frequency?: Database["public"]["Enums"]["recurrence_frequency"]
          from_account_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          next_run_on?: string
          second_day_of_month?: number | null
          starts_on?: string
          to_account_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_rules_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "account_totals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_rules_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_rules_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "account_totals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_rules_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_parameters: {
        Row: {
          created_at: string
          estimated_inflation: number
          isr_rate_on_capital: number
          iva_rate: number
          source: string | null
          uma_daily: number | null
          year: number
        }
        Insert: {
          created_at?: string
          estimated_inflation: number
          isr_rate_on_capital: number
          iva_rate?: number
          source?: string | null
          uma_daily?: number | null
          year: number
        }
        Update: {
          created_at?: string
          estimated_inflation?: number
          isr_rate_on_capital?: number
          iva_rate?: number
          source?: string | null
          uma_daily?: number | null
          year?: number
        }
        Relationships: []
      }
      transactions: {
        Row: {
          accrual_date: string | null
          amount: number
          category_id: string | null
          created_at: string
          from_account_id: string | null
          id: string
          is_accrual: boolean
          merchant: string | null
          msi_plan_id: string | null
          notes: string | null
          occurred_at: string
          recurring_rule_id: string | null
          reverses_transaction_id: string | null
          to_account_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Insert: {
          accrual_date?: string | null
          amount: number
          category_id?: string | null
          created_at?: string
          from_account_id?: string | null
          id?: string
          is_accrual?: boolean
          merchant?: string | null
          msi_plan_id?: string | null
          notes?: string | null
          occurred_at?: string
          recurring_rule_id?: string | null
          reverses_transaction_id?: string | null
          to_account_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Update: {
          accrual_date?: string | null
          amount?: number
          category_id?: string | null
          created_at?: string
          from_account_id?: string | null
          id?: string
          is_accrual?: boolean
          merchant?: string | null
          msi_plan_id?: string | null
          notes?: string | null
          occurred_at?: string
          recurring_rule_id?: string | null
          reverses_transaction_id?: string | null
          to_account_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "account_totals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_msi_fk"
            columns: ["msi_plan_id"]
            isOneToOne: false
            referencedRelation: "msi_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_recurring_fk"
            columns: ["recurring_rule_id"]
            isOneToOne: false
            referencedRelation: "recurring_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_reverses_transaction_id_fkey"
            columns: ["reverses_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "account_totals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      account_totals: {
        Row: {
          applies_isr: boolean | null
          balance: number | null
          color: string | null
          compounding:
            | Database["public"]["Enums"]["compounding_frequency"]
            | null
          created_at: string | null
          currency: string | null
          destination: Database["public"]["Enums"]["yield_destination"] | null
          display_order: number | null
          gross_annual_rate: number | null
          icon: string | null
          id: string | null
          institution_id: string | null
          is_archived: boolean | null
          kind: Database["public"]["Enums"]["account_kind"] | null
          matures_on: string | null
          name: string | null
          nature: Database["public"]["Enums"]["account_nature"] | null
          notes: string | null
          opened_on: string | null
          parent_account_id: string | null
          target_amount: number | null
          target_date: string | null
          total_balance: number | null
          updated_at: string | null
          user_id: string | null
          vault_balance: number | null
          withdrawal_lock: Database["public"]["Enums"]["lock_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_parent_account_id_fkey"
            columns: ["parent_account_id"]
            isOneToOne: false
            referencedRelation: "account_totals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_parent_account_id_fkey"
            columns: ["parent_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_progress: {
        Row: {
          category_id: string | null
          id: string | null
          limit_amount: number | null
          month: string | null
          progress: number | null
          remaining_amount: number | null
          spent_amount: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      liquidity_summary: {
        Row: {
          available_balance: number | null
          net_worth: number | null
          total_assets: number | null
          total_liabilities: number | null
          user_id: string | null
          vault_liquid_balance: number | null
          vault_locked_balance: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      accrue_account: {
        Args: { p_account_id: string; p_through?: string }
        Returns: number
      }
      accrue_all_yields: { Args: { p_through?: string }; Returns: number }
      assert_own_account: {
        Args: { p_account_id: string }
        Returns: {
          balance: number
          color: string | null
          created_at: string
          currency: string
          display_order: number
          icon: string | null
          id: string
          institution_id: string | null
          is_archived: boolean
          kind: Database["public"]["Enums"]["account_kind"]
          name: string
          nature: Database["public"]["Enums"]["account_nature"]
          notes: string | null
          opened_on: string
          parent_account_id: string | null
          target_amount: number | null
          target_date: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "accounts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      catch_up_my_yields: { Args: never; Returns: number }
      closes_compounding_period: {
        Args: {
          p_compounding: Database["public"]["Enums"]["compounding_frequency"]
          p_date: string
        }
        Returns: boolean
      }
      create_msi_plan: {
        Args: {
          p_category_id?: string
          p_credit_account_id: string
          p_description: string
          p_first_payment_on?: string
          p_installments: number
          p_purchased_on?: string
          p_total_amount: number
        }
        Returns: {
          category_id: string | null
          created_at: string
          credit_account_id: string
          description: string
          first_payment_on: string
          id: string
          installments: number
          installments_paid: number
          monthly_amount: number
          purchased_on: string
          total_amount: number
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "msi_plans"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      open_vault: {
        Args: {
          p_applies_isr?: boolean
          p_compounding?: Database["public"]["Enums"]["compounding_frequency"]
          p_day_count_basis?: number
          p_destination?: Database["public"]["Enums"]["yield_destination"]
          p_gross_annual_rate?: number
          p_initial_amount: number
          p_name: string
          p_parent_account_id: string
          p_penalty_rate?: number
          p_target_amount?: number
          p_target_date?: string
          p_term_days?: number
          p_withdrawal_lock?: Database["public"]["Enums"]["lock_type"]
        }
        Returns: {
          balance: number
          color: string | null
          created_at: string
          currency: string
          display_order: number
          icon: string | null
          id: string
          institution_id: string | null
          is_archived: boolean
          kind: Database["public"]["Enums"]["account_kind"]
          name: string
          nature: Database["public"]["Enums"]["account_nature"]
          notes: string | null
          opened_on: string
          parent_account_id: string | null
          target_amount: number | null
          target_date: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "accounts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      post_recurring_occurrence: {
        Args: { p_occurred_at?: string; p_rule_id: string }
        Returns: {
          accrual_date: string | null
          amount: number
          category_id: string | null
          created_at: string
          from_account_id: string | null
          id: string
          is_accrual: boolean
          merchant: string | null
          msi_plan_id: string | null
          notes: string | null
          occurred_at: string
          recurring_rule_id: string | null
          reverses_transaction_id: string | null
          to_account_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_expense: {
        Args: {
          p_account_id: string
          p_amount: number
          p_category_id?: string
          p_merchant?: string
          p_notes?: string
          p_occurred_at?: string
        }
        Returns: {
          accrual_date: string | null
          amount: number
          category_id: string | null
          created_at: string
          from_account_id: string | null
          id: string
          is_accrual: boolean
          merchant: string | null
          msi_plan_id: string | null
          notes: string | null
          occurred_at: string
          recurring_rule_id: string | null
          reverses_transaction_id: string | null
          to_account_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_income: {
        Args: {
          p_account_id: string
          p_amount: number
          p_category_id?: string
          p_merchant?: string
          p_notes?: string
          p_occurred_at?: string
        }
        Returns: {
          accrual_date: string | null
          amount: number
          category_id: string | null
          created_at: string
          from_account_id: string | null
          id: string
          is_accrual: boolean
          merchant: string | null
          msi_plan_id: string | null
          notes: string | null
          occurred_at: string
          recurring_rule_id: string | null
          reverses_transaction_id: string | null
          to_account_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reverse_transaction: {
        Args: { p_reason?: string; p_transaction_id: string }
        Returns: {
          accrual_date: string | null
          amount: number
          category_id: string | null
          created_at: string
          from_account_id: string | null
          id: string
          is_accrual: boolean
          merchant: string | null
          msi_plan_id: string | null
          notes: string | null
          occurred_at: string
          recurring_rule_id: string | null
          reverses_transaction_id: string | null
          to_account_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      settle_matured_term: {
        Args: { p_account_id: string }
        Returns: {
          balance: number
          color: string | null
          created_at: string
          currency: string
          display_order: number
          icon: string | null
          id: string
          institution_id: string | null
          is_archived: boolean
          kind: Database["public"]["Enums"]["account_kind"]
          name: string
          nature: Database["public"]["Enums"]["account_nature"]
          notes: string | null
          opened_on: string
          parent_account_id: string | null
          target_amount: number | null
          target_date: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "accounts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      transfer_between_accounts: {
        Args: {
          p_amount: number
          p_force?: boolean
          p_from_account_id: string
          p_notes?: string
          p_occurred_at?: string
          p_to_account_id: string
        }
        Returns: {
          accrual_date: string | null
          amount: number
          category_id: string | null
          created_at: string
          from_account_id: string | null
          id: string
          is_accrual: boolean
          merchant: string | null
          msi_plan_id: string | null
          notes: string | null
          occurred_at: string
          recurring_rule_id: string | null
          reverses_transaction_id: string | null
          to_account_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      account_kind:
        | "checking"
        | "savings"
        | "vault"
        | "term_deposit"
        | "cash"
        | "investment"
        | "credit_card"
        | "loan"
      account_nature: "asset" | "liability"
      category_kind: "expense" | "income"
      compounding_frequency:
        | "daily"
        | "monthly"
        | "bimonthly"
        | "quarterly"
        | "semiannual"
        | "annual"
        | "at_maturity"
      institution_kind:
        | "banco"
        | "neobanco"
        | "sofipo"
        | "fintech"
        | "casa_bolsa"
        | "gobierno"
        | "efectivo"
        | "otro"
      lock_type: "none" | "soft" | "hard"
      recurrence_frequency:
        | "weekly"
        | "biweekly"
        | "semimonthly"
        | "monthly"
        | "bimonthly"
        | "quarterly"
        | "semiannual"
        | "annual"
      transaction_type:
        | "income"
        | "expense"
        | "transfer"
        | "yield"
        | "fee"
        | "tax"
        | "adjustment"
        | "credit_charge"
        | "credit_payment"
      yield_destination: "capitalize" | "to_parent"
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
      account_kind: [
        "checking",
        "savings",
        "vault",
        "term_deposit",
        "cash",
        "investment",
        "credit_card",
        "loan",
      ],
      account_nature: ["asset", "liability"],
      category_kind: ["expense", "income"],
      compounding_frequency: [
        "daily",
        "monthly",
        "bimonthly",
        "quarterly",
        "semiannual",
        "annual",
        "at_maturity",
      ],
      institution_kind: [
        "banco",
        "neobanco",
        "sofipo",
        "fintech",
        "casa_bolsa",
        "gobierno",
        "efectivo",
        "otro",
      ],
      lock_type: ["none", "soft", "hard"],
      recurrence_frequency: [
        "weekly",
        "biweekly",
        "semimonthly",
        "monthly",
        "bimonthly",
        "quarterly",
        "semiannual",
        "annual",
      ],
      transaction_type: [
        "income",
        "expense",
        "transfer",
        "yield",
        "fee",
        "tax",
        "adjustment",
        "credit_charge",
        "credit_payment",
      ],
      yield_destination: ["capitalize", "to_parent"],
    },
  },
} as const

