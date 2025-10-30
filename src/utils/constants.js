// src/utils/constants.js - Application Constants

window.Constants = {
  // Timing constants (milliseconds)
  TIMING: {
    DEBOUNCE_STORAGE: 300,
    AUTO_LOG_CHECK: 1000,
    ANIMATION_DEFAULT: 500,
    ANIMATION_FAST: 300,
    APP_TRACK_CHECK: 500,
    MOUSE_CHECK: 50,
    TOOLTIP_DELAY: 1000,
    IPC_TIMEOUT: 5000
  },

  // Game mechanics
  GAME: {
    POINTS_PER_LEVEL: 1000,
    MAX_APP_NAME_LENGTH: 100,
    MAX_TASK_NAME_LENGTH: 200,
    MAX_REWARD_NAME_LENGTH: 200
  },

  // Storage limits
  STORAGE: {
    MAX_SIZE: 4 * 1024 * 1024, // 4MB
    MAX_IMAGE_SIZE: 5 * 1024 * 1024 // 5MB
  },

  // Timer constraints
  TIMER: {
    MAX_SECONDS: 999999, // ~11 days
    MIN_INACTIVITY_TIMEOUT: 0,
    MAX_INACTIVITY_TIMEOUT: 3600,
    MIN_MOUSE_TIMEOUT: 0,
    MAX_MOUSE_TIMEOUT: 3600
  },

  // Valid keyboard keys for shortcuts
  VALID_KEYS: new Set([
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
    'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12',
    'enter', 'escape', 'space', 'tab', 'backspace', 'delete',
    'arrowup', 'arrowdown', 'arrowleft', 'arrowright'
  ]),

  // Valid image types
  VALID_IMAGE_TYPES: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
};
