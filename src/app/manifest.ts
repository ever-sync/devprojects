import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ReobotLabs Portal',
    short_name: 'Reobot',
    description: 'Portal interno e de clientes da ReobotLabs.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#020817',
    theme_color: '#0F766E',
    lang: 'pt-BR',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    shortcuts: [
      {
        name: 'Dashboard',
        short_name: 'Dashboard',
        url: '/dashboard',
      },
      {
        name: 'Projetos',
        short_name: 'Projetos',
        url: '/projects',
      },
      {
        name: 'Meu Dia',
        short_name: 'Meu Dia',
        url: '/my-day',
      },
    ],
  }
}
