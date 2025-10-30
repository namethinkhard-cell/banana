# Firebase Security Rules - Detailed Explanation

This document explains the security rules implemented for the Co-op Timer feature and how they protect your data.

## 📋 Complete Security Rules

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

## 🔍 Rule-by-Rule Breakdown

### 1. Root Level Protection

```json
"rooms": { ... },
"$other": { ".validate": false }
```

**What it does:**
- Only allows the `rooms` path
- Blocks all other paths at the root level
- Prevents unauthorized database structure

**Protects against:**
- ❌ Creating `/admin`, `/config`, or other paths
- ❌ Storing data outside the rooms structure

---

### 2. Room-Level Security

```json
"$roomCode": {
  ".read": "auth != null",
  ".write": false,
  ...
}
```

**What it does:**
- Allows reading room data only if authenticated
- Prevents direct room-level writes
- Room codes are dynamic (`$roomCode` variable)

**Protects against:**
- ❌ Unauthenticated users viewing rooms
- ❌ Deleting entire rooms
- ❌ Modifying room metadata

**Why `.write: false`?**
- Users can only write to their own user node
- Prevents malicious room deletion
- Room cleanup happens automatically when users disconnect

---

### 3. Room Goal Field

```json
"goal": {
  ".read": "auth != null",
  ".write": "auth != null",
  ".validate": "newData.isNumber() && newData.val() > 0"
}
```

**What it does:**
- Stores optional room goal in seconds
- Any authenticated user can read the goal
- Any authenticated user can write/update the goal
- Must be a positive number

**Protects against:**
- ❌ Non-numeric goal values
- ❌ Zero or negative goals
- ❌ Unauthenticated access

**Example:**
```
✅ Allowed: goal = 28800 (8 hours in seconds)
✅ Allowed: goal = 14400 (4 hours)
❌ Blocked: goal = -100 (negative)
❌ Blocked: goal = "8 hours" (string)
❌ Blocked: goal = 0 (zero)
```

**Note:** While any authenticated user in the room can technically set the goal, the application enforces that only the room host (first user) can modify it through UI controls.

---

### 4. User Data Access Control

```json
"$userId": {
  ".read": "auth != null",
  ".write": "auth != null && auth.uid === $userId",
  ...
}
```

**What it does:**
- Any authenticated user in the room can read all user data
- Users can only write to their own user ID
- `auth.uid` is provided by Firebase Authentication

