// import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

// const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
// const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

// Deno.serve(async (req) => {
//   try {
//     // Create a Supabase client with the Admin key
//     const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
//     // Call the sync function
//     const { error } = await supabase.rpc('sync_all_users_to_leaderboard')
    
//     if (error) throw error
    
//     return new Response(
//       JSON.stringify({ success: true, message: 'Leaderboard synchronized successfully' }),
//       { headers: { 'Content-Type': 'application/json' } }
//     )
//   } catch (error) {
//     console.error('Sync error:', error)
//     return new Response(
//       JSON.stringify({ success: false, error: error.message }),
//       { status: 500, headers: { 'Content-Type': 'application/json' } }
//     )
//   }
// })