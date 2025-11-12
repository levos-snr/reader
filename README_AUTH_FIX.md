# Auth Timeout Fix Guide

## Problem
Better Auth adapter queries (`adapter:findOne`, `adapter:create`) are timing out after 1 second during sign-in/sign-up.

## Root Cause
The Better Auth component's internal queries are hitting Convex's 1-second query timeout limit. This is likely due to:
1. Slow database queries
2. Network latency
3. Missing indexes on Better Auth's internal tables (which we can't modify directly)

## Solutions Applied

### 1. Optimized Better Auth Configuration
- Added session optimization settings
- Configured password requirements
- Improved error handling

### 2. Enhanced Error Handling
- Added try-catch blocks in auth route handler
- Better error messages for debugging
- Graceful error responses

### 3. Code Optimizations
- Fixed helper functions in `users.ts`
- Optimized auth queries to use indexes

## Additional Steps to Fix Timeouts

### Option 1: Check Convex Dashboard
1. Go to your Convex dashboard
2. Check if there are any slow queries
3. Look for Better Auth tables and check their indexes

### Option 2: Restart Convex Dev Server
Sometimes the dev server gets into a bad state:
```bash
# Stop the dev server (Ctrl+C)
# Then restart
bun run dev
```

### Option 3: Clear Convex Cache
```bash
# Delete .convex directory and restart
rm -rf .convex
bun run dev
```

### Option 4: Check Network Connection
- Ensure stable internet connection
- Check if Convex backend is accessible
- Verify no firewall blocking connections

### Option 5: Update Better Auth Package
```bash
bun update @convex-dev/better-auth better-auth
```

### Option 6: Check Environment Variables
Make sure these are set:
- `BETTER_AUTH_SECRET`
- `NEXT_PUBLIC_SITE_URL` or `NEXT_PUBLIC_CONVEX_URL`

## Testing
After applying fixes, test:
1. Sign up with a new account
2. Sign in with existing account
3. Check console for any errors

## If Timeouts Persist
The issue might be with the Better Auth package itself or Convex backend performance. Consider:
1. Opening an issue with `@convex-dev/better-auth`
2. Checking Convex status page
3. Using a different auth solution temporarily

