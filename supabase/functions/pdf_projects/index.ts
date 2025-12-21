// Supabase Edge Function for pdf_projects table
// Copy this ENTIRE file and paste into Supabase Dashboard → Edge Functions → Create New Function

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  // CORS headers for all responses
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  }

  try {
    // Get Authorization header
    const authHeader = req.headers.get('Authorization')
    
    // Create Supabase client with extended timeout for large JSONB operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: authHeader ? { Authorization: authHeader } : {}
        },
        db: {
          schema: 'public'
        }
      }
    )

    // Set statement timeout to 120 seconds for large JSONB operations (31+ page flipbooks and larger documents)
    await supabase.rpc('set_config', {
      setting_name: 'statement_timeout',
      new_value: '120000',
      is_local: true
    }).catch(() => {
      // Fallback: execute raw SQL if RPC doesn't work
      return supabase.from('pdf_projects').select('id').limit(0)
    })

    const method = req.method

    // ============================================
    // GET - List or get project(s)
    // ============================================
    if (method === 'GET') {
      const url = new URL(req.url)
      const id = url.searchParams.get('id')
      const limit = parseInt(url.searchParams.get('limit') || '100')
      const status = url.searchParams.get('status')
      const offset = parseInt(url.searchParams.get('offset') || '0')

      let query = supabase
        .from('pdf_projects')
        .select('*')
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1)

      // Filter by ID if provided
      if (id) {
        query = query.eq('id', id).single()
      }

      // Filter by status if provided
      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query

      if (error) {
        console.error('GET Error:', error)
        return new Response(
          JSON.stringify({ data: null, error: error.message }),
          { headers: corsHeaders, status: 400 }
        )
      }

      return new Response(
        JSON.stringify({ data, error: null }),
        { headers: corsHeaders, status: 200 }
      )
    }

    // ============================================
    // POST - Create, update, or delete (action-based)
    // ============================================
    if (method === 'POST') {
      const body = await req.json()
      const action = body.action // 'create', 'update', or 'delete'
      const id = body.id
      const data = body.data

      // ----------------------------------------
      // CREATE
      // ----------------------------------------
      if (action === 'create') {
        const { data: created, error } = await supabase
          .from('pdf_projects')
          .insert([data])
          .select()
          .single()

        if (error) {
          console.error('CREATE Error:', error)
          return new Response(
            JSON.stringify({ data: null, error: error.message }),
            { headers: corsHeaders, status: 400 }
          )
        }

        return new Response(
          JSON.stringify({ data: created, error: null }),
          { headers: corsHeaders, status: 201 }
        )
      }

      // ----------------------------------------
      // UPDATE
      // ----------------------------------------
      if (action === 'update') {
        if (!id) {
          return new Response(
            JSON.stringify({ data: null, error: 'ID required for update' }),
            { headers: corsHeaders, status: 400 }
          )
        }

        const { data: updated, error } = await supabase
          .from('pdf_projects')
          .update(data)
          .eq('id', id)
          .select()
          .single()

        if (error) {
          console.error('UPDATE Error:', error)
          return new Response(
            JSON.stringify({ data: null, error: error.message }),
            { headers: corsHeaders, status: 400 }
          )
        }

        return new Response(
          JSON.stringify({ data: updated, error: null }),
          { headers: corsHeaders, status: 200 }
        )
      }

      // ----------------------------------------
      // DELETE
      // ----------------------------------------
      if (action === 'delete') {
        if (!id) {
          return new Response(
            JSON.stringify({ data: null, error: 'ID required for delete' }),
            { headers: corsHeaders, status: 400 }
          )
        }

        const { error } = await supabase
          .from('pdf_projects')
          .delete()
          .eq('id', id)

        if (error) {
          console.error('DELETE Error:', error)
          return new Response(
            JSON.stringify({ data: null, error: error.message }),
            { headers: corsHeaders, status: 400 }
          )
        }

        return new Response(
          JSON.stringify({ data: { deleted: true }, error: null }),
          { headers: corsHeaders, status: 200 }
        )
      }

      // Unknown action
      return new Response(
        JSON.stringify({ data: null, error: 'Invalid action. Use: create, update, or delete' }),
        { headers: corsHeaders, status: 400 }
      )
    }

    // Method not allowed
    return new Response(
      JSON.stringify({ data: null, error: 'Method not allowed' }),
      { headers: corsHeaders, status: 405 }
    )

  } catch (err) {
    console.error('Edge Function Error:', err)
    return new Response(
      JSON.stringify({
        data: null,
        error: err?.message ?? 'Internal server error'
      }),
      { headers: corsHeaders, status: 500 }
    )
  }
})
