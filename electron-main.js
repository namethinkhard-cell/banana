const { app, BrowserWindow, ipcMain, globalShortcut, Menu, screen, Tray } = require('electron');
const { autoUpdater } = require('electron-updater');
const activeWin = require('active-win');
const path = require('path');

// Constants for validation
const TIMER_MAX_SECONDS = 999999; // ~11 days
const TIMEOUT_MIN = 0;
const TIMEOUT_MAX = 3600; // 1 hour
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const OPACITY_MIN = 0.1;
const OPACITY_MAX = 1.0;

let mainWindow;
let miniWindow;
let tray = null;
let timerInterval;
let mouseCheckInterval;
let trackingInterval = null; // Track the global tracking interval
let currentSeconds = 0;
let isTracking = false;
let isPaused = true;
let trackedApps = [];
let lastActiveApp = null;
let inactivityTimeout = 5;
let mouseInactivityTimeout = 2;
let lastMouseActivity = Date.now();
let lastMousePosition = null;
let customMiniImage = '';
let miniWindowDimensions = { width: 180, height: 40 };
let lastClickedApp = null;
let lastNonElectronApp = null;
let customShortcut = null; // Track custom shortcuts separately
let coopRoomData = { roomCode: '', userId: '', username: '' };
let coopUsers = {};

// Auto-updater configuration
autoUpdater.autoDownload = false; // Don't auto-download, let user choose
autoUpdater.autoInstallOnAppQuit = true; // Install when app quits

// Auto-updater event handlers
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for updates...');
  if (mainWindow) {
    mainWindow.webContents.send('update-status', { status: 'checking' });
  }
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info.version);
  if (mainWindow) {
    mainWindow.webContents.send('update-status', { status: 'available', info });
  }
});

autoUpdater.on('update-not-available', (info) => {
  console.log('Update not available');
  if (mainWindow) {
    mainWindow.webContents.send('update-status', { status: 'not-available', info });
  }
});

autoUpdater.on('error', (err) => {
  console.error('Update error:', err);
  if (mainWindow) {
    mainWindow.webContents.send('update-status', { status: 'error', error: err.message });
  }
});

autoUpdater.on('download-progress', (progressObj) => {
  console.log(`Download progress: ${progressObj.percent}%`);
  if (mainWindow) {
    mainWindow.webContents.send('update-status', { status: 'downloading', progress: progressObj });
  }
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info.version);
  if (mainWindow) {
    mainWindow.webContents.send('update-status', { status: 'downloaded', info });
  }
});

