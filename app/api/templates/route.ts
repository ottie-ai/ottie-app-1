// API route for template operations

import { NextResponse } from 'next/server'
import { templates } from '@/lib/templates/config'

export async function GET() {
  return NextResponse.json({ templates })
}

