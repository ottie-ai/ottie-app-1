#!/usr/bin/env node

/**
 * Check trigger and function via SQL queries
 * Requires service role key for admin access
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env.local
const envPath = join(__dirname, '..', '.env.local')
let envContent = ''
try {
  envContent = readFileSync(envPath, 'utf-8')
} catch (e) {
  console.error('❌ Could not read .env.local file')
  process.exit(1)
}

const getEnvVar = (name) => {
  const match = envContent.match(new RegExp(`^${name}=(.+)$`, 'm'))
  return match ? match[1].trim() : null
}

const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL')
// Try service role key first (bypasses RLS), fallback to publishable key
const supabaseKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY') || 
                    getEnvVar('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  console.log('🔍 Checking Supabase trigger and function...\n')

  // Check function via SQL
  console.log('1. Checking function handle_new_profile...')
  let funcData = null
  let funcError = null
  try {
    const result = await supabase.rpc('exec_sql', {
      query: `
        SELECT 
          proname as function_name,
          pronargs as num_args,
          prorettype::regtype as return_type
        FROM pg_proc 
        WHERE proname = 'handle_new_profile';
      `
    })
    funcData = result.data
    funcError = result.error
  } catch (e) {
    funcError = { message: 'RPC not available' }
  }

  if (funcError) {
    console.log('   ⚠️  Cannot check via RPC (this is normal)')
    console.log('   💡 Check manually in Supabase SQL Editor:')
    console.log('      SELECT * FROM pg_proc WHERE proname = \'handle_new_profile\';')
  } else if (funcData && funcData.length > 0) {
    console.log('   ✅ Function exists:', funcData[0])
  } else {
    console.log('   ❌ Function does NOT exist')
  }

  // Check trigger
  console.log('\n2. Checking trigger on_profile_created...')
  let triggerData = null
  let triggerError = null
  try {
    const result = await supabase.rpc('exec_sql', {
      query: `
        SELECT 
          tgname as trigger_name,
          tgrelid::regclass as table_name,
          tgenabled as enabled
        FROM pg_trigger 
        WHERE tgname = 'on_profile_created';
      `
    })
    triggerData = result.data
    triggerError = result.error
  } catch (e) {
    triggerError = { message: 'RPC not available' }
  }

  if (triggerError) {
    console.log('   ⚠️  Cannot check via RPC (this is normal)')
    console.log('   💡 Check manually in Supabase SQL Editor:')
    console.log('      SELECT * FROM pg_trigger WHERE tgname = \'on_profile_created\';')
  } else if (triggerData && triggerData.length > 0) {
    console.log('   ✅ Trigger exists:', triggerData[0])
  } else {
    console.log('   ❌ Trigger does NOT exist')
  }

  // Check RLS policies
  console.log('\n3. Checking RLS policies...')
  let wsPolicies = null
  let wsPolError = null
  try {
    const result = await supabase.rpc('exec_sql', {
      query: `
        SELECT policyname, cmd 
        FROM pg_policies 
        WHERE tablename = 'workspaces'
        ORDER BY cmd, policyname;
      `
    })
    wsPolicies = result.data
    wsPolError = result.error
  } catch (e) {
    wsPolError = { message: 'RPC not available' }
  }

  if (wsPolError) {
    console.log('   ⚠️  Cannot check via RPC')
    console.log('   💡 Check manually: SELECT * FROM pg_policies WHERE tablename = \'workspaces\';')
  } else if (wsPolicies) {
    console.log('   ✅ Workspaces policies:')
    wsPolicies.forEach(p => {
      console.log(`      - ${p.policyname} (${p.cmd})`)
    })
  }

  let memPolicies = null
  let memPolError = null
  try {
    const result = await supabase.rpc('exec_sql', {
      query: `
        SELECT policyname, cmd 
        FROM pg_policies 
        WHERE tablename = 'memberships'
        ORDER BY cmd, policyname;
      `
    })
    memPolicies = result.data
    memPolError = result.error
  } catch (e) {
    memPolError = { message: 'RPC not available' }
  }

  if (memPolError) {
    console.log('   ⚠️  Cannot check via RPC')
  } else if (memPolicies) {
    console.log('   ✅ Memberships policies:')
    memPolicies.forEach(p => {
      console.log(`      - ${p.policyname} (${p.cmd})`)
    })
  }

  // Check actual data
  console.log('\n4. Checking actual data (with RLS)...')
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .limit(10)

  if (pErr) {
    console.log('   ❌ Error accessing profiles:', pErr.message)
    if (pErr.message.includes('permission') || pErr.message.includes('policy')) {
      console.log('   💡 This is expected - RLS is blocking access')
      console.log('   💡 Add SUPABASE_SERVICE_ROLE_KEY to .env.local for admin access')
    }
  } else {
    console.log(`   ✅ Found ${profiles?.length || 0} profiles`)
  }

  const { data: workspaces, error: wErr } = await supabase
    .from('workspaces')
    .select('id, name, plan')
    .limit(10)

  if (wErr) {
    console.log('   ❌ Error accessing workspaces:', wErr.message)
  } else {
    console.log(`   ✅ Found ${workspaces?.length || 0} workspaces`)
  }

  console.log('\n✅ Check completed!')
  console.log('\n💡 For full diagnostics, run SQL queries directly in Supabase SQL Editor')
  console.log('💡 Or add SUPABASE_SERVICE_ROLE_KEY to .env.local for admin access')
}

main().catch(console.error)

