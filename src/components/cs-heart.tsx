import type { SVGProps } from 'react';

/** Pequeno easter egg CS, desenhado em SVG para continuar nítido no celular. */
export function CsHeart({className='',...props}:SVGProps<SVGSVGElement>){
 return <svg
  aria-hidden="true" focusable="false" viewBox="0 0 32 30"
  width="16" height="15" className={className} {...props}
 >
  <path d="M16 27.2 4.2 16.1C-2 10 2.1 1.4 9.1 2.2c3.1.3 5.4 2.1 6.9 4.1 1.5-2 3.8-3.8 6.9-4.1 7-.8 11.1 7.8 4.9 13.9L16 27.2Z" fill="#e45369" stroke="#ff93a4" strokeWidth="1.2"/>
  <text x="16" y="17.1" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="9.1" fontWeight="900" letterSpacing="-.8" fill="#fff">CS</text>
 </svg>;
}
