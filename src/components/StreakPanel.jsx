// src/components/StreakPanel.jsx
window.StreakPanel = ({
  streakData,
  checkInToday,
  isDateChecked,
  dailySummaries,
  setDailySummaries,
  developerMode,
  darkMode
}) => {
  const { getTodayDateString, getMonthYear, generateCalendarDays, formatTime } = window.Utils;
  const { ChevronLeft, ChevronRight } = window.Icons;
  const StreakIcon = ({ className }) => <img src="src/icons/streak-icon.png" alt="Streak" className={className} />;
  const HeatmapIcon = ({ className }) => <img src="src/icons/heatmap-icon.png" alt="Heatmap" className={className} />;
  const SummaryIcon = ({ className }) => <img src="src/icons/summary-icon.png" alt="Summary" className={className} />;
  const [selectedDate, setSelectedDate] = React.useState(getTodayDateString());
  const [historySortBy, setHistorySortBy] = React.useState('date');
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const [isEditing, setIsEditing] = React.useState(false);
  const [editPoints, setEditPoints] = React.useState(0);
  const [editWorkTime, setEditWorkTime] = React.useState(0);

  // Get average work time for intensity calculation
  const maxWorkTime = React.useMemo(() => {
    const times = Object.values(dailySummaries).map(s => s.timerSeconds || 0).filter(t => t > 0);
    if (times.length === 0) return 1;
    const average = times.reduce((sum, time) => sum + time, 0) / times.length;
    return average;
  }, [dailySummaries]);

  // Get intensity color based on work time (10 steps for calendar)
  // Average work time = 30% intensity, scaling from there
  const getIntensityColor = (workTime) => {
    if (!workTime || workTime === 0) {
      return darkMode
        ? 'bg-transparent border-transparent'
        : 'bg-white/70 border-white/50';
    }

    // Scale so that average = 30% intensity (0.3)
    // When workTime = maxWorkTime (average), intensity should be 0.3
    // So we multiply by 0.3: intensity = (workTime / maxWorkTime) * 0.3
    // Cap at 1.0 for values much higher than average
    const rawIntensity = workTime / maxWorkTime;
    const scaledIntensity = Math.min(rawIntensity * 0.3, 1.0);

    // 10 levels with 10% opacity increments
    const amberColor = 'amber-500';
    const amberBorder = 'amber-500';

    if (scaledIntensity >= 0.9) return `bg-${amberColor}/100 border-${amberBorder}`;
    if (scaledIntensity >= 0.8) return `bg-${amberColor}/90 border-${amberBorder}`;
    if (scaledIntensity >= 0.7) return `bg-${amberColor}/80 border-${amberBorder}`;
    if (scaledIntensity >= 0.6) return `bg-${amberColor}/70 border-${amberBorder}`;
    if (scaledIntensity >= 0.5) return `bg-${amberColor}/60 border-${amberColor}`;
    if (scaledIntensity >= 0.4) return `bg-${amberColor}/50 border-${amberColor}`;
    if (scaledIntensity >= 0.3) return `bg-${amberColor}/40 border-${amberColor}`;
    if (scaledIntensity >= 0.2) return `bg-${amberColor}/30 border-${amberColor}`;
    if (scaledIntensity >= 0.1) return `bg-${amberColor}/20 border-${amberColor}`;
    return `bg-${amberColor}/10 border-${amberColor}`;
  };

  // Generate calendar days for current month
  const generateMonthCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    return days;
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    const today = new Date();
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
    if (nextMonth <= today) {
      setCurrentMonth(nextMonth);
    }
  };

  const isCurrentMonth = () => {
    const today = new Date();
    return currentMonth.getMonth() === today.getMonth() &&
           currentMonth.getFullYear() === today.getFullYear();
  };

  const getMonthYearDisplay = () => {
    return currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const startEditing = () => {
    const summary = dailySummaries[selectedDate];
    setEditPoints(summary?.pointsEarned || 0);
    setEditWorkTime(summary?.timerSeconds || 0);
    setIsEditing(true);
  };

  const saveEdits = () => {
    setDailySummaries(prev => ({
      ...prev,
      [selectedDate]: {
        ...prev[selectedDate],
        pointsEarned: parseInt(editPoints) || 0,
        timerSeconds: parseInt(editWorkTime) || 0,
        completedTasks: prev[selectedDate]?.completedTasks || []
      }
    }));
    setIsEditing(false);
  };

  const cancelEdits = () => {
    setIsEditing(false);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className={`${darkMode ? 'dark-glass-panel dark-shadow' : 'glass-panel shadow-lg'} rounded-xl p-lg mb-xl hover-lift`}>
        <div className="mb-lg">
          <div className="flex items-center gap-xs mb-md">
            <StreakIcon className={`w-4 h-4 ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`} />
            <h2 className={`text-2xl font-semibold ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`}>Streak</h2>
          </div>
          <p className={`text-lg font-normal mt-1 ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>Increase your streak by logging a work time!</p>
        </div>

        <div className="grid grid-cols-2 gap-lg mb-lg">
          <div className={`${
            darkMode ? 'bg-transparent border-transparent' : 'bg-white/50 border-white/40'
          } border rounded-lg p-lg text-center shadow-md`}>
            <p className={`text-sm mb-xs font-semibold ${darkMode ? 'dark-text-primary' : 'text-zinc-700'}`}>Current Streak</p>
            <p className={`text-5xl font-semibold ${darkMode ? 'text-amber-500' : 'text-amber-500'}`}>{streakData.currentStreak}</p>
            <p className={`text-sm mt-xs font-normal ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>days</p>
          </div>
          <div className={`${
            darkMode ? 'bg-transparent border-transparent' : 'bg-white/50 border-white/40'
          } border rounded-lg p-lg text-center shadow-md`}>
            <p className={`text-sm mb-xs font-semibold ${darkMode ? 'dark-text-primary' : 'text-zinc-700'}`}>Longest Streak</p>
            <p className={`text-5xl font-semibold ${darkMode ? 'text-amber-500' : 'text-amber-500'}`}>{streakData.longestStreak}</p>
            <p className={`text-sm mt-xs font-normal ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>days</p>
          </div>
        </div>
      </div>

      <div className={`${darkMode ? 'dark-glass-panel dark-shadow' : 'glass-panel shadow-lg'} rounded-xl p-lg hover-lift`}>
        <div className="flex items-center gap-xs mb-md">
          <HeatmapIcon className={`w-4 h-4 ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`} />
          <h2 className={`text-2xl font-semibold ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`}>Heatmap</h2>
        </div>

        <div className="flex items-center justify-between mb-md">
          <button
            onClick={goToPreviousMonth}
            className={`p-xs rounded-lg transition ${
              darkMode ? 'hover:bg-[rgba(255,255,255,0.05)]' : 'hover:bg-white/50'
            }`}
            data-tooltip="Previous month"
          >
            <ChevronLeft className={`w-5 h-5 ${darkMode ? 'dark-text-primary' : 'text-zinc-700'}`} />
          </button>
          <h4 className={`text-lg font-semibold ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`}>{getMonthYearDisplay()}</h4>
          <button
            onClick={goToNextMonth}
            disabled={isCurrentMonth()}
            className={`p-xs rounded-lg transition ${
              isCurrentMonth() ? 'opacity-30 cursor-not-allowed' : darkMode ? 'hover:bg-[rgba(255,255,255,0.05)]' : 'hover:bg-white/50'
            }`}
            data-tooltip="Next month"
          >
            <ChevronRight className={`w-5 h-5 ${darkMode ? 'dark-text-primary' : 'text-zinc-700'}`} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-xs">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className={`text-center text-sm font-normal py-xs ${darkMode ? 'dark-text-primary' : 'text-zinc-700'}`}>
              {day}
            </div>
          ))}

          {generateMonthCalendar().map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="aspect-square"></div>;
            }

            const year = currentMonth.getFullYear();
            const month = currentMonth.getMonth();
            const dateString = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const workTime = dailySummaries[dateString]?.timerSeconds || 0;
            const intensityColor = getIntensityColor(workTime);
            const isSelected = dateString === selectedDate;
            const today = new Date();
            const isToday = day === today.getDate() &&
                           month === today.getMonth() &&
                           year === today.getFullYear();

            return (
              <div
                key={day}
                onClick={() => setSelectedDate(dateString)}
                className={`aspect-square rounded-lg flex items-center justify-center transition cursor-pointer heatmap-cell ${intensityColor} ${
                  isToday ? `ring-2 ${darkMode ? 'ring-amber-500' : 'ring-amber-500'}` : isSelected ? `ring-2 ${darkMode ? 'ring-zinc-600' : 'ring-zinc-700'}` : ''
                }`}
                data-tooltip={formatTime(workTime)}
              >
                <span className={`text-sm font-normal ${darkMode ? 'text-white' : 'text-zinc-700'}`}>{day}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-lg flex items-center justify-between text-xs">
          <span className={`font-semibold ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>Work Time Intensity</span>
          <div className="flex items-center gap-1">
            <span className={`font-normal ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>Less</span>
            <div className={darkMode ? 'w-4 h-4 rounded bg-transparent border border-transparent' : 'w-4 h-4 rounded bg-white/70 border border-white/50'}></div>
            <div className={`w-4 h-4 rounded ${darkMode ? 'bg-amber-500/30 border border-amber-500' : 'bg-amber-500/30 border border-amber-500'}`}></div>
            <div className={`w-4 h-4 rounded ${darkMode ? 'bg-amber-500/50 border border-amber-500' : 'bg-amber-500/50 border border-amber-500'}`}></div>
            <div className={`w-4 h-4 rounded ${darkMode ? 'bg-amber-500/70 border border-amber-500' : 'bg-amber-500/70 border border-amber-500'}`}></div>
            <div className={`w-4 h-4 rounded ${darkMode ? 'bg-amber-500/100 border border-amber-500' : 'bg-amber-500/100 border border-amber-500'}`}></div>
            <span className={`font-normal ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>More</span>
          </div>
        </div>
      </div>

      {/* Daily Summary Section */}
      <div className={`${darkMode ? 'dark-glass-panel dark-shadow' : 'glass-panel shadow-lg'} rounded-xl p-lg mt-xl hover-lift`}>
        <div className="flex items-center gap-xs mb-md">
          <SummaryIcon className={`w-4 h-4 ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`} />
          <h2 className={`text-2xl font-semibold ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`}>Summary</h2>
        </div>

        {/* Selected Date Summary */}
        <div className={`${
          darkMode ? 'bg-transparent border-transparent' : 'bg-white border-white/40'
        } border rounded-lg p-md mb-md shadow-md`}>
          <div className="flex items-center justify-between mb-sm">
            <h4 className={`text-lg font-normal ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`}>
              {selectedDate === getTodayDateString()
                ? "Here's what you've done today."
                : selectedDate && (() => {
                    const [year, month, day] = selectedDate.split('-').map(Number);
                    const localDate = new Date(year, month - 1, day);
                    return `Here's what you did on ${localDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}.`;
                  })()}
            </h4>
            {developerMode && !isEditing && (
              <button
                onClick={startEditing}
                className={`px-sm py-xs rounded-lg text-sm font-semibold transition border ${
                  darkMode
                    ? 'bg-zinc-700/20 hover:bg-zinc-700/30 text-zinc-400 border-zinc-700/40'
                    : 'bg-zinc-600/20 hover:bg-zinc-600/30 text-zinc-700 border-zinc-600/40'
                }`}
              >
                Edit
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-md">
              <div className="grid grid-cols-2 gap-md">
                <div className={`${
                  darkMode ? 'bg-transparent border-transparent' : 'bg-white/50 border-white/40'
                } border rounded-lg p-md`}>
                  <p className={`text-sm mb-xs font-semibold ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>Points Earned</p>
                  <input
                    type="number"
                    value={editPoints}
                    onChange={(e) => setEditPoints(e.target.value)}
                    className={`w-full p-2 border rounded-lg focus:outline-none focus:border-amber-500 ${
                      darkMode ? 'dark-input' : 'bg-white/60 border-white/50 text-zinc-800'
                    }`}
                    min="0"
                  />
                </div>
                <div className={`${
                  darkMode ? 'bg-transparent border-transparent' : 'bg-white/50 border-white/40'
                } border rounded-lg p-md`}>
                  <p className={`text-sm mb-xs font-semibold ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>Work Time (seconds)</p>
                  <input
                    type="number"
                    value={editWorkTime}
                    onChange={(e) => setEditWorkTime(e.target.value)}
                    className={`w-full p-2 border rounded-lg focus:outline-none focus:border-amber-500 ${
                      darkMode ? 'dark-input' : 'bg-white/60 border-white/50 text-zinc-800'
                    }`}
                    min="0"
                  />
                </div>
              </div>
              <div className="flex gap-xs">
                <button
                  onClick={saveEdits}
                  className="flex-1 bg-amber-500 hover:bg-amber-500 text-white py-xs rounded-lg transition font-semibold"
                >
                  Save Changes
                </button>
                <button
                  onClick={cancelEdits}
                  className={`flex-1 py-xs rounded-lg transition border font-semibold ${
                    darkMode ? 'dark-button' : 'bg-white/50 hover:bg-white/70 text-zinc-700 border-white/40'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-md mb-md">
              <div className={`${
                darkMode ? 'bg-transparent border-transparent' : 'bg-white/50 border-white/40'
              } border rounded-lg p-md`}>
                <p className={`text-sm mb-1 font-semibold ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>Points Earned</p>
                <p className={`text-3xl font-semibold ${darkMode ? 'text-amber-500' : 'text-amber-500'}`}>
                  {dailySummaries[selectedDate]?.pointsEarned || 0}
                </p>
              </div>
              <div className={`${
                darkMode ? 'bg-transparent border-transparent' : 'bg-white/50 border-white/40'
              } border rounded-lg p-md`}>
                <p className={`text-sm mb-1 font-semibold ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>Work Time</p>
                <p className={`text-3xl font-semibold ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>
                  {formatTime(dailySummaries[selectedDate]?.timerSeconds || 0)}
                </p>
              </div>
            </div>
          )}

          {/* Selected Date's Completed Tasks */}
          {!isEditing && dailySummaries[selectedDate]?.completedTasks?.length > 0 && (
            <div className={`border-t pt-md ${darkMode ? 'border-[rgba(255,255,255,0.1)]' : 'border-white/40'}`}>
              <div className="space-y-xs max-h-48 overflow-y-auto font-semibold">
                {dailySummaries[selectedDate].completedTasks.map((task, index) => (
                  <div key={index} className={`flex items-center justify-between border rounded-lg p-xs ${
                    darkMode ? 'bg-transparent border-transparent' : 'bg-white/50 border-white/40'
                  }`}>
                    <span className={`text-sm ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`}>{task.name}</span>
                    <span className={`text-sm text-amber-500`}>+{task.points} pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* History */}
        <div className="flex items-center justify-between mb-md mt-2xl">
          <h4 className={`text-lg font-semibold ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`}>History</h4>
          <select
            value={historySortBy}
            onChange={(e) => setHistorySortBy(e.target.value)}
            className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-amber-500 ${
              darkMode ? 'dark-input' : 'bg-white/60 border-white/50 text-zinc-800'
            }`}
          >
            <option value="date">Sort by Date</option>
            <option value="pointsDesc">Points (High to Low)</option>
            <option value="pointsAsc">Points (Low to High)</option>
            <option value="durationDesc">Duration (High to Low)</option>
            <option value="durationAsc">Duration (Low to High)</option>
          </select>
        </div>
        <div style={{ maxHeight: '24rem', overflowY: 'auto', overflowX: 'hidden' }}>
          <div className="space-y-xs">
          {Object.keys(dailySummaries)
            .filter(date => date !== getTodayDateString())
            .sort((a, b) => {
              const summaryA = dailySummaries[a];
              const summaryB = dailySummaries[b];

              switch (historySortBy) {
                case 'pointsDesc':
                  return summaryB.pointsEarned - summaryA.pointsEarned;
                case 'pointsAsc':
                  return summaryA.pointsEarned - summaryB.pointsEarned;
                case 'durationDesc':
                  return summaryB.timerSeconds - summaryA.timerSeconds;
                case 'durationAsc':
                  return summaryA.timerSeconds - summaryB.timerSeconds;
                case 'date':
                default:
                  return b.localeCompare(a);
              }
            })
            .map(date => {
              const summary = dailySummaries[date];
              const [year, month, day] = date.split('-').map(Number);
              const dateObj = new Date(year, month - 1, day);
              const formattedDate = dateObj.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });

              return (
                <div
                  key={date}
                  className={`${
                    darkMode
                      ? 'bg-transparent border-transparent hover:bg-[rgba(255,255,255,0.08)]'
                      : 'bg-white/50 border-white/40 hover:bg-white/70'
                  } border rounded-lg p-md transition cursor-pointer`}
                  onClick={() => setSelectedDate(date)}
                >
                  <div className="flex items-center justify-between">
                    <span className={`${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`}>{formattedDate}</span>
                    <div className="flex gap-md text-sm">
                      <span className={darkMode ? 'text-amber-500' : 'text-amber-500'}>
                        {summary.pointsEarned} pts
                      </span>
                      <span className={darkMode ? 'dark-text-secondary' : 'text-zinc-600'}>
                        {formatTime(summary.timerSeconds)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          {Object.keys(dailySummaries).filter(date => date !== getTodayDateString()).length === 0 && (
            <p className={`text-center py-lg font-normal ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>No history yet. Complete tasks and log timer sessions to see your daily summaries!</p>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};