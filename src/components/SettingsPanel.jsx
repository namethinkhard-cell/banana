// src/components/SettingsPanel.jsx
window.SettingsPanel = ({
  isElectron,
  points,
  setPoints,
  setTotalPointsEarned,
  clearCompletedHistory,
  clearRedeemedHistory,
  clearTimerSessions,
  clearDailySummaries,
  autoStartTimer,
  setAutoStartTimer,
  autoLogEnabled,
  setAutoLogEnabled,
  autoLogTime,
  setAutoLogTime,
  alwaysOnTop,
  toggleAlwaysOnTop,
  textSize,
  setTextSize,
  darkMode
}) => {
  const SettingsIcon = ({ className }) => <img src="src/icons/settings-icon.png" alt="Settings" className={className} />;

  const [updateStatus, setUpdateStatus] = React.useState(null);
  const [updateInfo, setUpdateInfo] = React.useState(null);
  const [downloadProgress, setDownloadProgress] = React.useState(null);

  // Listen for update status changes
  React.useEffect(() => {
    if (isElectron && window.electronTimer && window.electronTimer.onUpdateStatus) {
      window.electronTimer.onUpdateStatus((status) => {
        setUpdateStatus(status.status);
        if (status.info) setUpdateInfo(status.info);
        if (status.progress) setDownloadProgress(status.progress);
        if (status.error) console.error('Update error:', status.error);
      });
    }
  }, [isElectron]);

  const handleCheckForUpdates = async () => {
    if (isElectron && window.electronTimer && window.electronTimer.checkForUpdates) {
      await window.electronTimer.checkForUpdates();
    }
  };

  const handleDownloadUpdate = async () => {
    if (isElectron && window.electronTimer && window.electronTimer.downloadUpdate) {
      await window.electronTimer.downloadUpdate();
    }
  };

  const handleInstallUpdate = async () => {
    if (isElectron && window.electronTimer && window.electronTimer.installUpdate) {
      if (window.confirm('The app will restart to install the update. Continue?')) {
        await window.electronTimer.installUpdate();
      }
    }
  };

  // Helper to restore focus after confirm dialogs
  const confirmWithFocusRestore = (message) => {
    const result = window.confirm(message);
    // Force restore input interactivity after dialog closes
    setTimeout(() => {
      document.body.style.pointerEvents = '';
      const inputs = document.querySelectorAll('input, textarea, select');
      inputs.forEach(input => {
        input.style.pointerEvents = 'auto';
      });
    }, 0);
    return result;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className={`${darkMode ? 'dark-glass-panel dark-shadow' : 'glass-panel shadow-lg'} rounded-xl p-lg`}>
        <div className="flex items-center gap-xs mb-xl">
          <SettingsIcon className={`w-4 h-4 ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`} />
          <h2 className={`text-2xl font-semibold ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`}>Application Settings</h2>
        </div>

        <div className="space-y-lg">
          <div className={`${darkMode ? 'bg-transparent border-transparent' : 'bg-white/40 border-white/40'} p-md rounded-lg border`}>
            <div className="flex items-center justify-between mb-md">
              <div>
                <h3 className={`text-lg font-semibold ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`}>Auto Log</h3>
                <p className={`text-sm font-normal ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>Timer will automatically log and reset at {autoLogTime} daily</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoLogEnabled}
                  onChange={(e) => setAutoLogEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
            <div>
              <label className={`block text-sm mb-xs font-semibold ${darkMode ? 'dark-text-primary' : 'text-zinc-700'}`}>
              </label>
              <input
                type="time"
                value={autoLogTime}
                onChange={(e) => setAutoLogTime(e.target.value)}
                disabled={!autoLogEnabled}
                className={`w-full p-2 border rounded-lg focus:outline-none focus:border-amber-500 ${
                  darkMode ? 'dark-input' : 'bg-white/60 border-white/50 text-zinc-800'
                } ${!autoLogEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
            </div>
          </div>

          {isElectron && (
            <>
              <div className={`${darkMode ? 'bg-transparent border-transparent' : 'bg-white/40 border-white/40'} p-md rounded-lg border`}>
                <div className="flex items-center justify-between mb-xs">
                  <div>
                    <h3 className={`text-lg font-semibold ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`}>Auto Start</h3>
                    <p className={`text-sm font-normal ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>Automatically start timer when app launches</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoStartTimer}
                      onChange={(e) => setAutoStartTimer(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>
              </div>

              <div className={`${darkMode ? 'bg-transparent border-transparent' : 'bg-white/40 border-white/40'} p-md rounded-lg border`}>
                <div className="flex items-center justify-between mb-xs">
                  <div>
                    <h3 className={`text-lg font-semibold ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`}>Always On Top</h3>
                    <p className={`text-sm font-normal ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>Keep the app window above other windows</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={alwaysOnTop}
                      onChange={(e) => toggleAlwaysOnTop(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>
              </div>

              <div className={`${darkMode ? 'bg-transparent border-transparent' : 'bg-white/40 border-white/40'} p-md rounded-lg border`}>
                <div className="mb-md">
                  <h3 className={`text-lg font-semibold ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`}>Auto Updates</h3>
                  <p className={`text-sm font-normal ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>Keep your app up to date with the latest features</p>
                </div>
                <div className="space-y-sm">
                  {updateStatus === 'checking' && (
                    <div className={`text-sm font-normal ${darkMode ? 'dark-text-primary' : 'text-zinc-700'}`}>
                      Checking for updates...
                    </div>
                  )}
                  {updateStatus === 'not-available' && (
                    <div className={`text-sm font-normal ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                      You're on the latest version!
                    </div>
                  )}
                  {updateStatus === 'available' && updateInfo && (
                    <div className={`text-sm font-normal ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>
                      New version {updateInfo.version} available!
                    </div>
                  )}
                  {updateStatus === 'downloading' && downloadProgress && (
                    <div>
                      <div className={`text-sm font-normal mb-xs ${darkMode ? 'dark-text-primary' : 'text-zinc-700'}`}>
                        Downloading update: {downloadProgress.percent?.toFixed(1)}%
                      </div>
                      <div className="w-full bg-gray-300 rounded-full h-2">
                        <div
                          className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${downloadProgress.percent}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  {updateStatus === 'downloaded' && updateInfo && (
                    <div className={`text-sm font-normal ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                      Update downloaded! Restart to install version {updateInfo.version}
                    </div>
                  )}
                  {updateStatus === 'error' && (
                    <div className={`text-sm font-normal ${darkMode ? 'text-red-400' : 'text-red-700'}`}>
                      Error checking for updates. Please try again later.
                    </div>
                  )}
                  <div className="flex gap-sm">
                    <button
                      onClick={handleCheckForUpdates}
                      disabled={updateStatus === 'checking' || updateStatus === 'downloading'}
                      className={`flex-1 px-md py-xs rounded-lg transition border font-semibold ${
                        darkMode
                          ? 'bg-transparent hover:bg-[rgba(255,255,255,0.08)] border-[rgba(255,255,255,0.1)] text-white'
                          : 'bg-zinc-50 hover:bg-zinc-200 border-grey-50 text-zinc-800'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      Check for Updates
                    </button>
                    {updateStatus === 'available' && (
                      <button
                        onClick={handleDownloadUpdate}
                        className={`flex-1 px-md py-xs rounded-lg transition border font-semibold ${
                          darkMode
                            ? 'bg-amber-500 hover:bg-amber-600 border-amber-500 text-white'
                            : 'bg-amber-500 hover:bg-amber-600 border-amber-500 text-white'
                        }`}
                      >
                        Download Update
                      </button>
                    )}
                    {updateStatus === 'downloaded' && (
                      <button
                        onClick={handleInstallUpdate}
                        className={`flex-1 px-md py-xs rounded-lg transition border font-semibold ${
                          darkMode
                            ? 'bg-green-500 hover:bg-green-600 border-green-500 text-white'
                            : 'bg-green-500 hover:bg-green-600 border-green-500 text-white'
                        }`}
                      >
                        Restart & Install
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          <div className={`${darkMode ? 'bg-transparent border-transparent' : 'bg-white/40 border-white/40'} p-md rounded-lg border`}>
            <div className="mb-md">
              <h3 className={`text-lg font-semibold ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`}>Text Size</h3>
              <p className={`text-sm font-normal ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>Adjust the global text size (80% - 200%)</p>
            </div>
            <div>
              <div className="flex items-center gap-md">
                <input
                  type="range"
                  min="80"
                  max="200"
                  step="5"
                  value={textSize}
                  onChange={(e) => setTextSize(parseInt(e.target.value))}
                  className="flex-1 h-2 rounded-lg appearance-none cursor-pointer text-size-slider"
                  style={{
                    background: darkMode ? '#52525b' : '#a1a1aa'
                  }}
                />
                <span className={`text-lg font-semibold min-w-[4rem] text-center ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`}>
                  {textSize}%
                </span>
              </div>
            </div>
          </div>

          <div className={`p-md rounded-lg border ${
            darkMode ? 'bg-transparent border-transparent' : 'bg-white/40 border-white/40'
          }`}>
            <h3 className={`text-lg font-semibold mb-sm ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`}>Data Management</h3>
            <div className="space-y-sm">
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to reset your points to 0?')) {
                    setPoints(0);
                  }
                }}
                className={`w-full text-red-500 px-md py-xs rounded-lg transition border font-semibold ${
                  darkMode
                    ? 'bg-transparent hover:bg-[rgba(255,255,255,0.08)] border-[rgba(255,255,255,0.1)]'
                    : 'bg-zinc-50 hover:bg-zinc-200 border-grey-50'
                }`}
              >
                Reset Wallet
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to reset your level to 0? This will reset your total points earned.')) {
                    setTotalPointsEarned(0);
                  }
                }}
                className={`w-full text-red-500 px-md py-xs rounded-lg transition border font-semibold ${
                  darkMode
                    ? 'bg-transparent hover:bg-[rgba(255,255,255,0.08)] border-[rgba(255,255,255,0.1)]'
                    : 'bg-zinc-50 hover:bg-zinc-200 border-grey-50'
                }`}
              >
                Reset Level
              </button>
              <button
                onClick={() => {
                  clearCompletedHistory();
                }}
                className={`w-full text-red-500 px-md py-xs rounded-lg transition border font-semibold ${
                  darkMode
                    ? 'bg-transparent hover:bg-[rgba(255,255,255,0.08)] border-[rgba(255,255,255,0.1)]'
                    : 'bg-zinc-50 hover:bg-zinc-200 border-grey-50'
                }`}
              >
                Clear Completed
              </button>
              <button
                onClick={() => {
                  clearRedeemedHistory();
                }}
                className={`w-full text-red-500 px-md py-xs rounded-lg transition border font-semibold ${
                  darkMode
                    ? 'bg-transparent hover:bg-[rgba(255,255,255,0.08)] border-[rgba(255,255,255,0.1)]'
                    : 'bg-zinc-50 hover:bg-zinc-200 border-grey-50'
                }`}
              >
                Clear Redeemed
              </button>
              <button
                onClick={() => {
                  clearTimerSessions();
                }}
                className={`w-full text-red-500 px-md py-xs rounded-lg transition border font-semibold ${
                  darkMode
                    ? 'bg-transparent hover:bg-[rgba(255,255,255,0.08)] border-[rgba(255,255,255,0.1)]'
                    : 'bg-zinc-50 hover:bg-zinc-200 border-grey-50'
                }`}
              >
                Clear Work Timer Session History
              </button>
              <button
                onClick={() => {
                  clearDailySummaries();
                }}
                className={`w-full text-red-500 px-md py-xs rounded-lg transition border font-semibold ${
                  darkMode
                    ? 'bg-transparent hover:bg-[rgba(255,255,255,0.08)] border-[rgba(255,255,255,0.1)]'
                    : 'bg-zinc-50 hover:bg-zinc-200 border-grey-50'
                }`}
              >
                Clear Summary History
              </button>
            </div>
          </div>

          {!isElectron && (
            <div className={`border rounded-lg p-md ${
              darkMode
                ? 'bg-zinc-700/20 border-zinc-700/40'
                : 'bg-zinc-600/10 border-zinc-600/30'
            }`}>
              <p className={`text-sm font-normal ${darkMode ? 'text-zinc-400' : 'text-zinc-700'}`}>
                ℹ️ Some settings are only available in the desktop app version. Running in browser mode.
              </p>
            </div>
          )}

          <div className={`${darkMode ? 'bg-transparent border-transparent' : 'bg-white/40 border-white/40'} p-md rounded-lg border`}>
            <h3 className={`text-lg font-semibold mb-sm ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`}>Keyboard Shortcuts</h3>
            <div className={`space-y-xs text-sm font-normal ${darkMode ? 'dark-text-primary' : 'text-zinc-700'}`}>
              <div className="flex justify-between">
                <span>Toggle Add Task Form:</span>
                <kbd className={`px-xs py-xs rounded border font-mono ${
                  darkMode ? 'bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.2)]' : 'bg-white/60 border-white/50'
                }`}>Ctrl + T</kbd>
              </div>
              <div className="flex justify-between">
                <span>Toggle Add Reward Form:</span>
                <kbd className={`px-xs py-xs rounded border font-mono ${
                  darkMode ? 'bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.2)]' : 'bg-white/60 border-white/50'
                }`}>Ctrl + R</kbd>
              </div>
              <div className="flex justify-between">
                <span>Toggle Work Timer:</span>
                <kbd className={`px-xs py-xs rounded border font-mono ${
                  darkMode ? 'bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.2)]' : 'bg-white/60 border-white/50'
                }`}>Ctrl + W</kbd>
              </div>
              <div className="flex justify-between">
                <span>Toggle Mini Timer:</span>
                <kbd className={`px-xs py-xs rounded border font-mono ${
                  darkMode ? 'bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.2)]' : 'bg-white/60 border-white/50'
                }`}>Ctrl + E</kbd>
              </div>
              <div className="flex justify-between">
                <span>Toggle Always On Top:</span>
                <kbd className={`px-xs py-xs rounded border font-mono ${
                  darkMode ? 'bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.2)]' : 'bg-white/60 border-white/50'
                }`}>Shift + T</kbd>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
