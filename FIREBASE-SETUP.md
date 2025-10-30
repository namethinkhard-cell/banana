# Firebase Setup Guide for Co-op Timer Feature

This guide will walk you through setting up Firebase for the Co-op Timer feature in the banana application.

## 🔥 Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Enter a project name (e.g., "banana-coop-timer")
4. Click **Continue**
5. (Optional) Disable Google Analytics or configure it
6. Click **Create project**
7. Wait for the project to be created, then click **Continue**

## 🔑 Step 2: Get Your Firebase Configuration

1. In the Firebase Console, click the **gear icon** (⚙️) next to "Project Overview"
2. Select **"Project settings"**
3. Scroll down to **"Your apps"** section
4. Click the **Web icon** (`</>`) to add a web app
5. Enter an app nickname (e.g., "banana-web-app")
6. **Do NOT** check "Firebase Hosting" (unless you plan to use it)
7. Click **"Register app"**
8. Copy the configuration object that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:..."
};
```

9. Open `src/utils/firebaseConfig.js` in the banana application
10. Replace the placeholder config with your actual configuration:

```javascript
window.FirebaseConfig = {
  config: {
    apiKey: "YOUR_ACTUAL_API_KEY",
    authDomain: "your-project.firebaseapp.com",
    databaseURL: "https://your-project-default-rtdb.firebaseio.com",
    projectId: "your-project",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:..."
  },
  // ... rest of the file
};
```

## 🔐 Step 3: Enable Authentication

1. In Firebase Console, go to **Build** > **Authentication**
2. Click **"Get started"**
3. Go to the **"Sign-in method"** tab
4. Find **"Anonymous"** in the list
5. Click on **"Anonymous"**
6. Toggle **"Enable"** to ON
7. Click **"Save"**

## 💾 Step 4: Create Realtime Database

1. In Firebase Console, go to **Build** > **Realtime Database**
2. Click **"Create Database"**
3. Select a location (choose closest to your users)
4. **Start in TEST MODE** (we'll secure it in the next step)
5. Click **"Enable"**

## 🛡️ Step 5: Set Up Security Rules (CRITICAL!)

This is the **most important step** for security!

1. In the Realtime Database section, go to the **"Rules"** tab
2. Replace the default rules with the following secure rules:

```json
{
  "rules": {
    "rooms": {
      "$roomCode": {
        ".read": "auth != null",
        ".write": false,
        "goal": {
          ".read": "auth != null",
          ".write": "auth != null",
          ".validate": "newData.isNumber() && newData.val() > 0"
        },
        "users": {
          "$userId": {
            ".read": "auth != null",
            ".write": "auth != null && auth.uid === $userId",
            ".validate": "newData.hasChildren(['name', 'timerRunning', 'timerPaused', 'baseSeconds', 'lastUpdate', 'joinedAt', 'lastSeen'])",
            "name": {
              ".validate": "newData.isString() && newData.val().length > 0 && newData.val().length <= 30"
            },
            "timerRunning": {
              ".validate": "newData.isBoolean()"
            },
            "timerPaused": {
              ".validate": "newData.isBoolean()"
            },
            "baseSeconds": {
              ".validate": "newData.isNumber() && newData.val() >= 0"
            },
            "startedAt": {
              ".validate": "newData.isNumber() || newData.val() === '.sv' || newData.val() === null"
            },
            "lastUpdate": {
              ".validate": "newData.isNumber() || newData.val() === '.sv'"
            },
            "joinedAt": {
              ".validate": "newData.isNumber() || newData.val() === '.sv'"
            },
            "lastSeen": {
              ".validate": "newData.isNumber() || newData.val() === '.sv'"
            },
            "$other": {
              ".validate": false
            }
          }
        },
        "$other": {
          ".validate": false
        }
      }
    },
    "$other": {
      ".validate": false
    }
  }
}
```

3. Click **"Publish"**
4. Confirm the changes

### What These Rules Do:

- ✅ **Authentication Required**: Only authenticated users can read/write
- ✅ **User Isolation**: Users can only modify their own data
- ✅ **Schema Validation**: Enforces correct data structure
- ✅ **Data Type Validation**: Ensures names are strings, timers are numbers, etc.
- ✅ **Length Limits**: Username max 30 characters
- ✅ **No Extra Fields**: Prevents adding unauthorized fields
- ✅ **Read-Only Room Codes**: Users can't modify room metadata

## ⚡ Step 6: (Optional) Set Up Usage Limits

To prevent abuse and unexpected costs:

1. Go to **Build** > **Realtime Database** > **Usage** tab
2. Set up billing alerts in Google Cloud Console
3. Consider setting up **App Check** for additional security:
   - Go to **Build** > **App Check**
   - Register your web app
   - This prevents requests from non-app sources

## 🧪 Step 7: Test Your Setup

1. Open the banana application
2. Go to the **Co-op** tab
3. Enter a username
4. Click **"Create New Room"**
5. If successful, you'll see:
   - A room code generated
   - Your user listed in "Active Users"
   - Your timer syncing

### Troubleshooting

**"Firebase not loaded"**
- Check that index.html includes Firebase CDN scripts

**"Firebase configuration not found"**
- Verify you updated `src/utils/firebaseConfig.js` with your actual config

**"Permission denied"**
- Check that Authentication > Anonymous is enabled
- Verify Security Rules are published correctly
- Make sure you're signed in (happens automatically)

**"Room not found"**
- Room codes are case-sensitive and 8 characters
- Rooms are deleted when all users leave

## 📊 Monitoring Usage

1. Go to **Build** > **Realtime Database** > **Usage**
2. Monitor:
   - Concurrent connections
   - Data downloaded
   - Data stored
3. Firebase Spark (free) plan limits:
   - 100 concurrent connections
   - 1 GB stored
   - 10 GB/month downloaded
4. Set up billing alerts to avoid surprises

## 🔒 Security Best Practices

✅ **DO:**
- Keep your Security Rules strict
- Monitor usage regularly
- Use App Check in production
- Set billing alerts
- Update Firebase SDK regularly

❌ **DON'T:**
- Share your Firebase config publicly (it's designed to be in client code, but keep the project private)
- Disable authentication
- Use test mode rules in production
- Allow writes without validation
- Store sensitive data in Realtime Database

## 📚 Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Realtime Database Security Rules](https://firebase.google.com/docs/database/security)
- [Firebase Pricing](https://firebase.google.com/pricing)
- [App Check Setup](https://firebase.google.com/docs/app-check)

## 🆘 Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify all steps in this guide
3. Check Firebase Console > Realtime Database > Data to see if data is being written
4. Test with Firebase Console > Realtime Database > Rules playground

---

**You're all set!** The Co-op Timer feature is now ready to use. Share room codes with friends and sync your work timers in real-time! 🎉
