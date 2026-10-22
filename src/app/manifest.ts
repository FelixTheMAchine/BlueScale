import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
 return {
  name: 'BlueScale — Escalas da Atlética',
  short_name: 'BlueScale',
  description: 'Organize pessoas, eventos e escalas de forma simples pelo celular.',
  start_url: '/',
  scope: '/',
  id: '/',
  display: 'standalone',
  background_color: '#0b1120',
  theme_color: '#0e1b33',
  lang: 'pt-BR',
  icons: [
   {src:'/icons/blue-192.png',sizes:'192x192',type:'image/png',purpose:'any'},
   {src:'/icons/blue-512.png',sizes:'512x512',type:'image/png',purpose:'any'},
   {src:'/icons/blue-maskable-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'},
  ]
 };
}
