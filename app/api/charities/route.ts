import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Uses service role key — bypasses RLS entirely, always works
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('charities')
      .select('id, name, description, image_url, featured')
      .eq('active', true)
      .order('featured', { ascending: false })
      .order('name')

    if (error) {
      console.error('Charities API error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ charities: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
