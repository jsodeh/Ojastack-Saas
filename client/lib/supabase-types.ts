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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      agent_analytics: {
        Row: {
          agent_id: string
          avg_response_time: number | null
          avg_voice_quality: number | null
          conversations_count: number | null
          created_at: string | null
          date: string
          escalations_count: number | null
          id: string
          messages_count: number | null
          satisfaction_avg: number | null
          tool_calls_count: number | null
          total_voice_duration: number | null
          voice_conversations_count: number | null
        }
        Insert: {
          agent_id: string
          avg_response_time?: number | null
          avg_voice_quality?: number | null
          conversations_count?: number | null
          created_at?: string | null
          date: string
          escalations_count?: number | null
          id?: string
          messages_count?: number | null
          satisfaction_avg?: number | null
          tool_calls_count?: number | null
          total_voice_duration?: number | null
          voice_conversations_count?: number | null
        }
        Update: {
          agent_id?: string
          avg_response_time?: number | null
          avg_voice_quality?: number | null
          conversations_count?: number | null
          created_at?: string | null
          date?: string
          escalations_count?: number | null
          id?: string
          messages_count?: number | null
          satisfaction_avg?: number | null
          tool_calls_count?: number | null
          total_voice_duration?: number | null
          voice_conversations_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_analytics_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_deployments: {
        Row: {
          agent_id: string | null
          created_at: string | null
          deployed_at: string | null
          deployment_config: Json
          endpoints: Json
          id: string
          last_active: string | null
          metrics: Json | null
          persona_id: string | null
          status: string | null
          user_id: string | null
          workflow_id: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          deployed_at?: string | null
          deployment_config?: Json
          endpoints?: Json
          id?: string
          last_active?: string | null
          metrics?: Json | null
          persona_id?: string | null
          status?: string | null
          user_id?: string | null
          workflow_id?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          deployed_at?: string | null
          deployment_config?: Json
          endpoints?: Json
          id?: string
          last_active?: string | null
          metrics?: Json | null
          persona_id?: string | null
          status?: string | null
          user_id?: string | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_deployments_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_deployments_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "agent_personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_deployments_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "agent_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_personas: {
        Row: {
          behavior_config: Json
          context_config: Json
          created_at: string | null
          expertise_config: Json
          generated_prompt: string
          id: string
          name: string
          personality_config: Json
          role: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          behavior_config?: Json
          context_config?: Json
          created_at?: string | null
          expertise_config?: Json
          generated_prompt: string
          id?: string
          name: string
          personality_config?: Json
          role: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          behavior_config?: Json
          context_config?: Json
          created_at?: string | null
          expertise_config?: Json
          generated_prompt?: string
          id?: string
          name?: string
          personality_config?: Json
          role?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      agent_template_usage: {
        Row: {
          agent_id: string | null
          created_at: string | null
          customizations_made: Json | null
          deployment_channels: string[] | null
          id: string
          template_id: string | null
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          customizations_made?: Json | null
          deployment_channels?: string[] | null
          id?: string
          template_id?: string | null
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          customizations_made?: Json | null
          deployment_channels?: string[] | null
          id?: string
          template_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_template_usage_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_template_usage_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "agent_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_templates: {
        Row: {
          category: string
          configuration: Json | null
          created_at: string | null
          created_by: string | null
          customizable_fields: Json
          customization_options: Json | null
          default_config: Json
          description: string
          features: Json
          icon: string | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          is_official: boolean | null
          is_public: boolean | null
          metadata: Json | null
          name: string
          persona_id: string | null
          personality: Json
          preview_image: string | null
          rating: number | null
          setup_instructions: Json | null
          tags: string[] | null
          updated_at: string | null
          usage_count: number | null
          workflow_id: string | null
          workflows: Json
        }
        Insert: {
          category: string
          configuration?: Json | null
          created_at?: string | null
          created_by?: string | null
          customizable_fields?: Json
          customization_options?: Json | null
          default_config?: Json
          description: string
          features?: Json
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          is_official?: boolean | null
          is_public?: boolean | null
          metadata?: Json | null
          name: string
          persona_id?: string | null
          personality?: Json
          preview_image?: string | null
          rating?: number | null
          setup_instructions?: Json | null
          tags?: string[] | null
          updated_at?: string | null
          usage_count?: number | null
          workflow_id?: string | null
          workflows?: Json
        }
        Update: {
          category?: string
          configuration?: Json | null
          created_at?: string | null
          created_by?: string | null
          customizable_fields?: Json
          customization_options?: Json | null
          default_config?: Json
          description?: string
          features?: Json
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          is_official?: boolean | null
          is_public?: boolean | null
          metadata?: Json | null
          name?: string
          persona_id?: string | null
          personality?: Json
          preview_image?: string | null
          rating?: number | null
          setup_instructions?: Json | null
          tags?: string[] | null
          updated_at?: string | null
          usage_count?: number | null
          workflow_id?: string | null
          workflows?: Json
        }
        Relationships: [
          {
            foreignKeyName: "agent_templates_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "agent_personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_templates_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "agent_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_whatsapp_configs: {
        Row: {
          agent_id: string | null
          auto_reply: boolean | null
          business_hours: Json | null
          created_at: string | null
          credential_id: string | null
          enabled: boolean | null
          fallback_message: string | null
          id: string
          phone_number_id: string
          updated_at: string | null
          welcome_message: string | null
        }
        Insert: {
          agent_id?: string | null
          auto_reply?: boolean | null
          business_hours?: Json | null
          created_at?: string | null
          credential_id?: string | null
          enabled?: boolean | null
          fallback_message?: string | null
          id?: string
          phone_number_id: string
          updated_at?: string | null
          welcome_message?: string | null
        }
        Update: {
          agent_id?: string | null
          auto_reply?: boolean | null
          business_hours?: Json | null
          created_at?: string | null
          credential_id?: string | null
          enabled?: boolean | null
          fallback_message?: string | null
          id?: string
          phone_number_id?: string
          updated_at?: string | null
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_whatsapp_configs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_whatsapp_configs_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_credentials"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_workflows: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_template: boolean | null
          name: string
          status: string | null
          tags: string[] | null
          template_id: string | null
          updated_at: string | null
          user_id: string | null
          version: string | null
          workflow_data: Json
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_template?: boolean | null
          name: string
          status?: string | null
          tags?: string[] | null
          template_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          version?: string | null
          workflow_data?: Json
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_template?: boolean | null
          name?: string
          status?: string | null
          tags?: string[] | null
          template_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          version?: string | null
          workflow_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "agent_workflows_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "agent_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          conversation_count: number | null
          created_at: string
          default_voice_settings: Json | null
          deployment_urls: Json | null
          description: string | null
          id: string
          instructions: string | null
          integration_configs: Json | null
          integrations: string[] | null
          knowledge_base_id: string | null
          knowledge_base_ids: string[] | null
          last_active: string | null
          max_tokens: number | null
          model: string | null
          name: string
          personality: string | null
          settings: Json | null
          status: string | null
          temperature: number | null
          template_id: string | null
          tools: string[] | null
          type: string
          updated_at: string
          user_id: string
          video_config: Json | null
          voice_config: Json | null
          voice_enabled: boolean | null
          voice_settings: Json | null
          workflow_ids: string[] | null
        }
        Insert: {
          conversation_count?: number | null
          created_at?: string
          default_voice_settings?: Json | null
          deployment_urls?: Json | null
          description?: string | null
          id?: string
          instructions?: string | null
          integration_configs?: Json | null
          integrations?: string[] | null
          knowledge_base_id?: string | null
          knowledge_base_ids?: string[] | null
          last_active?: string | null
          max_tokens?: number | null
          model?: string | null
          name: string
          personality?: string | null
          settings?: Json | null
          status?: string | null
          temperature?: number | null
          template_id?: string | null
          tools?: string[] | null
          type: string
          updated_at?: string
          user_id: string
          video_config?: Json | null
          voice_config?: Json | null
          voice_enabled?: boolean | null
          voice_settings?: Json | null
          workflow_ids?: string[] | null
        }
        Update: {
          conversation_count?: number | null
          created_at?: string
          default_voice_settings?: Json | null
          deployment_urls?: Json | null
          description?: string | null
          id?: string
          instructions?: string | null
          integration_configs?: Json | null
          integrations?: string[] | null
          knowledge_base_id?: string | null
          knowledge_base_ids?: string[] | null
          last_active?: string | null
          max_tokens?: number | null
          model?: string | null
          name?: string
          personality?: string | null
          settings?: Json | null
          status?: string | null
          temperature?: number | null
          template_id?: string | null
          tools?: string[] | null
          type?: string
          updated_at?: string
          user_id?: string
          video_config?: Json | null
          voice_config?: Json | null
          voice_enabled?: boolean | null
          voice_settings?: Json | null
          workflow_ids?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "agents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "agent_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_analytics: {
        Row: {
          avg_response_time: number | null
          channel_id: string
          created_at: string
          date: string
          id: string
          messages_failed: number
          messages_received: number
          messages_sent: number
          unique_users: number
          uptime_percentage: number | null
        }
        Insert: {
          avg_response_time?: number | null
          channel_id: string
          created_at?: string
          date: string
          id?: string
          messages_failed?: number
          messages_received?: number
          messages_sent?: number
          unique_users?: number
          uptime_percentage?: number | null
        }
        Update: {
          avg_response_time?: number | null
          channel_id?: string
          created_at?: string
          date?: string
          id?: string
          messages_failed?: number
          messages_received?: number
          messages_sent?: number
          unique_users?: number
          uptime_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_analytics_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channel_activity"
            referencedColumns: ["channel_id"]
          },
          {
            foreignKeyName: "channel_analytics_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channel_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_analytics_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channel_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_configs: {
        Row: {
          authentication: Json | null
          configuration: Json
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          name: string
          test_results: Json | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          authentication?: Json | null
          configuration?: Json
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          name: string
          test_results?: Json | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          authentication?: Json | null
          configuration?: Json
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          name?: string
          test_results?: Json | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      channel_messages: {
        Row: {
          channel_id: string
          channel_type: string
          content: Json
          created_at: string
          direction: string
          error: string | null
          id: string
          recipient: Json
          sender: Json
          status: string
          timestamp: string
        }
        Insert: {
          channel_id: string
          channel_type: string
          content: Json
          created_at?: string
          direction: string
          error?: string | null
          id?: string
          recipient: Json
          sender: Json
          status: string
          timestamp: string
        }
        Update: {
          channel_id?: string
          channel_type?: string
          content?: Json
          created_at?: string
          direction?: string
          error?: string | null
          id?: string
          recipient?: Json
          sender?: Json
          status?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channel_activity"
            referencedColumns: ["channel_id"]
          },
          {
            foreignKeyName: "channel_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channel_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channel_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_sessions: {
        Row: {
          channel_id: string
          created_at: string
          ended_at: string | null
          id: string
          last_activity: string
          message_count: number
          session_id: string
          started_at: string
          user_id: string | null
          user_info: Json | null
        }
        Insert: {
          channel_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          last_activity?: string
          message_count?: number
          session_id: string
          started_at?: string
          user_id?: string | null
          user_info?: Json | null
        }
        Update: {
          channel_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          last_activity?: string
          message_count?: number
          session_id?: string
          started_at?: string
          user_id?: string | null
          user_info?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_sessions_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channel_activity"
            referencedColumns: ["channel_id"]
          },
          {
            foreignKeyName: "channel_sessions_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channel_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_sessions_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channel_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          agent_id: string
          channel: string
          created_at: string
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          escalation_reason: string | null
          escalation_requested: boolean | null
          human_agent_id: string | null
          id: string
          intent: string | null
          messages: Json | null
          metadata: Json | null
          resolution_time: number | null
          satisfaction_score: number | null
          sentiment: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          agent_id: string
          channel: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          escalation_reason?: string | null
          escalation_requested?: boolean | null
          human_agent_id?: string | null
          id?: string
          intent?: string | null
          messages?: Json | null
          metadata?: Json | null
          resolution_time?: number | null
          satisfaction_score?: number | null
          sentiment?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          agent_id?: string
          channel?: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          escalation_reason?: string | null
          escalation_requested?: boolean | null
          human_agent_id?: string | null
          id?: string
          intent?: string | null
          messages?: Json | null
          metadata?: Json | null
          resolution_time?: number | null
          satisfaction_score?: number | null
          sentiment?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      deployment_logs: {
        Row: {
          created_at: string
          deployment_id: string
          id: string
          level: string
          message: string
          metadata: Json | null
          timestamp: string
        }
        Insert: {
          created_at?: string
          deployment_id: string
          id?: string
          level: string
          message: string
          metadata?: Json | null
          timestamp?: string
        }
        Update: {
          created_at?: string
          deployment_id?: string
          id?: string
          level?: string
          message?: string
          metadata?: Json | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "deployment_logs_deployment_id_fkey"
            columns: ["deployment_id"]
            isOneToOne: false
            referencedRelation: "agent_deployments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deployment_logs_deployment_id_fkey"
            columns: ["deployment_id"]
            isOneToOne: false
            referencedRelation: "deployment_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      deployment_metrics: {
        Row: {
          active_connections: number
          cpu_usage: number
          created_at: string
          deployment_id: string
          error_rate: number
          id: string
          memory_usage: number
          request_count: number
          response_time: number
          timestamp: string
          uptime: number
        }
        Insert: {
          active_connections?: number
          cpu_usage?: number
          created_at?: string
          deployment_id: string
          error_rate?: number
          id?: string
          memory_usage?: number
          request_count?: number
          response_time?: number
          timestamp?: string
          uptime?: number
        }
        Update: {
          active_connections?: number
          cpu_usage?: number
          created_at?: string
          deployment_id?: string
          error_rate?: number
          id?: string
          memory_usage?: number
          request_count?: number
          response_time?: number
          timestamp?: string
          uptime?: number
        }
        Relationships: [
          {
            foreignKeyName: "deployment_metrics_deployment_id_fkey"
            columns: ["deployment_id"]
            isOneToOne: false
            referencedRelation: "agent_deployments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deployment_metrics_deployment_id_fkey"
            columns: ["deployment_id"]
            isOneToOne: false
            referencedRelation: "deployment_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      document_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string | null
          document_id: string
          embedding_json: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string | null
          document_id: string
          embedding_json?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string | null
          document_id?: string
          embedding_json?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          content: string | null
          created_at: string
          file_type: string | null
          file_url: string | null
          id: string
          knowledge_base_id: string
          metadata: Json | null
          name: string
          size_bytes: number | null
          status: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          file_type?: string | null
          file_url?: string | null
          id?: string
          knowledge_base_id: string
          metadata?: Json | null
          name: string
          size_bytes?: number | null
          status?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          file_type?: string | null
          file_url?: string | null
          id?: string
          knowledge_base_id?: string
          metadata?: Json | null
          name?: string
          size_bytes?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_knowledge_base_id_fkey"
            columns: ["knowledge_base_id"]
            isOneToOne: false
            referencedRelation: "knowledge_bases"
            referencedColumns: ["id"]
          },
        ]
      }
      escalations: {
        Row: {
          agent_id: string
          assigned_at: string | null
          conversation_id: string
          created_at: string | null
          human_agent_id: string | null
          id: string
          reason: string
          resolution_notes: string | null
          resolved_at: string | null
          status: string | null
        }
        Insert: {
          agent_id: string
          assigned_at?: string | null
          conversation_id: string
          created_at?: string | null
          human_agent_id?: string | null
          id?: string
          reason: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string | null
        }
        Update: {
          agent_id?: string
          assigned_at?: string | null
          conversation_id?: string
          created_at?: string | null
          human_agent_id?: string | null
          id?: string
          reason?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escalations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalations_human_agent_id_fkey"
            columns: ["human_agent_id"]
            isOneToOne: false
            referencedRelation: "human_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      human_agents: {
        Row: {
          created_at: string | null
          current_conversations: number | null
          email: string
          id: string
          max_concurrent_conversations: number | null
          name: string
          role: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_conversations?: number | null
          email: string
          id?: string
          max_concurrent_conversations?: number | null
          name: string
          role?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_conversations?: number | null
          email?: string
          id?: string
          max_concurrent_conversations?: number | null
          name?: string
          role?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      knowledge_base_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string | null
          embedding: string | null
          end_position: number | null
          file_id: string | null
          id: string
          knowledge_base_id: string | null
          metadata: Json | null
          start_position: number | null
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string | null
          embedding?: string | null
          end_position?: number | null
          file_id?: string | null
          id?: string
          knowledge_base_id?: string | null
          metadata?: Json | null
          start_position?: number | null
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string | null
          embedding?: string | null
          end_position?: number | null
          file_id?: string | null
          id?: string
          knowledge_base_id?: string | null
          metadata?: Json | null
          start_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_chunks_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "knowledge_base_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_base_chunks_knowledge_base_id_fkey"
            columns: ["knowledge_base_id"]
            isOneToOne: false
            referencedRelation: "knowledge_bases"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base_files: {
        Row: {
          content_hash: string | null
          created_at: string | null
          embedding_status: string | null
          file_path: string | null
          file_size: number
          file_type: string
          filename: string
          id: string
          knowledge_base_id: string | null
          metadata: Json | null
          processed_content: string | null
          updated_at: string | null
        }
        Insert: {
          content_hash?: string | null
          created_at?: string | null
          embedding_status?: string | null
          file_path?: string | null
          file_size: number
          file_type: string
          filename: string
          id?: string
          knowledge_base_id?: string | null
          metadata?: Json | null
          processed_content?: string | null
          updated_at?: string | null
        }
        Update: {
          content_hash?: string | null
          created_at?: string | null
          embedding_status?: string | null
          file_path?: string | null
          file_size?: number
          file_type?: string
          filename?: string
          id?: string
          knowledge_base_id?: string | null
          metadata?: Json | null
          processed_content?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_files_knowledge_base_id_fkey"
            columns: ["knowledge_base_id"]
            isOneToOne: false
            referencedRelation: "knowledge_bases"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_bases: {
        Row: {
          created_at: string
          description: string | null
          documents_count: number | null
          id: string
          name: string
          size_bytes: number | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          documents_count?: number | null
          id?: string
          name: string
          size_bytes?: number | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          documents_count?: number | null
          id?: string
          name?: string
          size_bytes?: number | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
          type: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
          type?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      persona_creation_sessions: {
        Row: {
          completed_steps: string[] | null
          created_at: string | null
          current_step: string | null
          expires_at: string | null
          id: string
          session_data: Json
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          completed_steps?: string[] | null
          created_at?: string | null
          current_step?: string | null
          expires_at?: string | null
          id?: string
          session_data?: Json
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          completed_steps?: string[] | null
          created_at?: string | null
          current_step?: string | null
          expires_at?: string | null
          id?: string
          session_data?: Json
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company: string | null
          current_usage: number | null
          full_name: string | null
          id: string
          plan: string | null
          updated_at: string
          usage_limit: number | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          current_usage?: number | null
          full_name?: string | null
          id: string
          plan?: string | null
          updated_at?: string
          usage_limit?: number | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          current_usage?: number | null
          full_name?: string | null
          id?: string
          plan?: string | null
          updated_at?: string
          usage_limit?: number | null
          username?: string | null
        }
        Relationships: []
      }
      template_activities: {
        Row: {
          action: string
          created_at: string | null
          id: string
          metadata: Json | null
          template_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          template_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_activities_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      template_collection_items: {
        Row: {
          added_at: string | null
          added_by: string
          collection_id: string
          id: string
          notes: string | null
          sort_order: number
          template_id: string
        }
        Insert: {
          added_at?: string | null
          added_by: string
          collection_id: string
          id?: string
          notes?: string | null
          sort_order?: number
          template_id: string
        }
        Update: {
          added_at?: string | null
          added_by?: string
          collection_id?: string
          id?: string
          notes?: string | null
          sort_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "template_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_collection_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_collections: {
        Row: {
          color_theme: string | null
          cover_image: string | null
          created_at: string | null
          curator_id: string
          description: string | null
          id: string
          is_official: boolean
          is_public: boolean
          name: string
          updated_at: string | null
        }
        Insert: {
          color_theme?: string | null
          cover_image?: string | null
          created_at?: string | null
          curator_id: string
          description?: string | null
          id?: string
          is_official?: boolean
          is_public?: boolean
          name: string
          updated_at?: string | null
        }
        Update: {
          color_theme?: string | null
          cover_image?: string | null
          created_at?: string | null
          curator_id?: string
          description?: string | null
          id?: string
          is_official?: boolean
          is_public?: boolean
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      template_downloads: {
        Row: {
          downloaded_at: string | null
          id: string
          ip_address: unknown | null
          metadata: Json | null
          template_id: string
          user_agent: string | null
          user_id: string
          version: string
        }
        Insert: {
          downloaded_at?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          template_id: string
          user_agent?: string | null
          user_id: string
          version: string
        }
        Update: {
          downloaded_at?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          template_id?: string
          user_agent?: string | null
          user_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_downloads_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_marketplace_analytics: {
        Row: {
          category_stats: Json | null
          created_at: string | null
          date: string
          id: string
          new_downloads: number
          new_ratings: number
          new_templates: number
          public_templates: number
          top_templates: Json | null
          total_downloads: number
          total_ratings: number
          total_templates: number
        }
        Insert: {
          category_stats?: Json | null
          created_at?: string | null
          date: string
          id?: string
          new_downloads?: number
          new_ratings?: number
          new_templates?: number
          public_templates?: number
          top_templates?: Json | null
          total_downloads?: number
          total_ratings?: number
          total_templates?: number
        }
        Update: {
          category_stats?: Json | null
          created_at?: string | null
          date?: string
          id?: string
          new_downloads?: number
          new_ratings?: number
          new_templates?: number
          public_templates?: number
          top_templates?: Json | null
          total_downloads?: number
          total_ratings?: number
          total_templates?: number
        }
        Relationships: []
      }
      template_ratings: {
        Row: {
          created_at: string | null
          id: string
          rating: number
          review: string | null
          template_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          rating: number
          review?: string | null
          template_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          rating?: number
          review?: string | null
          template_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_ratings_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_reviews: {
        Row: {
          created_at: string | null
          id: string
          rating: number
          review: string | null
          template_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          rating: number
          review?: string | null
          template_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          rating?: number
          review?: string | null
          template_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_reviews_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "agent_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      test_execution_logs: {
        Row: {
          created_at: string
          id: string
          level: string
          message: string
          metadata: Json | null
          result_id: string | null
          suite_id: string
          test_case_id: string | null
          timestamp: string
        }
        Insert: {
          created_at?: string
          id?: string
          level: string
          message: string
          metadata?: Json | null
          result_id?: string | null
          suite_id: string
          test_case_id?: string | null
          timestamp?: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          message?: string
          metadata?: Json | null
          result_id?: string | null
          suite_id?: string
          test_case_id?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_execution_logs_result_id_fkey"
            columns: ["result_id"]
            isOneToOne: false
            referencedRelation: "test_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_execution_logs_suite_id_fkey"
            columns: ["suite_id"]
            isOneToOne: false
            referencedRelation: "test_suite_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_execution_logs_suite_id_fkey"
            columns: ["suite_id"]
            isOneToOne: false
            referencedRelation: "test_suites"
            referencedColumns: ["id"]
          },
        ]
      }
      test_results: {
        Row: {
          artifacts: Json
          case_results: Json
          completed_at: string
          created_at: string
          duration: number
          id: string
          metrics: Json
          started_at: string
          status: string
          suite_id: string
          summary: Json
        }
        Insert: {
          artifacts?: Json
          case_results?: Json
          completed_at: string
          created_at?: string
          duration?: number
          id?: string
          metrics?: Json
          started_at: string
          status: string
          suite_id: string
          summary?: Json
        }
        Update: {
          artifacts?: Json
          case_results?: Json
          completed_at?: string
          created_at?: string
          duration?: number
          id?: string
          metrics?: Json
          started_at?: string
          status?: string
          suite_id?: string
          summary?: Json
        }
        Relationships: [
          {
            foreignKeyName: "test_results_suite_id_fkey"
            columns: ["suite_id"]
            isOneToOne: false
            referencedRelation: "test_suite_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_results_suite_id_fkey"
            columns: ["suite_id"]
            isOneToOne: false
            referencedRelation: "test_suites"
            referencedColumns: ["id"]
          },
        ]
      }
      test_suites: {
        Row: {
          configuration: Json
          created_at: string
          description: string | null
          id: string
          last_run_at: string | null
          name: string
          results: Json | null
          status: string
          target_id: string
          target_type: string
          test_cases: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          configuration?: Json
          created_at?: string
          description?: string | null
          id?: string
          last_run_at?: string | null
          name: string
          results?: Json | null
          status?: string
          target_id: string
          target_type: string
          test_cases?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          configuration?: Json
          created_at?: string
          description?: string | null
          id?: string
          last_run_at?: string | null
          name?: string
          results?: Json | null
          status?: string
          target_id?: string
          target_type?: string
          test_cases?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tool_calls: {
        Row: {
          completed_at: string | null
          conversation_id: string
          created_at: string | null
          execution_time: number | null
          id: string
          message_id: string | null
          parameters: Json | null
          result: Json | null
          status: string | null
          tool_name: string
        }
        Insert: {
          completed_at?: string | null
          conversation_id: string
          created_at?: string | null
          execution_time?: number | null
          id?: string
          message_id?: string | null
          parameters?: Json | null
          result?: Json | null
          status?: string | null
          tool_name: string
        }
        Update: {
          completed_at?: string | null
          conversation_id?: string
          created_at?: string | null
          execution_time?: number | null
          id?: string
          message_id?: string | null
          parameters?: Json | null
          result?: Json | null
          status?: string | null
          tool_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_calls_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_calls_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      user_encryption_keys: {
        Row: {
          created_at: string | null
          key_hash: string
          salt: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          key_hash: string
          salt: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          key_hash?: string
          salt?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      voice_audio_files: {
        Row: {
          conversation_id: string
          created_at: string | null
          duration: number
          file_path: string
          file_size: number
          file_url: string
          format: string
          id: string
          message_id: string | null
          quality_score: number | null
          role: string
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          duration?: number
          file_path: string
          file_size: number
          file_url: string
          format: string
          id?: string
          message_id?: string | null
          quality_score?: number | null
          role: string
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          duration?: number
          file_path?: string
          file_size?: number
          file_url?: string
          format?: string
          id?: string
          message_id?: string | null
          quality_score?: number | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_audio_files_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_audio_files_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          channel_id: string
          channel_type: string
          created_at: string
          event_type: string
          id: string
          payload: Json
          processed: boolean
          processing_error: string | null
          timestamp: string
        }
        Insert: {
          channel_id: string
          channel_type: string
          created_at?: string
          event_type: string
          id?: string
          payload: Json
          processed?: boolean
          processing_error?: string | null
          timestamp: string
        }
        Update: {
          channel_id?: string
          channel_type?: string
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean
          processing_error?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channel_activity"
            referencedColumns: ["channel_id"]
          },
          {
            foreignKeyName: "webhook_events_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channel_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_events_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channel_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_credentials: {
        Row: {
          access_token_encrypted: string
          business_account_id: string
          created_at: string | null
          display_name: string
          id: string
          last_validated: string | null
          phone_number: string
          phone_number_id: string
          status: string | null
          updated_at: string | null
          user_id: string | null
          webhook_verify_token: string
        }
        Insert: {
          access_token_encrypted: string
          business_account_id: string
          created_at?: string | null
          display_name: string
          id?: string
          last_validated?: string | null
          phone_number: string
          phone_number_id: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          webhook_verify_token: string
        }
        Update: {
          access_token_encrypted?: string
          business_account_id?: string
          created_at?: string | null
          display_name?: string
          id?: string
          last_validated?: string | null
          phone_number?: string
          phone_number_id?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          webhook_verify_token?: string
        }
        Relationships: []
      }
      whatsapp_deployments: {
        Row: {
          access_token: string
          agent_id: string
          business_account_id: string
          business_phone_number: string
          created_at: string | null
          display_name: string | null
          id: string
          last_message_at: string | null
          message_count: number | null
          status: string | null
          user_id: string
          webhook_url: string | null
          webhook_verify_token: string
        }
        Insert: {
          access_token: string
          agent_id: string
          business_account_id: string
          business_phone_number: string
          created_at?: string | null
          display_name?: string | null
          id: string
          last_message_at?: string | null
          message_count?: number | null
          status?: string | null
          user_id: string
          webhook_url?: string | null
          webhook_verify_token: string
        }
        Update: {
          access_token?: string
          agent_id?: string
          business_account_id?: string
          business_phone_number?: string
          created_at?: string | null
          display_name?: string | null
          id?: string
          last_message_at?: string | null
          message_count?: number | null
          status?: string | null
          user_id?: string
          webhook_url?: string | null
          webhook_verify_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_deployments_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          agent_id: string | null
          content: Json
          conversation_id: string | null
          created_at: string | null
          credential_id: string | null
          direction: string
          from_phone: string
          id: string
          message_type: string
          status: string | null
          timestamp: string
          to_phone: string
          whatsapp_message_id: string
        }
        Insert: {
          agent_id?: string | null
          content: Json
          conversation_id?: string | null
          created_at?: string | null
          credential_id?: string | null
          direction: string
          from_phone: string
          id?: string
          message_type: string
          status?: string | null
          timestamp: string
          to_phone: string
          whatsapp_message_id: string
        }
        Update: {
          agent_id?: string | null
          content?: Json
          conversation_id?: string | null
          created_at?: string | null
          credential_id?: string | null
          direction?: string
          from_phone?: string
          id?: string
          message_type?: string
          status?: string | null
          timestamp?: string
          to_phone?: string
          whatsapp_message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_credentials"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_webhooks: {
        Row: {
          created_at: string | null
          credential_id: string | null
          id: string
          phone_number_id: string
          status: string | null
          updated_at: string | null
          user_id: string | null
          webhook_token: string
          webhook_url: string
        }
        Insert: {
          created_at?: string | null
          credential_id?: string | null
          id?: string
          phone_number_id: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          webhook_token: string
          webhook_url: string
        }
        Update: {
          created_at?: string | null
          credential_id?: string | null
          id?: string
          phone_number_id?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          webhook_token?: string
          webhook_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_webhooks_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_credentials"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_executions: {
        Row: {
          completed_at: string | null
          debug_info: Json | null
          deployment_id: string | null
          error_message: string | null
          execution_data: Json
          execution_time_ms: number | null
          id: string
          started_at: string | null
          status: string
          workflow_id: string | null
        }
        Insert: {
          completed_at?: string | null
          debug_info?: Json | null
          deployment_id?: string | null
          error_message?: string | null
          execution_data?: Json
          execution_time_ms?: number | null
          id?: string
          started_at?: string | null
          status: string
          workflow_id?: string | null
        }
        Update: {
          completed_at?: string | null
          debug_info?: Json | null
          deployment_id?: string | null
          error_message?: string | null
          execution_data?: Json
          execution_time_ms?: number | null
          id?: string
          started_at?: string | null
          status?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_deployment_id_fkey"
            columns: ["deployment_id"]
            isOneToOne: false
            referencedRelation: "agent_deployments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_deployment_id_fkey"
            columns: ["deployment_id"]
            isOneToOne: false
            referencedRelation: "deployment_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "agent_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_node_definitions: {
        Row: {
          category: string
          configuration_schema: Json
          created_at: string | null
          created_by: string | null
          description: string
          icon: string | null
          id: string
          input_schema: Json
          is_system: boolean | null
          name: string
          output_schema: Json
          type: string
          updated_at: string | null
        }
        Insert: {
          category: string
          configuration_schema?: Json
          created_at?: string | null
          created_by?: string | null
          description: string
          icon?: string | null
          id?: string
          input_schema?: Json
          is_system?: boolean | null
          name: string
          output_schema?: Json
          type: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          configuration_schema?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string
          icon?: string | null
          id?: string
          input_schema?: Json
          is_system?: boolean | null
          name?: string
          output_schema?: Json
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      workflow_templates: {
        Row: {
          author_avatar: string | null
          author_id: string
          author_name: string
          category: string
          changelog: string | null
          created_at: string | null
          description: string
          download_count: number
          id: string
          is_featured: boolean
          is_public: boolean
          is_verified: boolean
          name: string
          published_at: string | null
          rating_average: number
          rating_count: number
          requirements: Json
          source_workflow_id: string | null
          tags: string[] | null
          template_data: Json
          updated_at: string | null
          version: string
        }
        Insert: {
          author_avatar?: string | null
          author_id: string
          author_name: string
          category: string
          changelog?: string | null
          created_at?: string | null
          description: string
          download_count?: number
          id?: string
          is_featured?: boolean
          is_public?: boolean
          is_verified?: boolean
          name: string
          published_at?: string | null
          rating_average?: number
          rating_count?: number
          requirements?: Json
          source_workflow_id?: string | null
          tags?: string[] | null
          template_data?: Json
          updated_at?: string | null
          version?: string
        }
        Update: {
          author_avatar?: string | null
          author_id?: string
          author_name?: string
          category?: string
          changelog?: string | null
          created_at?: string | null
          description?: string
          download_count?: number
          id?: string
          is_featured?: boolean
          is_public?: boolean
          is_verified?: boolean
          name?: string
          published_at?: string | null
          rating_average?: number
          rating_count?: number
          requirements?: Json
          source_workflow_id?: string | null
          tags?: string[] | null
          template_data?: Json
          updated_at?: string | null
          version?: string
        }
        Relationships: []
      }
    }
    Views: {
      channel_activity: {
        Row: {
          activity_date: string | null
          channel_id: string | null
          channel_name: string | null
          channel_type: string | null
          failed_messages: number | null
          inbound_messages: number | null
          message_count: number | null
          outbound_messages: number | null
          unique_senders: number | null
        }
        Relationships: []
      }
      channel_summary: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          failed_messages: number | null
          id: string | null
          last_tested: string | null
          messages_today: number | null
          name: string | null
          test_status: string | null
          total_messages: number | null
          type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
      deployment_summary: {
        Row: {
          agent_id: string | null
          created_at: string | null
          deployed_at: string | null
          error_rate: number | null
          id: string | null
          last_active: string | null
          persona_id: string | null
          request_count: number | null
          response_time: number | null
          status: string | null
          uptime: number | null
          user_id: string | null
          workflow_id: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          deployed_at?: string | null
          error_rate?: never
          id?: string | null
          last_active?: string | null
          persona_id?: string | null
          request_count?: never
          response_time?: never
          status?: string | null
          uptime?: never
          user_id?: string | null
          workflow_id?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          deployed_at?: string | null
          error_rate?: never
          id?: string | null
          last_active?: string | null
          persona_id?: string | null
          request_count?: never
          response_time?: never
          status?: string | null
          uptime?: never
          user_id?: string | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_deployments_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_deployments_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "agent_personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_deployments_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "agent_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      test_suite_summary: {
        Row: {
          created_at: string | null
          failed_tests: number | null
          id: string | null
          last_run_at: string | null
          name: string | null
          pass_rate: number | null
          passed_tests: number | null
          status: string | null
          target_id: string | null
          target_type: string | null
          test_case_count: number | null
          total_tests: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          failed_tests?: never
          id?: string | null
          last_run_at?: string | null
          name?: string | null
          pass_rate?: never
          passed_tests?: never
          status?: string | null
          target_id?: string | null
          target_type?: string | null
          test_case_count?: never
          total_tests?: never
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          failed_tests?: never
          id?: string | null
          last_run_at?: string | null
          name?: string | null
          pass_rate?: never
          passed_tests?: never
          status?: string | null
          target_id?: string | null
          target_type?: string | null
          test_case_count?: never
          total_tests?: never
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      update_channel_analytics: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
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
    Enums: {},
  },
} as const
