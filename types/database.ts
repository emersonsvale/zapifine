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
      agenda_excecoes: {
        Row: {
          companie_id: string
          created_at: string | null
          data: string
          end_time: string | null
          id: string
          kind: string
          motivo: string | null
          start_time: string | null
          user_id: string
        }
        Insert: {
          companie_id: string
          created_at?: string | null
          data: string
          end_time?: string | null
          id?: string
          kind: string
          motivo?: string | null
          start_time?: string | null
          user_id: string
        }
        Update: {
          companie_id?: string
          created_at?: string | null
          data?: string
          end_time?: string | null
          id?: string
          kind?: string
          motivo?: string | null
          start_time?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_excecoes_companie_id_fkey"
            columns: ["companie_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_excecoes_companie_id_fkey"
            columns: ["companie_id"]
            isOneToOne: false
            referencedRelation: "vw_bots_empresa"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "agenda_excecoes_companie_id_fkey"
            columns: ["companie_id"]
            isOneToOne: false
            referencedRelation: "vw_user_dashboard"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "agenda_excecoes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_excecoes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_user_dashboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      agenda_horarios_semanal: {
        Row: {
          ativo: boolean | null
          companie_id: string
          created_at: string | null
          end_time: string
          id: string
          start_time: string
          user_id: string
          weekday: number
        }
        Insert: {
          ativo?: boolean | null
          companie_id: string
          created_at?: string | null
          end_time: string
          id?: string
          start_time: string
          user_id: string
          weekday: number
        }
        Update: {
          ativo?: boolean | null
          companie_id?: string
          created_at?: string | null
          end_time?: string
          id?: string
          start_time?: string
          user_id?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "agenda_horarios_semanal_companie_id_fkey"
            columns: ["companie_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_horarios_semanal_companie_id_fkey"
            columns: ["companie_id"]
            isOneToOne: false
            referencedRelation: "vw_bots_empresa"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "agenda_horarios_semanal_companie_id_fkey"
            columns: ["companie_id"]
            isOneToOne: false
            referencedRelation: "vw_user_dashboard"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "agenda_horarios_semanal_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_horarios_semanal_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_user_dashboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      agenda_lembretes: {
        Row: {
          agendamento_id: string
          attempts: number
          channel: string
          created_at: string | null
          fire_at: string
          id: string
          last_error: string | null
          payload: Json | null
          sent_at: string | null
          status: string
          target: string | null
          whatsapp_connection_id: string | null
        }
        Insert: {
          agendamento_id: string
          attempts?: number
          channel: string
          created_at?: string | null
          fire_at: string
          id?: string
          last_error?: string | null
          payload?: Json | null
          sent_at?: string | null
          status?: string
          target?: string | null
          whatsapp_connection_id?: string | null
        }
        Update: {
          agendamento_id?: string
          attempts?: number
          channel?: string
          created_at?: string | null
          fire_at?: string
          id?: string
          last_error?: string | null
          payload?: Json | null
          sent_at?: string | null
          status?: string
          target?: string | null
          whatsapp_connection_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agenda_lembretes_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_lembretes_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "vw_user_dashboard"
            referencedColumns: ["whatsapp_id"]
          },
          {
            foreignKeyName: "agenda_lembretes_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      agenda_templates: {
        Row: {
          ativo: boolean
          body: string
          channel: string
          companie_id: string
          created_at: string | null
          id: string
          kind: string
          minutes_before: number | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean
          body: string
          channel: string
          companie_id: string
          created_at?: string | null
          id?: string
          kind: string
          minutes_before?: number | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean
          body?: string
          channel?: string
          companie_id?: string
          created_at?: string | null
          id?: string
          kind?: string
          minutes_before?: number | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agenda_templates_companie_id_fkey"
            columns: ["companie_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_templates_companie_id_fkey"
            columns: ["companie_id"]
            isOneToOne: false
            referencedRelation: "vw_bots_empresa"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "agenda_templates_companie_id_fkey"
            columns: ["companie_id"]
            isOneToOne: false
            referencedRelation: "vw_user_dashboard"
            referencedColumns: ["company_id"]
          },
        ]
      }
      agendamento_attendees: {
        Row: {
          agendamento_id: string
          created_at: string | null
          display_name: string | null
          email: string
          id: string
          is_organizer: boolean | null
          lead_id: number | null
          response_status: string | null
        }
        Insert: {
          agendamento_id: string
          created_at?: string | null
          display_name?: string | null
          email: string
          id?: string
          is_organizer?: boolean | null
          lead_id?: number | null
          response_status?: string | null
        }
        Update: {
          agendamento_id?: string
          created_at?: string | null
          display_name?: string | null
          email?: string
          id?: string
          is_organizer?: boolean | null
          lead_id?: number | null
          response_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agendamento_attendees_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamento_attendees_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      agendamentos: {
        Row: {
          companie_id: string | null
          created_at: string
          description: string | null
          gg_end: string | null
          gg_link: string | null
          gg_start: string | null
          gg_title: string | null
          id: string
          integration_id: string | null
          is_external: boolean
          lead_id: number | null
          location: string | null
          meet_link: string | null
          source_calendar_id: string | null
          status_agenda:
            | Database["public"]["Enums"]["enum_status_agenda"]
            | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          companie_id?: string | null
          created_at?: string
          description?: string | null
          gg_end?: string | null
          gg_link?: string | null
          gg_start?: string | null
          gg_title?: string | null
          id: string
          integration_id?: string | null
          is_external?: boolean
          lead_id?: number | null
          location?: string | null
          meet_link?: string | null
          source_calendar_id?: string | null
          status_agenda?:
            | Database["public"]["Enums"]["enum_status_agenda"]
            | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          companie_id?: string | null
          created_at?: string
          description?: string | null
          gg_end?: string | null
          gg_link?: string | null
          gg_start?: string | null
          gg_title?: string | null
          id?: string
          integration_id?: string | null
          is_external?: boolean
          lead_id?: number | null
          location?: string | null
          meet_link?: string | null
          source_calendar_id?: string | null
          status_agenda?:
            | Database["public"]["Enums"]["enum_status_agenda"]
            | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agendamentos_companie_id_fkey"
            columns: ["companie_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_companie_id_fkey"
            columns: ["companie_id"]
            isOneToOne: false
            referencedRelation: "vw_bots_empresa"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "agendamentos_companie_id_fkey"
            columns: ["companie_id"]
            isOneToOne: false
            referencedRelation: "vw_user_dashboard"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "agendamentos_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "google_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_source_calendar_id_fkey"
            columns: ["source_calendar_id"]
            isOneToOne: false
            referencedRelation: "google_calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_user_dashboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      ai_agent_tools: {
        Row: {
          agent_id: string
          config: Json
          tool_slug: string
        }
        Insert: {
          agent_id: string
          config?: Json
          tool_slug: string
        }
        Update: {
          agent_id?: string
          config?: Json
          tool_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_tools_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agents: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          metadata: Json
          model: string
          nome: string
          system_prompt: string
          temperature: number | null
          tipo: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          model?: string
          nome: string
          system_prompt: string
          temperature?: number | null
          tipo: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          model?: string
          nome?: string
          system_prompt?: string
          temperature?: number | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "vw_bots_empresa"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "ai_agents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "vw_user_dashboard"
            referencedColumns: ["company_id"]
          },
        ]
      }
      ai_connection_binding: {
        Row: {
          group_trigger_prefix: string
          orchestrator_agent_id: string
          updated_at: string
          whatsapp_connection_id: string
        }
        Insert: {
          group_trigger_prefix?: string
          orchestrator_agent_id: string
          updated_at?: string
          whatsapp_connection_id: string
        }
        Update: {
          group_trigger_prefix?: string
          orchestrator_agent_id?: string
          updated_at?: string
          whatsapp_connection_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_connection_binding_orchestrator_agent_id_fkey"
            columns: ["orchestrator_agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_connection_binding_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: true
            referencedRelation: "vw_user_dashboard"
            referencedColumns: ["whatsapp_id"]
          },
          {
            foreignKeyName: "ai_connection_binding_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: true
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversation_state: {
        Row: {
          conversa_id: number
          is_paused: boolean
          last_run_at: string | null
          last_summary: string | null
          last_summary_msg_id: string | null
          paused_at: string | null
          paused_by: string | null
          updated_at: string
        }
        Insert: {
          conversa_id: number
          is_paused?: boolean
          last_run_at?: string | null
          last_summary?: string | null
          last_summary_msg_id?: string | null
          paused_at?: string | null
          paused_by?: string | null
          updated_at?: string
        }
        Update: {
          conversa_id?: number
          is_paused?: boolean
          last_run_at?: string | null
          last_summary?: string | null
          last_summary_msg_id?: string | null
          paused_at?: string | null
          paused_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversation_state_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: true
            referencedRelation: "whats_conversa"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_knowledge_base: {
        Row: {
          chunk_index: number | null
          company_id: string
          content_text: string
          created_at: string
          embedding: string | null
          id: string
          metadata: Json
          source_ref: string | null
          source_type: string | null
        }
        Insert: {
          chunk_index?: number | null
          company_id: string
          content_text: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json
          source_ref?: string | null
          source_type?: string | null
        }
        Update: {
          chunk_index?: number | null
          company_id?: string
          content_text?: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json
          source_ref?: string | null
          source_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_knowledge_base_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_knowledge_base_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "vw_bots_empresa"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "ai_knowledge_base_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "vw_user_dashboard"
            referencedColumns: ["company_id"]
          },
        ]
      }
      ai_run_log: {
        Row: {
          agent_id: string | null
          company_id: string
          completion_tokens: number | null
          conversa_id: number | null
          cost_usd: number | null
          created_at: string
          error: string | null
          id: string
          latency_ms: number | null
          prompt_tokens: number | null
          role: string | null
          tools_called: Json | null
        }
        Insert: {
          agent_id?: string | null
          company_id: string
          completion_tokens?: number | null
          conversa_id?: number | null
          cost_usd?: number | null
          created_at?: string
          error?: string | null
          id?: string
          latency_ms?: number | null
          prompt_tokens?: number | null
          role?: string | null
          tools_called?: Json | null
        }
        Update: {
          agent_id?: string | null
          company_id?: string
          completion_tokens?: number | null
          conversa_id?: number | null
          cost_usd?: number | null
          created_at?: string
          error?: string | null
          id?: string
          latency_ms?: number | null
          prompt_tokens?: number | null
          role?: string | null
          tools_called?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_run_log_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_run_log_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "whats_conversa"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_specialist_bindings: {
        Row: {
          orchestrator_id: string
          specialist_id: string
          when_use_hint: string
        }
        Insert: {
          orchestrator_id: string
          specialist_id: string
          when_use_hint: string
        }
        Update: {
          orchestrator_id?: string
          specialist_id?: string
          when_use_hint?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_specialist_bindings_orchestrator_id_fkey"
            columns: ["orchestrator_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_specialist_bindings_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      app: {
        Row: {
          created_at: string
          id: number
          versao: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          versao?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          versao?: string | null
        }
        Relationships: []
      }
      app_config: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      app_ddis: {
        Row: {
          code: number | null
          code_text: string | null
          created_at: string
          id: number
          nome_pais: string | null
        }
        Insert: {
          code?: number | null
          code_text?: string | null
          created_at?: string
          id?: number
          nome_pais?: string | null
        }
        Update: {
          code?: number | null
          code_text?: string | null
          created_at?: string
          id?: number
          nome_pais?: string | null
        }
        Relationships: []
      }
      asaas_webhook_events: {
        Row: {
          created_at: string
          event: string
          id: number
          payment_id: string
        }
        Insert: {
          created_at?: string
          event: string
          id?: number
          payment_id: string
        }
        Update: {
          created_at?: string
          event?: string
          id?: number
          payment_id?: string
        }
        Relationships: []
      }
      bots: {
        Row: {
          away_message: string | null
          company_id: string | null
          comprimento_respostas: string | null
          created_at: string | null
          descricao: string | null
          ia_ativa: boolean | null
          id: string
          instance_name: string | null
          language_style: string | null
          name: string | null
          roteiro_atendimento: string | null
          status: Database["public"]["Enums"]["status_bot"] | null
          updated_at: string | null
          user_id: string | null
          uso_abreviacoes: boolean | null
          uso_emoji: boolean | null
          welcome_message: string | null
        }
        Insert: {
          away_message?: string | null
          company_id?: string | null
          comprimento_respostas?: string | null
          created_at?: string | null
          descricao?: string | null
          ia_ativa?: boolean | null
          id?: string
          instance_name?: string | null
          language_style?: string | null
          name?: string | null
          roteiro_atendimento?: string | null
          status?: Database["public"]["Enums"]["status_bot"] | null
          updated_at?: string | null
          user_id?: string | null
          uso_abreviacoes?: boolean | null
          uso_emoji?: boolean | null
          welcome_message?: string | null
        }
        Update: {
          away_message?: string | null
          company_id?: string | null
          comprimento_respostas?: string | null
          created_at?: string | null
          descricao?: string | null
          ia_ativa?: boolean | null
          id?: string
          instance_name?: string | null
          language_style?: string | null
          name?: string | null
          roteiro_atendimento?: string | null
          status?: Database["public"]["Enums"]["status_bot"] | null
          updated_at?: string | null
          user_id?: string | null
          uso_abreviacoes?: boolean | null
          uso_emoji?: boolean | null
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "vw_bots_empresa"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "bots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "vw_user_dashboard"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "bots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_user_dashboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      cobrancas: {
        Row: {
          checkout_session_id: string | null
          codigo_cupom: string | null
          companie_id: string | null
          created_at: string
          id: number
          id_payment: string | null
          invoice_id: string | null
          invoice_url: string | null
          link_pagamento: string | null
          mensagens_excedentes: number | null
          mes_referencia: string | null
          pago_em: string | null
          plano_assinado_id: number | null
          status_asaas: string | null
          stripe_subscription_id: string | null
          valor_excedente: number | null
          valor_plano: number | null
          valor_total: number | null
          vencimento: string | null
        }
        Insert: {
          checkout_session_id?: string | null
          codigo_cupom?: string | null
          companie_id?: string | null
          created_at?: string
          id?: number
          id_payment?: string | null
          invoice_id?: string | null
          invoice_url?: string | null
          link_pagamento?: string | null
          mensagens_excedentes?: number | null
          mes_referencia?: string | null
          pago_em?: string | null
          plano_assinado_id?: number | null
          status_asaas?: string | null
          stripe_subscription_id?: string | null
          valor_excedente?: number | null
          valor_plano?: number | null
          valor_total?: number | null
          vencimento?: string | null
        }
        Update: {
          checkout_session_id?: string | null
          codigo_cupom?: string | null
          companie_id?: string | null
          created_at?: string
          id?: number
          id_payment?: string | null
          invoice_id?: string | null
          invoice_url?: string | null
          link_pagamento?: string | null
          mensagens_excedentes?: number | null
          mes_referencia?: string | null
          pago_em?: string | null
          plano_assinado_id?: number | null
          status_asaas?: string | null
          stripe_subscription_id?: string | null
          valor_excedente?: number | null
          valor_plano?: number | null
          valor_total?: number | null
          vencimento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cobrancas_companie_id_fkey"
            columns: ["companie_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobrancas_companie_id_fkey"
            columns: ["companie_id"]
            isOneToOne: false
            referencedRelation: "vw_bots_empresa"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "cobrancas_companie_id_fkey"
            columns: ["companie_id"]
            isOneToOne: false
            referencedRelation: "vw_user_dashboard"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "cobrancas_plano_assinado_id_fkey"
            columns: ["plano_assinado_id"]
            isOneToOne: false
            referencedRelation: "plan_assinados"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          agenda_publico_ativo: boolean | null
          agenda_publico_descricao: string | null
          agenda_publico_slug: string | null
          agenda_publico_titulo: string | null
          bairro_empresa: string | null
          business_hours: string | null
          cep_empresa: string | null
          cidade_empresa: string | null
          cnpj: string | null
          coluna_inicial_id: number | null
          coluna_perdido_id: number | null
          created_at: string | null
          descricao_empresa: string | null
          email_empresa: string | null
          estado_empresa: string | null
          funil_incial_id: number | null
          gg_access_token: string | null
          gg_calendar_id: string | null
          gg_email: string | null
          gg_refresh_token: string | null
          gg_scopes: string[] | null
          gg_sync_token: string | null
          gg_synced_at: string | null
          gg_token_expires_at: string | null
          id: string
          link_agendamento: string | null
          logo_url: string | null
          name: string
          numero_empresa: string | null
          phone: string | null
          produtos_servicos_empresa: string | null
          rua_empresa: string | null
          site_empresa: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          agenda_publico_ativo?: boolean | null
          agenda_publico_descricao?: string | null
          agenda_publico_slug?: string | null
          agenda_publico_titulo?: string | null
          bairro_empresa?: string | null
          business_hours?: string | null
          cep_empresa?: string | null
          cidade_empresa?: string | null
          cnpj?: string | null
          coluna_inicial_id?: number | null
          coluna_perdido_id?: number | null
          created_at?: string | null
          descricao_empresa?: string | null
          email_empresa?: string | null
          estado_empresa?: string | null
          funil_incial_id?: number | null
          gg_access_token?: string | null
          gg_calendar_id?: string | null
          gg_email?: string | null
          gg_refresh_token?: string | null
          gg_scopes?: string[] | null
          gg_sync_token?: string | null
          gg_synced_at?: string | null
          gg_token_expires_at?: string | null
          id?: string
          link_agendamento?: string | null
          logo_url?: string | null
          name: string
          numero_empresa?: string | null
          phone?: string | null
          produtos_servicos_empresa?: string | null
          rua_empresa?: string | null
          site_empresa?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          agenda_publico_ativo?: boolean | null
          agenda_publico_descricao?: string | null
          agenda_publico_slug?: string | null
          agenda_publico_titulo?: string | null
          bairro_empresa?: string | null
          business_hours?: string | null
          cep_empresa?: string | null
          cidade_empresa?: string | null
          cnpj?: string | null
          coluna_inicial_id?: number | null
          coluna_perdido_id?: number | null
          created_at?: string | null
          descricao_empresa?: string | null
          email_empresa?: string | null
          estado_empresa?: string | null
          funil_incial_id?: number | null
          gg_access_token?: string | null
          gg_calendar_id?: string | null
          gg_email?: string | null
          gg_refresh_token?: string | null
          gg_scopes?: string[] | null
          gg_sync_token?: string | null
          gg_synced_at?: string | null
          gg_token_expires_at?: string | null
          id?: string
          link_agendamento?: string | null
          logo_url?: string | null
          name?: string
          numero_empresa?: string | null
          phone?: string | null
          produtos_servicos_empresa?: string | null
          rua_empresa?: string | null
          site_empresa?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_coluna_inicial_id_fkey"
            columns: ["coluna_inicial_id"]
            isOneToOne: false
            referencedRelation: "ff_colunas_funil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_coluna_perdido_id_fkey"
            columns: ["coluna_perdido_id"]
            isOneToOne: false
            referencedRelation: "ff_colunas_funil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_funil_incial_id_fkey"
            columns: ["funil_incial_id"]
            isOneToOne: false
            referencedRelation: "ff_funil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_user_dashboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      cupons_desconto: {
        Row: {
          ativo: boolean | null
          codigo: string | null
          created_at: string
          desconto: number | null
          id: number
          nome: string | null
          usado_qtd: number | null
        }
        Insert: {
          ativo?: boolean | null
          codigo?: string | null
          created_at?: string
          desconto?: number | null
          id?: number
          nome?: string | null
          usado_qtd?: number | null
        }
        Update: {
          ativo?: boolean | null
          codigo?: string | null
          created_at?: string
          desconto?: number | null
          id?: number
          nome?: string | null
          usado_qtd?: number | null
        }
        Relationships: []
      }
      ff_colunas_funil: {
        Row: {
          companie_id: string | null
          created_at: string
          descricao: string | null
          funil_id: number | null
          id: number
          nome_coluna: string | null
          position: number | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          companie_id?: string | null
          created_at?: string
          descricao?: string | null
          funil_id?: number | null
          id?: number
          nome_coluna?: string | null
          position?: number | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          companie_id?: string | null
          created_at?: string
          descricao?: string | null
          funil_id?: number | null
          id?: number
          nome_coluna?: string | null
          position?: number | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ff_colunas_funil_companie_id_fkey"
            columns: ["companie_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ff_colunas_funil_companie_id_fkey"
            columns: ["companie_id"]
            isOneToOne: false
            referencedRelation: "vw_bots_empresa"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "ff_colunas_funil_companie_id_fkey"
            columns: ["companie_id"]
            isOneToOne: false
            referencedRelation: "vw_user_dashboard"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "ff_colunas_funil_funil_id_fkey"
            columns: ["funil_id"]
            isOneToOne: false
            referencedRelation: "ff_funil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ff_colunas_funil_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ff_colunas_funil_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_user_dashboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      ff_funil: {
        Row: {
          companie_id: string | null
          created_at: string
          id: number
          nome_funil: string | null
          user_id: string | null
        }
        Insert: {
          companie_id?: string | null
          created_at?: string
          id?: number
          nome_funil?: string | null
          user_id?: string | null
        }
        Update: {
          companie_id?: string | null
          created_at?: string
          id?: number
          nome_funil?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ff_funil_companie_id_fkey"
            columns: ["companie_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ff_funil_companie_id_fkey"
            columns: ["companie_id"]
            isOneToOne: false
            referencedRelation: "vw_bots_empresa"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "ff_funil_companie_id_fkey"
            columns: ["companie_id"]
            isOneToOne: false
            referencedRelation: "vw_user_dashboard"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "ff_funil_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ff_funil_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_user_dashboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      follow_up: {
        Row: {
          companies_id: string | null
          created_at: string
          executado: boolean | null
          hora: string | null
          id: number
          lead_id: number | null
          mensagem: string | null
          remoteJid_lead: string | null
        }
        Insert: {
          companies_id?: string | null
          created_at?: string
          executado?: boolean | null
          hora?: string | null
          id?: number
          lead_id?: number | null
          mensagem?: string | null
          remoteJid_lead?: string | null
        }
        Update: {
          companies_id?: string | null
          created_at?: string
          executado?: boolean | null
          hora?: string | null
          id?: number
          lead_id?: number | null
          mensagem?: string | null
          remoteJid_lead?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_companies_id_fkey"
            columns: ["companies_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_companies_id_fkey"
            columns: ["companies_id"]
            isOneToOne: false
            referencedRelation: "vw_bots_empresa"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "follow_up_companies_id_fkey"
            columns: ["companies_id"]
            isOneToOne: false
            referencedRelation: "vw_user_dashboard"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "follow_up_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_up_config: {
        Row: {
          acao: string | null
          ativado: boolean | null
          companies_id: string | null
          created_at: string
          id: number
          intervalo_chamadas: number | null
          maximo_chamadas: number | null
          mensagem: string | null
          primeira_chamada: number | null
        }
        Insert: {
          acao?: string | null
          ativado?: boolean | null
          companies_id?: string | null
          created_at?: string
          id?: number
          intervalo_chamadas?: number | null
          maximo_chamadas?: number | null
          mensagem?: string | null
          primeira_chamada?: number | null
        }
        Update: {
          acao?: string | null
          ativado?: boolean | null
          companies_id?: string | null
          created_at?: string
          id?: number
          intervalo_chamadas?: number | null
          maximo_chamadas?: number | null
          mensagem?: string | null
          primeira_chamada?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_config_companies_id_fkey"
            columns: ["companies_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_config_companies_id_fkey"
            columns: ["companies_id"]
            isOneToOne: false
            referencedRelation: "vw_bots_empresa"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "follow_up_config_companies_id_fkey"
            columns: ["companies_id"]
            isOneToOne: false
            referencedRelation: "vw_user_dashboard"
            referencedColumns: ["company_id"]
          },
        ]
      }
      google_calendars: {
        Row: {
          access_role: string | null
          color_hex: string | null
          created_at: string
          default_write: boolean
          description: string | null
          gg_calendar_id: string
          id: string
          integration_id: string
          primary_flag: boolean
          selected: boolean
          summary: string | null
          sync_token: string | null
          synced_at: string | null
          time_zone: string | null
          updated_at: string
          watch_channel_id: string | null
          watch_expires_at: string | null
          watch_resource_id: string | null
          watch_token: string | null
        }
        Insert: {
          access_role?: string | null
          color_hex?: string | null
          created_at?: string
          default_write?: boolean
          description?: string | null
          gg_calendar_id: string
          id?: string
          integration_id: string
          primary_flag?: boolean
          selected?: boolean
          summary?: string | null
          sync_token?: string | null
          synced_at?: string | null
          time_zone?: string | null
          updated_at?: string
          watch_channel_id?: string | null
          watch_expires_at?: string | null
          watch_resource_id?: string | null
          watch_token?: string | null
        }
        Update: {
          access_role?: string | null
          color_hex?: string | null
          created_at?: string
          default_write?: boolean
          description?: string | null
          gg_calendar_id?: string
          id?: string
          integration_id?: string
          primary_flag?: boolean
          selected?: boolean
          summary?: string | null
          sync_token?: string | null
          synced_at?: string | null
          time_zone?: string | null
          updated_at?: string
          watch_channel_id?: string | null
          watch_expires_at?: string | null
          watch_resource_id?: string | null
          watch_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "google_calendars_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "google_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      google_integrations: {
        Row: {
          access_token: string | null
          companie_id: string
          created_at: string
          gg_email: string | null
          gg_sub: string | null
          id: string
          refresh_token: string
          revoked_at: string | null
          scopes: string[] | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          companie_id: string
          created_at?: string
          gg_email?: string | null
          gg_sub?: string | null
          id?: string
          refresh_token: string
          revoked_at?: string | null
          scopes?: string[] | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          companie_id?: string
          created_at?: string
          gg_email?: string | null
          gg_sub?: string | null
          id?: string
          refresh_token?: string
          revoked_at?: string | null
          scopes?: string[] | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_integrations_companie_id_fkey"
            columns: ["companie_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_integrations_companie_id_fkey"
            columns: ["companie_id"]
            isOneToOne: false
            referencedRelation: "vw_bots_empresa"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "google_integrations_companie_id_fkey"
            columns: ["companie_id"]
            isOneToOne: false
            referencedRelation: "vw_user_dashboard"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "google_integrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_integrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_user_dashboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      leads: {
        Row: {
          avatar_fetched_at: string | null
          avatar_url: string | null
          bairro: string | null
          canal_preferido: string | null
          cargo: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          coluna_id: number | null
          companies_id: string | null
          stage_since?: string | null
          complemento: string | null
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          "e-mail": string | null
          empresa: string | null
          estado: string | null
          follows_enviados: number | null
          funil_id: number | null
          genero: string | null
          ia_ativa: boolean | null
          id: number
          nome_lead: string | null
          numero_endereco: string | null
          numero_whatsapp_lead: string | null
          observacao: string | null
          origem: string | null
          prioridade: string | null
          proxima_acao: string | null
          proxima_acao_data: string | null
          remoteJid_lead: string | null
          resumo_lead: string | null
          rua: string | null
          tags: string[] | null
          telefone_secundario: string | null
          ultima_interacao_ia: string | null
          ultima_interacao_lead: string | null
          user_id: string | null
          valor_negocio: number | null
          whatsapp_validado: boolean | null
        }
        Insert: {
          avatar_fetched_at?: string | null
          avatar_url?: string | null
          bairro?: string | null
          canal_preferido?: string | null
          cargo?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          coluna_id?: number | null
          companies_id?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          "e-mail"?: string | null
          empresa?: string | null
          estado?: string | null
          follows_enviados?: number | null
          funil_id?: number | null
          genero?: string | null
          ia_ativa?: boolean | null
          id?: number
          nome_lead?: string | null
          numero_endereco?: string | null
          numero_whatsapp_lead?: string | null
          observacao?: string | null
          origem?: string | null
          prioridade?: string | null
          proxima_acao?: string | null
          proxima_acao_data?: string | null
          remoteJid_lead?: string | null
          resumo_lead?: string | null
          rua?: string | null
          tags?: string[] | null
          telefone_secundario?: string | null
          ultima_interacao_ia?: string | null
          ultima_interacao_lead?: string | null
          user_id?: string | null
          valor_negocio?: number | null
          whatsapp_validado?: boolean | null
        }
        Update: {
          avatar_fetched_at?: string | null
          avatar_url?: string | null
          bairro?: string | null
          canal_preferido?: string | null
          cargo?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          coluna_id?: number | null
          companies_id?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          "e-mail"?: string | null
          empresa?: string | null
          estado?: string | null
          follows_enviados?: number | null
          funil_id?: number | null
          genero?: string | null
          ia_ativa?: boolean | null
          id?: number
          nome_lead?: string | null
          numero_endereco?: string | null
          numero_whatsapp_lead?: string | null
          observacao?: string | null
          origem?: string | null
          prioridade?: string | null
          proxima_acao?: string | null
          proxima_acao_data?: string | null
          remoteJid_lead?: string | null
          resumo_lead?: string | null
          rua?: string | null
          tags?: string[] | null
          telefone_secundario?: string | null
          ultima_interacao_ia?: string | null
          ultima_interacao_lead?: string | null
          user_id?: string | null
          valor_negocio?: number | null
          whatsapp_validado?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_coluna_id_fkey"
            columns: ["coluna_id"]
            isOneToOne: false
            referencedRelation: "ff_colunas_funil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_companies_id_fkey"
            columns: ["companies_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_companies_id_fkey"
            columns: ["companies_id"]
            isOneToOne: false
            referencedRelation: "vw_bots_empresa"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "leads_companies_id_fkey"
            columns: ["companies_id"]
            isOneToOne: false
            referencedRelation: "vw_user_dashboard"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "leads_funil_id_fkey"
            columns: ["funil_id"]
            isOneToOne: false
            referencedRelation: "ff_funil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_user_dashboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      lembretes: {
        Row: {
          companies_id: string | null
          created_at: string
          enviado: boolean | null
          hora_envio: string | null
          id: number
          leads_id: number | null
          lembrete_config_id: number | null
          lembrete_template_id: number | null
          mensagem: string | null
        }
        Insert: {
          companies_id?: string | null
          created_at?: string
          enviado?: boolean | null
          hora_envio?: string | null
          id?: number
          leads_id?: number | null
          lembrete_config_id?: number | null
          lembrete_template_id?: number | null
          mensagem?: string | null
        }
        Update: {
          companies_id?: string | null
          created_at?: string
          enviado?: boolean | null
          hora_envio?: string | null
          id?: number
          leads_id?: number | null
          lembrete_config_id?: number | null
          lembrete_template_id?: number | null
          mensagem?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lembretes_companies_id_fkey"
            columns: ["companies_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lembretes_companies_id_fkey"
            columns: ["companies_id"]
            isOneToOne: false
            referencedRelation: "vw_bots_empresa"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "lembretes_companies_id_fkey"
            columns: ["companies_id"]
            isOneToOne: false
            referencedRelation: "vw_user_dashboard"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "lembretes_leads_id_fkey"
            columns: ["leads_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lembretes_lembrete_config_id_fkey"
            columns: ["lembrete_config_id"]
            isOneToOne: false
            referencedRelation: "lembretes_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lembretes_lembrete_template_id_fkey"
            columns: ["lembrete_template_id"]
            isOneToOne: false
            referencedRelation: "lembretes_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      lembretes_config: {
        Row: {
          ativo: boolean | null
          cancelamento: boolean | null
          companies_id: string | null
          created_at: string
          envio_email: boolean | null
          envio_whatsapp: boolean | null
          id: number
          primeiro_lote_tempo: string | null
          primeiro_lote_tipo: string | null
          segundo_lote_tempo: string | null
          segundo_lote_tipo: string | null
        }
        Insert: {
          ativo?: boolean | null
          cancelamento?: boolean | null
          companies_id?: string | null
          created_at?: string
          envio_email?: boolean | null
          envio_whatsapp?: boolean | null
          id?: number
          primeiro_lote_tempo?: string | null
          primeiro_lote_tipo?: string | null
          segundo_lote_tempo?: string | null
          segundo_lote_tipo?: string | null
        }
        Update: {
          ativo?: boolean | null
          cancelamento?: boolean | null
          companies_id?: string | null
          created_at?: string
          envio_email?: boolean | null
          envio_whatsapp?: boolean | null
          id?: number
          primeiro_lote_tempo?: string | null
          primeiro_lote_tipo?: string | null
          segundo_lote_tempo?: string | null
          segundo_lote_tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lembretes_config_companies_id_fkey"
            columns: ["companies_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lembretes_config_companies_id_fkey"
            columns: ["companies_id"]
            isOneToOne: false
            referencedRelation: "vw_bots_empresa"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "lembretes_config_companies_id_fkey"
            columns: ["companies_id"]
            isOneToOne: false
            referencedRelation: "vw_user_dashboard"
            referencedColumns: ["company_id"]
          },
        ]
      }
      lembretes_templates: {
        Row: {
          ativo: boolean | null
          companies_id: string | null
          created_at: string
          id: number
          lembretes_config_id: number | null
          mensagem: string | null
          tipo_lembrete:
            | Database["public"]["Enums"]["enum_tipo_lembretes"]
            | null
          titulo: string | null
        }
        Insert: {
          ativo?: boolean | null
          companies_id?: string | null
          created_at?: string
          id?: number
          lembretes_config_id?: number | null
          mensagem?: string | null
          tipo_lembrete?:
            | Database["public"]["Enums"]["enum_tipo_lembretes"]
            | null
          titulo?: string | null
        }
        Update: {
          ativo?: boolean | null
          companies_id?: string | null
          created_at?: string
          id?: number
          lembretes_config_id?: number | null
          mensagem?: string | null
          tipo_lembrete?:
            | Database["public"]["Enums"]["enum_tipo_lembretes"]
            | null
          titulo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lembretes_templates_companies_id_fkey"
            columns: ["companies_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lembretes_templates_companies_id_fkey"
            columns: ["companies_id"]
            isOneToOne: false
            referencedRelation: "vw_bots_empresa"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "lembretes_templates_companies_id_fkey"
            columns: ["companies_id"]
            isOneToOne: false
            referencedRelation: "vw_user_dashboard"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "lembretes_templates_lembretes_config_id_fkey"
            columns: ["lembretes_config_id"]
            isOneToOne: false
            referencedRelation: "lembretes_config"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          message: string | null
          read: boolean | null
          reference_id: string | null
          reference_type: string | null
          tipo: Database["public"]["Enums"]["enum_notification"] | null
          title: string | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          message?: string | null
          read?: boolean | null
          reference_id?: string | null
          reference_type?: string | null
          tipo?: Database["public"]["Enums"]["enum_notification"] | null
          title?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          message?: string | null
          read?: boolean | null
          reference_id?: string | null
          reference_type?: string | null
          tipo?: Database["public"]["Enums"]["enum_notification"] | null
          title?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "vw_bots_empresa"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "vw_user_dashboard"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_user_dashboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      plan: {
        Row: {
          created_at: string
          extras_beneficios: string | null
          id: number
          limite_leads: number | null
          limite_mensagens: number | null
          limite_users: number | null
          mensagem_excedente: number | null
          nome: string | null
          recursos: string[] | null
          stripe_price_live_id: string | null
          stripe_price_test_id: string | null
          valor_mensal: number | null
        }
        Insert: {
          created_at?: string
          extras_beneficios?: string | null
          id?: number
          limite_leads?: number | null
          limite_mensagens?: number | null
          limite_users?: number | null
          mensagem_excedente?: number | null
          nome?: string | null
          recursos?: string[] | null
          stripe_price_live_id?: string | null
          stripe_price_test_id?: string | null
          valor_mensal?: number | null
        }
        Update: {
          created_at?: string
          extras_beneficios?: string | null
          id?: number
          limite_leads?: number | null
          limite_mensagens?: number | null
          limite_users?: number | null
          mensagem_excedente?: number | null
          nome?: string | null
          recursos?: string[] | null
          stripe_price_live_id?: string | null
          stripe_price_test_id?: string | null
          valor_mensal?: number | null
        }
        Relationships: []
      }
      plan_assinados: {
        Row: {
          ativo: boolean | null
          cancelado_em: string | null
          companie_id: string | null
          created_at: string
          data_fim: string | null
          data_fim_trial: string | null
          data_inicio: string | null
          date_inicio_date: string | null
          id: number
          observacoes: string | null
          plan_id: number | null
          recorrente: boolean | null
          stripe_subscription_id: string | null
          trial: boolean | null
        }
        Insert: {
          ativo?: boolean | null
          cancelado_em?: string | null
          companie_id?: string | null
          created_at?: string
          data_fim?: string | null
          data_fim_trial?: string | null
          data_inicio?: string | null
          date_inicio_date?: string | null
          id?: number
          observacoes?: string | null
          plan_id?: number | null
          recorrente?: boolean | null
          stripe_subscription_id?: string | null
          trial?: boolean | null
        }
        Update: {
          ativo?: boolean | null
          cancelado_em?: string | null
          companie_id?: string | null
          created_at?: string
          data_fim?: string | null
          data_fim_trial?: string | null
          data_inicio?: string | null
          date_inicio_date?: string | null
          id?: number
          observacoes?: string | null
          plan_id?: number | null
          recorrente?: boolean | null
          stripe_subscription_id?: string | null
          trial?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_assinados_companie_id_fkey"
            columns: ["companie_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_assinados_companie_id_fkey"
            columns: ["companie_id"]
            isOneToOne: false
            referencedRelation: "vw_bots_empresa"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "plan_assinados_companie_id_fkey"
            columns: ["companie_id"]
            isOneToOne: false
            referencedRelation: "vw_user_dashboard"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "plan_assinados_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plan"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_uso_mensal: {
        Row: {
          companie_id: string | null
          created_at: string
          fechado: boolean | null
          ia_cost_usd: number
          ia_tokens_input: number
          ia_tokens_output: number
          id: number
          mensagens_excedentes: number | null
          mes: string | null
          total_leads: number | null
          total_mensagens: number | null
          valor_excedente: number | null
        }
        Insert: {
          companie_id?: string | null
          created_at?: string
          fechado?: boolean | null
          ia_cost_usd?: number
          ia_tokens_input?: number
          ia_tokens_output?: number
          id?: number
          mensagens_excedentes?: number | null
          mes?: string | null
          total_leads?: number | null
          total_mensagens?: number | null
          valor_excedente?: number | null
        }
        Update: {
          companie_id?: string | null
          created_at?: string
          fechado?: boolean | null
          ia_cost_usd?: number
          ia_tokens_input?: number
          ia_tokens_output?: number
          id?: number
          mensagens_excedentes?: number | null
          mes?: string | null
          total_leads?: number | null
          total_mensagens?: number | null
          valor_excedente?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_uso_mensal_companie_id_fkey"
            columns: ["companie_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_uso_mensal_companie_id_fkey"
            columns: ["companie_id"]
            isOneToOne: false
            referencedRelation: "vw_bots_empresa"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "plan_uso_mensal_companie_id_fkey"
            columns: ["companie_id"]
            isOneToOne: false
            referencedRelation: "vw_user_dashboard"
            referencedColumns: ["company_id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean | null
          companies_id: string | null
          created_at: string
          descricao: string | null
          exibir_preco: boolean | null
          id: number
          imagem_principal: string | null
          imagens: string[] | null
          nome: string | null
          preco: number | null
        }
        Insert: {
          ativo?: boolean | null
          companies_id?: string | null
          created_at?: string
          descricao?: string | null
          exibir_preco?: boolean | null
          id?: number
          imagem_principal?: string | null
          imagens?: string[] | null
          nome?: string | null
          preco?: number | null
        }
        Update: {
          ativo?: boolean | null
          companies_id?: string | null
          created_at?: string
          descricao?: string | null
          exibir_preco?: boolean | null
          id?: number
          imagem_principal?: string | null
          imagens?: string[] | null
          nome?: string | null
          preco?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "produtos_companies_id_fkey"
            columns: ["companies_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_companies_id_fkey"
            columns: ["companies_id"]
            isOneToOne: false
            referencedRelation: "vw_bots_empresa"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "produtos_companies_id_fkey"
            columns: ["companies_id"]
            isOneToOne: false
            referencedRelation: "vw_user_dashboard"
            referencedColumns: ["company_id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          company_id: string | null
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          company_id?: string | null
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          company_id?: string | null
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "vw_bots_empresa"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "push_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "vw_user_dashboard"
            referencedColumns: ["company_id"]
          },
        ]
      }
      setores: {
        Row: {
          company_id: string
          cor: string | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          company_id: string
          cor?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          cor?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "setores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "vw_bots_empresa"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "setores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "vw_user_dashboard"
            referencedColumns: ["company_id"]
          },
        ]
      }
      token_user: {
        Row: {
          card_brand: string | null
          card_number: string | null
          card_token: string | null
          created_at: string
          empresa_id: string | null
          id: number
          user_id: string | null
        }
        Insert: {
          card_brand?: string | null
          card_number?: string | null
          card_token?: string | null
          created_at?: string
          empresa_id?: string | null
          id?: number
          user_id?: string | null
        }
        Update: {
          card_brand?: string | null
          card_number?: string | null
          card_token?: string | null
          created_at?: string
          empresa_id?: string | null
          id?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_user_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "token_user_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_bots_empresa"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "token_user_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_user_dashboard"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "token_user_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "token_user_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_user_dashboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      users: {
        Row: {
          asaasid: string | null
          cargo_chat: string | null
          companie_id: string | null
          created_at: string | null
          email: string
          foto_perfil: string | null
          funcao_user: Database["public"]["Enums"]["enum_tipo_user"] | null
          id: string
          instancia: string | null
          is_onboarding_complete: boolean | null
          last_login: string | null
          nome: string | null
          setor_id: string | null
          status: Database["public"]["Enums"]["enum_status_user"] | null
          stripe_customer_id: string | null
        }
        Insert: {
          asaasid?: string | null
          cargo_chat?: string | null
          companie_id?: string | null
          created_at?: string | null
          email: string
          foto_perfil?: string | null
          funcao_user?: Database["public"]["Enums"]["enum_tipo_user"] | null
          id: string
          instancia?: string | null
          is_onboarding_complete?: boolean | null
          last_login?: string | null
          nome?: string | null
          setor_id?: string | null
          status?: Database["public"]["Enums"]["enum_status_user"] | null
          stripe_customer_id?: string | null
        }
        Update: {
          asaasid?: string | null
          cargo_chat?: string | null
          companie_id?: string | null
          created_at?: string | null
          email?: string
          foto_perfil?: string | null
          funcao_user?: Database["public"]["Enums"]["enum_tipo_user"] | null
          id?: string
          instancia?: string | null
          is_onboarding_complete?: boolean | null
          last_login?: string | null
          nome?: string | null
          setor_id?: string | null
          status?: Database["public"]["Enums"]["enum_status_user"] | null
          stripe_customer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_companie_id_fkey"
            columns: ["companie_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_companie_id_fkey"
            columns: ["companie_id"]
            isOneToOne: false
            referencedRelation: "vw_bots_empresa"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "users_companie_id_fkey"
            columns: ["companie_id"]
            isOneToOne: false
            referencedRelation: "vw_user_dashboard"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "users_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      whats_conversa: {
        Row: {
          assigned_at: string | null
          assigned_to: string | null
          avatar_fetched_at: string | null
          avatar_url: string | null
          companies_id: string | null
          created_at: string
          grupoNome: string | null
          id: number
          isgrupo: boolean | null
          last_read_at: string | null
          lead_id: number | null
          remoteJid: string | null
          setor_id: string | null
          user_id: string | null
          whatsapp_connection_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_to?: string | null
          avatar_fetched_at?: string | null
          avatar_url?: string | null
          companies_id?: string | null
          created_at?: string
          grupoNome?: string | null
          id?: number
          isgrupo?: boolean | null
          last_read_at?: string | null
          lead_id?: number | null
          remoteJid?: string | null
          setor_id?: string | null
          user_id?: string | null
          whatsapp_connection_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_to?: string | null
          avatar_fetched_at?: string | null
          avatar_url?: string | null
          companies_id?: string | null
          created_at?: string
          grupoNome?: string | null
          id?: number
          isgrupo?: boolean | null
          last_read_at?: string | null
          lead_id?: number | null
          remoteJid?: string | null
          setor_id?: string | null
          user_id?: string | null
          whatsapp_connection_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whats_conversa_companies_id_fkey"
            columns: ["companies_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whats_conversa_companies_id_fkey"
            columns: ["companies_id"]
            isOneToOne: false
            referencedRelation: "vw_bots_empresa"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "whats_conversa_companies_id_fkey"
            columns: ["companies_id"]
            isOneToOne: false
            referencedRelation: "vw_user_dashboard"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "whats_conversa_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whats_conversa_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whats_conversa_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whats_conversa_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_user_dashboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "whats_conversa_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "vw_user_dashboard"
            referencedColumns: ["whatsapp_id"]
          },
          {
            foreignKeyName: "whats_conversa_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      whats_mensagens_conversa: {
        Row: {
          created_at: string
          deletada: boolean | null
          editada: boolean | null
          id: number
          id_mensagem: string | null
          ingrupo: boolean | null
          interna: boolean | null
          lead_id: number | null
          mensagem: string | null
          midia_url: string | null
          quemmandou: string | null
          quoted_message_id: string | null
          reacao: string | null
          sender: string | null
          status: Database["public"]["Enums"]["enum_status_mensagem"] | null
          tipo: string | null
          visto: boolean | null
          whats_conversa_id: number | null
        }
        Insert: {
          created_at?: string
          deletada?: boolean | null
          editada?: boolean | null
          id?: number
          id_mensagem?: string | null
          ingrupo?: boolean | null
          interna?: boolean | null
          lead_id?: number | null
          mensagem?: string | null
          midia_url?: string | null
          quemmandou?: string | null
          quoted_message_id?: string | null
          reacao?: string | null
          sender?: string | null
          status?: Database["public"]["Enums"]["enum_status_mensagem"] | null
          tipo?: string | null
          visto?: boolean | null
          whats_conversa_id?: number | null
        }
        Update: {
          created_at?: string
          deletada?: boolean | null
          editada?: boolean | null
          id?: number
          id_mensagem?: string | null
          ingrupo?: boolean | null
          interna?: boolean | null
          lead_id?: number | null
          mensagem?: string | null
          midia_url?: string | null
          quemmandou?: string | null
          quoted_message_id?: string | null
          reacao?: string | null
          sender?: string | null
          status?: Database["public"]["Enums"]["enum_status_mensagem"] | null
          tipo?: string | null
          visto?: boolean | null
          whats_conversa_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "whats_mensagens_conversa_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whats_mensagens_conversa_whats_conversa_id_fkey"
            columns: ["whats_conversa_id"]
            isOneToOne: false
            referencedRelation: "whats_conversa"
            referencedColumns: ["id"]
          },
        ]
      }
      whats_participantes: {
        Row: {
          avatar_fetched_at: string | null
          avatar_url: string | null
          companies_id: string
          jid: string
          nome: string | null
          updated_at: string
        }
        Insert: {
          avatar_fetched_at?: string | null
          avatar_url?: string | null
          companies_id: string
          jid: string
          nome?: string | null
          updated_at?: string
        }
        Update: {
          avatar_fetched_at?: string | null
          avatar_url?: string | null
          companies_id?: string
          jid?: string
          nome?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whats_participantes_companies_id_fkey"
            columns: ["companies_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whats_participantes_companies_id_fkey"
            columns: ["companies_id"]
            isOneToOne: false
            referencedRelation: "vw_bots_empresa"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "whats_participantes_companies_id_fkey"
            columns: ["companies_id"]
            isOneToOne: false
            referencedRelation: "vw_user_dashboard"
            referencedColumns: ["company_id"]
          },
        ]
      }
      whats_presence: {
        Row: {
          conversa_id: number
          media: string | null
          state: string
          updated_at: string
        }
        Insert: {
          conversa_id: number
          media?: string | null
          state: string
          updated_at?: string
        }
        Update: {
          conversa_id?: number
          media?: string | null
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whats_presence_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: true
            referencedRelation: "whats_conversa"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_connections: {
        Row: {
          apikey_evo: string | null
          cloud_api_access_token: string | null
          cloud_api_app_id: string | null
          cloud_api_coexistence: boolean | null
          cloud_api_display_name: string | null
          cloud_api_phone_number_id: string | null
          cloud_api_verified_name: string | null
          cloud_api_waba_id: string | null
          cloud_api_webhook_verify_token: string | null
          company_id: string | null
          connection_status: string | null
          created_at: string | null
          display_name: string | null
          external_id: string | null
          id: string
          instance_id: string | null
          instance_name: string | null
          is_connected: boolean | null
          is_principal: boolean
          last_connected_at: string | null
          meta_ig_business_id: string | null
          meta_long_lived_token: string | null
          meta_page_id: string | null
          phone_number: string | null
          provider: Database["public"]["Enums"]["enum_whatsapp_provider"]
          qr_code_url: string | null
          uazapi_instance_token: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          apikey_evo?: string | null
          cloud_api_access_token?: string | null
          cloud_api_app_id?: string | null
          cloud_api_coexistence?: boolean | null
          cloud_api_display_name?: string | null
          cloud_api_phone_number_id?: string | null
          cloud_api_verified_name?: string | null
          cloud_api_waba_id?: string | null
          cloud_api_webhook_verify_token?: string | null
          company_id?: string | null
          connection_status?: string | null
          created_at?: string | null
          display_name?: string | null
          external_id?: string | null
          id?: string
          instance_id?: string | null
          instance_name?: string | null
          is_connected?: boolean | null
          is_principal?: boolean
          last_connected_at?: string | null
          meta_ig_business_id?: string | null
          meta_long_lived_token?: string | null
          meta_page_id?: string | null
          phone_number?: string | null
          provider?: Database["public"]["Enums"]["enum_whatsapp_provider"]
          qr_code_url?: string | null
          uazapi_instance_token?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          apikey_evo?: string | null
          cloud_api_access_token?: string | null
          cloud_api_app_id?: string | null
          cloud_api_coexistence?: boolean | null
          cloud_api_display_name?: string | null
          cloud_api_phone_number_id?: string | null
          cloud_api_verified_name?: string | null
          cloud_api_waba_id?: string | null
          cloud_api_webhook_verify_token?: string | null
          company_id?: string | null
          connection_status?: string | null
          created_at?: string | null
          display_name?: string | null
          external_id?: string | null
          id?: string
          instance_id?: string | null
          instance_name?: string | null
          is_connected?: boolean | null
          is_principal?: boolean
          last_connected_at?: string | null
          meta_ig_business_id?: string | null
          meta_long_lived_token?: string | null
          meta_page_id?: string | null
          phone_number?: string | null
          provider?: Database["public"]["Enums"]["enum_whatsapp_provider"]
          qr_code_url?: string | null
          uazapi_instance_token?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_connections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_connections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "vw_bots_empresa"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "whatsapp_connections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "vw_user_dashboard"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "whatsapp_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_user_dashboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      vw_bots_empresa: {
        Row: {
          away_message: string | null
          bairro_empresa: string | null
          bot_company_id: string | null
          bot_created_at: string | null
          bot_id: string | null
          bot_instance_name: string | null
          bot_updated_at: string | null
          bot_user_id: string | null
          business_hours: string | null
          cep_empresa: string | null
          cidade_empresa: string | null
          cnpj: string | null
          company_created_at: string | null
          company_id: string | null
          company_updated_at: string | null
          company_user_id: string | null
          comprimento_respostas: string | null
          descricao_bot: string | null
          descricao_empresa: string | null
          email_empresa: string | null
          estado_empresa: string | null
          ia_ativa: boolean | null
          language_style: string | null
          link_agendamento: string | null
          logo_url: string | null
          nome_bot: string | null
          nome_empresa: string | null
          numero_empresa: string | null
          produtos_servicos_empresa: string | null
          roteiro_atendimento: string | null
          rua_empresa: string | null
          site_empresa: string | null
          status: Database["public"]["Enums"]["status_bot"] | null
          telefone_empresa: string | null
          uso_abreviacoes: boolean | null
          uso_emoji: boolean | null
          welcome_message: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bots_company_id_fkey"
            columns: ["bot_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bots_company_id_fkey"
            columns: ["bot_company_id"]
            isOneToOne: false
            referencedRelation: "vw_bots_empresa"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "bots_company_id_fkey"
            columns: ["bot_company_id"]
            isOneToOne: false
            referencedRelation: "vw_user_dashboard"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "bots_user_id_fkey"
            columns: ["bot_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bots_user_id_fkey"
            columns: ["bot_user_id"]
            isOneToOne: false
            referencedRelation: "vw_user_dashboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "companies_user_id_fkey"
            columns: ["company_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_user_id_fkey"
            columns: ["company_user_id"]
            isOneToOne: false
            referencedRelation: "vw_user_dashboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      vw_user_dashboard: {
        Row: {
          away_message: string | null
          bairro_empresa: string | null
          bot_created_at: string | null
          bot_id: string | null
          bot_instance_name: string | null
          bot_updated_at: string | null
          business_hours: string | null
          cep_empresa: string | null
          cidade_empresa: string | null
          cnpj: string | null
          coluna_inicial_id: number | null
          coluna_perdido_id: number | null
          company_created_at: string | null
          company_id: string | null
          company_updated_at: string | null
          comprimento_respostas: string | null
          connection_status: string | null
          descricao_bot: string | null
          descricao_empresa: string | null
          email: string | null
          email_empresa: string | null
          estado_empresa: string | null
          funil_incial_id: number | null
          ia_ativa: boolean | null
          instance_id: string | null
          instancia_usuario: string | null
          is_connected: boolean | null
          is_onboarding_complete: boolean | null
          language_style: string | null
          last_connected_at: string | null
          last_login: string | null
          logo_url: string | null
          nome_bot: string | null
          nome_empresa: string | null
          nome_usuario: string | null
          numero_empresa: string | null
          phone_number: string | null
          qr_code_url: string | null
          rua_empresa: string | null
          site_empresa: string | null
          status: Database["public"]["Enums"]["status_bot"] | null
          telefone_empresa: string | null
          user_created_at: string | null
          user_id: string | null
          uso_abreviacoes: boolean | null
          uso_emoji: boolean | null
          welcome_message: string | null
          whatsapp_created_at: string | null
          whatsapp_id: string | null
          whatsapp_instance_name: string | null
          whatsapp_updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_coluna_inicial_id_fkey"
            columns: ["coluna_inicial_id"]
            isOneToOne: false
            referencedRelation: "ff_colunas_funil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_coluna_perdido_id_fkey"
            columns: ["coluna_perdido_id"]
            isOneToOne: false
            referencedRelation: "ff_colunas_funil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_funil_incial_id_fkey"
            columns: ["funil_incial_id"]
            isOneToOne: false
            referencedRelation: "ff_funil"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      ai_search_knowledge: {
        Args: {
          p_company_id: string
          p_match_count?: number
          p_query_embedding: string
        }
        Returns: {
          chunk_index: number
          content_text: string
          distance: number
          source_ref: string
        }[]
      }
      chat_list: {
        Args: { p_company_id: string }
        Returns: {
          assigned_nome: string
          assigned_to: string
          companies_id: string
          created_at: string
          id: number
          last_message: string
          last_message_at: string
          last_message_status: Database["public"]["Enums"]["enum_status_mensagem"]
          last_message_tipo: string
          last_read_at: string
          lead_avatar_url: string
          lead_ia_ativa: boolean
          lead_id: number
          lead_nome: string
          lead_numero: string
          lead_resumo: string
          remoteJid: string
          setor_cor: string
          setor_id: string
          setor_nome: string
          unread_count: number
          provider: Database["public"]["Enums"]["enum_whatsapp_provider"] | null
          funil_nome: string
          coluna_nome: string
        }[]
      }
      cron_google_sync: { Args: never; Returns: undefined }
      current_company_id: { Args: never; Returns: string }
      dashboard_stats: { Args: { p_company_id: string }; Returns: Json }
      empresas_vencem_hoje: {
        Args: never
        Returns: {
          companie_id: string
        }[]
      }
      fn_current_user_companie_id: { Args: never; Returns: string }
      get_current_user_profile: { Args: never; Returns: Json }
      increment_follows_enviados: {
        Args: { p_lead_id: number }
        Returns: number
      }
      is_owner_of_company: { Args: { c_id: string }; Returns: boolean }
      set_presence: {
        Args: { p_media?: string; p_remote_jid: string; p_state: string }
        Returns: undefined
      }
      transferir_conversa_setor: {
        Args: { p_conversa_id: number; p_nota?: string; p_setor_id: string }
        Returns: Json
      }
      transferir_conversa_user: {
        Args: { p_conversa_id: number; p_nota?: string; p_to_user_id: string }
        Returns: Json
      }
      upsert_whats_conversa: {
        Args: {
          p_company_id: string
          p_grupo_nome?: string
          p_isgrupo?: boolean
          p_lead_id?: number
          p_remote_jid: string
          p_user_id?: string
          p_whatsapp_connection_id: string
        }
        Returns: {
          assigned_at: string | null
          assigned_to: string | null
          avatar_fetched_at: string | null
          avatar_url: string | null
          companies_id: string | null
          created_at: string
          grupoNome: string | null
          id: number
          isgrupo: boolean | null
          last_read_at: string | null
          lead_id: number | null
          remoteJid: string | null
          setor_id: string | null
          user_id: string | null
          whatsapp_connection_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "whats_conversa"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      enum_notification:
        | "mensagem"
        | "lead"
        | "agenda"
        | "alerta"
        | "atencao"
        | "pagamento"
        | "transferencia"
      enum_status_agenda: "Confirmado" | "Pendente" | "Cancelado"
      enum_status_mensagem: "Recebida" | "Enviada" | "Entregue" | "Lida"
      enum_status_pgto: "Pendente" | "Paga" | "Cancelada" | "Vencida"
      enum_status_user: "Ativo" | "Bloqueado" | "Desativado"
      enum_tipo_lembretes: "Agendamento" | "Confirmação"
      enum_tipo_pgto: "Pix" | "Cartao" | "Boleto"
      enum_tipo_user: "OWNER" | "EMPLOYEE" | "VIEWER"
      enum_whatsapp_provider:
        | "whatsapp_evolution"
        | "whatsapp_uazapi"
        | "whatsapp_cloud"
        | "instagram"
        | "facebook"
      status_bot: "Online" | "Ausente" | "Offline"
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
      enum_notification: [
        "mensagem",
        "lead",
        "agenda",
        "alerta",
        "atencao",
        "pagamento",
        "transferencia",
      ],
      enum_status_agenda: ["Confirmado", "Pendente", "Cancelado"],
      enum_status_mensagem: ["Recebida", "Enviada", "Entregue", "Lida"],
      enum_status_pgto: ["Pendente", "Paga", "Cancelada", "Vencida"],
      enum_status_user: ["Ativo", "Bloqueado", "Desativado"],
      enum_tipo_lembretes: ["Agendamento", "Confirmação"],
      enum_tipo_pgto: ["Pix", "Cartao", "Boleto"],
      enum_tipo_user: ["OWNER", "EMPLOYEE", "VIEWER"],
      enum_whatsapp_provider: [
        "whatsapp_evolution",
        "whatsapp_uazapi",
        "whatsapp_cloud",
        "instagram",
        "facebook",
      ],
      status_bot: ["Online", "Ausente", "Offline"],
    },
  },
} as const
