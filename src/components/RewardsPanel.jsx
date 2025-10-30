// src/components/RewardsPanel.jsx
window.RewardsPanel = ({
  rewards,
  setRewards,
  points,
  setPreviewPoints,
  showRewardsSection,
  setShowRewardsSection,
  showRewardForm,
  setShowRewardForm,
  newReward,
  setNewReward,
  rewardSortBy,
  setRewardSortBy,
  editingReward,
  setEditingReward,
  draggedRewardIndex,
  setDraggedRewardIndex,
  redeemReward,
  deleteReward,
  sortedRewards,
  handleRewardDragStart,
  handleRewardDragOver,
  handleRewardDragEnd,
  addReward,
  darkMode
}) => {
  const { Plus, X, Edit, Gift, Trash2, GripVertical, RotateCcw, ChevronDown, Repeat } = window.Icons;
  const RewardIcon = ({ className }) => <img src="src/icons/rewards-icon.png" alt="Rewards" className={className} />;
  const [claimingRewardId, setClaimingRewardId] = React.useState(null);
  const [contextMenu, setContextMenu] = React.useState(null);
  const [droppedRewardId, setDroppedRewardId] = React.useState(null);
  const [isClosing, setIsClosing] = React.useState(false);
  const [shouldRender, setShouldRender] = React.useState(showRewardsSection);
  const [hoveredRewardId, setHoveredRewardId] = React.useState(null);
  const hasListenerRef = React.useRef(false);
  const scrollContainerRef = React.useRef(null);
  const scrollIntervalRef = React.useRef(null);
  const previewTimeoutRef = React.useRef(null);

  React.useEffect(() => {
    if (showRewardsSection) {
      setShouldRender(true);
      setIsClosing(false);
    } else {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [showRewardsSection]);

  const handleRedeemReward = (reward, event) => {
    if (points < reward.cost) return;

    setClaimingRewardId(reward.id);

    // Create floating notification
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const notification = document.createElement('div');
    notification.className = 'float-notification font-light text-amber-500';
    notification.textContent = `You earned that.`;
    notification.style.left = `${rect.left}px`;
    notification.style.top = `${rect.top}px`;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
      redeemReward(reward);
      setClaimingRewardId(null);
    }, 1200);
  };

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

  const handleRewardDragEndWithAnimation = () => {
    handleRewardDragEnd();
    if (draggedRewardIndex !== null && rewards[draggedRewardIndex]) {
      setDroppedRewardId(rewards[draggedRewardIndex].id);
      setTimeout(() => setDroppedRewardId(null), 500);
    }

    // Remove grabbing cursor
    document.body.style.cursor = '';

    // Stop auto-scroll
    if (scrollIntervalRef.current) {
      cancelAnimationFrame(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  };

  const handleRewardDragStartLocal = (index, e) => {
    handleRewardDragStart(index, e);

    // Set grabbing cursor on body to override all other cursors
    document.body.style.cursor = 'grabbing';
  };

  const handleRewardDragOverLocal = (e, index) => {
    handleRewardDragOver(e, index);

    // Auto-scroll logic
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const rect = container.getBoundingClientRect();
    const mouseY = e.clientY;
    const scrollThreshold = 50; // pixels from edge to trigger scroll
    const scrollSpeed = 8; // pixels per frame

    // Clear existing interval
    if (scrollIntervalRef.current) {
      cancelAnimationFrame(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }

    // Check if near top edge
    if (mouseY - rect.top < scrollThreshold && container.scrollTop > 0) {
      const scroll = () => {
        if (container.scrollTop > 0) {
          container.scrollTop -= scrollSpeed;
          scrollIntervalRef.current = requestAnimationFrame(scroll);
        }
      };
      scrollIntervalRef.current = requestAnimationFrame(scroll);
    }
    // Check if near bottom edge
    else if (rect.bottom - mouseY < scrollThreshold && container.scrollTop < container.scrollHeight - container.clientHeight) {
      const scroll = () => {
        if (container.scrollTop < container.scrollHeight - container.clientHeight) {
          container.scrollTop += scrollSpeed;
          scrollIntervalRef.current = requestAnimationFrame(scroll);
        }
      };
      scrollIntervalRef.current = requestAnimationFrame(scroll);
    }
  };

  return (
    <>
    <div className={`${darkMode ? 'dark-glass-panel dark-shadow' : 'glass-panel shadow-lg'} rounded-xl p-lg fade-slide-in stagger-2 hover-lift`}>
      <div className="flex items-center justify-between mb-md">
        <button
          onClick={() => setShowRewardsSection(!showRewardsSection)}
          className={`flex items-center gap-xs transition ${darkMode ? 'hover:text-[#a8a8a8]' : 'hover:text-zinc-600'}`}
        >
          <RewardIcon className={`w-4 h-4 ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`} />
          <h2 className={`text-2xl font-semibold ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`}>Rewards</h2>
          <ChevronDown className={`w-5 h-5 panel-arrow ${!showRewardsSection ? 'collapsed' : ''} ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`} />
        </button>
        <div className="flex items-center gap-xs">
          <select
            value={rewardSortBy}
            onChange={(e) => setRewardSortBy(e.target.value)}
            className={`px-sm py-xs border rounded-lg text-sm font-medium focus:outline-none focus:border-amber-500 ${
              darkMode
                ? 'dark-input'
                : 'bg-white/60 border-white/50 text-zinc-800'
            }`}
          >
            <option value="manual">Custom Order</option>
            <option value="dateAsc">By Oldest</option>
            <option value="dateDesc">By Newest</option>
            <option value="costAsc">By Lowest Cost</option>
            <option value="costDesc">By Highest Cost</option>
          </select>
          <button
            onClick={() => setShowRewardForm(!showRewardForm)}
            className={`p-xs rounded-lg transition border shadow-md expand-button ${
              darkMode
                ? 'dark-button'
                : 'bg-white/50 hover:bg-white/70 text-zinc-700 border-white/40'
            }`}
          >
            {showRewardForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {shouldRender && (
        <div className={isClosing ? "panel-content-closing" : "panel-content-open"}>
          {showRewardForm && (
            <div className={`mb-md p-md rounded-lg border shadow-md liquid-drop relative z-10 ${
              darkMode
                ? 'bg-transparent border-transparent'
                : 'bg-white/40 border-white/40'
            }`}>
              <input
                type="text"
                placeholder="Reward name"
                value={newReward.name}
                onChange={(e) => setNewReward({ ...newReward, name: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && newReward.cost && addReward()}
                className={`w-full p-xs border rounded-lg mb-xs placeholder-zinc-500 font-normal focus:outline-none focus:border-amber-500 ${
                  darkMode ? 'dark-input' : 'bg-white/60 border-white/50 text-zinc-800'
                }`}
                autoFocus
              />
              <input
                type="number"
                placeholder="Point cost"
                value={newReward.cost}
                onChange={(e) => setNewReward({ ...newReward, cost: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && newReward.name && addReward()}
                onWheel={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  const delta = e.deltaY > 0 ? -1 : 1;
                  const currentVal = newReward.cost === '' ? 0 : parseInt(newReward.cost);
                  const newVal = Math.max(1, currentVal + delta);

                  setNewReward({ ...newReward, cost: newVal.toString() });
                }}
                className={`points-input w-full p-xs border rounded-lg mb-xs placeholder-zinc-500 font-normal focus:outline-none focus:border-amber-500 ${
                  darkMode ? 'dark-input' : 'bg-white/60 border-white/50 text-zinc-800'
                }`}
                min="1"
              />
              <button
                type="button"
                onClick={() => setNewReward({ ...newReward, repeatable: !newReward.repeatable })}
                className="flex items-center gap-xs mb-xs cursor-pointer group"
              >
                <Repeat
                  className={`w-5 h-5 transition-colors ${
                    newReward.repeatable ? 'text-amber-500' : 'text-zinc-600'
                  }`}
                  checked={newReward.repeatable}
                />
                <span className={`text-sm font-medium ${darkMode ? 'dark-text-primary' : 'text-zinc-700'}`}>Repeatable</span>
              </button>
              <button
                onClick={addReward}
                className="w-full text-white py-xs rounded-lg transition font-base shadow-md breathing-gradient border-0"
              >
                Add Reward
              </button>
            </div>
          )}

          <div style={{ maxHeight: '24rem', overflowY: 'auto', overflowX: 'hidden' }} ref={scrollContainerRef}>
            <div className="space-y-xs">
            {rewards.length === 0 ? (
              <p className={`text-center py-lg font-normal ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>No rewards yet. Add something to work towards!</p>
            ) : (
              sortedRewards.map((reward, index) => (
                <div
                  key={reward.id}
                  draggable={rewardSortBy === 'manual'}
                  onDragStart={(e) => rewardSortBy === 'manual' && handleRewardDragStartLocal(index, e)}
                  onDragOver={(e) => rewardSortBy === 'manual' && handleRewardDragOverLocal(e, index)}
                  onDragEnd={handleRewardDragEndWithAnimation}
                  onContextMenu={(e) => handleContextMenu(e, reward)}
                  className={`${
                    darkMode
                      ? 'bg-transparent border-transparent hover:bg-[rgba(255,255,255,0.08)]'
                      : 'bg-white/50 border-white/40 hover:bg-white/70'
                  } border p-md rounded-lg flex items-center justify-between hover-lift ${rewardSortBy === 'manual' ? 'cursor-move drag-item' : ''} ${claimingRewardId === reward.id ? 'reward-claiming' : ''} ${draggedRewardIndex === index ? 'dragging' : ''} ${droppedRewardId === reward.id ? 'just-dropped' : ''}`}
                >
                  <div className="flex items-center gap-xs flex-1">
                    {rewardSortBy === 'manual' && <GripVertical className={`w-5 h-5 ${darkMode ? 'text-zinc-600' : 'text-zinc-400'}`} />}
                    <div className="flex-1">
                      {editingReward === reward.id ? (
                        <div className="space-y-xs">
                          <input
                            type="text"
                            value={reward.name}
                            onChange={(e) => setRewards(rewards.map(r => r.id === reward.id ? { ...r, name: e.target.value } : r))}
                            className={`w-full p-xs border rounded-lg font-normal ${
                              darkMode ? 'dark-input' : 'bg-white/60 border-white/50 text-zinc-800'
                            }`}
                            autoFocus
                          />
                          <input
                            type="number"
                            value={reward.cost}
                            onChange={(e) => setRewards(rewards.map(r => r.id === reward.id ? { ...r, cost: e.target.value === '' ? '' : parseInt(e.target.value) } : r))}
                            className={`points-input w-full p-xs border rounded-lg font-normal ${
                              darkMode ? 'dark-input' : 'bg-white/60 border-white/50 text-zinc-800'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setRewards(rewards.map(r => r.id === reward.id ? { ...r, repeatable: !r.repeatable } : r))}
                            className="flex items-center gap-xs cursor-pointer group"
                          >
                            <Repeat
                              className={`w-5 h-5 transition-colors ${
                                reward.repeatable ? 'text-amber-500' : 'text-zinc-600'
                              }`}
                              checked={reward.repeatable}
                            />
                            <span className={`text-sm font-medium ${darkMode ? 'dark-text-primary' : 'text-zinc-700'}`}>Repeatable</span>
                          </button>
                          <button
                            onClick={() => setEditingReward(null)}
                            className="w-full bg-amber-500 hover:bg-amber-500 text-white py-xs rounded-lg transition font-medium"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-xs">
                            <p className={`font-medium text-base ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`}>{reward.name}</p>
                            {reward.repeatable && (
                              <RotateCcw className="w-4 h-4 text-zinc-600" data-tooltip="Repeatable" />
                            )}
                          </div>
                          <p className={`text-lg font-semibold ${darkMode ? 'text-amber-500' : 'text-amber-500'}`}>{reward.cost} points</p>
                          <div className="mt-xs">
                            <div className={`w-full rounded-full h-2 overflow-hidden ${
                              darkMode ? 'bg-transparent' : 'bg-white/50'
                            }`}>
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  points >= reward.cost ? 'bg-amber-500' : 'bg-amber-500/50'
                                }`}
                                style={{ width: `${Math.min((points / reward.cost) * 100, 100)}%` }}
                              ></div>
                            </div>
                            <p className={`text-sm mt-xs ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>
                              {points}/{reward.cost} ({Math.min(Math.round((points / reward.cost) * 100), 100)}%)
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  {editingReward !== reward.id && (
                    <button
                      onClick={(e) => handleRedeemReward(reward, e)}
                      onMouseEnter={() => {
                        if (points >= reward.cost) {
                          if (previewTimeoutRef.current) {
                            clearTimeout(previewTimeoutRef.current);
                            previewTimeoutRef.current = null;
                          }
                          setHoveredRewardId(reward.id);
                          setPreviewPoints(points - reward.cost);
                        }
                      }}
                      onMouseLeave={() => {
                        setHoveredRewardId(null);
                        previewTimeoutRef.current = setTimeout(() => {
                          setPreviewPoints(null);
                        }, 1200);
                      }}
                      disabled={points < reward.cost}
                      className={`${
                        points >= reward.cost
                          ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 border-amber-500/40'
                          : darkMode
                            ? 'bg-zinc-700/30 text-zinc-500 border-zinc-700/40 cursor-not-allowed'
                            : 'bg-zinc-600/30 text-zinc-600 border-zinc-600/40 cursor-not-allowed'
                      } p-xs rounded-lg transition border ml-lg`}
                      data-tooltip={hoveredRewardId === reward.id && points >= reward.cost ? `Wallet: ${points - reward.cost >= 100000 ? window.Utils.formatPoints(points - reward.cost) : (points - reward.cost)}` : (points >= reward.cost ? 'Redeem reward' : 'Not enough points')}
                    >
                      <Gift className="w-5 h-5" />
                    </button>
                  )}
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
            setEditingReward(contextMenu.reward.id);
            setContextMenu(null);
          }}
          className={`w-full px-md py-xs text-left transition flex items-center gap-xs font-medium ${
            darkMode ? 'hover:bg-zinc-700/10 text-zinc-400' : 'hover:bg-zinc-600/10 text-zinc-700'
          }`}
        >
          <Edit className="w-4 h-4" />
          Edit Reward
        </button>
        <button
          onClick={() => {
            deleteReward(contextMenu.reward.id);
            setContextMenu(null);
          }}
          className="w-full px-md py-xs text-left hover:bg-red-500/10 text-red-600 transition flex items-center gap-xs font-medium"
        >
          <Trash2 className="w-4 h-4" />
          Delete Reward
        </button>
      </div>
    )}
    </>
  );
};