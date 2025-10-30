// src/App.jsx - Main Application Component
const { useState, useEffect, useMemo, useCallback } = React;

function TaskRewardsApp() {
  const isElectron = typeof window.electronTimer !== 'undefined';

  const loadFromStorage = (key, defaultValue) => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  // State declarations
  const [points, setPoints] = useState(() => loadFromStorage('taskmaster_points', 0));
  const [totalPointsEarned, setTotalPointsEarned] = useState(() => loadFromStorage('taskmaster_total_points', 0));
  const [tasks, setTasks] = useState(() => loadFromStorage('taskmaster_tasks', []));
  const [completedTasks, setCompletedTasks] = useState(() => loadFromStorage('taskmaster_completed', []));
  const [rewards, setRewards] = useState(() => loadFromStorage('taskmaster_rewards', []));
  const [redeemedRewards, setRedeemedRewards] = useState(() => loadFromStorage('taskmaster_redeemed', []));
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showRewardForm, setShowRewardForm] = useState(false);
  const [showTasksSection, setShowTasksSection] = useState(true);
  const [showRewardsSection, setShowRewardsSection] = useState(true);
  const [showCompletedSection, setShowCompletedSection] = useState(true);
  const [showRedeemedSection, setShowRedeemedSection] = useState(true);
  const [activeTab, setActiveTab] = useState('home'); // Changed from 'tasks' to 'home'
  const [newTask, setNewTask] = useState({ name: '', points: '', repeatable: false });
  const [newReward, setNewReward] = useState({ name: '', cost: '', repeatable: false });
  const [editingTask, setEditingTask] = useState(null);
  const [editingReward, setEditingReward] = useState(null);
  const [draggedTaskIndex, setDraggedTaskIndex] = useState(null);
  const [draggedRewardIndex, setDraggedRewardIndex] = useState(null);
  const [taskSortBy, setTaskSortBy] = useState('manual');
  const [rewardSortBy, setRewardSortBy] = useState('manual');

  const [timerSeconds, setTimerSeconds] = useState(() => loadFromStorage('taskmaster_timer_seconds', 0));
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isTimerPaused, setIsTimerPaused] = useState(true);
  const [timerSessions, setTimerSessions] = useState(() => loadFromStorage('taskmaster_timer_sessions', []));
  const [trackedApps, setTrackedApps] = useState(() => loadFromStorage('taskmaster_tracked_apps', []));
  const [newAppName, setNewAppName] = useState('');
  const [inactivityTimeout, setInactivityTimeout] = useState(() => loadFromStorage('taskmaster_inactivity_timeout', 5));
  const [showTimerSettings, setShowTimerSettings] = useState(false);
  const [currentActiveApp, setCurrentActiveApp] = useState(null);

  const [streakData, setStreakData] = useState(() => loadFromStorage('taskmaster_streak_data', {
    currentStreak: 0,
    longestStreak: 0,
    checkedDates: []
  }));

  const [dailySummaries, setDailySummaries] = useState(() => loadFromStorage('taskmaster_daily_summaries', {}));

  const [countdown, setCountdown] = useState('');
  const [mouseInactivityTime, setMouseInactivityTime] = useState(() => loadFromStorage('taskmaster_mouse_inactivity', 2));
  const [lastMouseActivity, setLastMouseActivity] = useState(Date.now());
  
  const [alwaysOnTop, setAlwaysOnTop] = useState(() => loadFromStorage('taskmaster_always_on_top', false));
  const [autoStartTimer, setAutoStartTimer] = useState(() => loadFromStorage('taskmaster_auto_start_timer', false));
  const [autoLogEnabled, setAutoLogEnabled] = useState(() => loadFromStorage('taskmaster_auto_log_enabled', false));
  const [autoLogTime, setAutoLogTime] = useState(() => loadFromStorage('taskmaster_auto_log_time', '23:59'));
  const [progressDuration, setProgressDuration] = useState(() => loadFromStorage('taskmaster_progress_duration', 28800)); // Default 8 hours in seconds
  const [darkMode, setDarkMode] = useState(() => loadFromStorage('taskmaster_dark_mode', true));
  const [textSize, setTextSize] = useState(() => loadFromStorage('taskmaster_text_size', 100)); // Default 100%

  // Co-op state
  const [coopRoomCode, setCoopRoomCode] = useState(() => loadFromStorage('taskmaster_coop_room_code', ''));
  const [coopUsername, setCoopUsername] = useState(() => loadFromStorage('taskmaster_coop_username', ''));
  const [coopUserId, setCoopUserId] = useState(() => loadFromStorage('taskmaster_coop_user_id', ''));

  // Notification state
  const [notification, setNotification] = useState({ message: '', isVisible: false });
  const [coopRoomUsers, setCoopRoomUsers] = useState({});

  // Preview points for hover animation
  const [previewPoints, setPreviewPoints] = useState(null);

  // Send coop room data to Electron main process for mini window
  useEffect(() => {
    if (isElectron) {
      window.electronTimer.updateCoopRoomData(coopRoomCode, coopUserId, coopUsername);
    }
  }, [coopRoomCode, coopUserId, coopUsername, isElectron]);

  // Consolidated localStorage effects with debouncing and size validation
  useEffect(() => {
    const storageData = {
      taskmaster_points: points,
      taskmaster_total_points: totalPointsEarned,
      taskmaster_tasks: tasks,
      taskmaster_completed: completedTasks,
      taskmaster_rewards: rewards,
      taskmaster_redeemed: redeemedRewards,
      taskmaster_timer_seconds: timerSeconds,
      taskmaster_timer_sessions: timerSessions,
      taskmaster_tracked_apps: trackedApps,
      taskmaster_inactivity_timeout: inactivityTimeout,
      taskmaster_streak_data: streakData,
      taskmaster_daily_summaries: dailySummaries,
      taskmaster_mouse_inactivity: mouseInactivityTime,
      taskmaster_always_on_top: alwaysOnTop,
      taskmaster_auto_start_timer: autoStartTimer,
      taskmaster_auto_log_enabled: autoLogEnabled,
      taskmaster_auto_log_time: autoLogTime,
      taskmaster_progress_duration: progressDuration,
      taskmaster_dark_mode: darkMode,
      taskmaster_text_size: textSize,
      taskmaster_coop_room_code: coopRoomCode,
      taskmaster_coop_username: coopUsername,
      taskmaster_coop_user_id: coopUserId
    };

    const timeoutId = setTimeout(() => {
      try {
        let totalSize = 0;
        const entries = Object.entries(storageData);

        // Validate total size before saving
        for (const [key, value] of entries) {
          const serialized = JSON.stringify(value);
          totalSize += serialized.length;

          if (totalSize > window.Constants.STORAGE.MAX_SIZE) {
            window.Logger.warn('Storage quota exceeded, skipping save');
            return;
          }
        }

        // Save all entries
        entries.forEach(([key, value]) => {
          localStorage.setItem(key, JSON.stringify(value));
        });

        // Send image data to Electron main process (replaces executeJavaScript approach)
        if (isElectron) {
          const customImage = localStorage.getItem('customTimerImage');
          const customDimensions = localStorage.getItem('customImageDimensions');
          if (customImage || customDimensions) {
            window.electronTimer.setStoredImageData({
              image: customImage,
              dimensions: customDimensions
            }).catch(err => window.Logger.error('Failed to sync image data to main process', err));
          }
        }
      } catch (error) {
        window.Logger.error('Error saving to localStorage', error);
      }
    }, window.Constants.TIMING.DEBOUNCE_STORAGE);

    return () => clearTimeout(timeoutId);
  }, [points, totalPointsEarned, tasks, completedTasks, rewards, redeemedRewards,
      timerSeconds, timerSessions, trackedApps, inactivityTimeout, streakData,
      dailySummaries, mouseInactivityTime, alwaysOnTop, autoStartTimer, autoLogEnabled, autoLogTime, progressDuration, darkMode, textSize,
      coopRoomCode, coopUsername, coopUserId, isElectron]);

  // Countdown to end of year
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const endOfYear = new Date(now.getFullYear() + 1, 0, 1, 0, 0, 0);
      const diff = endOfYear - now;

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown(`There are ${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds left in the year.`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // State to track last auto-log execution
  const [lastAutoLogTime, setLastAutoLogTime] = useState(null);

  // Auto-log timer check with race condition prevention
  useEffect(() => {
    if (!autoLogEnabled) return;

    const checkAutoLog = async () => {
      const now = new Date();
      const [hours, minutes] = autoLogTime.split(':').map(Number);
      const currentKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${hours}:${minutes}`;

      // Only execute once per minute
      if (lastAutoLogTime !== currentKey &&
          now.getHours() === hours &&
          now.getMinutes() === minutes) {
        setLastAutoLogTime(currentKey);

        if (timerSeconds > 0) {
          await logSession();
          // Restart timer after logging - ensure it starts from 0
          if (trackedApps.length > 0 && isElectron) {
            setTimeout(async () => {
              await window.electronTimer.setTimerSeconds(0);
              await window.electronTimer.startTimer(trackedApps, inactivityTimeout);
              setIsTimerRunning(true);
            }, 1000);
          }
        }
      }
    };

    const interval = setInterval(checkAutoLog, window.Constants.TIMING.AUTO_LOG_CHECK);
    return () => clearInterval(interval);
  }, [autoLogEnabled, autoLogTime, timerSeconds, trackedApps, isElectron, inactivityTimeout, lastAutoLogTime]);

  // Mouse activity tracking
  useEffect(() => {
    const handleMouseMove = () => {
      setLastMouseActivity(Date.now());
      if (isElectron) {
        window.electronTimer.updateMouseActivity();
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isElectron]);

  // Electron timer integration
  useEffect(() => {
    if (isElectron) {
      window.electronTimer.getTimerSeconds().then(seconds => {
        if (seconds > 0) {
          setTimerSeconds(seconds);
        }
      });

      window.electronTimer.getTrackingStatus().then(async (status) => {
        setIsTimerRunning(status);

        // Auto-start timer on app launch if enabled and not already running
        if (!status && autoStartTimer && trackedApps.length > 0) {
          await window.electronTimer.setTimerSeconds(timerSeconds);
          await window.electronTimer.startTimer(trackedApps, inactivityTimeout);
          setIsTimerRunning(true);
        }
      });

      window.electronTimer.getPausedStatus().then(isPaused => {
        setIsTimerPaused(isPaused);
      });

      window.electronTimer.getMouseInactivityTimeout().then(timeout => {
        setMouseInactivityTime(timeout);
      });

      window.electronTimer.getAlwaysOnTop().then(enabled => {
        setAlwaysOnTop(enabled);
      });

      window.electronTimer.onTimerUpdate((seconds) => {
        setTimerSeconds(seconds);
      });

      window.electronTimer.onTrackingStatus((status) => {
        setIsTimerRunning(status);
      });

      window.electronTimer.onTimerPausedStatus((isPaused) => {
        setIsTimerPaused(isPaused);
      });

      window.electronTimer.onTimerStoppedInactive(() => {
        setIsTimerRunning(false);
      });

      const appCheckInterval = setInterval(async () => {
        const app = await window.electronTimer.getOpenApps();
        if (app) {
          setCurrentActiveApp(app.name);
        }
      }, 2000);

      return () => clearInterval(appCheckInterval);
    }
  }, [isElectron]);

  // Task functions
  const addTask = () => {
    if (newTask.name && newTask.points) {
      setTasks([...tasks, { 
        id: Date.now(), 
        name: newTask.name, 
        points: parseInt(newTask.points),
        repeatable: newTask.repeatable,
        createdAt: window.Utils.formatDateTime(),
        createdTimestamp: Date.now()
      }]);
      setNewTask({ name: '', points: '', repeatable: false });
      setShowTaskForm(false);
    }
  };

  const sortedTasks = useMemo(() => {
    if (tasks.length === 0) return [];
    if (taskSortBy === 'manual') return tasks;

    const createComparator = (sortBy) => {
      switch (sortBy) {
        case 'dateAsc':
          return (a, b) => (a.createdTimestamp || 0) - (b.createdTimestamp || 0);
        case 'dateDesc':
          return (a, b) => (b.createdTimestamp || 0) - (a.createdTimestamp || 0);
        case 'pointsAsc':
          return (a, b) => a.points - b.points;
        case 'pointsDesc':
          return (a, b) => b.points - a.points;
        default:
          return null;
      }
    };

    const comparator = createComparator(taskSortBy);
    return comparator ? [...tasks].sort(comparator) : tasks;
  }, [tasks, taskSortBy]);

  const completeTask = (task) => {
    setPoints(points + task.points);
    setTotalPointsEarned(totalPointsEarned + task.points);
    const completedItem = {
      ...task,
      completedAt: window.Utils.formatDateTime(),
      completedId: Date.now()
    };
    setCompletedTasks([completedItem, ...completedTasks]);

    // Update daily summary
    const today = window.Utils.getTodayDateString();
    setDailySummaries(prev => ({
      ...prev,
      [today]: {
        pointsEarned: (prev[today]?.pointsEarned || 0) + task.points,
        timerSeconds: prev[today]?.timerSeconds || 0,
        completedTasks: [
          ...(prev[today]?.completedTasks || []),
          { name: task.name, points: task.points, completedAt: window.Utils.formatDateTime() }
        ]
      }
    }));

    if (!task.repeatable) {
      setTasks(tasks.filter(t => t.id !== task.id));
    }
  };

  const deleteTask = (id) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const deleteCompletedTask = (completedId) => {
    setCompletedTasks(completedTasks.filter(t => t.completedId !== completedId));
  };

  const handleTaskDragStart = (index, e) => {
    setDraggedTaskIndex(index);

    // Hide drag preview by creating an invisible image
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleTaskDragOver = (e, index) => {
    e.preventDefault();
    if (draggedTaskIndex === null || draggedTaskIndex === index) return;
    
    const newTasks = [...tasks];
    const draggedTask = newTasks[draggedTaskIndex];
    newTasks.splice(draggedTaskIndex, 1);
    newTasks.splice(index, 0, draggedTask);
    
    setTasks(newTasks);
    setDraggedTaskIndex(index);
  };

  const handleTaskDragEnd = () => {
    setDraggedTaskIndex(null);
  };

  // Reward functions
  const addReward = () => {
    if (newReward.name && newReward.cost) {
      setRewards([...rewards, { 
        id: Date.now(), 
        name: newReward.name, 
        cost: parseInt(newReward.cost),
        repeatable: newReward.repeatable,
        createdTimestamp: Date.now()
      }]);
      setNewReward({ name: '', cost: '', repeatable: false });
      setShowRewardForm(false);
    }
  };

  const sortedRewards = useMemo(() => {
    if (rewards.length === 0) return [];
    if (rewardSortBy === 'manual') return rewards;

    const createComparator = (sortBy) => {
      switch (sortBy) {
        case 'dateAsc':
          return (a, b) => (a.createdTimestamp || 0) - (b.createdTimestamp || 0);
        case 'dateDesc':
          return (a, b) => (b.createdTimestamp || 0) - (a.createdTimestamp || 0);
        case 'costAsc':
          return (a, b) => a.cost - b.cost;
        case 'costDesc':
          return (a, b) => b.cost - a.cost;
        default:
          return null;
      }
    };

    const comparator = createComparator(rewardSortBy);
    return comparator ? [...rewards].sort(comparator) : rewards;
  }, [rewards, rewardSortBy]);

  const redeemReward = (reward) => {
    if (points >= reward.cost) {
      setPoints(points - reward.cost);
      const redeemedItem = {
        ...reward,
        redeemedAt: window.Utils.formatDateTime(),
        redeemedId: Date.now()
      };
      setRedeemedRewards([redeemedItem, ...redeemedRewards]);
      
      if (!reward.repeatable) {
        setRewards(rewards.filter(r => r.id !== reward.id));
      }
    }
  };

  const deleteReward = (id) => {
    setRewards(rewards.filter(r => r.id !== id));
  };

  const deleteRedeemedReward = (redeemedId) => {
    setRedeemedRewards(redeemedRewards.filter(r => r.redeemedId !== redeemedId));
  };

  const handleRewardDragStart = (index, e) => {
    setDraggedRewardIndex(index);

    // Hide drag preview by creating an invisible image
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleRewardDragOver = (e, index) => {
    e.preventDefault();
    if (draggedRewardIndex === null || draggedRewardIndex === index) return;
    
    const newRewards = [...rewards];
    const draggedReward = newRewards[draggedRewardIndex];
    newRewards.splice(draggedRewardIndex, 1);
    newRewards.splice(index, 0, draggedReward);
    
    setRewards(newRewards);
    setDraggedRewardIndex(index);
  };

  const handleRewardDragEnd = () => {
    setDraggedRewardIndex(null);
  };

  // Timer functions
  const startTimer = async () => {
    if (isElectron && trackedApps.length > 0) {
      await window.electronTimer.setTimerSeconds(timerSeconds);
      await window.electronTimer.startTimer(trackedApps, inactivityTimeout);
      setIsTimerRunning(true);
    } else if (!isElectron) {
      setIsTimerRunning(true);
    } else {
      showNotification('Please add at least one application to track first!');
    }
  };

  const stopTimer = async () => {
    setIsTimerRunning(false);
    if (isElectron) {
      await window.electronTimer.stopTimer();
    }
  };

  const resetTimer = async () => {
    setIsTimerRunning(false);
    setTimerSeconds(0);
    if (isElectron) {
      await window.electronTimer.resetTimer();
    }
  };

  const logSession = async () => {
    // Validate timer seconds
    const validSeconds = Number.isInteger(timerSeconds) && timerSeconds > 0 ? timerSeconds : 0;

    if (validSeconds === 0) {
      window.Logger.warn('Invalid timer seconds, cannot log session');
      return;
    }

    try {
      setTimerSessions([{
        duration: validSeconds,
        date: window.Utils.formatDateTime()
      }, ...timerSessions]);

      // Update daily summary
      const today = window.Utils.getTodayDateString();
      setDailySummaries(prev => ({
        ...prev,
        [today]: {
          pointsEarned: prev[today]?.pointsEarned || 0,
          timerSeconds: (prev[today]?.timerSeconds || 0) + validSeconds,
          completedTasks: prev[today]?.completedTasks || []
        }
      }));

      // Auto-increment streak when work time is logged
      if (!streakData.checkedDates.includes(today)) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayString = `${yesterday.getFullYear()}-${(yesterday.getMonth() + 1).toString().padStart(2, '0')}-${yesterday.getDate().toString().padStart(2, '0')}`;

        let newStreak;
        if (streakData.checkedDates.includes(yesterdayString)) {
          newStreak = streakData.currentStreak + 1;
        } else {
          newStreak = 1;
        }

        setStreakData({
          currentStreak: newStreak,
          longestStreak: Math.max(newStreak, streakData.longestStreak),
          checkedDates: [...streakData.checkedDates, today]
        });
      }

      await resetTimer();
    } catch (error) {
      window.Logger.error('Error logging session', error);
    }
  };

  useEffect(() => {
    let interval;
    if (isTimerRunning && !isElectron) {
      interval = setInterval(() => {
        const inactiveSeconds = (Date.now() - lastMouseActivity) / 1000;
        if (inactiveSeconds < mouseInactivityTime) {
          setTimerSeconds(prev => prev + 1);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, isElectron, lastMouseActivity, mouseInactivityTime]);

  const addTrackedApp = async () => {
    const appName = newAppName.trim();

    // Validate input
    if (!appName) return;

    if (appName.length > window.Constants.GAME.MAX_APP_NAME_LENGTH) {
      showNotification(`App name too long (max ${window.Constants.GAME.MAX_APP_NAME_LENGTH} characters)`);
      return;
    }

    // Normalize and check for duplicates
    const normalizedName = appName.toLowerCase();
    if (trackedApps.some(app => app.toLowerCase() === normalizedName)) {
      showNotification('This app is already being tracked');
      return;
    }

    const updatedApps = [...trackedApps, appName];
    setTrackedApps(updatedApps);
    setNewAppName('');

    // Update tracked apps in Electron without restarting timer
    if (isElectron && isTimerRunning) {
      await window.electronTimer.updateTrackedApps(updatedApps);
    }
  };

  const removeTrackedApp = async (index) => {
    const updatedApps = trackedApps.filter((_, i) => i !== index);
    setTrackedApps(updatedApps);

    // Update tracked apps in Electron without restarting timer
    if (isElectron && isTimerRunning) {
      await window.electronTimer.updateTrackedApps(updatedApps);
    }
  };

  const detectCurrentApp = async () => {
    if (isElectron) {
      const app = await window.electronTimer.getOpenApps();
      if (app) {
        setNewAppName(app.name);
      }
    }
  };

  const openMiniWindow = async () => {
    if (isElectron) {
      await window.electronTimer.openMiniWindow();
    }
  };

  // Notification function
  const showNotification = (message) => {
    setNotification({ message, isVisible: true });
  };

  const closeNotification = () => {
    setNotification(prev => ({ ...prev, isVisible: false }));
  };

  // Settings functions
  const toggleAlwaysOnTop = async (enabled) => {
    setAlwaysOnTop(enabled);
    if (isElectron) {
      await window.electronTimer.setAlwaysOnTop(enabled);
    }
    // Show notification when Always on top is toggled
    if (enabled) {
      showNotification('Always on top mode enabled');
    } else {
      showNotification('Always on top mode disabled');
    }
  };

  const clearCompletedHistory = () => {
    if (window.confirm('Are you sure you want to clear all completed task history?')) {
      setCompletedTasks([]);
    }
  };

  const clearRedeemedHistory = () => {
    if (window.confirm('Are you sure you want to clear all redeemed reward history?')) {
      setRedeemedRewards([]);
    }
  };

  const clearTimerSessions = () => {
    if (window.confirm('Are you sure you want to clear all timer session history?')) {
      setTimerSessions([]);
    }
  };

  const clearDailySummaries = () => {
    if (window.confirm('Are you sure you want to clear all daily summaries? This will delete all tracked points and work time history.')) {
      setDailySummaries({});
    }
  };

  // Streak functions
  const checkInToday = () => {
    const today = window.Utils.getTodayDateString();
    if (streakData.checkedDates.includes(today)) {
      return;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = `${yesterday.getFullYear()}-${(yesterday.getMonth() + 1).toString().padStart(2, '0')}-${yesterday.getDate().toString().padStart(2, '0')}`;

    let newStreak;
    if (streakData.checkedDates.includes(yesterdayString)) {
      newStreak = streakData.currentStreak + 1;
    } else {
      newStreak = 1;
    }

    setStreakData({
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, streakData.longestStreak),
      checkedDates: [...streakData.checkedDates, today]
    });
  };

  const isDateChecked = (dateString) => {
    return streakData.checkedDates.includes(dateString);
  };

  // Apply dark mode class to body
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  // Apply text size globally
  useEffect(() => {
    document.documentElement.style.fontSize = `${textSize}%`;
  }, [textSize]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = async (e) => {
      // Ctrl+1-5: Switch tabs
      if (e.ctrlKey && ['1', '2', '3', '4', '5'].includes(e.key)) {
        e.preventDefault();
        const tabMap = {
          '1': 'home',
          '2': 'timer',
          '3': 'streak',
          '4': 'coop',
          '5': 'settings'
        };
        setActiveTab(tabMap[e.key]);
        return;
      }

      // Simple checks first
      if (e.ctrlKey && e.key === 't') {
        e.preventDefault();
        setShowTaskForm(prev => !prev);
        setShowTasksSection(true);
        setActiveTab('home');
      }
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        setShowRewardForm(prev => !prev);
        setShowRewardsSection(true);
        setActiveTab('home');
      }

      // Ctrl+W: Toggle work timer
      if (e.ctrlKey && e.key === 'w') {
        e.preventDefault();

        if (trackedApps.length === 0) {
          showNotification('Add a tracked application first!');
          return;
        }

        if (isTimerRunning) {
          // Stop the timer
          await stopTimer();
          showNotification('Work timer disabled');
        } else {
          // Start the timer
          await startTimer();
          showNotification('Work timer enabled');
        }
      }

      // Ctrl+E: Toggle mini timer window (only in Electron)
      if (isElectron && e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        const result = await window.electronTimer.toggleMiniWindow();
        if (result.opened) {
          showNotification('Mini Timer opened');
        } else {
          showNotification('Mini Timer closed');
        }
      }

      // Shift+T: Toggle always on top (only in Electron)
      if (isElectron && e.shiftKey && e.key === 'T' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        const newState = !alwaysOnTop;
        await toggleAlwaysOnTop(newState);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [trackedApps, isTimerRunning, alwaysOnTop, isElectron]);

  // Render
  return (
    <div className={`flex h-screen overflow-x-hidden ${darkMode ? 'bg-[#1e1e1e]' : 'bg-gray-50'}`}>
      {/* Sidebar */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} darkMode={darkMode} />

      {/* Main Content */}
      <div className={`flex-1 overflow-auto ${darkMode ? 'bg-[#1e1e1e]' : 'bg-gradient-to-br from-amber-50 via-orange-50 to-rose-100'}`}>
        <div className="max-w-7xl mx-auto p-8" style={{ WebkitAppRegion: 'no-drag' }}>

          {/* Co-op Panel - Always mounted for continuous Firebase sync, but only shows UI when active */}
          <window.CoopPanel
            timerSeconds={timerSeconds}
            isTimerRunning={isTimerRunning}
            isTimerPaused={isTimerPaused}
            darkMode={darkMode}
            roomCode={coopRoomCode}
            setRoomCode={setCoopRoomCode}
            username={coopUsername}
            setUsername={setCoopUsername}
            userId={coopUserId}
            setUserId={setCoopUserId}
            isVisible={activeTab === 'coop'}
            showNotification={showNotification}
            isElectron={isElectron}
          />
          
          {activeTab === 'home' && (
            <div className="tab-content">
              <window.Header points={points} previewPoints={previewPoints} totalPointsEarned={totalPointsEarned} countdown={countdown} darkMode={darkMode} />

              <div className="space-y-6">
                <div className="grid lg:grid-cols-2 gap-6">
                  <window.TasksPanel tasks={tasks} setTasks={setTasks} points={points} setPreviewPoints={setPreviewPoints} showTasksSection={showTasksSection} setShowTasksSection={setShowTasksSection} showTaskForm={showTaskForm} setShowTaskForm={setShowTaskForm} newTask={newTask} setNewTask={setNewTask} taskSortBy={taskSortBy} setTaskSortBy={setTaskSortBy} editingTask={editingTask} setEditingTask={setEditingTask} draggedTaskIndex={draggedTaskIndex} setDraggedTaskIndex={setDraggedTaskIndex} completeTask={completeTask} deleteTask={deleteTask} sortedTasks={sortedTasks} handleTaskDragStart={handleTaskDragStart} handleTaskDragOver={handleTaskDragOver} handleTaskDragEnd={handleTaskDragEnd} addTask={addTask} darkMode={darkMode} />
                  <window.RewardsPanel rewards={rewards} setRewards={setRewards} points={points} setPreviewPoints={setPreviewPoints} showRewardsSection={showRewardsSection} setShowRewardsSection={setShowRewardsSection} showRewardForm={showRewardForm} setShowRewardForm={setShowRewardForm} newReward={newReward} setNewReward={setNewReward} rewardSortBy={rewardSortBy} setRewardSortBy={setRewardSortBy} editingReward={editingReward} setEditingReward={setEditingReward} draggedRewardIndex={draggedRewardIndex} setDraggedRewardIndex={setDraggedRewardIndex} redeemReward={redeemReward} deleteReward={deleteReward} sortedRewards={sortedRewards} handleRewardDragStart={handleRewardDragStart} handleRewardDragOver={handleRewardDragOver} handleRewardDragEnd={handleRewardDragEnd} addReward={addReward} darkMode={darkMode} />
                </div>
                <div className="grid lg:grid-cols-2 gap-6">
                  <window.CompletedPanel completedTasks={completedTasks} showCompletedSection={showCompletedSection} setShowCompletedSection={setShowCompletedSection} deleteCompletedTask={deleteCompletedTask} darkMode={darkMode} />
                  <window.RedeemedPanel redeemedRewards={redeemedRewards} showRedeemedSection={showRedeemedSection} setShowRedeemedSection={setShowRedeemedSection} deleteRedeemedReward={deleteRedeemedReward} darkMode={darkMode} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'timer' && (
            <div className="tab-content">
              <window.TimerPanel timerSeconds={timerSeconds} isTimerRunning={isTimerRunning} isTimerPaused={isTimerPaused} timerSessions={timerSessions} setTimerSessions={setTimerSessions} trackedApps={trackedApps} setTrackedApps={setTrackedApps} newAppName={newAppName} setNewAppName={setNewAppName} mouseInactivityTime={mouseInactivityTime} setMouseInactivityTime={setMouseInactivityTime} showTimerSettings={showTimerSettings} setShowTimerSettings={setShowTimerSettings} currentActiveApp={currentActiveApp} startTimer={startTimer} stopTimer={stopTimer} logSession={logSession} addTrackedApp={addTrackedApp} removeTrackedApp={removeTrackedApp} detectCurrentApp={detectCurrentApp} openMiniWindow={openMiniWindow} isElectron={isElectron} progressDuration={progressDuration} setProgressDuration={setProgressDuration} darkMode={darkMode} />
            </div>
          )}


          {activeTab === 'streak' && (
            <div className="tab-content">
              <window.StreakPanel streakData={streakData} checkInToday={checkInToday} isDateChecked={isDateChecked} dailySummaries={dailySummaries} setDailySummaries={setDailySummaries} darkMode={darkMode} />
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="tab-content">
              <window.SettingsPanel isElectron={isElectron} points={points} setPoints={setPoints} setTotalPointsEarned={setTotalPointsEarned} clearCompletedHistory={clearCompletedHistory} clearRedeemedHistory={clearRedeemedHistory} clearTimerSessions={clearTimerSessions} clearDailySummaries={clearDailySummaries} autoStartTimer={autoStartTimer} setAutoStartTimer={setAutoStartTimer} autoLogEnabled={autoLogEnabled} setAutoLogEnabled={setAutoLogEnabled} autoLogTime={autoLogTime} setAutoLogTime={setAutoLogTime} alwaysOnTop={alwaysOnTop} toggleAlwaysOnTop={toggleAlwaysOnTop} textSize={textSize} setTextSize={setTextSize} darkMode={darkMode} />
            </div>
          )}
        </div>
      </div>

      {/* Glass Notification */}
      <window.Notification
        message={notification.message}
        isVisible={notification.isVisible}
        onClose={closeNotification}
        duration={5000}
      />
    </div>
  );
}

ReactDOM.render(<TaskRewardsApp />, document.getElementById('root'));