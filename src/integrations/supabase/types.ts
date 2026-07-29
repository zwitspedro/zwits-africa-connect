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
      bookings: {
        Row: {
          address: string
          budget: number | null
          category: string
          completed_at: string | null
          created_at: string
          customer_confirmed_at: string | null
          customer_id: string
          description: string | null
          dispatch_radius_km: number
          dispatch_state: string
          dispatch_updated_at: string | null
          dispatch_wave: number
          fulfilment_mode: string
          id: string
          lat: number | null
          lng: number | null
          payment_method: string | null
          payment_reference: string | null
          payment_status: string
          photos: string[]
          price: number | null
          provider_id: string | null
          scheduled_for: string | null
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        Insert: {
          address: string
          budget?: number | null
          category: string
          completed_at?: string | null
          created_at?: string
          customer_confirmed_at?: string | null
          customer_id: string
          description?: string | null
          dispatch_radius_km?: number
          dispatch_state?: string
          dispatch_updated_at?: string | null
          dispatch_wave?: number
          fulfilment_mode?: string
          id?: string
          lat?: number | null
          lng?: number | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          photos?: string[]
          price?: number | null
          provider_id?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Update: {
          address?: string
          budget?: number | null
          category?: string
          completed_at?: string | null
          created_at?: string
          customer_confirmed_at?: string | null
          customer_id?: string
          description?: string | null
          dispatch_radius_km?: number
          dispatch_state?: string
          dispatch_updated_at?: string | null
          dispatch_wave?: number
          fulfilment_mode?: string
          id?: string
          lat?: number | null
          lng?: number | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          photos?: string[]
          price?: number | null
          provider_id?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_rate_history: {
        Row: {
          active: boolean
          category: string
          change_kind: string
          changed_by: string | null
          created_at: string
          id: string
          min_fee: number
          notes: string | null
          percent: number
        }
        Insert: {
          active?: boolean
          category: string
          change_kind: string
          changed_by?: string | null
          created_at?: string
          id?: string
          min_fee?: number
          notes?: string | null
          percent: number
        }
        Update: {
          active?: boolean
          category?: string
          change_kind?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          min_fee?: number
          notes?: string | null
          percent?: number
        }
        Relationships: []
      }
      commission_rates: {
        Row: {
          active: boolean
          category: string
          created_at: string
          id: string
          min_fee: number
          notes: string | null
          percent: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          category: string
          created_at?: string
          id?: string
          min_fee?: number
          notes?: string | null
          percent?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          id?: string
          min_fee?: number
          notes?: string | null
          percent?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      customer_ratings: {
        Row: {
          booking_id: string
          created_at: string
          customer_id: string
          id: string
          provider_id: string
          provider_user_id: string
          rating: number
          review: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string
          customer_id: string
          id?: string
          provider_id: string
          provider_user_id: string
          rating: number
          review?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          provider_id?: string
          provider_user_id?: string
          rating?: number
          review?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_ratings_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_ratings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      job_offers: {
        Row: {
          booking_id: string
          created_at: string
          distance_km: number | null
          expires_at: string
          id: string
          offered_at: string
          provider_id: string
          provider_user_id: string
          responded_at: string | null
          status: string
          updated_at: string
          wave: number
        }
        Insert: {
          booking_id: string
          created_at?: string
          distance_km?: number | null
          expires_at: string
          id?: string
          offered_at?: string
          provider_id: string
          provider_user_id: string
          responded_at?: string | null
          status?: string
          updated_at?: string
          wave?: number
        }
        Update: {
          booking_id?: string
          created_at?: string
          distance_km?: number | null
          expires_at?: string
          id?: string
          offered_at?: string
          provider_id?: string
          provider_user_id?: string
          responded_at?: string | null
          status?: string
          updated_at?: string
          wave?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_offers_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_offers_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      job_quotes: {
        Row: {
          booking_id: string
          created_at: string
          eta_minutes: number
          id: string
          message: string | null
          price: number
          provider_id: string
          provider_user_id: string
          status: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          eta_minutes: number
          id?: string
          message?: string | null
          price: number
          provider_id: string
          provider_user_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          eta_minutes?: number
          id?: string
          message?: string | null
          price?: number
          provider_id?: string
          provider_user_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_quotes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_quotes_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          booking_id: string
          content: string | null
          created_at: string
          id: string
          receiver_id: string
          sender_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          booking_id: string
          content?: string | null
          created_at?: string
          id?: string
          receiver_id: string
          sender_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          booking_id?: string
          content?: string | null
          created_at?: string
          id?: string
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: string
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type?: string
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type?: string
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      provider_document_audits: {
        Row: {
          created_at: string
          doc_key: string
          errors: string[]
          file_name: string | null
          file_size: number | null
          height: number | null
          id: string
          mime_type: string | null
          provider_user_id: string
          status: string
          storage_path: string | null
          width: number | null
        }
        Insert: {
          created_at?: string
          doc_key: string
          errors?: string[]
          file_name?: string | null
          file_size?: number | null
          height?: number | null
          id?: string
          mime_type?: string | null
          provider_user_id: string
          status: string
          storage_path?: string | null
          width?: number | null
        }
        Update: {
          created_at?: string
          doc_key?: string
          errors?: string[]
          file_name?: string | null
          file_size?: number | null
          height?: number | null
          id?: string
          mime_type?: string | null
          provider_user_id?: string
          status?: string
          storage_path?: string | null
          width?: number | null
        }
        Relationships: []
      }
      provider_locations: {
        Row: {
          accuracy: number | null
          booking_id: string
          created_at: string
          heading: number | null
          id: string
          lat: number
          lng: number
          provider_user_id: string
          speed: number | null
          updated_at: string
        }
        Insert: {
          accuracy?: number | null
          booking_id: string
          created_at?: string
          heading?: number | null
          id?: string
          lat: number
          lng: number
          provider_user_id: string
          speed?: number | null
          updated_at?: string
        }
        Update: {
          accuracy?: number | null
          booking_id?: string
          created_at?: string
          heading?: number | null
          id?: string
          lat?: number
          lng?: number
          provider_user_id?: string
          speed?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_locations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          available: boolean
          bio: string | null
          business_doc_url: string | null
          business_name: string
          category: string
          city: string
          created_at: string
          hourly_rate: number
          id: string
          id_document_url: string | null
          jobs_completed: number
          rating_avg: number
          ratings_count: number
          reviewed_at: string | null
          reviewed_by: string | null
          revoke_reason: string | null
          selfie_url: string | null
          submitted_at: string | null
          updated_at: string
          user_id: string
          verification_status: Database["public"]["Enums"]["provider_verification_status"]
          verified: boolean
        }
        Insert: {
          available?: boolean
          bio?: string | null
          business_doc_url?: string | null
          business_name: string
          category: string
          city: string
          created_at?: string
          hourly_rate?: number
          id?: string
          id_document_url?: string | null
          jobs_completed?: number
          rating_avg?: number
          ratings_count?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          revoke_reason?: string | null
          selfie_url?: string | null
          submitted_at?: string | null
          updated_at?: string
          user_id: string
          verification_status?: Database["public"]["Enums"]["provider_verification_status"]
          verified?: boolean
        }
        Update: {
          available?: boolean
          bio?: string | null
          business_doc_url?: string | null
          business_name?: string
          category?: string
          city?: string
          created_at?: string
          hourly_rate?: number
          id?: string
          id_document_url?: string | null
          jobs_completed?: number
          rating_avg?: number
          ratings_count?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          revoke_reason?: string | null
          selfie_url?: string | null
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
          verification_status?: Database["public"]["Enums"]["provider_verification_status"]
          verified?: boolean
        }
        Relationships: []
      }
      ratings: {
        Row: {
          booking_id: string
          created_at: string
          customer_id: string
          id: string
          provider_id: string
          rating: number
          review: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string
          customer_id: string
          id?: string
          provider_id: string
          rating: number
          review?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          provider_id?: string
          rating?: number
          review?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ratings_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
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
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_booking_counterpart_profile: {
        Args: { _user_id: string }
        Returns: {
          avatar_url: string
          display_name: string
          phone: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "customer" | "provider" | "admin"
      booking_status:
        | "pending"
        | "accepted"
        | "in_progress"
        | "completed"
        | "cancelled"
      provider_verification_status:
        | "unverified"
        | "pending"
        | "approved"
        | "revoked"
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
      app_role: ["customer", "provider", "admin"],
      booking_status: [
        "pending",
        "accepted",
        "in_progress",
        "completed",
        "cancelled",
      ],
      provider_verification_status: [
        "unverified",
        "pending",
        "approved",
        "revoked",
      ],
    },
  },
} as const