function createTray() {
  const iconPath = path.join(__dirname, 'src/icons/logo.png');
  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('banana');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 1100,
    icon: path.join(__dirname, 'src/icons/logo.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  Menu.setApplicationMenu(null);

  mainWindow.loadFile('index.html');

  // mainWindow.webContents.openDevTools();

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    } else {
      // Only close mini window when app is actually quitting
      if (miniWindow) {
        miniWindow.close();
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createMiniWindow() {
  if (miniWindow) {
    miniWindow.focus();
    return;
  }

  miniWindow = new BrowserWindow({
    width: miniWindowDimensions.width,
    height: miniWindowDimensions.height,
    frame: false,
    alwaysOnTop: true,
    resizable: true,
    skipTaskbar: false,
    parent: null,
    icon: path.join(__dirname, 'src/icons/logo.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  Menu.setApplicationMenu(null);

  miniWindow.loadFile('mini.html');

  // Open DevTools for debugging (comment out for production)
  // miniWindow.webContents.openDevTools({ mode: 'detach' });

  // Ensure always on top with highest priority
  miniWindow.setAlwaysOnTop(true, 'screen-saver');

  // Send coop room data to mini window once it's ready
  miniWindow.webContents.once('did-finish-load', () => {
    if (miniWindow) {
      miniWindow.webContents.send('coop-room-data-update', coopRoomData);
      miniWindow.webContents.send('coop-users-update', coopUsers);
    }
  });

  miniWindow.on('closed', () => {
    miniWindow = null;
  });
}

async function checkActiveWindow() {
  if (!isTracking) return;
  
  try {
    const activeWindow = await activeWin();
    
    if (activeWindow) {
      const appName = activeWindow.owner.name.toLowerCase();
      const windowTitle = activeWindow.title.toLowerCase();
      
      const isTrackedApp = trackedApps.some(tracked => {
        const trackedLower = tracked.toLowerCase();
        return appName.includes(trackedLower) || windowTitle.includes(trackedLower);
      });
      
      // Check mouse inactivity - timer should only increment if BOTH conditions are true:
      // 1. User is in a tracked app
      // 2. Mouse has moved recently (unless timeout is 0, which means never pause)
      const mouseInactiveSeconds = (Date.now() - lastMouseActivity) / 1000;
      const isMouseActive = mouseInactivityTimeout === 0 || mouseInactiveSeconds < mouseInactivityTimeout;

      // Only increment timer if in tracked app AND mouse is active
      if (isTrackedApp && isMouseActive) {
        if (isPaused) {
          isPaused = false;
          if (mainWindow) mainWindow.webContents.send('timer-paused-status', false);
          if (miniWindow) miniWindow.webContents.send('timer-paused-status', false);
        }
        lastActiveApp = Date.now();
        currentSeconds++;
        if (mainWindow) mainWindow.webContents.send('timer-update', currentSeconds);
        if (miniWindow) miniWindow.webContents.send('timer-update', currentSeconds);
      } else {
        // Pause if either: not in tracked app OR mouse is inactive
        if (!isPaused) {
          isPaused = true;
          if (mainWindow) mainWindow.webContents.send('timer-paused-status', true);
          if (miniWindow) miniWindow.webContents.send('timer-paused-status', true);
        }
      }
    }
  } catch (error) {
    console.error('Error checking active window:', error);
  }
}

async function checkMouseMovement() {
  try {
    const currentMousePosition = screen.getCursorScreenPoint();

    // Check if mouse has moved
    if (lastMousePosition &&
        (currentMousePosition.x !== lastMousePosition.x ||
         currentMousePosition.y !== lastMousePosition.y)) {
      lastMouseActivity = Date.now();
    }

    lastMousePosition = currentMousePosition;
  } catch (error) {
    console.error('Error checking mouse movement:', error);
  }
}

async function trackActiveApp() {
  try {
    const activeWindow = await activeWin();
    if (activeWindow) {
      const appName = activeWindow.owner.name;
      // Only store non-Electron apps
      if (appName.toLowerCase() !== 'electron' && !appName.toLowerCase().includes('electron')) {
        lastNonElectronApp = appName;
      }
    }
  } catch (error) {
    console.error('Error tracking active app:', error);
  }
}

// Start tracking active window periodically - managed globally
function startGlobalTracking() {
  if (!trackingInterval) {
    trackingInterval = setInterval(trackActiveApp, 500);
  }
}

function stopGlobalTracking() {
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;
  }
}

function startTracking(apps, timeout) {
  if (isTracking) return;

  // Validate inputs
  if (!Array.isArray(apps) || apps.length === 0) {
    console.error('Invalid apps array provided to startTracking');
    return;
  }

  const validatedTimeout = Math.max(TIMEOUT_MIN, Math.min(TIMEOUT_MAX, parseInt(timeout) || 5));

  trackedApps = apps;
  inactivityTimeout = validatedTimeout;
  isTracking = true;
  isPaused = true;
  lastActiveApp = Date.now();
  lastMouseActivity = Date.now();
  lastMousePosition = screen.getCursorScreenPoint();

  // Start global tracking if not already running
  startGlobalTracking();

  timerInterval = setInterval(checkActiveWindow, 1000);

  // Check mouse position every 50ms for more responsive tracking
  mouseCheckInterval = setInterval(checkMouseMovement, 50);

  if (mainWindow) mainWindow.webContents.send('tracking-status', true);
  if (miniWindow) miniWindow.webContents.send('tracking-status', true);
}

function stopTracking() {
  isTracking = false;
  isPaused = true;
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  if (mouseCheckInterval) {
    clearInterval(mouseCheckInterval);
    mouseCheckInterval = null;
  }
  
  if (mainWindow) mainWindow.webContents.send('tracking-status', false);
  if (miniWindow) miniWindow.webContents.send('tracking-status', false);
}

function resetTimer() {
  stopTracking();
  currentSeconds = 0;
  if (mainWindow) mainWindow.webContents.send('timer-update', 0);
  if (miniWindow) miniWindow.webContents.send('timer-update', 0);
}

async function getAllOpenWindows() {
  try {
    const windows = await activeWin.getOpenWindows();
    const uniqueApps = [...new Set(windows.map(w => w.owner.name))];
    return uniqueApps;
  } catch (error) {
    console.error('Error getting open windows:', error);
    return [];
  }
}

// IPC handlers
ipcMain.handle('start-timer', (event, apps, timeout) => {
  startTracking(apps, timeout);
  return { success: true };
});

ipcMain.handle('stop-timer', () => {
  stopTracking();
  return { seconds: currentSeconds };
});

ipcMain.handle('reset-timer', () => {
  resetTimer();
  return { success: true };
});

ipcMain.handle('get-timer-seconds', () => {
  return currentSeconds;
});

ipcMain.handle('set-timer-seconds', (event, seconds) => {
  // Validate input
  if (!Number.isInteger(seconds) || seconds < 0) {
    console.error('Invalid seconds value:', seconds);
    return { success: false, error: 'Invalid seconds value' };
  }

  // Cap at maximum
  currentSeconds = Math.min(seconds, TIMER_MAX_SECONDS);
  return { success: true };
});

ipcMain.handle('get-open-apps', async () => {
  try {
    // Return the last non-Electron app if available
    if (lastNonElectronApp) {
      return {
        name: lastNonElectronApp,
        title: ''
      };
    }
    // Fallback to active window
    const activeWindow = await activeWin();
    if (activeWindow) {
      return {
        name: activeWindow.owner.name,
        title: activeWindow.title
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting open apps:', error);
    return null;
  }
});

ipcMain.handle('get-all-open-windows', async () => {
  return await getAllOpenWindows();
});

ipcMain.handle('open-mini-window', () => {
  createMiniWindow();
  return { success: true };
});

ipcMain.handle('close-mini-window', () => {
  if (miniWindow) {
    miniWindow.close();
  }
  return { success: true };
});

ipcMain.handle('toggle-mini-window', () => {
  if (miniWindow) {
    miniWindow.close();
    return { success: true, opened: false };
  } else {
    createMiniWindow();
    return { success: true, opened: true };
  }
});

ipcMain.handle('resize-mini-window', (event, width, height) => {
  if (miniWindow) {
    miniWindow.setSize(width, height);
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('get-mini-window-size', () => {
  if (miniWindow) {
    const size = miniWindow.getSize();
    return { width: size[0], height: size[1] };
  }
  return null;
});

ipcMain.handle('get-tracking-status', () => {
  return isTracking;
});

ipcMain.handle('get-tracked-apps', () => {
  return trackedApps;
});

ipcMain.handle('update-tracked-apps', (event, apps) => {
  // Validate inputs
  if (!Array.isArray(apps)) {
    console.error('Invalid apps array provided to update-tracked-apps');
    return { success: false, error: 'Invalid apps array' };
  }

  // Update tracked apps without restarting the timer
  trackedApps = apps;
  return { success: true };
});

ipcMain.handle('get-paused-status', () => {
  return isPaused;
});

ipcMain.handle('update-mouse-activity', () => {
  // This is now handled by the global mouse check, but we'll keep it for compatibility
  lastMouseActivity = Date.now();
  return { success: true };
});

ipcMain.handle('set-mouse-inactivity-timeout', (event, timeout) => {
  // Treat empty string or 0 as "no pause" (continuous tracking)
  if (timeout === '' || timeout === 0 || timeout === '0') {
    mouseInactivityTimeout = 0;
    return { success: true };
  }

  // Validate input
  const parsedTimeout = parseInt(timeout);
  if (isNaN(parsedTimeout) || parsedTimeout < TIMEOUT_MIN || parsedTimeout > TIMEOUT_MAX) {
    console.error('Invalid mouse inactivity timeout:', timeout);
    return { success: false, error: 'Invalid timeout value' };
  }

  mouseInactivityTimeout = parsedTimeout;
  return { success: true };
});

ipcMain.handle('get-mouse-inactivity-timeout', () => {
  return mouseInactivityTimeout;
});

ipcMain.handle('set-always-on-top', (event, enabled) => {
  if (mainWindow) {
    mainWindow.setAlwaysOnTop(enabled);
    // Ensure window is visible and focused when enabling always on top
    if (enabled) {
      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }
      mainWindow.focus();
    }
  }
  return { success: true };
});

ipcMain.handle('get-always-on-top', () => {
  if (mainWindow) {
    return mainWindow.isAlwaysOnTop();
  }
  return false;
});

ipcMain.handle('set-window-opacity', (event, opacity) => {
  // Validate input
  const parsedOpacity = parseFloat(opacity);
  if (isNaN(parsedOpacity) || parsedOpacity < OPACITY_MIN || parsedOpacity > OPACITY_MAX) {
    console.error('Invalid opacity value:', opacity);
    return { success: false, error: 'Invalid opacity value' };
  }

  if (mainWindow) {
    mainWindow.setOpacity(parsedOpacity);
  }
  return { success: true };
});

ipcMain.handle('update-mini-image', (event, imageData, dimensions) => {
  // Validate inputs
  if (imageData && typeof imageData === 'string') {
    // Check approximate size (base64 is ~1.33x the actual size)
    const estimatedSize = (imageData.length * 3) / 4;
    if (estimatedSize > MAX_IMAGE_SIZE) {
      console.error('Image data too large:', estimatedSize);
      return { success: false, error: 'Image too large (max 5MB)' };
    }
  }

  if (dimensions && typeof dimensions === 'object') {
    if (!Number.isInteger(dimensions.width) || !Number.isInteger(dimensions.height) ||
        dimensions.width < 100 || dimensions.height < 40 ||
        dimensions.width > 2000 || dimensions.height > 2000) {
      console.error('Invalid dimensions:', dimensions);
      return { success: false, error: 'Invalid dimensions' };
    }
  }

  customMiniImage = imageData || '';
  miniWindowDimensions = dimensions || { width: 180, height: 40 };

  // If mini window is open, resize it and update image
  if (miniWindow) {
    miniWindow.setSize(miniWindowDimensions.width, miniWindowDimensions.height);
    miniWindow.webContents.send('custom-image-update', customMiniImage);
  }

  return { success: true };
});

ipcMain.handle('get-custom-image', () => {
  return customMiniImage;
});

ipcMain.handle('register-shortcut', (event, shortcut) => {
  // Validate shortcut format
  if (!shortcut || typeof shortcut !== 'string') {
    console.error('Invalid shortcut provided');
    return { success: false, error: 'Invalid shortcut format' };
  }

  // Basic validation - shortcuts should contain modifiers
  const validPattern = /^(CommandOrControl|Ctrl|Control|Alt|Option|AltGr|Shift|Super|Meta)(\+[A-Z0-9])+$/i;
  if (!validPattern.test(shortcut)) {
    console.error('Invalid shortcut pattern:', shortcut);
    return { success: false, error: 'Invalid shortcut pattern' };
  }

  // Unregister only the previous custom shortcut, not all shortcuts
  if (customShortcut) {
    try {
      globalShortcut.unregister(customShortcut);
    } catch (error) {
      console.error('Error unregistering previous shortcut:', error);
    }
  }

  try {
    const success = globalShortcut.register(shortcut, () => {
      if (mainWindow) {
        mainWindow.webContents.send('shortcut-triggered');
      }
    });

    if (!success) {
      console.error('Failed to register shortcut (may be in use):', shortcut);
      return { success: false, error: 'Shortcut already in use' };
    }

    customShortcut = shortcut;
    return { success: true };
  } catch (error) {
    console.error('Error registering shortcut:', error);
    return { success: false, error: error.message };
  }
});

// Handler for retrieving stored image data from renderer
ipcMain.handle('get-stored-image-data', (event) => {
  return {
    image: customMiniImage,
    dimensions: miniWindowDimensions
  };
});

// Handler for setting stored image data from renderer (called on app load)
ipcMain.handle('set-stored-image-data', (event, data) => {
  if (data.image) {
    customMiniImage = data.image;
  }
  if (data.dimensions) {
    try {
      const dims = typeof data.dimensions === 'string' ? JSON.parse(data.dimensions) : data.dimensions;
      if (dims && dims.width && dims.height) {
        miniWindowDimensions = dims;
      }
    } catch (e) {
      console.error('Error parsing custom dimensions:', e);
    }
  }
  return { success: true };
});

// Coop room data handlers
ipcMain.handle('update-coop-room-data', (event, roomCode, userId, username) => {
  coopRoomData = {
    roomCode: roomCode || '',
    userId: userId || '',
    username: username || ''
  };

  // Notify mini window
  if (miniWindow) {
    miniWindow.webContents.send('coop-room-data-update', coopRoomData);
  }

  return { success: true };
});

ipcMain.handle('get-coop-room-data', () => {
  return coopRoomData;
});

ipcMain.handle('update-coop-users', (event, users) => {
  coopUsers = users || {};

  // Notify mini window
  if (miniWindow) {
    miniWindow.webContents.send('coop-users-update', coopUsers);
  }

  return { success: true };
});

// IPC handlers for auto-updater
ipcMain.handle('check-for-updates', () => {
  autoUpdater.checkForUpdates();
  return { success: true };
});

ipcMain.handle('download-update', () => {
  autoUpdater.downloadUpdate();
  return { success: true };
});

ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall();
  return { success: true };
});

app.whenReady().then(() => {
  createTray();
  createWindow();

  // Start global tracking
  startGlobalTracking();

  // Check for updates on app startup (after a delay to let the window load)
  setTimeout(() => {
    autoUpdater.checkForUpdates();
  }, 5000);
});

app.on('window-all-closed', (event) => {
  // Don't quit on window close - app stays in tray
  // Only quit when user explicitly quits from tray menu
  if (app.isQuitting) {
    stopTracking();
    stopGlobalTracking();
    globalShortcut.unregisterAll();
    if (process.platform !== 'darwin') {
      app.quit();
    }
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('before-quit', () => {
  app.isQuitting = true;
});