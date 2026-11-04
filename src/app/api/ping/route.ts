import { NextResponse } from 'next/server';

// Lightweight, uncached liveness route for external HTTP monitors.
// Database health remains separately available at /api/health.
export const dynamic = 'force-dynamic';
export function GET(){
 return NextResponse.json({status:'alive'},{
  headers:{'Cache-Control':'no-store, max-age=0','X-Robots-Tag':'noindex'},
 });
}
