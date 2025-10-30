# Firebase Cloud Functions Setup Guide

This guide will help you set up Firebase Cloud Functions for automatic room cleanup in the banana app.

## What These Functions Do

1. **`cleanupEmptyRooms`** - Automatically deletes rooms when the last user leaves (unless marked as permanent)
2. **`cleanupStaleRooms`** - Runs hourly to delete rooms that have been inactive for 24+ hours

## Prerequisites

- Firebase CLI installed (`npm install -g firebase-tools`)
- Firebase project already set up (you have this)
- Billing enabled on Firebase (required for Cloud Functions)

## Step 1: Install Firebase CLI (if not already installed)

```bash
npm install -g firebase-tools
```

## Step 2: Login to Firebase

```bash
firebase login
```

This will open a browser window to authenticate with your Google account.

## Step 3: Initialize Firebase Functions

In your project directory (`C:\Users\what\Desktop\banana`):

```bash
firebase init functions
```

When prompted:
- **Select project**: Choose your existing project (banana-71ab3)
- **Language**: JavaScript
- **ESLint**: No (or Yes, your choice)
- **Install dependencies**: Yes

**IMPORTANT**: This will create a `functions` folder. You'll need to **replace** the generated files with the ones in `firebase-functions/` folder:

```bash
# After firebase init completes:
# Copy the files from firebase-functions/ to functions/
```

Or manually:
- Copy `firebase-functions/index.js` → `functions/index.js`
- Copy `firebase-functions/package.json` → `functions/package.json`

## Step 4: Install Dependencies

```bash
cd functions
npm install
cd ..
```

## Step 5: Deploy the Functions

```bash
firebase deploy --only functions
```

This will:
- Upload your functions to Firebase
- Set up the database trigger for `cleanupEmptyRooms`
- Schedule the hourly `cleanupStaleRooms` job

## Step 6: Verify Deployment

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (banana-71ab3)
3. Go to **Build** > **Functions**
4. You should see two functions:
   - `cleanupEmptyRooms` (Database trigger)
   - `cleanupStaleRooms` (Scheduled)

## How It Works

### Automatic Cleanup on Leave
When a user leaves a room:
1. Their user data is removed from `/rooms/{roomCode}/users/{userId}`
2. The `cleanupEmptyRooms` function is triggered
3. Function checks:
   - Is the room marked as `permanent: true`? → Skip deletion
   - Are there any users left? → Skip deletion
   - Otherwise → Delete the entire room

### Scheduled Cleanup (Hourly)
Every hour, the `cleanupStaleRooms` function:
1. Scans all rooms in the database
2. For each non-permanent room:
   - If empty → Delete it
   - If all users haven't been seen in 24+ hours → Delete it
3. Keeps permanent rooms forever

## Making a Room Permanent

To make a room permanent (like BATHROOM), you can either:

### Option 1: Via Firebase Console
1. Go to Firebase Console > Realtime Database > Data
2. Find the room (e.g., `/rooms/BATHROOM`)
3. Add or edit `/rooms/BATHROOM/metadata/permanent` = `true`

### Option 2: Via cleanup-rooms.html
The cleanup utility already marks BATHROOM as permanent.

### Option 3: Programmatically
```javascript
// In your app or a script
const db = firebase.database();
db.ref('rooms/BATHROOM/metadata').update({
  permanent: true
});
```

## Testing the Functions

### Test Automatic Cleanup
1. Create a test room with 1 user
2. Have that user leave the room
3. Check Firebase Console > Realtime Database
4. The room should disappear within a few seconds

### Test Scheduled Cleanup
You can manually trigger it:
```bash
firebase functions:shell
cleanupStaleRooms()
```

Or wait for the hourly schedule to run.

## Monitoring Functions

### View Logs
```bash
firebase functions:log
```

Or in Firebase Console:
- Go to **Build** > **Functions**
- Click on a function name
- Go to the **Logs** tab

### Check Usage
- Go to **Build** > **Functions** > **Usage** tab
- Monitor invocations, execution time, and memory usage

## Costs

Firebase Cloud Functions pricing (Blaze plan required):
- **Free tier**: 2 million invocations/month, 400K GB-seconds
- **Your usage**: Very minimal
  - `cleanupEmptyRooms`: Triggered only when users leave (maybe 10-100/day)
  - `cleanupStaleRooms`: 24 times/day = 720/month
  - **Total**: Well within free tier

**Estimated cost**: $0/month (stays in free tier)

## Upgrading to Blaze Plan

Cloud Functions require the Blaze (pay-as-you-go) plan:

1. Go to Firebase Console > Settings (gear icon) > Usage and billing
2. Click **Modify plan**
3. Select **Blaze plan**
4. Add a payment method
5. Set a budget alert (recommended: $5/month)

**Note**: You won't be charged unless you exceed the free tier limits, which is very unlikely for this usage.

## Troubleshooting

### "Billing account not configured"
- You need to upgrade to the Blaze plan (see above)

### "Permission denied"
- Make sure you're logged in: `firebase login`
- Check that you have owner/editor access to the Firebase project

### "Functions not deploying"
- Check syntax: `npm run lint` (if ESLint is enabled)
- Verify Node version: `node --version` (should be 18 or 16)
- Check logs: `firebase functions:log`

### "Room still not deleting"
- Check Firebase Console > Functions > Logs for errors
- Verify the function is deployed and active
- Ensure room has `permanent: false` (or no metadata)

## Alternative: Manual Cleanup Only

If you don't want to set up Cloud Functions, you can just use manual cleanup:

1. Use the `cleanup-rooms.html` tool periodically
2. Run it weekly/monthly to clean up empty rooms
3. Manually mark BATHROOM as permanent in Firebase Console

This approach:
- ✅ No billing required (stay on Spark plan)
- ✅ Simple, no server-side code
- ❌ Requires manual intervention
- ❌ Rooms accumulate between cleanups

## Summary

With Cloud Functions:
- ✅ Automatic cleanup when last user leaves
- ✅ Scheduled cleanup of stale rooms
- ✅ Permanent rooms protected from deletion
- ✅ No manual intervention needed
- ✅ Stays within free tier
- ⚠️ Requires Blaze plan (but free for your usage)

**Recommended**: Set up Cloud Functions for automatic room management!
