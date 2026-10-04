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
          status?: string
          title?: string
          type?: string
          workspace_id?: string
        }
        Relationships: [
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
          created_at: string
          created_by: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          name: string
        }
        Update: {
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
