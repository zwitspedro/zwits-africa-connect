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
      admin_audit_log: {
        Row: {
          action: string
          actor: string | null
          created_at: string
          id: string
          metadata: Json | null
          subject_id: string | null
          subject_type: string
        }
        Insert: {
          action: string
          actor?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          subject_id?: string | null
          subject_type: string
        }
        Update: {
          action?: string
          actor?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          subject_id?: string | null
          subject_type?: string
        }
        Relationships: []
      }
      booking_status_history: {
        Row: {
          booking_id: string
          changed_by: string | null
          created_at: string
          id: string
          note: string | null
          status: string
        }
        Insert: {
          booking_id: string
          changed_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          status: string
        }
        Update: {
          booking_id?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_status_history_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
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
          max_fee: number | null
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
          max_fee?: number | null
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
          max_fee?: number | null
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
      deliveries: {
        Row: {
          created_at: string
          customer_id: string
          delivered_at: string | null
          dispatch_state: string
          dispatch_wave: number
          distance_km: number | null
          driver_id: string | null
          dropoff_address: string
          dropoff_lat: number | null
          dropoff_lng: number | null
          id: string
          notes: string | null
          parcel_size: string
          payment_method: string | null
          payment_status: string
          picked_up_at: string | null
          pickup_address: string
          pickup_lat: number | null
          pickup_lng: number | null
          price: number | null
          proof_photo_url: string | null
          recipient_name: string | null
          recipient_phone: string | null
          service_tier: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          delivered_at?: string | null
          dispatch_state?: string
          dispatch_wave?: number
          distance_km?: number | null
          driver_id?: string | null
          dropoff_address: string
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          id?: string
          notes?: string | null
          parcel_size?: string
          payment_method?: string | null
          payment_status?: string
          picked_up_at?: string | null
          pickup_address: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          price?: number | null
          proof_photo_url?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          service_tier?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          delivered_at?: string | null
          dispatch_state?: string
          dispatch_wave?: number
          distance_km?: number | null
          driver_id?: string | null
          dropoff_address?: string
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          id?: string
          notes?: string | null
          parcel_size?: string
          payment_method?: string | null
          payment_status?: string
          picked_up_at?: string | null
          pickup_address?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          price?: number | null
          proof_photo_url?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          service_tier?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      delivery_events: {
        Row: {
          actor: string | null
          created_at: string
          dedupe_key: string | null
          delivery_id: string
          event: string
          id: string
          metadata: Json | null
        }
        Insert: {
          actor?: string | null
          created_at?: string
          dedupe_key?: string | null
          delivery_id: string
          event: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          actor?: string | null
          created_at?: string
          dedupe_key?: string | null
          delivery_id?: string
          event?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_events_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_offers: {
        Row: {
          created_at: string
          delivery_id: string
          distance_km: number | null
          driver_user_id: string
          expires_at: string
          id: string
          offered_at: string
          responded_at: string | null
          status: string
          updated_at: string
          wave: number
        }
        Insert: {
          created_at?: string
          delivery_id: string
          distance_km?: number | null
          driver_user_id: string
          expires_at?: string
          id?: string
          offered_at?: string
          responded_at?: string | null
          status?: string
          updated_at?: string
          wave?: number
        }
        Update: {
          created_at?: string
          delivery_id?: string
          distance_km?: number | null
          driver_user_id?: string
          expires_at?: string
          id?: string
          offered_at?: string
          responded_at?: string | null
          status?: string
          updated_at?: string
          wave?: number
        }
        Relationships: [
          {
            foreignKeyName: "delivery_offers_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      device_tokens: {
        Row: {
          created_at: string
          id: string
          last_seen_at: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_seen_at?: string
          platform?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_seen_at?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      disputes: {
        Row: {
          booking_id: string | null
          created_at: string
          delivery_id: string | null
          description: string | null
          id: string
          opened_by: string
          reason: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          delivery_id?: string | null
          description?: string | null
          id?: string
          opened_by: string
          reason: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          delivery_id?: string | null
          description?: string | null
          id?: string
          opened_by?: string
          reason?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_profiles: {
        Row: {
          address: string | null
          available: boolean
          city: string
          created_at: string
          deliveries_completed: number
          full_name: string | null
          id: string
          id_document_url: string | null
          insurance_expiry: string | null
          insurance_provider: string | null
          licence_url: string | null
          onboarding_completed_at: string | null
          phone: string | null
          rating_avg: number
          ratings_count: number
          reviewed_at: string | null
          services: string[]
          submitted_at: string | null
          updated_at: string
          user_id: string
          vehicle_doc_url: string | null
          verification_status: string
          work_end: string | null
          work_start: string | null
          zone_radius_km: number
        }
        Insert: {
          address?: string | null
          available?: boolean
          city?: string
          created_at?: string
          deliveries_completed?: number
          full_name?: string | null
          id?: string
          id_document_url?: string | null
          insurance_expiry?: string | null
          insurance_provider?: string | null
          licence_url?: string | null
          onboarding_completed_at?: string | null
          phone?: string | null
          rating_avg?: number
          ratings_count?: number
          reviewed_at?: string | null
          services?: string[]
          submitted_at?: string | null
          updated_at?: string
          user_id: string
          vehicle_doc_url?: string | null
          verification_status?: string
          work_end?: string | null
          work_start?: string | null
          zone_radius_km?: number
        }
        Update: {
          address?: string | null
          available?: boolean
          city?: string
          created_at?: string
          deliveries_completed?: number
          full_name?: string | null
          id?: string
          id_document_url?: string | null
          insurance_expiry?: string | null
          insurance_provider?: string | null
          licence_url?: string | null
          onboarding_completed_at?: string | null
          phone?: string | null
          rating_avg?: number
          ratings_count?: number
          reviewed_at?: string | null
          services?: string[]
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
          vehicle_doc_url?: string | null
          verification_status?: string
          work_end?: string | null
          work_start?: string | null
          zone_radius_km?: number
        }
        Relationships: []
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
      favorites: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          provider_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          provider_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
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
      payments: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string
          currency: string
          customer_id: string
          delivery_id: string | null
          external_reference: string | null
          failure_reason: string | null
          id: string
          metadata: Json | null
          paid_at: string | null
          payment_method: string
          provider: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          customer_id: string
          delivery_id?: string | null
          external_reference?: string | null
          failure_reason?: string | null
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          payment_method?: string
          provider?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          customer_id?: string
          delivery_id?: string | null
          external_reference?: string | null
          failure_reason?: string | null
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          payment_method?: string
          provider?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: string
          avatar_url: string | null
          city: string | null
          country: string | null
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          referral_code: string | null
          terms_accepted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type?: string
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          referral_code?: string | null
          terms_accepted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type?: string
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          referral_code?: string | null
          terms_accepted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      provider_availability: {
        Row: {
          created_at: string
          enabled: boolean
          end_time: string
          id: string
          start_time: string
          updated_at: string
          user_id: string
          weekday: number
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          end_time?: string
          id?: string
          start_time?: string
          updated_at?: string
          user_id: string
          weekday: number
        }
        Update: {
          created_at?: string
          enabled?: boolean
          end_time?: string
          id?: string
          start_time?: string
          updated_at?: string
          user_id?: string
          weekday?: number
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
      provider_documents: {
        Row: {
          document_type: string
          expiry_date: string | null
          file_url: string
          id: string
          provider_user_id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          updated_at: string
          uploaded_at: string
          verification_status: string
        }
        Insert: {
          document_type: string
          expiry_date?: string | null
          file_url: string
          id?: string
          provider_user_id: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string
          uploaded_at?: string
          verification_status?: string
        }
        Update: {
          document_type?: string
          expiry_date?: string | null
          file_url?: string
          id?: string
          provider_user_id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string
          uploaded_at?: string
          verification_status?: string
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
      provider_onboarding: {
        Row: {
          background_check_consent: boolean
          bank_account: string | null
          bank_name: string | null
          business_address: string | null
          business_reg_url: string | null
          business_type: string | null
          certificate_url: string | null
          city: string | null
          completed_step: number
          country: string | null
          created_at: string
          emergency_services: boolean
          id: string
          max_travel_km: number
          mobile_money_number: string | null
          national_id: string | null
          payout_method: string | null
          portfolio_urls: string[]
          proof_of_address_url: string | null
          service_areas: string[]
          service_categories: string[]
          social_handle: string | null
          tax_number: string | null
          updated_at: string
          user_id: string
          website: string | null
          work_end: string | null
          work_start: string | null
          working_days: string[]
          years_experience: number | null
        }
        Insert: {
          background_check_consent?: boolean
          bank_account?: string | null
          bank_name?: string | null
          business_address?: string | null
          business_reg_url?: string | null
          business_type?: string | null
          certificate_url?: string | null
          city?: string | null
          completed_step?: number
          country?: string | null
          created_at?: string
          emergency_services?: boolean
          id?: string
          max_travel_km?: number
          mobile_money_number?: string | null
          national_id?: string | null
          payout_method?: string | null
          portfolio_urls?: string[]
          proof_of_address_url?: string | null
          service_areas?: string[]
          service_categories?: string[]
          social_handle?: string | null
          tax_number?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
          work_end?: string | null
          work_start?: string | null
          working_days?: string[]
          years_experience?: number | null
        }
        Update: {
          background_check_consent?: boolean
          bank_account?: string | null
          bank_name?: string | null
          business_address?: string | null
          business_reg_url?: string | null
          business_type?: string | null
          certificate_url?: string | null
          city?: string | null
          completed_step?: number
          country?: string | null
          created_at?: string
          emergency_services?: boolean
          id?: string
          max_travel_km?: number
          mobile_money_number?: string | null
          national_id?: string | null
          payout_method?: string | null
          portfolio_urls?: string[]
          proof_of_address_url?: string | null
          service_areas?: string[]
          service_categories?: string[]
          social_handle?: string | null
          tax_number?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
          work_end?: string | null
          work_start?: string | null
          working_days?: string[]
          years_experience?: number | null
        }
        Relationships: []
      }
      provider_services: {
        Row: {
          active: boolean
          base_price: number | null
          created_at: string
          id: string
          pricing_model: string
          provider_id: string
          service_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          base_price?: number | null
          created_at?: string
          id?: string
          pricing_model?: string
          provider_id: string
          service_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          base_price?: number | null
          created_at?: string
          id?: string
          pricing_model?: string
          provider_id?: string
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_time_off: {
        Row: {
          created_at: string
          day: string
          id: string
          reason: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day: string
          id?: string
          reason?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day?: string
          id?: string
          reason?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      provider_wallets: {
        Row: {
          available_balance: number
          created_at: string
          currency: string
          lifetime_earnings: number
          pending_balance: number
          provider_user_id: string
          updated_at: string
        }
        Insert: {
          available_balance?: number
          created_at?: string
          currency?: string
          lifetime_earnings?: number
          pending_balance?: number
          provider_user_id: string
          updated_at?: string
        }
        Update: {
          available_balance?: number
          created_at?: string
          currency?: string
          lifetime_earnings?: number
          pending_balance?: number
          provider_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      provider_withdrawals: {
        Row: {
          amount: number
          created_at: string
          destination: string
          failure_reason: string | null
          id: string
          method: string
          note: string | null
          processed_at: string | null
          provider_user_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          destination: string
          failure_reason?: string | null
          id?: string
          method: string
          note?: string | null
          processed_at?: string | null
          provider_user_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          destination?: string
          failure_reason?: string | null
          id?: string
          method?: string
          note?: string | null
          processed_at?: string | null
          provider_user_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
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
          onboarding_completed_at: string | null
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
          onboarding_completed_at?: string | null
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
          onboarding_completed_at?: string | null
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
      service_areas: {
        Row: {
          active: boolean
          area: string
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          provider_id: string
          radius_km: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          area: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          provider_id: string
          radius_km?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          area?: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          provider_id?: string
          radius_km?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_areas_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
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
      vehicles: {
        Row: {
          active: boolean
          capacity_kg: number | null
          colour: string | null
          created_at: string
          id: string
          make: string | null
          model: string | null
          photo_url: string | null
          plate: string
          updated_at: string
          user_id: string
          vehicle_type: string
        }
        Insert: {
          active?: boolean
          capacity_kg?: number | null
          colour?: string | null
          created_at?: string
          id?: string
          make?: string | null
          model?: string | null
          photo_url?: string | null
          plate: string
          updated_at?: string
          user_id: string
          vehicle_type?: string
        }
        Update: {
          active?: boolean
          capacity_kg?: number | null
          colour?: string | null
          created_at?: string
          id?: string
          make?: string | null
          model?: string | null
          photo_url?: string | null
          plate?: string
          updated_at?: string
          user_id?: string
          vehicle_type?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          balance_before: number
          booking_id: string | null
          created_at: string
          delivery_id: string | null
          id: string
          note: string | null
          provider_user_id: string
          reference: string
          status: string
          type: string
          withdrawal_id: string | null
        }
        Insert: {
          amount: number
          balance_after: number
          balance_before: number
          booking_id?: string | null
          created_at?: string
          delivery_id?: string | null
          id?: string
          note?: string | null
          provider_user_id: string
          reference: string
          status?: string
          type: string
          withdrawal_id?: string | null
        }
        Update: {
          amount?: number
          balance_after?: number
          balance_before?: number
          booking_id?: string | null
          created_at?: string
          delivery_id?: string | null
          id?: string
          note?: string | null
          provider_user_id?: string
          reference?: string
          status?: string
          type?: string
          withdrawal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_withdrawal_id_fkey"
            columns: ["withdrawal_id"]
            isOneToOne: false
            referencedRelation: "provider_withdrawals"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calc_commission: {
        Args: { _amount: number; _category: string }
        Returns: number
      }
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
      get_provider_documents: {
        Args: { _provider_id: string }
        Returns: {
          business_doc_url: string
          id_document_url: string
          selfie_url: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_booking_participant: {
        Args: { _booking_id: string; _user_id: string }
        Returns: boolean
      }
      is_provider_available_at: {
        Args: { _at: string; _user_id: string }
        Returns: boolean
      }
      is_trusted_writer: { Args: never; Returns: boolean }
      log_admin_action: {
        Args: {
          _action: string
          _metadata?: Json
          _subject_id?: string
          _subject_type: string
        }
        Returns: undefined
      }
      log_delivery_event: {
        Args: {
          _actor?: string
          _dedupe_key?: string
          _delivery_id: string
          _event: string
          _metadata?: Json
        }
        Returns: undefined
      }
      log_marketplace_event: {
        Args: {
          _actor?: string
          _booking_id: string
          _event: string
          _metadata?: Json
        }
        Returns: undefined
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
      post_wallet_transaction: {
        Args: {
          _allow_negative?: boolean
          _amount: number
          _booking_id?: string
          _delivery_id?: string
          _note?: string
          _provider_user_id: string
          _reference: string
          _type: string
          _withdrawal_id?: string
        }
        Returns: string
      }
      provider_readiness: { Args: { _user_id: string }; Returns: Json }
      providers_available_at: {
        Args: { _at: string; _user_ids: string[] }
        Returns: {
          user_id: string
        }[]
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      settle_booking: {
        Args: { _booking_id: string }
        Returns: {
          commission: number
          gross: number
          provider_earnings: number
        }[]
      }
    }
    Enums: {
      app_role: "customer" | "provider" | "admin" | "driver" | "business"
      booking_status:
        | "pending"
        | "accepted"
        | "travelling"
        | "arrived"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "matching"
        | "offered"
        | "provider_arriving"
        | "disputed"
        | "refunded"
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
      app_role: ["customer", "provider", "admin", "driver", "business"],
      booking_status: [
        "pending",
        "accepted",
        "travelling",
        "arrived",
        "in_progress",
        "completed",
        "cancelled",
        "matching",
        "offered",
        "provider_arriving",
        "disputed",
        "refunded",
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
