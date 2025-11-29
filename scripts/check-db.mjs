#!/usr/bin/env node

/**
 * Simple script to check Supabase database
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
const supabaseKey = getEnvVar('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  console.log('🔍 Checking Supabase database...\n')

  // Check users and workspaces
  console.log('1. Checking profiles and memberships...')
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .limit(100)

  if (pErr) {
    console.log('   ❌ Error:', pErr.message)
    return
  }

  const { data: memberships, error: mErr } = await supabase
    .from('memberships')
    .select('user_id, role')
    .limit(1000)

  if (mErr) {
    console.log('   ❌ Error:', mErr.message)
    return
  }

  const userIdsWithWorkspace = new Set(memberships?.map(m => m.user_id) || [])
  const usersWithoutWorkspace = profiles?.filter(p => !userIdsWithWorkspace.has(p.id)) || []

  console.log(`   ✅ Total profiles: ${profiles?.length || 0}`)
  console.log(`   ✅ Profiles with workspace: ${userIdsWithWorkspace.size}`)
  console.log(`   ${usersWithoutWorkspace.length > 0 ? '⚠️' : '✅'} Profiles WITHOUT workspace: ${usersWithoutWorkspace.length}`)

  if (usersWithoutWorkspace.length > 0) {
    console.log('\n   Users without workspace:')
    usersWithoutWorkspace.slice(0, 10).forEach(user => {
      console.log(`     - ${user.email || user.id} (${user.full_name || 'no name'})`)
    })
  }

  // Check workspaces
  console.log('\n2. Checking workspaces...')
  const { data: workspaces, error: wErr } = await supabase
    .from('workspaces')
    .select('id, name, plan')
    .limit(10)

  if (wErr) {
    console.log('   ❌ Error:', wErr.message)
  } else {
    console.log(`   ✅ Total workspaces: ${workspaces?.length || 0}`)
    if (workspaces && workspaces.length > 0) {
      console.log('   Sample workspaces:')
      workspaces.slice(0, 5).forEach(ws => {
        console.log(`     - ${ws.name} (plan: ${ws.plan || 'null'})`)
      })
    }
  }

  console.log('\n✅ Check completed!')
  console.log('\n💡 To fix missing workspaces, run: supabase/fix-workspace-trigger-only.sql in Supabase SQL Editor')
}

main().catch(console.error)

