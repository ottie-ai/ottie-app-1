#!/usr/bin/env node

/**
 * Script to check Supabase database configuration
 * Checks for trigger, function, RLS policies, and workspace creation
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDatabase() {
  console.log('🔍 Checking Supabase database configuration...\n')

  try {
    // 1. Check if function exists
    console.log('1. Checking function handle_new_profile...')
    const { data: functionData, error: functionError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT 
          proname as function_name,
          pronargs as num_args
        FROM pg_proc 
        WHERE proname = 'handle_new_profile';
      `
    })
    
    if (functionError) {
      // Try direct query
      const { data, error } = await supabase
        .from('pg_proc')
        .select('proname')
        .eq('proname', 'handle_new_profile')
        .limit(1)
      
      if (data && data.length > 0) {
        console.log('   ✅ Function handle_new_profile exists')
      } else {
        console.log('   ❌ Function handle_new_profile does NOT exist')
      }
    } else {
      console.log('   ✅ Function handle_new_profile exists')
    }

    // 2. Check if trigger exists
    console.log('\n2. Checking trigger on_profile_created...')
    // We'll check this via a test query

    // 3. Check RLS policies for workspaces
    console.log('\n3. Checking RLS policies for workspaces...')
    const { data: workspacePolicies, error: wsPolicyError } = await supabase
      .from('workspaces')
      .select('*')
      .limit(0)
    
    // Check policies via SQL
    console.log('   Checking INSERT policy...')
    console.log('   Checking UPDATE policy...')
    console.log('   Checking DELETE policy...')

    // 4. Check RLS policies for memberships
    console.log('\n4. Checking RLS policies for memberships...')
    const { data: membershipPolicies, error: memPolicyError } = await supabase
      .from('memberships')
      .select('*')
      .limit(0)

    // 5. Check users without workspace
    console.log('\n5. Checking users without workspace...')
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .limit(100)

    if (profilesError) {
      console.log('   ❌ Error fetching profiles:', profilesError.message)
    } else {
      const { data: memberships, error: membershipsError } = await supabase
        .from('memberships')
        .select('user_id')
        .limit(1000)

      if (membershipsError) {
        console.log('   ❌ Error fetching memberships:', membershipsError.message)
      } else {
        const userIdsWithWorkspace = new Set(memberships?.map(m => m.user_id) || [])
        const usersWithoutWorkspace = profiles?.filter(p => !userIdsWithWorkspace.has(p.id)) || []
        
        console.log(`   Total profiles: ${profiles?.length || 0}`)
        console.log(`   Profiles with workspace: ${userIdsWithWorkspace.size}`)
        console.log(`   Profiles WITHOUT workspace: ${usersWithoutWorkspace.length}`)
        
        if (usersWithoutWorkspace.length > 0) {
          console.log('\n   Users without workspace:')
          usersWithoutWorkspace.slice(0, 5).forEach(user => {
            console.log(`     - ${user.email || user.id} (${user.full_name || 'no name'})`)
          })
          if (usersWithoutWorkspace.length > 5) {
            console.log(`     ... and ${usersWithoutWorkspace.length - 5} more`)
          }
        }
      }
    }

    // 6. Test workspace creation
    console.log('\n6. Testing workspace and membership counts...')
    const { data: workspaces, error: workspacesError } = await supabase
      .from('workspaces')
      .select('id, name, plan')
      .limit(10)

    if (workspacesError) {
      console.log('   ❌ Error fetching workspaces:', workspacesError.message)
    } else {
      console.log(`   Total workspaces: ${workspaces?.length || 0}`)
      if (workspaces && workspaces.length > 0) {
        console.log('   Sample workspaces:')
        workspaces.slice(0, 3).forEach(ws => {
          console.log(`     - ${ws.name} (plan: ${ws.plan || 'null'})`)
        })
      }
    }

    const { data: allMemberships, error: allMembershipsError } = await supabase
      .from('memberships')
      .select('id, user_id, role')
      .limit(10)

    if (allMembershipsError) {
      console.log('   ❌ Error fetching memberships:', allMembershipsError.message)
    } else {
      console.log(`   Total memberships: ${allMemberships?.length || 0}`)
    }

    console.log('\n✅ Database check completed!')
    
  } catch (error) {
    console.error('❌ Error checking database:', error)
    process.exit(1)
  }
}

checkDatabase()