**Protects against:**
- ❌ User impersonation (can't write as another user)
- ❌ Modifying other users' timers
- ❌ Deleting other users from the room

**Example:**
```
✅ Allowed: User ABC123 writes to /rooms/ROOM01/users/ABC123
❌ Blocked: User ABC123 writes to /rooms/ROOM01/users/XYZ789
```

---

### 5. Required Fields Validation

```json
".validate": "newData.hasChildren(['name', 'timerRunning', 'timerPaused', 'baseSeconds', 'lastUpdate', 'joinedAt'])"
```

**What it does:**
- Ensures all 6 required fields are present
- Rejects incomplete user data
- Note: `startedAt` is optional (can be null when timer is paused/stopped)

**Protects against:**
- ❌ Partial data writes
- ❌ Missing critical fields
- ❌ App breaking due to undefined values

**Example:**
```javascript
// ✅ Valid (timer running)
{
  name: "Alice",
  timerRunning: true,
  timerPaused: false,
  baseSeconds: 3600,
  startedAt: 1729567890,
  lastUpdate: 1234567890,
  joinedAt: 1234567890
}

// ✅ Valid (timer stopped)
{
  name: "Alice",
  timerRunning: false,
  timerPaused: false,
  baseSeconds: 3600,
  startedAt: null,
  lastUpdate: 1234567890,
  joinedAt: 1234567890
}

// ❌ Invalid (missing baseSeconds)
{
  name: "Alice",
  timerRunning: true,
  timerPaused: false,
  lastUpdate: 1234567890,
  joinedAt: 1234567890
}
```

---

### 6. Username Validation

```json
"name": {
  ".validate": "newData.isString() && newData.val().length > 0 && newData.val().length <= 30"
}
```

**What it does:**
- Must be a string
- Must not be empty
- Maximum 30 characters

**Protects against:**
- ❌ Empty usernames
- ❌ Excessively long usernames (database bloat)
- ❌ Non-string values (numbers, objects)
- ❌ XSS attempts via long strings

**Example:**
```javascript
// ✅ Valid
name: "Alice"
name: "Bob_123"
name: "User with spaces"

// ❌ Invalid
name: ""  // Empty
name: "A".repeat(100)  // Too long
name: 12345  // Not a string
name: { first: "Alice" }  // Not a string
```

---

### 7. Timer State Validation

```json
"timerRunning": {
  ".validate": "newData.isBoolean()"
}
```

**What it does:**
- Must be exactly `true` or `false`

**Protects against:**
- ❌ String values like `"true"` or `"false"`
- ❌ Numbers like `1` or `0`
- ❌ Null or undefined

---

### 8. Base Seconds Validation

```json
"baseSeconds": {
  ".validate": "newData.isNumber() && newData.val() >= 0"
}
```

**What it does:**
- Stores accumulated timer seconds
- Must be a number
- Must be non-negative

**Protects against:**
- ❌ Negative timer values
- ❌ String values like `"3600"`
- ❌ Extremely large numbers (JavaScript max safe integer applies)

**Example:**
```javascript
// ✅ Valid
baseSeconds: 0
baseSeconds: 3600
baseSeconds: 86400

// ❌ Invalid
baseSeconds: -100
baseSeconds: "3600"
baseSeconds: null
```

**How it works:**
- Timer stopped/paused: `baseSeconds` = total accumulated time
- Timer running: `baseSeconds` + time since `startedAt` = current time

---

### 9. Started Timestamp Validation

```json
"startedAt": {
  ".validate": "newData.isNumber() || newData.val() === '.sv' || newData.val() === null"
}
```

**What it does:**
- Accepts numbers (Unix timestamps)
- Accepts Firebase server value placeholder (`.sv`)
- Accepts `null` when timer is stopped/paused
- Used to calculate elapsed time client-side

**Why allow null?**
- Timer stopped: `startedAt` = `null`
- Timer paused: `startedAt` = `null`
- Timer running: `startedAt` = timestamp when started

**Protects against:**
- ❌ Invalid timestamp values
- ❌ Non-timestamp, non-null values

**Example:**
```javascript
// ✅ Valid (timer running)
startedAt: 1729567890

// ✅ Valid (timer stopped)
startedAt: null

// ✅ Valid (using server timestamp)
startedAt: firebase.database.ServerValue.TIMESTAMP

// ❌ Invalid
startedAt: "2024-10-21"
startedAt: true
```

---

### 10. Last Update & Joined Timestamp Validation

```json
"lastUpdate": {
  ".validate": "newData.isNumber() || newData.val() === '.sv'"
},
"joinedAt": {
  ".validate": "newData.isNumber() || newData.val() === '.sv'"
}
```

**What it does:**
- Accepts numbers (Unix timestamps)
- Accepts Firebase server value placeholder (`.sv`)
- Server value is replaced with server timestamp automatically

**Why allow both?**
- Initial write uses `firebase.database.ServerValue.TIMESTAMP` (`.sv`)
- Server replaces it with actual timestamp
- Updates can use the stored number

**Protects against:**
- ❌ Fake timestamps
- ❌ Non-timestamp values

---

### 11. Deny Unknown Fields

```json
"$other": {
  ".validate": false
}
```

**What it does:**
- Blocks any field not explicitly defined
- Applies at both user level and room level

**Protects against:**
- ❌ Adding extra fields like `admin: true`
- ❌ Storing arbitrary data
- ❌ Future injection attacks

**Example:**
```javascript
// ❌ Blocked - contains unauthorized field "admin"
{
  name: "Alice",
  timerRunning: true,
  timerPaused: false,
  baseSeconds: 0,
  startedAt: null,
  lastUpdate: 123456,
  joinedAt: 123456,
  admin: true  // ← This field is NOT allowed
}
```

---

## 🔐 Security Features Summary

| Feature | Protection Level | Description |
|---------|-----------------|-------------|
| Authentication Required | ✅ **High** | All access requires Firebase auth |
| User Isolation | ✅ **High** | Users can only modify their own data |
| Schema Validation | ✅ **High** | Enforces exact data structure |
| Type Checking | ✅ **Medium** | Validates data types for all fields |
| Length Limits | ✅ **Medium** | Prevents database bloat |
| No Extra Fields | ✅ **High** | Blocks unauthorized data injection |
| Read Permissions | ✅ **Medium** | Room members can see each other |

---

## 🚨 Potential Vulnerabilities & Mitigations

### 1. Room Code Guessing

**Risk:** Someone could try to guess room codes

**Mitigation:**
- 8-character codes = 2.8 trillion combinations
- Rooms auto-delete when empty
- No way to list all active rooms
- Consider adding rate limiting on join attempts

---

### 2. Spam Joining

**Risk:** Attacker joins many rooms rapidly

**Mitigation:**
- Client-side: Max 20 users per room check
- Consider: Server-side rate limiting via Cloud Functions
- Consider: Temporary ban for suspicious activity

---

### 3. Data Privacy

**Risk:** Room members can see each other's data

**Mitigation:**
- This is intentional (co-op feature requirement)
- Only timer data is shared (not tasks, rewards, etc.)
- Users explicitly join rooms with codes
- Consider: Optional password-protected rooms

---

### 4. Database Quota Abuse

**Risk:** Malicious user creates many rooms

**Mitigation:**
- Rooms auto-delete on disconnect
- Firebase free tier limits apply
- Set up billing alerts
- Monitor usage in Firebase Console

---

## 🛠️ Advanced Security (Optional)

### Add App Check

Prevents non-app requests:

1. Go to Firebase Console > Build > App Check
2. Register your web app
3. Add to `firebaseConfig.js`:

```javascript
const appCheck = firebase.appCheck();
appCheck.activate('YOUR_SITE_KEY', true);
```

### Add Cloud Functions Rate Limiting

Limit join attempts per IP:

```javascript
exports.onJoinRoom = functions.database.ref('/rooms/{roomCode}/users/{userId}')
  .onCreate((snapshot, context) => {
    // Check rate limits, ban suspicious IPs
  });
```

### Add Room Passwords

Modify rules to require password:

```json
"$roomCode": {
  "password": {
    ".validate": "newData.isString()"
  },
  // ... rest of rules
}
```

---

## 📊 Monitoring & Auditing

### Check Active Rooms

Firebase Console > Realtime Database > Data tab

```
rooms/
  ├── ABC12345/
  │   └── users/
  │       ├── user_001/
  │       └── user_002/
  └── XYZ98765/
      └── users/
          └── user_003/
```

### Monitor Security Issues

Firebase Console > Build > Realtime Database > Usage

Watch for:
- Unusual spikes in connections
- High data download (potential scraping)
- Many failed auth attempts

---

## ✅ Security Checklist

Before going live, ensure:

- [ ] Firebase config is set in `firebaseConfig.js`
- [ ] Anonymous authentication is enabled
- [ ] Security rules are published (not test mode)
- [ ] Billing alerts are configured
- [ ] Usage is monitored regularly
- [ ] No sensitive data in Realtime Database
- [ ] Client-side validation matches server rules
- [ ] App Check is enabled (optional but recommended)

---

## 🆘 Security Incident Response

If you suspect a security breach:

1. **Immediately** disable Anonymous auth (Build > Authentication)
2. Change Realtime Database rules to read-only:
   ```json
   {
     "rules": {
       ".read": false,
       ".write": false
     }
   }
   ```
3. Review database data for suspicious entries
4. Check Firebase Console > Usage for anomalies
5. Enable App Check if not already enabled
6. Consider migrating to new Firebase project if compromised

---

## 📚 Further Reading

- [Firebase Security Rules Language](https://firebase.google.com/docs/database/security)
- [Common Security Pitfalls](https://firebase.google.com/docs/database/security/insecure-rules)
- [Firebase Security Best Practices](https://firebase.google.com/support/privacy)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

**These rules provide strong protection for the Co-op Timer feature while maintaining usability.** Review them periodically and update as needed! 🔒
