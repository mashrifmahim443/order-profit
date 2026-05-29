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
      customer_blacklist: {
        Row: {
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone: string
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      monthly_costs: {
        Row: {
          delivery_cost: number
          id: string
          marketing_cost: number
          month: number
          other_cost_amount: number
          other_cost_label: string
          packaging_cost: number
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          delivery_cost?: number
          id?: string
          marketing_cost?: number
          month: number
          other_cost_amount?: number
          other_cost_label?: string
          packaging_cost?: number
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          delivery_cost?: number
          id?: string
          marketing_cost?: number
          month?: number
          other_cost_amount?: number
          other_cost_label?: string
          packaging_cost?: number
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          order_date: string | null
          order_id: string
          order_status: string
          order_total: number
          product_name: string | null
          quantity: number
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          order_date?: string | null
          order_id: string
          order_status?: string
          order_total?: number
          product_name?: string | null
          quantity?: number
          user_id: string
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          order_date?: string | null
          order_id?: string
          order_status?: string
          order_total?: number
          product_name?: string | null
          quantity?: number
          user_id?: string
        }
        Relationships: []
      }
      payment_requests: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string
          note: string | null
          plan: string
          reviewed_at: string | null
          reviewed_by: string | null
          sender_number: string
          status: string
          transaction_id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method: string
          note?: string | null
          plan?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender_number: string
          status?: string
          transaction_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string
          note?: string | null
          plan?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender_number?: string
          status?: string
          transaction_id?: string
          user_id?: string
        }
        Relationships: []
      }
      plan_orders: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          note: string | null
          phone: string
          plan: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          website: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          note?: string | null
          phone: string
          plan?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          note?: string | null
          phone?: string
          plan?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          website?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          blocked: boolean
          created_at: string
          email_reports: string
          id: string
          plan: string
          plan_expires_at: string | null
          store_name: string
          webhook_token: string
        }
        Insert: {
          blocked?: boolean
          created_at?: string
          email_reports?: string
          id: string
          plan?: string
          plan_expires_at?: string | null
          store_name?: string
          webhook_token?: string
        }
        Update: {
          blocked?: boolean
          created_at?: string
          email_reports?: string
          id?: string
          plan?: string
          plan_expires_at?: string | null
          store_name?: string
          webhook_token?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          bkash_number: string
          business_order_limit: number
          business_price: number
          free_order_limit: number
          hero_subtitle: string
          hero_title: string
          id: number
          nagad_number: string
          pro_order_limit: number
          pro_price: number
          updated_at: string
        }
        Insert: {
          bkash_number?: string
          business_order_limit?: number
          business_price?: number
          free_order_limit?: number
          hero_subtitle?: string
          hero_title?: string
          id?: number
          nagad_number?: string
          pro_order_limit?: number
          pro_price?: number
          updated_at?: string
        }
        Update: {
          bkash_number?: string
          business_order_limit?: number
          business_price?: number
          free_order_limit?: number
          hero_subtitle?: string
          hero_title?: string
          id?: number
          nagad_number?: string
          pro_order_limit?: number
          pro_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          created_at: string
          id: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          created_at: string
          id: string
          is_admin: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_admin?: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_admin?: boolean
          message?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
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
      webhook_deliveries: {
        Row: {
          created_at: string
          id: string
          idempotency_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          idempotency_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          idempotency_key?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_platform_stats: {
        Args: never
        Returns: {
          blocked_users: number
          orders_this_month: number
          paid_users: number
          pending_payments: number
          total_users: number
        }[]
      }
      admin_user_stats: {
        Args: never
        Returns: {
          blocked: boolean
          created_at: string
          orders_this_month: number
          plan: string
          plan_expires_at: string
          store_name: string
          total_orders: number
          user_id: string
        }[]
      }
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
