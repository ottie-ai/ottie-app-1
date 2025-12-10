# Concurrent Queue Processing

## 🎯 Overview

The queue system now supports **concurrent processing** with configurable limit. Each job sends self-trigger immediately after completion (doesn't wait for other jobs).

## ⚙️ Configuration

### Environment Variable

```bash
MAX_CONCURRENT_SCRAPES=2  # Default: 2, upgrade to 50 when Firecrawl plan upgraded
```

- **Default**: 2 concurrent jobs
- **Upgrade**: Set to 50 when Firecrawl plan supports 50 concurrent scrapes
- **Location**: `.env.local` or Vercel Environment Variables

## 🔄 How It Works

### Concurrent Processing Flow:

```
Job 1 starts → Job 2 starts (if under limit)
  ↓              ↓
Job 1 completes (15s) → Self-trigger → Job 3 starts immediately
Job 2 completes (30s) → Self-trigger → Job 4 starts immediately
  ↓              ↓
Job 3 completes → Self-trigger → Job 5 starts
Job 4 completes → Self-trigger → Job 6 starts
...
```

### Key Features:

1. **Each job triggers next immediately** - Doesn't wait for other jobs
2. **Respects concurrent limit** - Won't exceed MAX_CONCURRENT_SCRAPES
3. **Self-triggering on error** - Even failed jobs trigger next job
4. **Smart cron** - Skips if jobs already processing

## 📊 Example Scenarios

### Scenario 1: 2 Concurrent Jobs (Default)

```
Queue: [Job1, Job2, Job3, Job4, Job5]
Limit: 2 concurrent

Time 0s:  Job1 starts, Job2 starts
Time 15s: Job1 completes → triggers Job3
Time 30s: Job2 completes → triggers Job4
Time 45s: Job3 completes → triggers Job5
Time 60s: Job4 completes → queue empty
Time 75s: Job5 completes → done

Total: ~75s (vs 5 minutes sequential)
```

### Scenario 2: 50 Concurrent Jobs (Upgraded)

```
Queue: 100 jobs
Limit: 50 concurrent

Time 0s:   Jobs 1-50 start
Time 15s:  Job1 completes → triggers Job51
Time 20s:  Job2 completes → triggers Job52
...
Time 30s:  Job50 completes → triggers Job100
Time 45s:  All 100 jobs done

Total: ~45s (vs 25 minutes sequential)
```

## 🛡️ Safety Features

### 1. Concurrent Limit Check

Before processing each job:
```typescript
if (stats.processingCount >= MAX_CONCURRENT_SCRAPES) {
  return { error: 'At concurrent limit' }
}
```

### 2. Self-Trigger Check

After each job completion:
```typescript
if (queueLength > 0 && processingCount < maxConcurrent) {
  // Trigger next worker
}
```

### 3. Smart Cron

Cron checks:
- Queue empty? → Skip
- Jobs processing? → Skip (self-triggering working)
- Queue has jobs but nothing processing? → Process (self-trigger failed)

## 🔧 Upgrading to 50 Concurrent

When upgrading Firecrawl plan:

1. **Set environment variable**:
   ```bash
   MAX_CONCURRENT_SCRAPES=50
   ```

2. **Deploy to Vercel**:
   - Add to Vercel Environment Variables
   - Redeploy

3. **Verify**:
   - Check logs for concurrent processing
   - Monitor queue stats: `GET /api/queue/process-scrape`

## 📝 Notes

- Each job is independent - doesn't wait for others
- Self-trigger happens immediately after completion
- Failed jobs also trigger next job (queue keeps moving)
- Cron is fallback only (runs every minute, skips if processing)
