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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      calendar_events: {
        Row: {
          content_id: string | null
          created_at: string
          created_by: string
          event_date: string
          id: string
          kind: string
          location: string | null
          notes: string | null
          start_time: string | null
          title: string
          workspace_id: string
        }
        Insert: {
          content_id?: string | null
          created_at?: string
          created_by?: string
          event_date: string
          id?: string
          kind?: string
          location?: string | null
          notes?: string | null
          start_time?: string | null
          title: string
          workspace_id: string
        }
        Update: {
          content_id?: string | null
          created_at?: string
          created_by?: string
          event_date?: string
          id?: string
          kind?: string
          location?: string | null
          notes?: string | null
          start_time?: string | null
          title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      clicks: {
        Row: {
          created_at: string
          id: string
          link_id: string
          referrer: string | null
          user_agent: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link_id: string
          referrer?: string | null
          user_agent?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link_id?: string
          referrer?: string | null
          user_agent?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clicks_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clicks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contents: {
        Row: {
          body: string | null
          created_at: string
          created_by: string
          due_date: string | null
          file_name: string | null
          file_path: string | null
          id: string
          mission_id: string | null
          status: string
          title: string
          type: string
          workspace_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by?: string
          due_date?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          mission_id?: string | null
          status?: string
          title: string
          type: string
          workspace_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string
          due_date?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          mission_id?: string | null
          status?: string
          title?: string
          type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contents_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "kitchen_missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          first_link_id: string | null
          id: string
          link_id: string | null
          name: string
          page: string | null
          props: Json | null
          session_id: string | null
          visitor_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          first_link_id?: string | null
          id?: string
          link_id?: string | null
          name: string
          page?: string | null
          props?: Json | null
          session_id?: string | null
          visitor_id?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          first_link_id?: string | null
          id?: string
          link_id?: string | null
          name?: string
          page?: string | null
          props?: Json | null
          session_id?: string | null
          visitor_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_first_link_id_fkey"
            columns: ["first_link_id"]
            isOneToOne: false
            referencedRelation: "links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      kitchen_inspirations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          tags: string[]
          takeaway: string | null
          title: string
          url: string
          why: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          tags?: string[]
          takeaway?: string | null
          title: string
          url: string
          why?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          tags?: string[]
          takeaway?: string | null
          title?: string
          url?: string
          why?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kitchen_inspirations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      kitchen_missions: {
        Row: {
          created_at: string
          created_by: string
          duration_min: number | null
          id: string
          kind: string
          never: string | null
          people: string | null
          period_start: string
          pitch: string | null
          plans: Json
          position: number
          scope: string
          title: string
          want: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          duration_min?: number | null
          id?: string
          kind?: string
          never?: string | null
          people?: string | null
          period_start: string
          pitch?: string | null
          plans?: Json
          position?: number
          scope?: string
          title: string
          want?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          duration_min?: number | null
          id?: string
          kind?: string
          never?: string | null
          people?: string | null
          period_start?: string
          pitch?: string | null
          plans?: Json
          position?: number
          scope?: string
          title?: string
          want?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kitchen_missions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      links: {
        Row: {
          archived_at: string | null
          code: string
          created_at: string
          created_by: string
          destination_url: string
          id: string
          name: string
          utm_campaign: string
          utm_content: string | null
          utm_medium: string
          utm_source: string
          workspace_id: string
        }
        Insert: {
          archived_at?: string | null
          code: string
          created_at?: string
          created_by?: string
          destination_url: string
          id?: string
          name: string
          utm_campaign: string
          utm_content?: string | null
          utm_medium: string
          utm_source: string
          workspace_id: string
        }
        Update: {
          archived_at?: string | null
          code?: string
          created_at?: string
          created_by?: string
          destination_url?: string
          id?: string
          name?: string
          utm_campaign?: string
          utm_content?: string | null
          utm_medium?: string
          utm_source?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "links_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_accounts: {
        Row: {
          amount: number | null
          city: string | null
          created_at: string
          created_by: string
          evidence: string
          external_ref: string | null
          id: string
          last_activity_at: string | null
          name: string
          notes: string | null
          owner_id: string | null
          phone: string | null
          priority: string | null
          segment: string | null
          source: string | null
          stage: string
          updated_at: string
          website: string | null
          workspace_id: string
        }
        Insert: {
          amount?: number | null
          city?: string | null
          created_at?: string
          created_by?: string
          evidence?: string
          external_ref?: string | null
          id?: string
          last_activity_at?: string | null
          name: string
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          priority?: string | null
          segment?: string | null
          source?: string | null
          stage?: string
          updated_at?: string
          website?: string | null
          workspace_id: string
        }
        Update: {
          amount?: number | null
          city?: string | null
          created_at?: string
          created_by?: string
          evidence?: string
          external_ref?: string | null
          id?: string
          last_activity_at?: string | null
          name?: string
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          priority?: string | null
          segment?: string | null
          source?: string | null
          stage?: string
          updated_at?: string
          website?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_accounts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_activities: {
        Row: {
          account_id: string
          actor_id: string
          created_at: string
          id: string
          kind: string
          note: string | null
          outcome: string
          workspace_id: string
        }
        Insert: {
          account_id: string
          actor_id?: string
          created_at?: string
          id?: string
          kind?: string
          note?: string | null
          outcome: string
          workspace_id: string
        }
        Update: {
          account_id?: string
          actor_id?: string
          created_at?: string
          id?: string
          kind?: string
          note?: string | null
          outcome?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_activities_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "sales_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_activities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_coach_card_versions: {
        Row: {
          actor_id: string
          card_id: string
          created_at: string
          id: string
          snapshot: Json
          version: number
          workspace_id: string
        }
        Insert: {
          actor_id?: string
          card_id: string
          created_at?: string
          id?: string
          snapshot: Json
          version: number
          workspace_id: string
        }
        Update: {
          actor_id?: string
          card_id?: string
          created_at?: string
          id?: string
          snapshot?: Json
          version?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_coach_card_versions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "sales_coach_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_coach_card_versions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_coach_cards: {
        Row: {
          advice: string
          created_at: string
          goal: string | null
          id: string
          listen: string | null
          next_question: string | null
          position: number
          slug: string
          title: string
          updated_at: string
          updated_by: string
          version: number
          workspace_id: string
        }
        Insert: {
          advice: string
          created_at?: string
          goal?: string | null
          id?: string
          listen?: string | null
          next_question?: string | null
          position?: number
          slug: string
          title: string
          updated_at?: string
          updated_by?: string
          version?: number
          workspace_id: string
        }
        Update: {
          advice?: string
          created_at?: string
          goal?: string | null
          id?: string
          listen?: string | null
          next_question?: string | null
          position?: number
          slug?: string
          title?: string
          updated_at?: string
          updated_by?: string
          version?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_coach_cards_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_contacts: {
        Row: {
          account_id: string
          created_at: string
          created_by: string
          email: string | null
          id: string
          is_decision_maker: boolean
          name: string
          phone: string | null
          role: string | null
          workspace_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          is_decision_maker?: boolean
          name: string
          phone?: string | null
          role?: string | null
          workspace_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          is_decision_maker?: boolean
          name?: string
          phone?: string | null
          role?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_contacts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "sales_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_contacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_next_actions: {
        Row: {
          account_id: string
          assignee_id: string | null
          created_at: string
          created_by: string
          done_at: string | null
          id: string
          label: string
          next_action_date: string
          workspace_id: string
        }
        Insert: {
          account_id: string
          assignee_id?: string | null
          created_at?: string
          created_by?: string
          done_at?: string | null
          id?: string
          label: string
          next_action_date: string
          workspace_id: string
        }
        Update: {
          account_id?: string
          assignee_id?: string | null
          created_at?: string
          created_by?: string
          done_at?: string | null
          id?: string
          label?: string
          next_action_date?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_next_actions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "sales_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_next_actions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_preferences: {
        Row: {
          hide_goals: boolean
          low_stimulation: boolean
          mode: string
          updated_at: string
          user_id: string
          weekly_challenge: number | null
          workspace_id: string
        }
        Insert: {
          hide_goals?: boolean
          low_stimulation?: boolean
          mode?: string
          updated_at?: string
          user_id?: string
          weekly_challenge?: number | null
          workspace_id: string
        }
        Update: {
          hide_goals?: boolean
          low_stimulation?: boolean
          mode?: string
          updated_at?: string
          user_id?: string
          weekly_challenge?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_preferences_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_stage_history: {
        Row: {
          account_id: string
          actor_id: string
          created_at: string
          from_stage: string | null
          id: string
          to_stage: string
          workspace_id: string
        }
        Insert: {
          account_id: string
          actor_id?: string
          created_at?: string
          from_stage?: string | null
          id?: string
          to_stage: string
          workspace_id: string
        }
        Update: {
          account_id?: string
          actor_id?: string
          created_at?: string
          from_stage?: string | null
          id?: string
          to_stage?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_stage_history_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "sales_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_stage_history_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          content_id: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          location: string | null
          status: string
          title: string
          workspace_id: string
        }
        Insert: {
          assignee_id?: string | null
          content_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          location?: string | null
          status?: string
          title: string
          workspace_id: string
        }
        Update: {
          assignee_id?: string | null
          content_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          location?: string | null
          status?: string
          title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_invites: {
        Row: {
          created_at: string
          email: string
          id: string
          invited_by: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invited_by?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invited_by?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          app: string
          created_at: string
          created_by: string
          id: string
          name: string
        }
        Insert: {
          app?: string
          created_at?: string
          created_by?: string
          id?: string
          name: string
        }
        Update: {
          app?: string
          created_at?: string
          created_by?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_invites: { Args: never; Returns: undefined }
      invite_member: { Args: { _email: string; _ws: string }; Returns: string }
      is_member: { Args: { _user: string; _ws: string }; Returns: boolean }
      list_members: {
        Args: { _ws: string }
        Returns: {
          email: string
          joined_at: string
          user_id: string
        }[]
      }
      remove_member: {
        Args: { _user: string; _ws: string }
        Returns: undefined
      }
      sales_log_call: {
        Args: {
          _account: string
          _next_date: string
          _next_label: string
          _note: string
          _outcome: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
