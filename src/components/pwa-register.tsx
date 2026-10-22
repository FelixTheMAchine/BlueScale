'use client';
import { useEffect } from 'react';

/** Only register offline fallback in production. Never cache authenticated data. */
export function PwaRegister(){
 useEffect(()=>{
  if(process.env.NODE_ENV!=='production'||!('serviceWorker' in navigator))return;
  void navigator.serviceWorker.register('/sw.js').catch(()=>{/* App continues online if SW fails. */});
 },[]);
 return null;
}
