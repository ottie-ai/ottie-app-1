#!/bin/bash

# Simple script to check Supabase configuration
# Usage: ./scripts/check-supabase.sh

echo "🔍 Supabase Database Check"
echo "=========================="
echo ""

echo "📋 Available scripts:"
echo "  1. SQL Diagnostics: supabase/check-trigger-status.sql"
echo "     → Run this in Supabase SQL Editor for full diagnostics"
echo ""
echo "  2. Data Check: node scripts/check-db.mjs"
echo "     → Checks profiles and workspaces (respects RLS)"
echo ""
echo "  3. Fix Script: supabase/fix-workspace-trigger-only.sql"
echo "     → Run this in Supabase SQL Editor to create/fix trigger"
echo ""

echo "💡 To check trigger and function status:"
echo "   → Open Supabase Dashboard → SQL Editor"
echo "   → Run: supabase/check-trigger-status.sql"
echo ""

echo "💡 To fix workspace creation:"
echo "   → Open Supabase Dashboard → SQL Editor"
echo "   → Run: supabase/fix-workspace-trigger-only.sql"
echo ""

echo "✅ Supabase CLI version: $(supabase --version)"
echo ""

