// src/components/RedeemedPanel.jsx
window.RedeemedPanel = ({
  redeemedRewards,
  showRedeemedSection,
  setShowRedeemedSection,
  deleteRedeemedReward,
  darkMode
}) => {
  const { Trash2, RotateCcw, ChevronDown } = window.Icons;
  const RedeemedIcon = ({ className }) => <img src="src/icons/redeemed-icon.png" alt="Redeemed" className={className} />;
  const [contextMenu, setContextMenu] = React.useState(null);
  const [isClosing, setIsClosing] = React.useState(false);
  const [shouldRender, setShouldRender] = React.useState(showRedeemedSection);
  const hasListenerRef = React.useRef(false);

  React.useEffect(() => {
    if (showRedeemedSection) {
      setShouldRender(true);
      setIsClosing(false);
    } else {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [showRedeemedSection]);

  const handleContextMenu = (e, reward) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      reward: reward
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
    <div className={`${darkMode ? 'dark-glass-panel dark-shadow' : 'glass-panel shadow-lg'} rounded-xl p-lg fade-slide-in stagger-4 hover-lift`}>
      <div className="flex items-center justify-between mb-md">
        <button
          onClick={() => setShowRedeemedSection(!showRedeemedSection)}
          className={`flex items-center gap-xs transition ${darkMode ? 'hover:text-[#a8a8a8]' : 'hover:text-zinc-600'}`}
        >
          <RedeemedIcon className={`w-4 h-4 ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`} />
          <h2 className={`text-2xl font-semibold ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`}>Redeemed</h2>
          <ChevronDown className={`w-5 h-5 panel-arrow ${!showRedeemedSection ? 'collapsed' : ''} ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`} />
        </button>
        <div className="bg-amber-500/20 text-amber-500 px-sm py-xs rounded-lg text-sm font-semibold border border-amber-500/40">
          {redeemedRewards.length}
        </div>
      </div>

      {shouldRender && (
        <div className={isClosing ? "panel-content-closing" : "panel-content-open"}>
          <div style={{ maxHeight: '24rem', overflowY: 'auto', overflowX: 'hidden' }}>
            <div className="space-y-sm">
            {redeemedRewards.length === 0 ? (
              <p className={`text-center py-lg font-normal ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>No rewards redeemed yet!</p>
            ) : (
              redeemedRewards.map(reward => (
                <div
                  key={reward.redeemedId}
                  onContextMenu={(e) => handleContextMenu(e, reward)}
                  className={`${
                    darkMode
                      ? 'bg-transparent border-transparent hover:bg-[rgba(255,255,255,0.08)]'
                      : 'bg-white/50 border-white/40 hover:bg-white/70'
                  } border p-md rounded-lg flex items-center justify-between transition hover-lift`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-xs">
                      <p className={`font-base text-medium ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`}>{reward.name}</p>
                      {reward.repeatable && (
                        <RotateCcw className="w-4 h-4 text-zinc-600" data-tooltip="Repeatable" />
                      )}
                    </div>
                    <p className={`text-base font-medium ${darkMode ? 'text-amber-500' : 'text-amber-500'}`}>-{reward.cost} points</p>
                    <p className={`text-sm mt-1 font-normal ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>{reward.redeemedAt}</p>
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
            deleteRedeemedReward(contextMenu.reward.redeemedId);
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