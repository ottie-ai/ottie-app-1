'use client'

import { useState, useEffect } from 'react'
import { useAuth } from './use-auth'
import { createClient } from '@/lib/supabase/client'
import type { Workspace, Membership } from '@/types/database'

/**
 * Hook to fetch and cache current user's workspace
 * Returns workspace data or null if not found
 */
export function useWorkspace() {
  const { user } = useAuth()
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadWorkspace() {
      if (!user?.id) {
        setWorkspace(null)
        setLoading(false)
        return
      }

      try {
        const supabase = createClient()
        
        // Check if user has a preferred workspace in localStorage
        let preferredWorkspaceId: string | null = null
        if (typeof window !== 'undefined') {
          preferredWorkspaceId = localStorage.getItem('current_workspace_id')
        }
        
        let query = supabase
          .from('memberships')
          .select(`
            *,
            workspace:workspaces!inner(*)
          `)
          .eq('user_id', user.id)
          .is('workspace.deleted_at', null)
        
        // If preferred workspace ID exists, try to load it first
        if (preferredWorkspaceId) {
          query = query.eq('workspace_id', preferredWorkspaceId)
        }
        
        const { data: membership, error: membershipError } = await query
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        // If preferred workspace not found, fall back to most recent
        if (membershipError || !membership || !membership.workspace) {
          if (preferredWorkspaceId) {
            // Try again without the preferred workspace filter
            const { data: fallbackMembership, error: fallbackError } = await supabase
              .from('memberships')
              .select(`
                *,
                workspace:workspaces!inner(*)
              `)
              .eq('user_id', user.id)
              .is('workspace.deleted_at', null)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
            
            if (fallbackError) {
              console.error('Error fetching user workspace:', fallbackError)
              setWorkspace(null)
            } else if (fallbackMembership && fallbackMembership.workspace) {
              setWorkspace(fallbackMembership.workspace as Workspace)
              // Update localStorage with the actual workspace
              if (typeof window !== 'undefined') {
                localStorage.setItem('current_workspace_id', fallbackMembership.workspace.id)
              }
            } else {
              setWorkspace(null)
            }
          } else {
            console.error('Error fetching user workspace:', membershipError)
            setWorkspace(null)
          }
        } else if (membership && membership.workspace) {
          setWorkspace(membership.workspace as Workspace)
          // Update localStorage with the current workspace
          if (typeof window !== 'undefined') {
            localStorage.setItem('current_workspace_id', membership.workspace.id)
          }
        } else {
          setWorkspace(null)
        }
      } catch (error) {
        console.error('Error loading workspace:', error)
        setWorkspace(null)
      } finally {
        setLoading(false)
      }
    }

    loadWorkspace()
  }, [user?.id])

  const refresh = async () => {
    if (!user?.id) {
      setWorkspace(null)
      return
    }

    try {
      const supabase = createClient()
      
      // Check if user has a preferred workspace in localStorage
      let preferredWorkspaceId: string | null = null
      if (typeof window !== 'undefined') {
        preferredWorkspaceId = localStorage.getItem('current_workspace_id')
      }
      
      let query = supabase
        .from('memberships')
        .select(`
          *,
          workspace:workspaces!inner(*)
        `)
        .eq('user_id', user.id)
        .is('workspace.deleted_at', null)
      
      // If preferred workspace ID exists, try to load it first
      if (preferredWorkspaceId) {
        query = query.eq('workspace_id', preferredWorkspaceId)
      }
      
      const { data: membership, error: membershipError } = await query
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // If preferred workspace not found, fall back to most recent
      if (membershipError || !membership || !membership.workspace) {
        if (preferredWorkspaceId) {
          // Try again without the preferred workspace filter
          const { data: fallbackMembership, error: fallbackError } = await supabase
            .from('memberships')
            .select(`
              *,
              workspace:workspaces!inner(*)
            `)
            .eq('user_id', user.id)
            .is('workspace.deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          
          if (fallbackError) {
            console.error('Error refreshing workspace:', fallbackError)
          } else if (fallbackMembership && fallbackMembership.workspace) {
            setWorkspace(fallbackMembership.workspace as Workspace)
            // Update localStorage with the actual workspace
            if (typeof window !== 'undefined') {
              localStorage.setItem('current_workspace_id', fallbackMembership.workspace.id)
            }
          } else {
            setWorkspace(null)
          }
        }
      } else if (membership && membership.workspace) {
        setWorkspace(membership.workspace as Workspace)
        // Update localStorage with the current workspace
        if (typeof window !== 'undefined') {
          localStorage.setItem('current_workspace_id', membership.workspace.id)
        }
      } else {
        setWorkspace(null)
      }
    } catch (error) {
      console.error('Error refreshing workspace:', error)
    }
  }

  return {
    workspace,
    loading,
    refresh,
  }
}

