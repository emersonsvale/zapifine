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
      agendamentos: {
        Row: {
          companie_id: string | null
          created_at: string
          gg_end: string | null
          gg_link: string | null
          gg_start: string | null
          gg_title: string | null
          id: string
          lead_id: number | null
          status_agenda:
            | Database["public"]["Enums"]["enum_status_agenda"]
            | null
        }
        Insert: {
          companie_id?: string | null
          created_at?: string
          gg_end?: string | null
          gg_link?: string | null
          gg_start?: string | null
          gg_title?: string | null
          id: string
          lead_id?: number | null
          status_agenda?:
            | Database["public"]["Enums"]["enum_status_agenda"]
            | null
        }
        Update: {
          companie_id?: string | null
          created_at?: string
          gg_end?: string | null
          gg_link?: string | null
          gg_start?: string | null
          gg_title?: string | null
          id?: string
          lead_id?: number | null
          status_agenda?:
            | Database["public"]["Enums"]["enum_status_agenda"]
            | null
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
            foreignKeyName: "agendamentos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
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
          gg_refresh_token: string | null
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
          gg_refresh_token?: string | null
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
          gg_refresh_token?: string | null
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
          user_id: string | null
        }
        Insert: {
          companie_id?: string | null
          created_at?: string
          descricao?: string | null
          funil_id?: number | null
          id?: number
          nome_coluna?: string | null
          user_id?: string | null
        }
        Update: {
          companie_id?: string | null
          created_at?: string
          descricao?: string | null
          funil_id?: number | null
          id?: number
          nome_coluna?: string | null
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
      leads: {
        Row: {
          cidade: string | null
          coluna_id: number | null
          companies_id: string | null
          created_at: string
          "e-mail": string | null
          estado: string | null
          follows_enviados: number | null
          funil_id: number | null
          ia_ativa: boolean | null
          id: number
          nome_lead: string | null
          numero_whatsapp_lead: string | null
          observacao: string | null
          origem: string | null
          prioridade: string | null
          remoteJid_lead: string | null
          resumo_lead: string | null
          tags: string[] | null
          ultima_interacao_ia: string | null
          ultima_interacao_lead: string | null
          user_id: string | null
          whatsapp_validado: boolean | null
        }
        Insert: {
          cidade?: string | null
          coluna_id?: number | null
          companies_id?: string | null
          created_at?: string
          "e-mail"?: string | null
          estado?: string | null
          follows_enviados?: number | null
          funil_id?: number | null
          ia_ativa?: boolean | null
          id?: number
          nome_lead?: string | null
          numero_whatsapp_lead?: string | null
          observacao?: string | null
          origem?: string | null
          prioridade?: string | null
          remoteJid_lead?: string | null
          resumo_lead?: string | null
          tags?: string[] | null
          ultima_interacao_ia?: string | null
          ultima_interacao_lead?: string | null
          user_id?: string | null
          whatsapp_validado?: boolean | null
        }
        Update: {
          cidade?: string | null
          coluna_id?: number | null
          companies_id?: string | null
          created_at?: string
          "e-mail"?: string | null
          estado?: string | null
          follows_enviados?: number | null
          funil_id?: number | null
          ia_ativa?: boolean | null
          id?: number
          nome_lead?: string | null
          numero_whatsapp_lead?: string | null
          observacao?: string | null
          origem?: string | null
          prioridade?: string | null
          remoteJid_lead?: string | null
          resumo_lead?: string | null
          tags?: string[] | null
          ultima_interacao_ia?: string | null
          ultima_interacao_lead?: string | null
          user_id?: string | null
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
        ]
      }
      whats_conversa: {
        Row: {
          companies_id: string | null
          created_at: string
          id: number
          lead_id: number | null
          remoteJid: string | null
          user_id: string | null
        }
        Insert: {
          companies_id?: string | null
          created_at?: string
          id?: number
          lead_id?: number | null
          remoteJid?: string | null
          user_id?: string | null
        }
        Update: {
          companies_id?: string | null
          created_at?: string
          id?: number
          lead_id?: number | null
          remoteJid?: string | null
          user_id?: string | null
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
        ]
      }
      whats_mensagens_conversa: {
        Row: {
          created_at: string
          id: number
          lead_id: number | null
          mensagem: string | null
          midia_url: string | null
          sender: string | null
          status: Database["public"]["Enums"]["enum_status_mensagem"] | null
          tipo: string | null
          whats_conversa_id: number | null
        }
        Insert: {
          created_at?: string
          id?: number
          lead_id?: number | null
          mensagem?: string | null
          midia_url?: string | null
          sender?: string | null
          status?: Database["public"]["Enums"]["enum_status_mensagem"] | null
          tipo?: string | null
          whats_conversa_id?: number | null
        }
        Update: {
          created_at?: string
          id?: number
          lead_id?: number | null
          mensagem?: string | null
          midia_url?: string | null
          sender?: string | null
          status?: Database["public"]["Enums"]["enum_status_mensagem"] | null
          tipo?: string | null
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
          id: string
          instance_id: string | null
          instance_name: string | null
          is_connected: boolean | null
          last_connected_at: string | null
          phone_number: string | null
          provider: Database["public"]["Enums"]["enum_whatsapp_provider"]
          qr_code_url: string | null
          remoteJid: string | null
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
          id?: string
          instance_id?: string | null
          instance_name?: string | null
          is_connected?: boolean | null
          last_connected_at?: string | null
          phone_number?: string | null
          provider?: Database["public"]["Enums"]["enum_whatsapp_provider"]
          qr_code_url?: string | null
          remoteJid?: string | null
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
          id?: string
          instance_id?: string | null
          instance_name?: string | null
          is_connected?: boolean | null
          last_connected_at?: string | null
          phone_number?: string | null
          provider?: Database["public"]["Enums"]["enum_whatsapp_provider"]
          qr_code_url?: string | null
          remoteJid?: string | null
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
      current_company_id: { Args: never; Returns: string }
      get_current_user_profile: { Args: never; Returns: Json }
      empresas_vencem_hoje: {
        Args: never
        Returns: {
          companie_id: string
        }[]
      }
      increment_follows_enviados: {
        Args: { p_lead_id: number }
        Returns: number
      }
      is_owner_of_company: { Args: { c_id: string }; Returns: boolean }
    }
    Enums: {
      enum_notification:
        | "mensagem"
        | "lead"
        | "agenda"
        | "alerta"
        | "atencao"
        | "pagamento"
      enum_status_agenda: "Confirmado" | "Pendente" | "Cancelado"
      enum_status_mensagem: "Recebida" | "Enviada"
      enum_status_pgto: "Pendente" | "Paga" | "Cancelada" | "Vencida"
      enum_status_user: "Ativo" | "Bloqueado" | "Desativado"
      enum_tipo_lembretes: "Agendamento" | "Confirmação"
      enum_tipo_pgto: "Pix" | "Cartao" | "Boleto"
      enum_tipo_user: "OWNER" | "EMPLOYEE" | "VIEWER"
      enum_whatsapp_provider: "evolution" | "cloud_api"
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
      ],
      enum_status_agenda: ["Confirmado", "Pendente", "Cancelado"],
      enum_status_mensagem: ["Recebida", "Enviada"],
      enum_status_pgto: ["Pendente", "Paga", "Cancelada", "Vencida"],
      enum_status_user: ["Ativo", "Bloqueado", "Desativado"],
      enum_tipo_lembretes: ["Agendamento", "Confirmação"],
      enum_tipo_pgto: ["Pix", "Cartao", "Boleto"],
      enum_tipo_user: ["OWNER", "EMPLOYEE", "VIEWER"],
      enum_whatsapp_provider: ["evolution", "cloud_api"],
      status_bot: ["Online", "Ausente", "Offline"],
    },
  },
} as const
