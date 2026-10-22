import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Shell } from '@/components/shell';
import { PwaRegister } from '@/components/pwa-register';

export const metadata: Metadata = {
 title:'BlueScale | Escalas inteligentes',
 description:'Gestão inteligente de pessoas e escalas para eventos universitários',
 applicationName:'BlueScale',
 appleWebApp:{capable:true,title:'BlueScale',statusBarStyle:'black-translucent'},
 icons:{apple:'/icons/blue-apple.png'}
};
export const viewport: Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#0e1b33'};

export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="pt-BR"><body><PwaRegister/><Shell>{children}</Shell></body></html>;
}
