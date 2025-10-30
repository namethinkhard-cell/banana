// src/components/CompletedPanel.jsx
window.CompletedPanel = ({
  completedTasks,
  showCompletedSection,
  setShowCompletedSection,
  deleteCompletedTask,
  darkMode
}) => {
  const { Trash2, RotateCcw, ChevronDown } = window.Icons;
  const CompletedIcon = ({ className }) => <img src="src/icons/completed-icon.png" alt="Completed" className={className} />;
  const [contextMenu, setContextMenu] = React.useState(null);
  const [isClosing, setIsClosing] = React.useState(false);
  const [shouldRender, setShouldRender] = React.useState(showCompletedSection);
  const hasListenerRef = React.useRef(false);

  React.useEffect(() => {
    if (showCompletedSection) {
      setShouldRender(true);
      setIsClosing(false);
    } else {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [showCompletedSection]);

  const handleContextMenu = (e, task) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      task: task
    });
  };

  React.useEffect(() => {
    const handleClick = () => setContextMenu(null);

    if (contextMenu && !hasListenerRef.current) {
      document.addEventListener('click', handleClick);
      hasListenerRef.current = true;
      return () => {
        document.removeEventListener('click', handleClick);
        hasListenerRef.current = false;
      };
    } else if (!contextMenu && hasListenerRef.current) {
      document.removeEventListener('click', handleClick);
      hasListenerRef.current = false;
    }
  }, [contextMenu]);

  return (
    <>
    <div className={`${darkMode ? 'dark-glass-panel dark-shadow' : 'glass-panel shadow-lg'} rounded-xl p-lg fade-slide-in stagger-3 hover-lift`}>
      <div className="flex items-center justify-between mb-md">
        <button
          onClick={() => setShowCompletedSection(!showCompletedSection)}
          className={`flex items-center gap-xs transition ${darkMode ? 'hover:text-[#a8a8a8]' : 'hover:text-zinc-600'}`}
        >
          <CompletedIcon className={`w-4 h-4 ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`} />
          <h2 className={`text-2xl font-semibold ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`}>Completed</h2>
          <ChevronDown className={`w-5 h-5 panel-arrow ${!showCompletedSection ? 'collapsed' : ''} ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`} />
        </button>
        <div className="bg-amber-500/20 text-amber-500 px-sm py-xs rounded-lg text-sm font-semibold border border-amber-500/40">
          {completedTasks.length}
        </div>
      </div>

      {shouldRender && (
        <div className={isClosing ? "panel-content-closing" : "panel-content-open"}>
          <div style={{ maxHeight: '24rem', overflowY: 'auto', overflowX: 'hidden' }}>
            <div className="space-y-sm">
            {completedTasks.length === 0 ? (
              <p className={`text-center py-lg font-normal ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>No completed tasks yet!</p>
            ) : (
              completedTasks.map(task => (
                <div
                  key={task.completedId}
                  onContextMenu={(e) => handleContextMenu(e, task)}
                  className={`${
                    darkMode
                      ? 'bg-transparent border-transparent hover:bg-[rgba(255,255,255,0.08)]'
                      : 'bg-white/50 border-white/40 hover:bg-white/70'
                  } border p-md rounded-lg flex items-center justify-between transition hover-lift`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-xs">
                      <p className={`font-medium text-medium ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`}>{task.name}</p>
                      {task.repeatable && (
                        <RotateCcw className="w-4 h-4 text-zinc-600" data-tooltip="Repeatable" />
                      )}
                    </div>
                    <p className={`text-base font-medium ${darkMode ? 'text-amber-500' : 'text-amber-500'}`}>+{task.points} points</p>
                    <p className={`text-sm mt-1 font-normal ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>{task.completedAt}</p>
                  </div>
                </div>
              ))
            )}
            </div>
          </div>
        </div>
      )}
    </div>

    {/* Context Menu */}
    {contextMenu && (
      <div
        className={`fixed backdrop-blur-sm border rounded-lg shadow-lg py-xs z-[99999] liquid-drop ${
          darkMode
            ? 'bg-transparent border-[rgba(255,255,255,0.2)]'
            : 'bg-white/95 border-white/50'
        }`}
        style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
      >
        <button
          onClick={() => {
            deleteCompletedTask(contextMenu.task.completedId);
            setContextMenu(null);
          }}
          className="w-full px-md py-xs text-left hover:bg-red-500/10 text-red-600 transition flex items-center gap-xs font-semibold"
        >
          <Trash2 className="w-4 h-4" />
          Remove from history
        </button>
      </div>
    )}
    </>
  );
};