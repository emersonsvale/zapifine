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
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },

  runtimeConfig: {
    metaAppSecret: process.env.META_APP_SECRET ?? '',
    public: {
      metaAppId: process.env.META_APP_ID ?? '',
      metaConfigId: process.env.META_CONFIG_ID ?? '',
      metaGraphVersion: process.env.META_GRAPH_VERSION ?? 'v20.0',
    },
  },

  supabase: {
    url: process.env.SUPABASE_URL || 'http://localhost:54321',
    key: process.env.SUPABASE_KEY || 'public-anon-key',
    redirect: true,
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/register', '/forgot-password', '/reset-password', '/confirm'],
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
