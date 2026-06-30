import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-04-21',
  devtools: { enabled: true },

  modules: ['@nuxtjs/supabase', 'shadcn-nuxt'],

  css: ['~/assets/css/tailwind.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  components: [
    { path: '~/components/ui', pathPrefix: false },
    '~/components',
  ],

  shadcn: {
    prefix: '',
    componentDir: './app/components/ui',
  },

  app: {
    head: {
      title: 'Zapifine',
      htmlAttrs: { lang: 'pt-BR', class: 'dark' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content: 'Zapifine - Chatbot inteligente para WhatsApp que automatiza seu atendimento.',
        },
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/favicon.png' },
        { rel: 'manifest', href: '/manifest.webmanifest' },
      ],
    },
  },

  runtimeConfig: {
    metaAppSecret: process.env.META_APP_SECRET ?? '',
    googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    googleRedirectUri:
      process.env.GOOGLE_REDIRECT_URI
      ?? 'http://localhost:3000/api/google/oauth/callback',
    googleOauthStateSecret: process.env.GOOGLE_OAUTH_STATE_SECRET ?? '',
    evoApiUrl: process.env.EVO_API_URL ?? '',
    evoGlobalApiKey: process.env.EVO_GLOBAL_API_KEY ?? '',
    whatsApiInternalUrl: process.env.WHATS_API_INTERNAL_URL ?? process.env.WHATS_API_URL ?? 'https://whats.zapifine.com',
    whatsApiInternalSecret: process.env.WHATS_API_INTERNAL_SECRET ?? '',
    cronSecret: process.env.CRON_SECRET ?? '',
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? '',
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? '',
    vapidSubject: process.env.VAPID_SUBJECT ?? 'mailto:suporte@zapifine.com',
    public: {
      metaAppId: process.env.META_APP_ID ?? '',
      metaConfigId: process.env.META_CONFIG_ID ?? '',
      metaGraphVersion: process.env.META_GRAPH_VERSION ?? 'v20.0',
      whatsApiUrl: process.env.WHATS_API_URL ?? 'https://whats.zapifine.com',
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? '',
    },
  },

  supabase: {
    url: process.env.SUPABASE_URL || 'http://localhost:54321',
    key: process.env.SUPABASE_KEY || 'public-anon-key',
    redirect: true,
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/register', '/forgot-password', '/reset-password', '/confirm', '/agendamento/*'],
    },
    clientOptions: {
      global: {
        headers: {
          ...(process.env.SUPABASE_GW_SECRET
            ? { 'x-zapifine-gw': process.env.SUPABASE_GW_SECRET }
            : {}),
          // SSR fetches não carregam Origin automaticamente. Browsers ignoram
          // este header (é "forbidden"), então só impacta SSR em dev.
          ...(process.env.NODE_ENV !== 'production'
            ? { origin: 'http://localhost:3000' }
            : {}),
        },
      },
    },
  },

  typescript: {
    strict: true,
  },

  imports: {
    // Silencia warning "Duplicated imports useAppConfig" de
    // nitropack vs @nuxt/nitro-server. Unimport chama opts.warn(msg);
    // passando noop vira silencioso.
    warn: () => {},
  },

  nitro: {
    preset: 'node-server',
    imports: {
      warn: () => {},
    },
  },
})
