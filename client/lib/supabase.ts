import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || "https://your-project.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || "your-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          updated_at: string | null;
          username: string | null;
          full_name: string | null;
          avatar_url: string | null;
          company: string | null;
          plan: string | null;
          usage_limit: number | null;
          current_usage: number | null;
        };
        Insert: {
          id: string;
          updated_at?: string | null;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          company?: string | null;
          plan?: string | null;
          usage_limit?: number | null;
          current_usage?: number | null;
        };
        Update: {
          id?: string;
          updated_at?: string | null;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          company?: string | null;
          plan?: string | null;
          usage_limit?: number | null;
          current_usage?: number | null;
        };
      };
      agents: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          user_id: string;
          name: string;
          description: string | null;
          type: "chat" | "voice" | "vision";
          status: "active" | "inactive" | "training";
          settings: any;
          knowledge_base_id: string | null;
          integrations: string[];
          conversation_count: number;
          last_active: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id: string;
          name: string;
          description?: string | null;
          type: "chat" | "voice" | "vision";
          status?: "active" | "inactive" | "training";
          settings?: any;
          knowledge_base_id?: string | null;
          integrations?: string[];
          conversation_count?: number;
          last_active?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          type?: "chat" | "voice" | "vision";
          status?: "active" | "inactive" | "training";
          settings?: any;
          knowledge_base_id?: string | null;
          integrations?: string[];
          conversation_count?: number;
          last_active?: string | null;
        };
      };
      conversations: {
        Row: {
          id: string;
          created_at: string;
          agent_id: string;
          user_id: string;
          customer_id: string | null;
          channel: string;
          status: "active" | "completed" | "escalated";
          messages: any[];
          metadata: any;
        };
        Insert: {
          id?: string;
          created_at?: string;
          agent_id: string;
          user_id: string;
          customer_id?: string | null;
          channel: string;
          status?: "active" | "completed" | "escalated";
          messages?: any[];
          metadata?: any;
        };
        Update: {
          id?: string;
          created_at?: string;
          agent_id?: string;
          user_id?: string;
          customer_id?: string | null;
          channel?: string;
          status?: "active" | "completed" | "escalated";
          messages?: any[];
          metadata?: any;
        };
      };
    };
  };
};
