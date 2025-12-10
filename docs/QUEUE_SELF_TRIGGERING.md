# Self-Triggering Queue Worker

## 🎯 How It Works

The queue worker now uses **self-triggering** for continuous processing instead of fixed intervals.

### Flow:

```
Job 1 completes (15s) → Worker triggers itself → Job 2 starts immediately
Job 2 completes (30s) → Worker triggers itself → Job 3 starts immediately
Job 3 completes (2min) → Worker triggers itself → Job 4 starts immediately
...
Queue empty → Worker stops (no more self-triggers)
```

### Benefits:

✅ **No wasted time** - Next job starts immediately after previous completes
✅ **Dynamic processing** - Fast jobs (15s) don't wait for slow jobs (2min)
✅ **Efficient** - Queue clears as fast as possible
✅ **Fallback** - Cron still runs every minute as backup

## 🔧 Implementation Details

### Self-Triggering Logic

After each job completes (success or failure):

1. Check queue length
2. If jobs remain → Trigger next worker (non-blocking fetch)
3. If queue empty → Stop (log message)

### Code Location:

**`lib/queue/scrape-queue.ts`** - `processNextJob()` function:
- After successful completion: Checks queue and self-triggers
- After error: Also checks queue and self-triggers (ensures queue keeps processing)

### Fallback Mechanism:

**Vercel Cron** (`vercel.json`):
- Runs every minute
- **Smart check**: First checks queue length before processing
- Only processes if jobs exist in queue
- If queue is empty → skips processing (no unnecessary API calls)
- Safety net for edge cases (if self-trigger fails)

## 📊 Example Scenarios

### Scenario 1: Fast Jobs
```
Queue: [Job1, Job2, Job3]
Job1 (15s) → triggers Job2 → Job2 (20s) → triggers Job3 → Job3 (10s) → done
Total: 45s (vs 3 minutes with cron)
```

### Scenario 2: Mixed Speed
```
Queue: [Fast, Slow, Fast]
Fast (15s) → triggers Slow → Slow (2min) → triggers Fast → Fast (10s) → done
Total: 2m 25s (vs 3 minutes with cron)
```

### Scenario 3: Empty Queue
```
Job completes → checks queue → empty → stops
No unnecessary API calls
```

## 🛡️ Safety Features

1. **Non-blocking triggers** - Uses `fetch().catch()` so errors don't break processing
2. **Cron fallback** - If self-trigger fails, cron picks up after 1 minute
3. **Error handling** - Even failed jobs trigger next job (queue keeps moving)
4. **Queue check** - Only triggers if jobs exist (no infinite loops)

## 🧪 Testing

### Test Continuous Processing:

```bash
# Add 5 jobs quickly
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/generate-preview \
    -d '{"url": "https://example.com"}'
done

# Watch logs - should see:
# Job 1 completes → triggers Job 2
# Job 2 completes → triggers Job 3
# etc.
```

### Verify Self-Triggering:

Check logs for:
```
✅ [Queue Worker] Job xxx completed successfully
🔄 [Queue Worker] 3 job(s) remaining, triggering next worker...
🔵 [Worker API] Processing next job (self-triggering enabled)...
```

## 📝 Notes

- Self-triggering uses `NEXT_PUBLIC_APP_URL` environment variable
- In production, this should be your domain (e.g., `https://ottie.com`)
- In development, defaults to `http://localhost:3000`
- Cron is still active as fallback (runs every minute)
