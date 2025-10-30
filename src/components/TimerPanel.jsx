// src/components/TimerPanel.jsx
window.TimerPanel = ({
  timerSeconds,
  isTimerRunning,
  isTimerPaused,
  timerSessions,
  setTimerSessions,
  trackedApps,
  setTrackedApps,
  newAppName,
  setNewAppName,
  mouseInactivityTime,
  setMouseInactivityTime,
  showTimerSettings,
  setShowTimerSettings,
  currentActiveApp,
  startTimer,
  stopTimer,
  logSession,
  addTrackedApp,
  removeTrackedApp,
  detectCurrentApp,
  openMiniWindow,
  isElectron,
  progressDuration,
  setProgressDuration,
  darkMode
}) => {
  const { Settings, ExternalLink, Save, X, Trash2, Hourglass } = window.Icons;
  const { formatTime } = window.Utils;

  const timerColor = (!isTimerPaused && isTimerRunning) ? '#aafbfb' : '#f59e0b';
  const [showProgressSettings, setShowProgressSettings] = React.useState(false);
  const [durationHours, setDurationHours] = React.useState(Math.floor(progressDuration / 3600));
  const [durationMinutes, setDurationMinutes] = React.useState(Math.floor((progressDuration % 3600) / 60));
  const [isEditingTime, setIsEditingTime] = React.useState(false);
  const [hoursAnimating, setHoursAnimating] = React.useState(false);
  const [minutesAnimating, setMinutesAnimating] = React.useState(false);
  const [customTimerImage, setCustomTimerImage] = React.useState(localStorage.getItem('customTimerImage') || '');
  const [customImageDimensions, setCustomImageDimensions] = React.useState(
    JSON.parse(localStorage.getItem('customImageDimensions') || '{"width": 180, "height": 40}')
  );

  const progressPercentage = Math.min((timerSeconds / progressDuration) * 100, 100);

  const handleUpdateDuration = () => {
    const totalSeconds = (durationHours * 3600) + (durationMinutes * 60);
    if (totalSeconds > 0) {
      setProgressDuration(totalSeconds);
      setIsEditingTime(false);
    }
  };

  React.useEffect(() => {
    setDurationHours(Math.floor(progressDuration / 3600));
    setDurationMinutes(Math.floor((progressDuration % 3600) / 60));
  }, [progressDuration]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target.result;
      const isGif = file.type === 'image/gif';

      const img = new Image();
      img.onload = () => {
        const maxWidth = 250;
        const maxHeight = 150;

        let width = img.width;
        let height = img.height;

        const widthRatio = maxWidth / width;
        const heightRatio = maxHeight / height;
        const ratio = Math.min(widthRatio, heightRatio, 1);

        const targetWidth = Math.floor(width * ratio);
        const targetHeight = Math.floor(height * ratio);

        let finalBase64 = base64Data;

        if (!isGif && ratio < 1) {
          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
          finalBase64 = canvas.toDataURL(file.type || 'image/png', 0.85);
        }

        const finalWidth = Math.max(targetWidth, 180);
        const dimensions = { width: finalWidth, height: targetHeight + 40 };
        localStorage.setItem('customTimerImage', finalBase64);
        localStorage.setItem('customImageDimensions', JSON.stringify(dimensions));
        setCustomTimerImage(finalBase64);
        setCustomImageDimensions(dimensions);

        if (isElectron) {
          window.electronTimer.closeMiniWindow().then(() => {
            setTimeout(() => {
              window.electronTimer.updateMiniImage(finalBase64, dimensions);
            }, 100);
          });
        }
      };
      img.src = base64Data;
    };
    reader.readAsDataURL(file);
  };

  const handleResetImage = () => {
    localStorage.removeItem('customTimerImage');
    localStorage.setItem('customImageDimensions', JSON.stringify({ width: 180, height: 40 }));
    setCustomTimerImage('');
    setCustomImageDimensions({ width: 180, height: 40 });

    if (isElectron) {
      window.electronTimer.closeMiniWindow().then(() => {
        setTimeout(() => {
          window.electronTimer.updateMiniImage('', { width: 180, height: 40 });
        }, 100);
      });
    }
  };

  return (
    <div className="space-y-xl">
      {/* Progress Panel */}
      <div className={`${darkMode ? 'dark-glass-panel dark-shadow' : 'glass-panel shadow-lg'} rounded-xl p-lg hover-lift`}>
        <div className="flex items-center justify-between mb-md">
          <div className="flex items-center gap-xs">
            <img src="src/icons/dailygoal-icon.png" alt="Daily Goal" className="w-4 h-4" />
            <h2 className={`text-2xl font-semibold ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`}>Daily Goal</h2>
          </div>
        </div>

        <div className="space-y-xs">
          <div className={`flex justify-between text-sm mb-md font-normal ${darkMode ? 'dark-text-secondary' : 'text-zinc-700'}`}>
            <span>{formatTime(timerSeconds)}</span>
            {isEditingTime ? (
              <div className="flex items-center gap-1 edit-time-animation">
                <input
                  type="number"
                  value={durationHours}
                  onChange={(e) => {
                    const newVal = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value));
                    if (newVal > durationHours) {
                      setHoursAnimating(true);
                      setTimeout(() => setHoursAnimating(false), 300);
                    }
                    setDurationHours(newVal);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleUpdateDuration();
                    } else if (e.key === 'ArrowUp') {
                      setHoursAnimating(true);
                      setTimeout(() => setHoursAnimating(false), 300);
                    }
                  }}
                  min="0"
                  className={`w-14 p-1 text-center border rounded focus:outline-none focus:border-amber-500 time-input ${
                    hoursAnimating ? 'value-increased' : ''
                  } ${darkMode ? 'dark-input' : 'bg-white/60 border-white/50 text-zinc-800'}`}
                />
                <span>:</span>
                <input
                  type="number"
                  value={durationMinutes.toString().padStart(2, '0')}
                  onChange={(e) => {
                    const newVal = e.target.value === '' ? '' : Math.max(0, Math.min(59, parseInt(e.target.value)));
                    if (newVal > durationMinutes) {
                      setMinutesAnimating(true);
                      setTimeout(() => setMinutesAnimating(false), 300);
                    }
                    setDurationMinutes(newVal);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleUpdateDuration();
                    } else if (e.key === 'ArrowUp') {
                      setMinutesAnimating(true);
                      setTimeout(() => setMinutesAnimating(false), 300);
                    }
                  }}
                  min="0"
                  max="59"
                  className={`w-14 p-1 text-center border rounded focus:outline-none focus:border-amber-500 time-input ${
                    minutesAnimating ? 'value-increased' : ''
                  } ${darkMode ? 'dark-input' : 'bg-white/60 border-white/50 text-zinc-800'}`}
                />
                <button
                  onClick={handleUpdateDuration}
                  className="ml-1 text-amber-500 hover:text-amber-600 transition"
                  data-tooltip="Save"
                >
                  ✓
                </button>
              </div>
            ) : (
              <span
                onClick={() => setIsEditingTime(true)}
                className="cursor-pointer hover:text-amber-500 transition"
                data-tooltip="Click to edit"
              >
                {formatTime(progressDuration)}
              </span>
            )}
          </div>
          <div className={`w-full rounded-full h-8 overflow-hidden border shadow-inner ${
            darkMode ? 'bg-[rgba(0,0,0,0.2)] border-[rgba(255,255,255,0.1)]' : 'bg-white/50 border-white/40'
          }`}>
            <div
              className="h-full breathing-gradient-level transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <div className="text-center mt-lg">
            <span className="text-2xl font-medium text-amber-500">{progressPercentage.toFixed(1)}%</span>
            <span className={`text-sm ml-2 font-normal ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>complete</span>
          </div>
        </div>
      </div>

      {/* Work Timer and Session History */}
      <div className="grid lg:grid-cols-2 gap-lg">
      <div className={`${darkMode ? 'dark-glass-panel dark-shadow' : 'glass-panel shadow-lg'} rounded-xl p-lg hover-lift`}>
        <div className="flex items-center justify-between mb-xl">
          <div className="flex items-center gap-xs">
            <img src="src/icons/worktimer-icon.png" alt="Work Timer" className="w-4 h-4" />
            <h2 className={`text-2xl font-semibold ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`}>Work Timer</h2>
          </div>
          <div className="flex gap-xs">
            {isElectron && (
              <button
                onClick={(e) => {
                  const svg = e.currentTarget.querySelector('svg');
                  svg.classList.remove('snappy-spin');
                  void svg.offsetWidth; // Force reflow
                  svg.classList.add('snappy-spin');
                  setTimeout(() => {
                    svg.classList.remove('snappy-spin');
                  }, 600);
                  openMiniWindow();
                }}
                className="bg-amber-500 hover:bg-amber-500 text-white p-2 rounded-lg transition shadow-md"
                data-tooltip="Open mini timer window"
              >
                <Hourglass className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => setShowTimerSettings(!showTimerSettings)}
              className={`p-2 rounded-lg transition shadow-md ${
                darkMode ? 'dark-button' : 'bg-white/50 hover:bg-white/70 text-zinc-700 border border-white/40'
              }`}
              data-tooltip="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="text-center mb-lg">
          <div className="text-5xl font-semibold mb-md transition-colors duration-300" style={{ color: timerColor, fontFamily: 'GeneralSans, system-ui, sans-serif' }}>
            {formatTime(timerSeconds)}
          </div>

          <div className="flex gap-sm justify-center">
            {!isTimerRunning ? (
              <button
                onClick={startTimer}
                className="bg-amber-500 hover:bg-amber-500 text-white px-lg py-sm rounded-lg font-medium transition shadow-md"
              >
                Start Tracking
              </button>
            ) : (
              <button
                onClick={stopTimer}
                className="bg-amber-600 hover:bg-amber-700 text-white px-lg py-sm rounded-lg font-medium transition shadow-md"
              >
                Stop Tracking
              </button>
            )}
            <button
              onClick={logSession}
              disabled={timerSeconds === 0}
              className={`${
                timerSeconds > 0
                  ? 'bg-zinc-600 hover:bg-zinc-700 text-white'
                  : 'bg-gray-300/50 text-gray-500 cursor-not-allowed'
              } px-lg py-sm rounded-lg font-medium transition flex items-center gap-xs shadow-md`}
            >
              <Save className="w-5 h-5" />
              Log Session
            </button>
          </div>

          {isTimerRunning && (
            <div className={`inline-block mt-md px-md py-xs rounded-lg text-sm font-semibold ${
              !isTimerPaused
                ? 'bg-cyan-500/20 text-cyan-600 border border-cyan-500/40'
                : 'bg-gray-300/50 text-gray-600 border border-gray-400/40'
            }`}>
              {!isTimerPaused ? '● Active' : '○ Paused'}
            </div>
          )}
        </div>

        {showTimerSettings && (
          <div className="mb-lg space-y-md">
            <div className={`p-md rounded-lg border ${
              darkMode ? 'bg-transparent border-transparent' : 'bg-white/40 border-white/40'
            }`}>
              <h3 className={`text-lg font-semibold mb-sm ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`}>Set Inactivity Timeout</h3>

            <div className="mb-md">
              <label className={`block text-sm mb-xs font-medium ${darkMode ? 'dark-text-secondary' : 'text-zinc-700'}`}>
                 Duration
              </label>
              <input
                type="number"
                value={mouseInactivityTime}
                onChange={async (e) => {
                  const newTimeout = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value));
                  setMouseInactivityTime(newTimeout);
                  if (isElectron) {
                    await window.electronTimer.setMouseInactivityTimeout(newTimeout);
                  }
                }}
                min="0"
                className={`points-input w-24 p-2 border rounded-lg placeholder-zinc-500 focus:outline-none focus:border-amber-500 ${
                  darkMode ? 'dark-input' : 'bg-white/60 border-white/50 text-zinc-800'
                }`}
              />
              <p className={`text-sm mt-1 font-normal ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>
                {mouseInactivityTime === 0 || mouseInactivityTime === ''
                  ? "Timer will never pause (continuous tracking)"
                  : `Timer will pause after ${mouseInactivityTime} seconds of no mouse movement`}
              </p>
            </div>
            </div>

            <div className={`p-md rounded-lg border ${
              darkMode ? 'bg-transparent border-transparent' : 'bg-white/40 border-white/40'
            }`}>
              <h3 className={`text-lg font-semibold mb-md ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`}>Tracked Applications</h3>

            <div className="mb-md">
              <div className="flex gap-xs">
                <input
                  type="text"
                  value={newAppName}
                  onChange={(e) => setNewAppName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTrackedApp()}
                  placeholder="Click an app, then click Detect & Add"
                  className={`flex-1 p-2 border rounded-lg placeholder-zinc-500 focus:outline-none focus:border-amber-500 ${
                    darkMode ? 'dark-input' : 'bg-white/60 border-white/50 text-zinc-800'
                  }`}
                />
                {isElectron && (
                  <button
                    onClick={detectCurrentApp}
                    className="bg-zinc-600 hover:bg-zinc-700 text-white px-sm py-xs rounded-lg text-sm font-medium transition shadow-md"
                    data-tooltip="Detect current app"
                  >
                    Detect
                  </button>
                )}
                <button
                  onClick={addTrackedApp}
                  className="bg-amber-500 hover:bg-amber-500 text-white px-md py-xs rounded-lg font-medium transition shadow-md"
                >
                  Add
                </button>
              </div>
              {currentActiveApp && isElectron && (
                <p className={`text-sm mt-1 font-normal ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>
                  Last clicked: {currentActiveApp}
                </p>
              )}
            </div>

            <div className="mt-lg">
              <label className={`block text-sm mb-xs font-semibold ${darkMode ? 'dark-text-secondary' : 'text-amber-500'}`}>
                Tracked Applications ({trackedApps.length})
              </label>
              <div className="space-y-xs max-h-40 overflow-y-auto">
                {trackedApps.length === 0 ? (
                  <p className={`text-sm py-xs font-normal ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>No apps tracked yet</p>
                ) : (
                  trackedApps.map((app, index) => (
                    <div key={index} className={`flex items-center justify-between p-xs rounded-lg border ${
                      darkMode ? 'bg-transparent border-transparent hover:bg-[rgba(255,255,255,0.08)]' : 'bg-white/50 border-white/40'
                    }`}>
                      <span className={`text-sm font-medium ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`}>{app}</span>
                      <button
                        onClick={() => removeTrackedApp(index)}
                        className="bg-red-500/20 hover:bg-red-500/30 text-red-600 p-1 rounded transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
            </div>

            <div className={`p-md rounded-lg border ${
              darkMode ? 'bg-transparent border-transparent' : 'bg-white/40 border-white/40'
            }`}>
              <h3 className={`text-lg font-semibold mb-sm ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`}>Change Mini Timer Display</h3>
              <div className="space-y-sm">
                {customTimerImage && (
                  <div className={`p-xs rounded-lg border ${
                    darkMode ? 'bg-transparent border-transparent' : 'bg-white/50 border-white/40'
                  }`}>
                    <img
                      src={customTimerImage}
                      alt="Custom timer"
                      className="w-full h-auto rounded"
                      style={{ maxHeight: '100px', objectFit: 'contain' }}
                    />
                  </div>
                )}
                <div className="flex gap-xs">
                  <label className="flex-1 bg-zinc-600 hover:bg-zinc-700 text-white px-md py-xs rounded-lg transition shadow-md text-center cursor-pointer font-semibold">
                    <input
                      type="file"
                      accept="image/*,.gif"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    {customTimerImage ? 'Change Image' : 'Upload Image'}
                  </label>
                  {customTimerImage && (
                    <button
                      onClick={handleResetImage}
                      className="bg-red-500/20 hover:bg-red-500/30 text-red-600 px-md py-xs rounded-lg transition border border-red-500/40 font-semibold"
                    >
                      Reset to Default
                    </button>
                  )}
                </div>
                <p className={`text-xs font-normal ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>
                  Upload a custom image or GIF for the mini timer window
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={`${darkMode ? 'dark-glass-panel dark-shadow' : 'glass-panel shadow-lg'} rounded-xl p-lg hover-lift`}>
        <div className="flex items-center gap-xs mb-md">
          <img src="src/icons/sessionhistory-icon.png" alt="Session History" className="w-4 h-4" />
          <h2 className={`text-2xl font-semibold ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`}>Session History</h2>
        </div>

        <div style={{ maxHeight: '24rem', overflowY: 'auto', overflowX: 'hidden' }}>
          <div className="space-y-sm">
          {timerSessions.length === 0 ? (
            <p className={`text-center py-lg font-normal ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>No sessions recorded yet</p>
          ) : (
            timerSessions.map((session, index) => (
              <div key={index} className={`p-md rounded-lg border transition shadow-md ${
                darkMode ? 'bg-transparent border-transparent hover:bg-[rgba(255,255,255,0.08)]' : 'bg-white/50 border-white/40 hover:bg-white/70'
              }`}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-amber-500 font-semibold text-base font-mono">{formatTime(session.duration)}</p>
                    <p className={`text-sm mt-1 font-normal ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>{session.date}</p>
                  </div>
                  <button
                    onClick={() => setTimerSessions(timerSessions.filter((_, i) => i !== index))}
                    className="bg-red-500/20 hover:bg-red-500/30 text-red-600 p-xs rounded-lg transition border border-red-500/40"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
          </div>
        </div>

        {timerSessions.length > 0 && (
          <div className="mt-md pt-md border-t border-white/30">
            <div className="flex justify-between text-sm">
              <span className={`font-medium ${darkMode ? 'dark-text-secondary' : 'text-zinc-700'}`}>Total Time:</span>
              <span className="text-amber-500 text-lg font-semibold">
                {formatTime(timerSessions.reduce((acc, s) => acc + s.duration, 0))}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );
};