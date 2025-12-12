// Supabase Edge Function for pdf_projects table
// Deploy this to: supabase/functions/pdf_projects/index.ts

import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_KEY') ?? '',
      { 
        global: { 
          headers: { Authorization: req.headers.get('Authorization')! } 
        } 
      }
    )

    const method = req.method

    // GET - List or get project(s)
    if (method === 'GET') {
      const url = new URL(req.url)
      const id = url.searchParams.get('id')
      const limit = url.searchParams.get('limit') || '100'
      const status = url.searchParams.get('status')
      const offset = url.searchParams.get('offset') || '0'

      let query = supabase
        .from('pdf_projects')
        .select('*')
        .order('updated_at', { ascending: false })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)

      // Filter by ID if provided
      if (id) {
        query = query.eq('id', id).single()
      }

      // Filter by status if provided
      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query

      if (error) throw error

      return new Response(JSON.stringify({ data, error: null }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        status: 200,
      })
    }

    // POST - Create, update, or delete (action-based)
    if (method === 'POST') {
      const body = await req.json()
      const action = body.action // 'create', 'update', or 'delete'
      const id = body.id
      const data = body.data

      // CREATE
      if (action === 'create') {
        const { data: created, error } = await supabase
          .from('pdf_projects')
          .insert([data])
          .select()
          .single()

        if (error) throw error

        return new Response(JSON.stringify({ data: created, error: null }), {
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          status: 201,
        })
      }

      // UPDATE
      if (action === 'update') {
        if (!id) {
          return new Response(
            JSON.stringify({ error: 'ID required for update' }), 
            { 
              status: 400,
              headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              }
            }
          )
        }

        const { data: updated, error } = await supabase
          .from('pdf_projects')
          .update(data)
          .eq('id', id)
          .select()
          .single()

        if (error) throw error

        return new Response(JSON.stringify({ data: updated, error: null }), {
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          status: 200,
        })
      }

      // DELETE
      if (action === 'delete') {
        if (!id) {
          return new Response(
            JSON.stringify({ error: 'ID required for delete' }), 
            { 
              status: 400,
              headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              }
            }
          )
        }

        const { error } = await supabase
          .from('pdf_projects')
          .delete()
          .eq('id', id)

        if (error) throw error

        return new Response(JSON.stringify({ data: { deleted: true }, error: null }), {
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          status: 200,
        })
      }

      return new Response(
        JSON.stringify({ error: 'Invalid action. Use: create, update, or delete' }), 
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }), 
      { 
        status: 405,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )

  } catch (err) {
    console.error('Edge Function Error:', err)
    return new Response(
      JSON.stringify({ 
        error: err?.message ?? 'Internal server error',
        data: null 
      }), 
      {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        status: 500 
      }
    )
  }
})
