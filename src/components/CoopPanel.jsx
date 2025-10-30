// src/components/CoopPanel.jsx - Collaborative Timer Room Feature
window.CoopPanel = ({ timerSeconds, isTimerRunning, isTimerPaused, darkMode, roomCode, setRoomCode, username, setUsername, userId, setUserId, isVisible, showNotification, isElectron }) => {
  const { Users, UserProfile, LogIn, LogOut, Copy, ChevronDown, Hourglass } = window.Icons;
  const { formatTime } = window.Utils;

  // State
  const [isConnected, setIsConnected] = React.useState(false);
  const [joinCode, setJoinCode] = React.useState('');
  const [roomUsers, setRoomUsers] = React.useState({});
  const [roomGoal, setRoomGoal] = React.useState(null); // Room goal in seconds
  const [isEditingGoal, setIsEditingGoal] = React.useState(false);
  const [goalHours, setGoalHours] = React.useState('');
  const [goalMinutes, setGoalMinutes] = React.useState('');
  const [error, setError] = React.useState('');
  const [showUserList, setShowUserList] = React.useState(true);
  const [copiedCode, setCopiedCode] = React.useState(false);
  const [isInitializing, setIsInitializing] = React.useState(false);
  const [hasReconnected, setHasReconnected] = React.useState(false);
  const [roomHost, setRoomHost] = React.useState(null); // Room host userId
  const [isOnline, setIsOnline] = React.useState(true); // Firebase connection status
  const [reconnecting, setReconnecting] = React.useState(false);
  const [useCustomCode, setUseCustomCode] = React.useState(false); // Toggle for custom room code
  const [customRoomCode, setCustomRoomCode] = React.useState(''); // Custom room code input

  // Refs for Firebase and rate limiting
  const roomRef = React.useRef(null);
  const userRef = React.useRef(null);
  const lastUpdateTime = React.useRef(0);
  const authUnsubscribe = React.useRef(null);
  const usersListener = React.useRef(null);
  const presenceListener = React.useRef(null);
  const reconnectAttemptRef = React.useRef(false);
  const intentionalDisconnect = React.useRef(false); // Track if user intentionally left
  const heartbeatInterval = React.useRef(null); // Heartbeat to maintain presence
  const prevTimerRunning = React.useRef(isTimerRunning);
  const prevTimerPaused = React.useRef(isTimerPaused);
  const [goalJustSet, setGoalJustSet] = React.useState(false);
  const prevRoomUsersCount = React.useRef(0);
  const [hoveredSegment, setHoveredSegment] = React.useState(null);
  const [justJoinedRoom, setJustJoinedRoom] = React.useState(false);
  const [localTick, setLocalTick] = React.useState(0); // Forces re-render every second for smooth counting
  const userPositions = React.useRef({}); // Track user positions for animation
  const userElements = React.useRef({}); // Store refs to user DOM elements

  // Constants for security
  const RATE_LIMIT_MS = 10000; // Max 1 update per 10 seconds
  const MAX_USERNAME_LENGTH = 30;
  const ROOM_CODE_LENGTH = 8;
  const MAX_USERS_PER_ROOM = 20;

  // Local timer for smooth counting (updates display every second)
  React.useEffect(() => {
    const interval = setInterval(() => {
      setLocalTick(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Calculate current elapsed seconds for a user based on their state
  const calculateElapsedSeconds = (userData) => {
    if (!userData) return 0;

    const baseSeconds = userData.baseSeconds || 0;
    const isRunning = userData.timerRunning && !userData.timerPaused;

    if (!isRunning || !userData.startedAt) {
      // Timer is stopped or paused, return base time
      return baseSeconds;
    }

    // Timer is running, calculate: baseSeconds + time since startedAt
    const now = Date.now();
    const elapsedSinceStart = Math.floor((now - userData.startedAt) / 1000);
    return baseSeconds + elapsedSinceStart;
  };

  // Utility: Generate secure room code
  const generateRoomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  };

  // Utility: Sanitize username
  const sanitizeUsername = (name) => {
    return name
      .trim()
      .slice(0, MAX_USERNAME_LENGTH)
      .replace(/[^a-zA-Z0-9\s\-_]/g, '');
  };

  // Utility: Validate room code
  const validateRoomCode = (code) => {
    const regex = new RegExp(`^[A-Z0-9]{${ROOM_CODE_LENGTH}}$`);
    return regex.test(code);
  };

  // Utility: Generate color for user with high distinction
  const generatePastelColor = (str) => {
    // Generate consistent color based on string (userId)
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Generate vibrant colors with wide range for better distinction
    const hue = Math.abs(hash % 360);
    const saturation = 50 + (Math.abs(hash >> 8) % 40); // 50-90% (much wider range)
    const lightness = 55 + (Math.abs(hash >> 16) % 25); // 55-80% (wider range for variety)

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  // Get user color (memoized based on userId)
  const getUserColors = React.useMemo(() => {
    const colors = {};
    Object.keys(roomUsers).forEach(uid => {
      colors[uid] = generatePastelColor(uid);
    });
    return colors;
  }, [Object.keys(roomUsers).join(',')]);

  // Update room goal
  const updateRoomGoal = async () => {
    if (!roomRef.current || userId !== roomHost) return;

    const hours = parseInt(goalHours) || 0;
    const minutes = parseInt(goalMinutes) || 0;

    if (hours === 0 && minutes === 0) {
      setError('Please enter a valid goal');
      return;
    }

    const goalSeconds = (hours * 3600) + (minutes * 60);

    try {
      await roomRef.current.child('goal').set(goalSeconds);
      const wasNull = roomGoal === null;
      setRoomGoal(goalSeconds);
      setIsEditingGoal(false);
      setGoalHours('');
      setGoalMinutes('');
      setError('');

      // Trigger animation if this is the first time setting a goal
      if (wasNull) {
        setGoalJustSet(true);
        setTimeout(() => setGoalJustSet(false), 1000);
      }
    } catch (err) {
      console.error('Error setting room goal:', err);
      setError('Failed to set goal');
    }
  };

  // Remove room goal
  const removeRoomGoal = async () => {
    if (!roomRef.current || userId !== roomHost) return;

    try {
      await roomRef.current.child('goal').remove();
      setRoomGoal(null);
      setIsEditingGoal(false);
      setGoalHours('');
      setGoalMinutes('');
    } catch (err) {
      console.error('Error removing room goal:', err);
    }
  };

  // Initialize Firebase
  const initializeFirebase = async () => {
    if (typeof firebase === 'undefined') {
      setError('Firebase not loaded. Please check setup instructions.');
      return false;
    }

    try {
      if (typeof window.FirebaseConfig === 'undefined') {
        setError('Firebase configuration not found. Please configure Firebase.');
        return false;
      }

      const firebaseApp = window.FirebaseConfig.initialize();
      if (!firebaseApp) {
        setError('Failed to initialize Firebase. Check console for details.');
        return false;
      }

      // Sign in anonymously
      const auth = firebase.auth();
      if (!auth.currentUser) {
        await auth.signInAnonymously();
      }

      return true;
    } catch (err) {
      console.error('Firebase initialization error:', err);
      setError(`Firebase error: ${err.message}`);
      return false;
    }
  };

  // Create a new room
  const createRoom = async () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    const cleanName = sanitizeUsername(username);
    if (!cleanName) {
      setError('Invalid username. Use only letters, numbers, spaces, - or _');
      return;
    }

    // Validate custom room code if using custom code
    let newRoomCode;
    if (useCustomCode) {
      const upperCode = customRoomCode.trim().toUpperCase();
      if (!validateRoomCode(upperCode)) {
        setError(`Custom room code must be ${ROOM_CODE_LENGTH} characters (letters and numbers only)`);
        return;
      }
      newRoomCode = upperCode;
    } else {
      newRoomCode = generateRoomCode();
    }

    setIsInitializing(true);
    setError('');

    try {
      const initialized = await initializeFirebase();
      if (!initialized) {
        setIsInitializing(false);
        return;
      }

      const auth = firebase.auth();
      const db = firebase.database();
      const userId = auth.currentUser.uid;

      // If using custom code, check if room already exists
      if (useCustomCode) {
        const existingRoom = await db.ref(`rooms/${newRoomCode}`).once('value');
        if (existingRoom.exists()) {
          setError('A room with this code already exists. Please join it instead or choose a different code.');
          setIsInitializing(false);
          return;
        }
      }

      // Create room reference
      const newRoomRef = db.ref(`rooms/${newRoomCode}`);
      const newUserRef = newRoomRef.child(`users/${userId}`);

      // Set room metadata (all rooms are temporary by default)
      await newRoomRef.child('metadata').set({
        permanent: false, // All rooms are temporary by default
        createdAt: firebase.database.ServerValue.TIMESTAMP
      });

      // Set room data
      await newUserRef.set({
        name: cleanName,
        timerRunning: isTimerRunning,
        timerPaused: isTimerPaused,
        baseSeconds: timerSeconds, // Accumulated time
        startedAt: isTimerRunning && !isTimerPaused ? Date.now() : null,
        lastUpdate: firebase.database.ServerValue.TIMESTAMP,
        joinedAt: firebase.database.ServerValue.TIMESTAMP,
        lastSeen: firebase.database.ServerValue.TIMESTAMP
      });

      // Store references
      roomRef.current = newRoomRef;
      userRef.current = newUserRef;
      setRoomCode(newRoomCode);
      setUserId(userId);
      setRoomHost(userId); // Creator is the host
      setIsConnected(true);
      setIsInitializing(false);
      setJustJoinedRoom(true);
      setTimeout(() => setJustJoinedRoom(false), 1000);

      // Clear intentional disconnect flag
      intentionalDisconnect.current = false;

      // Listen for users in room
      listenToRoomUsers(newRoomRef);

      // Listen for room goal
      listenToRoomGoal(newRoomRef);

      // Set up presence detection
      setupPresenceDetection();

      // Start heartbeat
      startHeartbeat();

    } catch (err) {
      console.error('Error creating room:', err);
      setError(`Failed to create room: ${err.message}`);
      setIsInitializing(false);
    }
  };

  // Join existing room
  const joinRoom = async () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    if (!joinCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    const cleanName = sanitizeUsername(username);
    if (!cleanName) {
      setError('Invalid username. Use only letters, numbers, spaces, - or _');
      return;
    }

    const upperCode = joinCode.trim().toUpperCase();
    if (!validateRoomCode(upperCode)) {
      setError(`Room code must be ${ROOM_CODE_LENGTH} characters (letters and numbers only)`);
      return;
    }

    setIsInitializing(true);
    setError('');

    try {
      const initialized = await initializeFirebase();
      if (!initialized) {
        setIsInitializing(false);
        return;
      }

      const auth = firebase.auth();
      const db = firebase.database();
      const userId = auth.currentUser.uid;

      // Check if room exists
      const roomSnapshot = await db.ref(`rooms/${upperCode}`).once('value');
      if (!roomSnapshot.exists()) {
        setError('Room not found. Please check the code and try again.');
        setIsInitializing(false);
        return;
      }

      // Check room size and detect host
      const roomData = roomSnapshot.val();
      const users = roomData.users || {};
      if (Object.keys(users).length >= MAX_USERS_PER_ROOM) {
        setError('Room is full. Maximum 20 users per room.');
        setIsInitializing(false);
        return;
      }

      // Find room host (first user by joinedAt timestamp)
      let hostUserId = null;
      let earliestJoinTime = Infinity;
      Object.entries(users).forEach(([uid, data]) => {
        if (data.joinedAt < earliestJoinTime) {
          earliestJoinTime = data.joinedAt;
          hostUserId = uid;
        }
      });
      setRoomHost(hostUserId);

      // Join room
      const joinRoomRef = db.ref(`rooms/${upperCode}`);
      const joinUserRef = joinRoomRef.child(`users/${userId}`);

      await joinUserRef.set({
        name: cleanName,
        timerRunning: isTimerRunning,
        timerPaused: isTimerPaused,
        baseSeconds: timerSeconds, // Accumulated time
        startedAt: isTimerRunning && !isTimerPaused ? Date.now() : null,
        lastUpdate: firebase.database.ServerValue.TIMESTAMP,
        joinedAt: firebase.database.ServerValue.TIMESTAMP,
        lastSeen: firebase.database.ServerValue.TIMESTAMP
      });

      // Store references
      roomRef.current = joinRoomRef;
      userRef.current = joinUserRef;
      setRoomCode(upperCode);
      setUserId(userId);
      setIsConnected(true);
      setIsInitializing(false);
      setJoinCode('');
      setJustJoinedRoom(true);
      setTimeout(() => setJustJoinedRoom(false), 1000);

      // Clear intentional disconnect flag
      intentionalDisconnect.current = false;

      // Listen for users in room
      listenToRoomUsers(joinRoomRef);

      // Listen for room goal
      listenToRoomGoal(joinRoomRef);

      // Set up presence detection
      setupPresenceDetection();

      // Start heartbeat
      startHeartbeat();

    } catch (err) {
      console.error('Error joining room:', err);
      setError(`Failed to join room: ${err.message}`);
      setIsInitializing(false);
    }
  };

  // Listen to room users
  const listenToRoomUsers = (roomReference) => {
    if (usersListener.current) {
      usersListener.current.off();
    }

    const usersRef = roomReference.child('users');
    usersListener.current = usersRef;

    usersRef.on('value', (snapshot) => {
      const users = snapshot.val() || {};
      setRoomUsers(users);

      // Update room host (earliest joinedAt)
      let hostUserId = null;
      let earliestJoinTime = Infinity;
      Object.entries(users).forEach(([uid, data]) => {
        if (data.joinedAt < earliestJoinTime) {
          earliestJoinTime = data.joinedAt;
          hostUserId = uid;
        }
      });
      setRoomHost(hostUserId);

      // Show notification when someone joins (count increased and not initial load)
      const currentCount = Object.keys(users).length;
      if (prevRoomUsersCount.current > 0 && currentCount > prevRoomUsersCount.current) {
        // Find the new user(s)
        const newUsers = Object.entries(users).filter(([uid]) => {
          return uid !== userId; // Exclude current user
        });
        if (newUsers.length > 0) {
          const latestUser = newUsers.reduce((latest, [uid, data]) => {
            return data.joinedAt > (latest?.joinedAt || 0) ? data : latest;
          }, null);
          if (latestUser && showNotification) {
            showNotification(`${latestUser.name} joined the room`);
          }
        }
      }
      prevRoomUsersCount.current = currentCount;
    });
  };

  // Listen to room goal
  const listenToRoomGoal = (roomReference) => {
    const goalRef = roomReference.child('goal');

    goalRef.on('value', (snapshot) => {
      const goal = snapshot.val();
      setRoomGoal(goal);
    });
  };

  // Start heartbeat to maintain presence (updates lastSeen every 30 seconds)
  const startHeartbeat = () => {
    // Clear any existing heartbeat
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
    }

    // Update lastSeen immediately
    if (userRef.current) {
      userRef.current.update({
        lastSeen: firebase.database.ServerValue.TIMESTAMP
      }).catch(err => console.error('Heartbeat update failed:', err));
    }

    // Set up interval to update every 30 seconds
    heartbeatInterval.current = setInterval(() => {
      if (userRef.current && !intentionalDisconnect.current) {
        userRef.current.update({
          lastSeen: firebase.database.ServerValue.TIMESTAMP
        }).catch(err => console.error('Heartbeat update failed:', err));
      }
    }, 30000); // 30 seconds
  };

  // Stop heartbeat
  const stopHeartbeat = () => {
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = null;
    }
  };

  // Set up Firebase presence detection
  const setupPresenceDetection = () => {
    if (typeof firebase === 'undefined') return;

    const db = firebase.database();
    const connectedRef = db.ref('.info/connected');

    if (presenceListener.current) {
      presenceListener.current.off();
    }

    presenceListener.current = connectedRef;

    connectedRef.on('value', (snapshot) => {
      const connected = snapshot.val();
      setIsOnline(connected === true);

      if (connected && isConnected && roomCode && userId && username) {
        // We're back online and were previously in a room
        handleReconnect();
      }
    });
  };

  // Handle reconnection when Firebase connection is restored
  const handleReconnect = async () => {
    // Prevent multiple simultaneous reconnection attempts
    if (reconnectAttemptRef.current) return;

    reconnectAttemptRef.current = true;
    setReconnecting(true);

    try {
      const auth = firebase.auth();
      const db = firebase.database();

      // Wait for auth to be ready
      if (!auth.currentUser) {
        await auth.signInAnonymously();
      }

      // Check if saved userId matches current auth
      const currentAuthId = auth.currentUser.uid;
      if (currentAuthId !== userId) {
        console.log('Auth ID changed during reconnection');
        reconnectAttemptRef.current = false;
        setReconnecting(false);
        return;
      }

      // Check if room still exists
      const roomSnapshot = await db.ref(`rooms/${roomCode}`).once('value');
      if (!roomSnapshot.exists()) {
        console.log('Room no longer exists during reconnection');
        reconnectAttemptRef.current = false;
        setReconnecting(false);
        return;
      }

      // Rejoin the room
      const rejoinRoomRef = db.ref(`rooms/${roomCode}`);
      const rejoinUserRef = rejoinRoomRef.child(`users/${userId}`);

      await rejoinUserRef.set({
        name: username,
        timerRunning: isTimerRunning,
        timerPaused: isTimerPaused,
        baseSeconds: timerSeconds,
        startedAt: isTimerRunning && !isTimerPaused ? Date.now() : null,
        lastUpdate: firebase.database.ServerValue.TIMESTAMP,
        joinedAt: firebase.database.ServerValue.TIMESTAMP,
        lastSeen: firebase.database.ServerValue.TIMESTAMP
      });

      // Update references
      roomRef.current = rejoinRoomRef;
      userRef.current = rejoinUserRef;

      // Restart heartbeat
      startHeartbeat();

      console.log('Successfully reconnected to room:', roomCode);

      if (showNotification) {
        showNotification('Reconnected to room');
      }
    } catch (err) {
      console.error('Error reconnecting to room:', err);
    } finally {
      reconnectAttemptRef.current = false;
      setReconnecting(false);
    }
  };

  // Leave room
  const leaveRoom = async () => {
    try {
      // Mark as intentional disconnect FIRST to prevent auto-reconnect
      intentionalDisconnect.current = true;

      // Stop heartbeat
      stopHeartbeat();

      // Save room ref for cleanup check
      const savedRoomRef = roomRef.current;
      const savedRoomCode = roomCode;

      // Remove user from Firebase first
      if (userRef.current) {
        await userRef.current.remove();
      }

      // After removing user, check if room should be cleaned up
      if (savedRoomRef) {
        try {
          const roomSnapshot = await savedRoomRef.once('value');
          const roomData = roomSnapshot.val();

          if (roomData) {
            const users = roomData.users || {};
            const userCount = Object.keys(users).length;
            const isPermanent = roomData.metadata?.permanent || false;

            // If room is now empty and not permanent, delete it
            if (userCount === 0 && !isPermanent) {
              await savedRoomRef.remove();
              console.log('Deleted empty non-permanent room:', savedRoomCode);
            }
          }
        } catch (cleanupErr) {
          // Ignore cleanup errors - user has already left
          console.log('Could not clean up room:', cleanupErr.message);
        }
      }

      // Stop listeners
      if (usersListener.current) {
        usersListener.current.off();
      }

      if (presenceListener.current) {
        presenceListener.current.off();
      }

      // Clear all state and refs
      roomRef.current = null;
      userRef.current = null;
      presenceListener.current = null;
      reconnectAttemptRef.current = false;
      setIsConnected(false);
      setRoomCode('');
      setRoomUsers({});
      setRoomGoal(null);
      setRoomHost(null);
      setUserId('');
      setError('');
      setReconnecting(false);
    } catch (err) {
      console.error('Error leaving room:', err);
      // Even on error, clear local state so user can continue
      roomRef.current = null;
      userRef.current = null;
      presenceListener.current = null;
      reconnectAttemptRef.current = false;
      setIsConnected(false);
      setRoomCode('');
      setRoomUsers({});
      setRoomGoal(null);
      setRoomHost(null);
      setUserId('');
      setError('');
      setReconnecting(false);
    }
  };

  // Update timer (only on state changes - no more interval updates!)
  React.useEffect(() => {
    if (!isConnected || !userRef.current) return;

    // Check if status changed (running/paused state)
    const statusChanged =
      prevTimerRunning.current !== isTimerRunning ||
      prevTimerPaused.current !== isTimerPaused;

    // Only update on state changes
    if (!statusChanged) {
      return;
    }

    prevTimerRunning.current = isTimerRunning;
    prevTimerPaused.current = isTimerPaused;

    // Determine what to write based on state
    const updateData = {
      timerRunning: isTimerRunning,
      timerPaused: isTimerPaused,
      baseSeconds: timerSeconds, // Current accumulated time
      startedAt: (isTimerRunning && !isTimerPaused) ? Date.now() : null,
      lastUpdate: firebase.database.ServerValue.TIMESTAMP
    };

    userRef.current.update(updateData).catch(err => {
      console.error('Error updating timer:', err);
    });
  }, [timerSeconds, isTimerRunning, isTimerPaused, isConnected]);

  // Auto-reconnect to room on mount
  React.useEffect(() => {
    const reconnectToRoom = async () => {
      // Don't reconnect if user intentionally disconnected
      if (intentionalDisconnect.current) {
        return;
      }

      // Only reconnect if we have saved credentials and aren't already connected
      if (isConnected || !roomCode || !userId || !username) {
        return;
      }

      setIsInitializing(true);

      try {
        const initialized = await initializeFirebase();
        if (!initialized) {
          setIsInitializing(false);
          return;
        }

        const auth = firebase.auth();
        const db = firebase.database();

        // Wait for auth to be ready
        if (!auth.currentUser) {
          await auth.signInAnonymously();
        }

        // Check if saved userId matches current auth
        const currentAuthId = auth.currentUser.uid;

        // If auth IDs don't match, we need to rejoin with new ID
        if (currentAuthId !== userId) {
          console.log('Auth ID changed, clearing saved room data');
          setRoomCode('');
          setUserId('');
          setIsInitializing(false);
          return;
        }

        // Check if room still exists
        const roomSnapshot = await db.ref(`rooms/${roomCode}`).once('value');
        if (!roomSnapshot.exists()) {
          console.log('Saved room no longer exists');
          setRoomCode('');
          setUserId('');
          setIsInitializing(false);
          return;
        }

        // Rejoin the room
        const rejoinRoomRef = db.ref(`rooms/${roomCode}`);
        const rejoinUserRef = rejoinRoomRef.child(`users/${userId}`);

        await rejoinUserRef.set({
          name: username,
          timerRunning: isTimerRunning,
          timerPaused: isTimerPaused,
          baseSeconds: timerSeconds, // Accumulated time
          startedAt: isTimerRunning && !isTimerPaused ? Date.now() : null,
          lastUpdate: firebase.database.ServerValue.TIMESTAMP,
          joinedAt: firebase.database.ServerValue.TIMESTAMP,
          lastSeen: firebase.database.ServerValue.TIMESTAMP
        });

        // Store references
        roomRef.current = rejoinRoomRef;
        userRef.current = rejoinUserRef;
        setIsConnected(true);
        setIsInitializing(false);

        // Clear intentional disconnect flag
        intentionalDisconnect.current = false;

        // Listen for users in room
        listenToRoomUsers(rejoinRoomRef);

        // Listen for room goal
        listenToRoomGoal(rejoinRoomRef);

        // Set up presence detection
        setupPresenceDetection();

        // Start heartbeat
        startHeartbeat();

        console.log('Successfully reconnected to room:', roomCode);

      } catch (err) {
        console.error('Error reconnecting to room:', err);
        setRoomCode('');
        setUserId('');
        setIsInitializing(false);
      }
    };

    reconnectToRoom();
  }, [roomCode, userId, username, isTimerRunning, isTimerPaused, timerSeconds, isConnected]);

  // Send coop users to Electron for mini window
  React.useEffect(() => {
    if (isElectron && window.electronTimer) {
      window.electronTimer.updateCoopUsers(roomUsers);
    }
  }, [roomUsers, isElectron]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (usersListener.current) {
        usersListener.current.off();
      }
      if (presenceListener.current) {
        presenceListener.current.off();
      }
      if (authUnsubscribe.current) {
        authUnsubscribe.current();
      }
      stopHeartbeat();
    };
  }, []);

  // Copy room code to clipboard
  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // FLIP Animation: Track position changes
  React.useEffect(() => {
    const userArray = Object.entries(roomUsers).map(([id, data]) => ({
      id,
      elapsedSeconds: calculateElapsedSeconds(data)
    }));

    // Sort to get positions
    userArray.sort((a, b) => {
      const timeDiff = b.elapsedSeconds - a.elapsedSeconds;
      if (timeDiff !== 0) return timeDiff;
      return 0;
    });

    const newPositions = {};
    userArray.forEach((user, index) => {
      newPositions[user.id] = index;
    });

    // Animate users that changed position
    Object.keys(newPositions).forEach(uid => {
      const oldPos = userPositions.current[uid];
      const newPos = newPositions[uid];
      const element = userElements.current[uid];

      if (element && oldPos !== undefined && oldPos !== newPos && !justJoinedRoom) {
        // Calculate pixel offset
        const delta = (oldPos - newPos) * (element.offsetHeight + 12); // 12px is gap (space-y-3)

        // Apply invert transform immediately (without transition)
        element.style.transform = `translateY(${delta}px)`;
        element.style.transition = 'none';

        // Force reflow
        element.offsetHeight;

        // Play: animate to new position with spring easing
        requestAnimationFrame(() => {
          element.style.transform = 'translateY(0)';
          element.style.transition = 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
        });
      }
    });

    userPositions.current = newPositions;
  }, [roomUsers, localTick, justJoinedRoom]);

  // Render user list
  const renderUserList = () => {
    const userArray = Object.entries(roomUsers).map(([id, data]) => ({
      id,
      ...data,
      isCurrentUser: id === userId,
      elapsedSeconds: calculateElapsedSeconds(data)
    }));

    // Sort: by elapsed seconds (highest first), then by name for ties
    userArray.sort((a, b) => {
      // Sort by elapsed seconds descending
      const timeDiff = b.elapsedSeconds - a.elapsedSeconds;
      if (timeDiff !== 0) return timeDiff;
      // If times are equal, sort alphabetically
      return a.name.localeCompare(b.name);
    });


    return userArray.map((user) => {
      // Determine timer state
      const isRunning = user.timerRunning && !user.timerPaused;
      const isPaused = user.timerRunning && user.timerPaused;
      const isStopped = !user.timerRunning;

      // Get user's color
      const userColor = getUserColors[user.id];

      // Choose visual state
      let statusColor, statusBorder, statusIcon, statusText, timerColor;
      if (isRunning) {
        // Use pastel color for running state
        statusColor = { backgroundColor: `${userColor}40` }; // 40 = 25% opacity in hex
        statusBorder = { borderColor: userColor };
        statusIcon = (
          <UserProfile
            className="w-5 h-5"
            style={{ color: userColor }}
          />
        );
        statusText = 'Timer running';
        timerColor = userColor; // Use user's pastel color
      } else if (isPaused) {
        statusColor = 'bg-amber-500/20';
        statusBorder = 'border-amber-500';
        statusIcon = <Hourglass className="w-5 h-5 text-amber-600" />;
        statusText = 'Timer paused';
        timerColor = '#f59e0b'; // amber-500
      } else {
        // Stopped state uses dark grey with SVG icon
        statusColor = 'bg-zinc-600/20';
        statusBorder = 'border-zinc-600';
        statusIcon = (
          <svg className="w-5 h-5 text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        );
        statusText = 'Timer stopped';
        timerColor = '#52525b'; // zinc-600
      }

      return (
        <div
          key={user.id}
          ref={(el) => {
            if (el) userElements.current[user.id] = el;
          }}
          className={`${
            darkMode
              ? 'bg-transparent border-transparent'
              : 'bg-white/50 border-white/40'
          } border rounded-lg p-4 flex items-center justify-between hover-lift user-item-slide`}
          style={{ willChange: 'transform' }}
        >
          <div className="flex items-center gap-3 flex-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                typeof statusColor === 'string' ? statusColor : ''
              } ${typeof statusBorder === 'string' ? statusBorder : ''}`}
              style={{
                ...(typeof statusColor === 'object' ? statusColor : {}),
                ...(typeof statusBorder === 'object' ? statusBorder : {})
              }}
            >
              {statusIcon}
            </div>
            <div className="flex-1">
              <p className={`font-medium flex items-center gap-1.5 ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`}>
                {user.name}
                {user.id === roomHost && (
                  <svg
                    className="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    style={{ color: '#fbbf24' }}
                  >
                    <path d="M12 2L15 9L22 9.5L16.5 14.5L18 22L12 18L6 22L7.5 14.5L2 9.5L9 9L12 2Z" />
                  </svg>
                )}
                {user.isCurrentUser && ' (You)'}
              </p>
              <p className={`text-sm ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>
                {statusText}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-semibold`} style={{ color: timerColor }}>
              {formatTime(user.elapsedSeconds)}
            </p>
          </div>
        </div>
      );
    });
  };

  // Render room goal section
  const renderRoomGoal = () => {
    // Calculate total room time using client-side calculation
    const totalRoomSeconds = Object.values(roomUsers).reduce((sum, user) => sum + calculateElapsedSeconds(user), 0);

    const isHost = userId === roomHost;

    // If no goal is set
    if (!roomGoal) {
      return (
        <div className={`${darkMode ? 'dark-glass-panel dark-shadow' : 'glass-panel shadow-lg'} rounded-xl p-6 mb-6 hover-lift ${justJoinedRoom ? 'float-up-into-place float-delay-2' : ''}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-xl font-semibold ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`}>
                Room Total
              </h3>
              <p className={`text-4xl font-semibold mt-2 ${darkMode ? 'text-amber-500' : 'text-amber-500'}`}>
                {formatTime(totalRoomSeconds)}
              </p>
            </div>
            {isHost && !isEditingGoal && (
              <button
                onClick={() => setIsEditingGoal(true)}
                className={`px-4 py-2 rounded-lg transition border ${
                  darkMode
                    ? 'dark-button'
                    : 'bg-white/50 hover:bg-white/70 text-zinc-700 border-white/40'
                }`}
              >
                Set Goal
              </button>
            )}
          </div>

          {/* Goal input form */}
          {isHost && isEditingGoal && (
            <div className="mt-4 pt-4 border-t border-white/20 morph-to-form">
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'dark-text-primary' : 'text-zinc-700'}`}>
                Room Goal
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  min="0"
                  value={goalHours}
                  onChange={(e) => setGoalHours(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value)))}
                  onKeyDown={(e) => e.key === 'Enter' && updateRoomGoal()}
                  placeholder="Hours"
                  className={`w-20 p-2 text-center border rounded-lg focus:outline-none focus:border-amber-500 goal-input ${
                    darkMode ? 'dark-input' : 'bg-white/60 border-white/50 text-zinc-800'
                  }`}
                  style={{
                    MozAppearance: 'textfield',
                    WebkitAppearance: 'none',
                    appearance: 'none'
                  }}
                />
                <span className={darkMode ? 'dark-text-primary' : 'text-zinc-700'}>h</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={goalMinutes}
                  onChange={(e) => setGoalMinutes(e.target.value === '' ? '' : Math.max(0, Math.min(59, parseInt(e.target.value))))}
                  onKeyDown={(e) => e.key === 'Enter' && updateRoomGoal()}
                  placeholder="Minutes"
                  className={`w-24 p-2 text-center border rounded-lg focus:outline-none focus:border-amber-500 goal-input ${
                    darkMode ? 'dark-input' : 'bg-white/60 border-white/50 text-zinc-800'
                  }`}
                  style={{
                    MozAppearance: 'textfield',
                    WebkitAppearance: 'none',
                    appearance: 'none'
                  }}
                />
                <span className={darkMode ? 'dark-text-primary' : 'text-zinc-700'}>m</span>
                <button
                  onClick={updateRoomGoal}
                  className="px-4 py-2 rounded-lg transition breathing-gradient text-white border-0 ml-2"
                >
                  Set
                </button>
                <button
                  onClick={() => {
                    setIsEditingGoal(false);
                    setGoalHours('');
                    setGoalMinutes('');
                    setError('');
                  }}
                  className={`px-4 py-2 rounded-lg transition border ${
                    darkMode
                      ? 'dark-button'
                      : 'bg-white/50 hover:bg-white/70 text-zinc-700 border-white/40'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }

    // If goal is set, show progress bar
    const progressPercent = Math.min((totalRoomSeconds / roomGoal) * 100, 100);

    // Calculate each user's contribution using client-side calculation
    const userContributions = Object.entries(roomUsers).map(([uid, data]) => {
      const userSeconds = calculateElapsedSeconds(data);
      return {
        id: uid,
        name: data.name,
        seconds: userSeconds,
        color: getUserColors[uid],
        percentageOfTotal: totalRoomSeconds > 0 ? (userSeconds / totalRoomSeconds) * 100 : 0,
        percentageOfGoal: roomGoal > 0 ? (userSeconds / roomGoal) * 100 : 0
      };
    }).filter(u => u.seconds > 0).sort((a, b) => b.seconds - a.seconds);

    return (
      <div className={`${darkMode ? 'dark-glass-panel dark-shadow' : 'glass-panel shadow-lg'} rounded-xl p-6 mb-6 hover-lift ${goalJustSet ? 'goal-appear-animation' : ''} ${justJoinedRoom ? 'float-up-into-place float-delay-2' : ''}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <h3 className={`text-xl font-semibold ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`}>
              Room Goal
            </h3>
            {!isEditingGoal ? (
              <div className="flex items-center gap-2">
                <p className={`text-sm ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>
                  {formatTime(totalRoomSeconds)} /
                </p>
                {isHost ? (
                  <span
                    onClick={() => {
                      setGoalHours(Math.floor(roomGoal / 3600).toString());
                      setGoalMinutes(Math.floor((roomGoal % 3600) / 60).toString());
                      setIsEditingGoal(true);
                    }}
                    className={`text-sm cursor-pointer hover:text-amber-500 transition ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}
                    data-tooltip="Click to edit"
                  >
                    {formatTime(roomGoal)}
                  </span>
                ) : (
                  <span className={`text-sm ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>
                    {formatTime(roomGoal)}
                  </span>
                )}
                <p className={`text-sm ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>
                  ({Math.round(progressPercent)}%)
                </p>
              </div>
            ) : (
              <div className="flex gap-2 items-center mt-2">
                <input
                  type="number"
                  min="0"
                  value={goalHours}
                  onChange={(e) => setGoalHours(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value)))}
                  onKeyDown={(e) => e.key === 'Enter' && updateRoomGoal()}
                  placeholder="Hours"
                  className={`w-16 p-1 text-center border rounded-lg text-sm focus:outline-none focus:border-amber-500 goal-input ${
                    darkMode ? 'dark-input' : 'bg-white/60 border-white/50 text-zinc-800'
                  }`}
                  style={{
                    MozAppearance: 'textfield',
                    WebkitAppearance: 'none',
                    appearance: 'none'
                  }}
                />
                <span className={`text-sm ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>h</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={goalMinutes}
                  onChange={(e) => setGoalMinutes(e.target.value === '' ? '' : Math.max(0, Math.min(59, parseInt(e.target.value))))}
                  onKeyDown={(e) => e.key === 'Enter' && updateRoomGoal()}
                  placeholder="Min"
                  className={`w-16 p-1 text-center border rounded-lg text-sm focus:outline-none focus:border-amber-500 goal-input ${
                    darkMode ? 'dark-input' : 'bg-white/60 border-white/50 text-zinc-800'
                  }`}
                  style={{
                    MozAppearance: 'textfield',
                    WebkitAppearance: 'none',
                    appearance: 'none'
                  }}
                />
                <span className={`text-sm ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>m</span>
                <button
                  onClick={updateRoomGoal}
                  className="ml-1 text-amber-500 hover:text-amber-600 transition text-sm"
                  data-tooltip="Save"
                >
                  ✓
                </button>
                <button
                  onClick={() => {
                    setIsEditingGoal(false);
                    setGoalHours('');
                    setGoalMinutes('');
                    setError('');
                  }}
                  className="text-zinc-500 hover:text-zinc-700 transition text-sm"
                  data-tooltip="Cancel"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
          {isHost && !isEditingGoal && (
            <button
              onClick={removeRoomGoal}
              className={`px-3 py-1 rounded-lg transition text-sm ${
                darkMode
                  ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400'
                  : 'bg-red-50 hover:bg-red-100 text-red-600'
              }`}
            >
              Remove Goal
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="relative w-full mb-8" style={{ overflow: 'visible' }}>
          {/* Tooltip - rendered outside overflow container */}
          {hoveredSegment && (
            <div
              className="absolute px-3 py-2 text-sm rounded-md pointer-events-none whitespace-nowrap font-medium shadow-lg transition-opacity duration-200"
              style={{
                backgroundColor: 'rgba(24, 24, 27, 0.98)',
                color: '#ffffff',
                zIndex: 9999,
                left: `${hoveredSegment.relativeX}%`,
                bottom: '100%',
                marginBottom: '0.5rem',
                transform: 'translateX(-50%)'
              }}
            >
              <div>{hoveredSegment.user.name}</div>
              <div>{formatTime(hoveredSegment.user.seconds)}</div>
              <div>{Math.round(hoveredSegment.user.percentage)}% of total</div>
            </div>
          )}

          <div className={`w-full rounded-full h-8 border shadow-inner ${
            darkMode ? 'bg-[rgba(0,0,0,0.2)] border-[rgba(255,255,255,0.1)]' : 'bg-white/50 border-white/40'
          }`} style={{ overflow: 'hidden' }}>
            <div
              className="h-full flex transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            >
              {userContributions.map((user, index) => {
                // Calculate segment width as percentage of container (not page)
                const segmentWidthInContainer = progressPercent > 0 ? (user.percentageOfTotal) : 0;
                const isFirstSegment = index === 0;
                const isLastSegment = index === userContributions.length - 1;

                // Calculate the center position for tooltip (as percentage of page width)
                let cumulativeWidthOfPage = 0;
                for (let i = 0; i < index; i++) {
                  cumulativeWidthOfPage += userContributions[i].percentageOfGoal;
                }
                const segmentCenterPercent = cumulativeWidthOfPage + (user.percentageOfGoal / 2);

                return (
                  <div
                    key={user.id}
                    className={`h-full cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:brightness-110 ${
                      isFirstSegment ? 'rounded-l-full' : ''
                    } ${isLastSegment ? 'rounded-r-full' : ''}`}
                    style={{
                      width: `${segmentWidthInContainer}%`,
                      backgroundColor: user.color,
                      minWidth: segmentWidthInContainer > 0 ? '2px' : '0'
                    }}
                    onMouseEnter={() => {
                      setHoveredSegment({
                        user: {
                          ...user,
                          percentage: user.percentageOfTotal
                        },
                        relativeX: segmentCenterPercent
                      });
                    }}
                    onMouseLeave={() => setHoveredSegment(null)}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Don't render UI if not visible, but keep all hooks running for Firebase sync
  if (!isVisible) {
    return null;
  }

  return (
    <div className="tab-content">
      <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className={`${darkMode ? 'dark-glass-panel dark-shadow' : 'glass-panel shadow-lg'} rounded-xl p-6 mb-6 hover-lift`}>
        <div className="flex items-center gap-3 mb-4">
          <Users className={`w-4 h-4 ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`} />
          <h2 className={`text-3xl font-semibold ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`}>Co-op Timer</h2>
        </div>
        <p className={`text-lg ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>
          Sync your work timer with friends! See everyone's progress in real-time.
        </p>
      </div>

      {/* Connection Status / Room Controls */}
      {!isConnected ? (
        <div className={`${darkMode ? 'dark-glass-panel dark-shadow' : 'glass-panel shadow-lg'} rounded-xl p-6 hover-lift`}>
          <h3 className={`text-xl font-semibold mb-4 ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`}>
            Join or Create a Room
          </h3>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Username Input */}
          <div className="mb-4">
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'dark-text-primary' : 'text-zinc-700'}`}>
              Your Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your name"
              maxLength={MAX_USERNAME_LENGTH}
              className={`w-full p-3 border rounded-lg focus:outline-none focus:border-amber-500 ${
                darkMode ? 'dark-input' : 'bg-white/60 border-white/50 text-zinc-800'
              }`}
              disabled={isInitializing}
            />
          </div>

          {/* Custom Room Code Toggle */}
          <div className="mb-4">
            <button
              type="button"
              onClick={() => !isInitializing && setUseCustomCode(!useCustomCode)}
              disabled={isInitializing}
              className="inline-flex items-center gap-2 cursor-pointer px-2 py-1 rounded-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-opacity-20"
              style={{
                background: 'transparent',
                border: 'none'
              }}
            >
              <svg
                className="w-4 h-4 transition-all duration-300"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  color: useCustomCode ? 'rgb(251, 146, 60)' : darkMode ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
                  filter: useCustomCode ? 'drop-shadow(0 0 6px rgba(251, 146, 60, 0.8)) drop-shadow(0 0 10px rgba(251, 146, 60, 0.5))' : 'none'
                }}
              >
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
              </svg>
              <span
                className={`text-xs font-medium transition-all duration-300 ${
                  useCustomCode
                    ? 'text-orange-500'
                    : darkMode ? 'dark-text-secondary' : 'text-zinc-600'
                }`}
              >
                Use custom room code
              </span>
            </button>
          </div>

          {/* Custom Room Code Input (shown only when checkbox is checked) */}
          {useCustomCode && (
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'dark-text-primary' : 'text-zinc-700'}`}>
                Custom Room Code
              </label>
              <input
                type="text"
                value={customRoomCode}
                onChange={(e) => setCustomRoomCode(e.target.value.toUpperCase())}
                placeholder="8-character code"
                maxLength={ROOM_CODE_LENGTH}
                className={`w-full p-3 border rounded-lg focus:outline-none focus:border-amber-500 uppercase ${
                  darkMode ? 'dark-input' : 'bg-white/60 border-white/50 text-zinc-800'
                }`}
                disabled={isInitializing}
              />
              <p className={`text-xs mt-1 ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>
                Must be exactly {ROOM_CODE_LENGTH} characters (letters and numbers only)
              </p>
            </div>
          )}

          {/* Create Room */}
          <div className="mb-6">
            <button
              onClick={createRoom}
              disabled={isInitializing || !username.trim() || (useCustomCode && !customRoomCode.trim())}
              className="w-full text-white py-3 rounded-lg transition font-medium shadow-md breathing-gradient border-0 btn-press pulse-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isInitializing ? (
                <span>
                  Creating
                  <span className="bouncing-dots">
                    <span>.</span>
                    <span>.</span>
                    <span>.</span>
                  </span>
                </span>
              ) : (
                'Create New Room'
              )}
            </button>
          </div>

          {/* Join Room */}
          <div className={`pt-6 ${darkMode ? 'border-t border-[rgba(255,255,255,0.1)]' : 'border-t border-white/40'}`}>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'dark-text-primary' : 'text-zinc-700'}`}>
              Room Code
            </label>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="8-character code"
              maxLength={ROOM_CODE_LENGTH}
              className={`w-full p-3 border rounded-lg mb-3 focus:outline-none focus:border-amber-500 uppercase ${
                darkMode ? 'dark-input' : 'bg-white/60 border-white/50 text-zinc-800'
              }`}
              disabled={isInitializing}
            />
            <button
              onClick={joinRoom}
              disabled={isInitializing || !username.trim() || !joinCode.trim()}
              className={`w-full py-3 rounded-lg transition font-medium border shadow-md btn-press disabled:opacity-50 disabled:cursor-not-allowed ${
                darkMode
                  ? 'dark-button'
                  : 'bg-white/50 hover:bg-white/70 text-zinc-700 border-white/40'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <LogIn className="w-5 h-5" />
                {isInitializing ? (
                  <span>
                    Joining
                    <span className="bouncing-dots">
                      <span>.</span>
                      <span>.</span>
                      <span>.</span>
                    </span>
                  </span>
                ) : (
                  'Join Room'
                )}
              </div>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Room Info */}
          <div className={`${darkMode ? 'dark-glass-panel dark-shadow' : 'glass-panel shadow-lg'} rounded-xl p-6 mb-6 hover-lift ${justJoinedRoom ? 'float-up-into-place float-delay-1' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={`text-xl font-semibold ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`}>
                    Room Code
                  </h3>
                  {!isOnline && (
                    <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-500 border border-red-500/30">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      Offline
                    </span>
                  )}
                  {reconnecting && (
                    <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30">
                      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Reconnecting...
                    </span>
                  )}
                </div>
                <p className={`text-sm ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>
                  Share this code with others
                </p>
              </div>
              <button
                onClick={leaveRoom}
                className={`px-4 py-2 rounded-lg transition border flex items-center gap-2 ${
                  darkMode
                    ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30'
                    : 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200'
                }`}
              >
                <LogOut className="w-4 h-4" />
                Leave Room
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className={`flex-1 p-4 rounded-lg text-2xl font-semibold text-center ${
                darkMode ? 'bg-zinc-800/50' : 'bg-white/60'
              }`}>
                <span className="text-amber-500">{roomCode}</span>
              </div>
              <button
                onClick={copyRoomCode}
                className={`p-4 rounded-lg transition border ${
                  copiedCode
                    ? darkMode
                      ? 'bg-green-500/20 text-green-400 border-green-500/30'
                      : 'bg-green-50 text-green-600 border-green-200'
                    : darkMode
                    ? 'dark-button'
                    : 'bg-white/50 hover:bg-white/70 text-zinc-700 border-white/40'
                }`}
                data-tooltip={copiedCode ? 'Copied!' : 'Copy code'}
              >
                <Copy className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Room Goal / Total */}
          {renderRoomGoal()}

          {/* User List */}
          <div className={`${darkMode ? 'dark-glass-panel dark-shadow' : 'glass-panel shadow-lg'} rounded-xl p-6 hover-lift ${justJoinedRoom ? 'float-up-into-place float-delay-3' : ''}`}>
            <button
              onClick={() => setShowUserList(!showUserList)}
              className="w-full flex items-center justify-between mb-4"
            >
              <div className="flex items-center gap-2">
                <Users className={`w-4 h-4 ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`} />
                <h3 className={`text-xl font-semibold ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`}>
                  Active Users ({Object.keys(roomUsers).length})
                </h3>
              </div>
              <ChevronDown className={`w-5 h-5 panel-arrow ${!showUserList ? 'collapsed' : ''} ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`} />
            </button>

            {showUserList && (
              <div style={{ maxHeight: '32rem', overflowY: 'auto', overflowX: 'hidden' }}>
                <div className="space-y-3">
                  {Object.keys(roomUsers).length === 0 ? (
                    <p className={`text-center py-8 ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>
                      No users in room
                    </p>
                  ) : (
                    renderUserList()
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
      </div>
    </div>
  );
};
