// src/components/TasksPanel.jsx
window.TasksPanel = ({
  tasks,
  setTasks,
  points,
  setPreviewPoints,
  showTasksSection,
  setShowTasksSection,
  showTaskForm,
  setShowTaskForm,
  newTask,
  setNewTask,
  taskSortBy,
  setTaskSortBy,
  editingTask,
  setEditingTask,
  draggedTaskIndex,
  setDraggedTaskIndex,
  completeTask,
  deleteTask,
  sortedTasks,
  handleTaskDragStart,
  handleTaskDragOver,
  handleTaskDragEnd,
  addTask,
  darkMode
}) => {
  const { Plus, X, Edit, CheckCircle2, Trash2, GripVertical, RotateCcw, ChevronDown, Repeat } = window.Icons;
  const TaskIcon = ({ className }) => <img src="src/icons/tasks-icon.png" alt="Tasks" className={className} />;
  const [completingTaskId, setCompletingTaskId] = React.useState(null);
  const [contextMenu, setContextMenu] = React.useState(null);
  const [droppedTaskId, setDroppedTaskId] = React.useState(null);
  const [isClosing, setIsClosing] = React.useState(false);
  const [shouldRender, setShouldRender] = React.useState(showTasksSection);
  const [hoveredTaskId, setHoveredTaskId] = React.useState(null);
  const hasListenerRef = React.useRef(false);
  const scrollContainerRef = React.useRef(null);
  const scrollIntervalRef = React.useRef(null);
  const previewTimeoutRef = React.useRef(null);

  React.useEffect(() => {
    if (showTasksSection) {
      setShouldRender(true);
      setIsClosing(false);
    } else {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [showTasksSection]);

  const handleCompleteTask = (task, event) => {
    setCompletingTaskId(task.id);

    // Create floating notification
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const notification = document.createElement('div');
    notification.className = 'float-notification font-light text-amber-500';
    notification.textContent = `+${task.points} banana`;
    notification.style.left = `${rect.left}px`;
    notification.style.top = `${rect.top}px`;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
      completeTask(task);
      setCompletingTaskId(null);
    }, 1200);
  };

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

  const handleTaskDragEndWithAnimation = (taskId) => {
    handleTaskDragEnd();
    if (draggedTaskIndex !== null && tasks[draggedTaskIndex]) {
      setDroppedTaskId(tasks[draggedTaskIndex].id);
      setTimeout(() => setDroppedTaskId(null), 500);
    }

    // Remove grabbing cursor
    document.body.style.cursor = '';

    // Stop auto-scroll
    if (scrollIntervalRef.current) {
      cancelAnimationFrame(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  };

  const handleTaskDragStartLocal = (index, e) => {
    handleTaskDragStart(index, e);

    // Set grabbing cursor on body to override all other cursors
    document.body.style.cursor = 'grabbing';
  };

  const handleTaskDragOverLocal = (e, index) => {
    handleTaskDragOver(e, index);

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
    <div className={`${darkMode ? 'dark-glass-panel dark-shadow' : 'glass-panel shadow-lg'} rounded-xl p-lg fade-slide-in stagger-1 hover-lift`}>
      <div className="flex items-center justify-between mb-md">
        <button
          onClick={() => setShowTasksSection(!showTasksSection)}
          className={`flex items-center gap-xs transition ${darkMode ? 'hover:text-[#a8a8a8]' : 'hover:text-zinc-600'}`}
        >
          <TaskIcon className={`w-4 h-4 ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`} />
          <h2 className={`text-2xl font-semibold ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`}>Tasks</h2>
          <ChevronDown className={`w-5 h-5 panel-arrow ${!showTasksSection ? 'collapsed' : ''} ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`} />
        </button>
        <div className="flex items-center gap-xs">
          <select
            value={taskSortBy}
            onChange={(e) => setTaskSortBy(e.target.value)}
            className={`px-sm py-xs border rounded-lg text-sm font-medium focus:outline-none focus:border-amber-500 ${
              darkMode
                ? 'dark-input'
                : 'bg-white/60 border-white/50 text-zinc-800'
            }`}
          >
            <option value="manual">Custom Order</option>
            <option value="dateAsc">By Oldest</option>
            <option value="dateDesc">By Newest</option>
            <option value="pointsAsc">By Lowest Points</option>
            <option value="pointsDesc">By Highest Points</option>
          </select>
          <button
            onClick={() => setShowTaskForm(!showTaskForm)}
            className={`p-xs rounded-lg transition border shadow-md expand-button ${
              darkMode
                ? 'dark-button'
                : 'bg-white/50 hover:bg-white/70 text-zinc-700 border-white/40'
            }`}
          >
            {showTaskForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {shouldRender && (
        <div className={isClosing ? "panel-content-closing" : "panel-content-open"}>
          {showTaskForm && (
            <div className={`mb-md p-md rounded-lg border shadow-md liquid-drop relative z-10 ${
              darkMode
                ? 'bg-transparent border-transparent'
                : 'bg-white/40 border-white/40'
            }`}>
              <input
                type="text"
                placeholder="Task name"
                value={newTask.name}
                onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && newTask.points && addTask()}
                className={`w-full p-xs border rounded-lg mb-xs placeholder-zinc-500 font-normal focus:outline-none focus:border-amber-500 ${
                  darkMode ? 'dark-input' : 'bg-white/60 border-white/50 text-zinc-800'
                }`}
                autoFocus
              />
              <input
                type="number"
                placeholder="Points"
                value={newTask.points}
                onChange={(e) => setNewTask({ ...newTask, points: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && newTask.name && addTask()}
                onWheel={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  const delta = e.deltaY > 0 ? -1 : 1;
                  const currentVal = newTask.points === '' ? 0 : parseInt(newTask.points);
                  const newVal = Math.max(1, currentVal + delta);

                  setNewTask({ ...newTask, points: newVal.toString() });
                }}
                className={`points-input w-full p-xs border rounded-lg mb-xs placeholder-zinc-500 font-normal focus:outline-none focus:border-amber-500 ${
                  darkMode ? 'dark-input' : 'bg-white/60 border-white/50 text-zinc-800'
                }`}
                min="1"
              />
              <button
                type="button"
                onClick={() => setNewTask({ ...newTask, repeatable: !newTask.repeatable })}
                className="flex items-center gap-xs mb-xs cursor-pointer group"
              >
                <Repeat
                  className={`w-5 h-5 transition-colors ${
                    newTask.repeatable ? 'text-amber-500' : 'text-zinc-600'
                  }`}
                  checked={newTask.repeatable}
                />
                <span className={`text-sm font-medium ${darkMode ? 'dark-text-primary' : 'text-zinc-700'}`}>Repeatable</span>
              </button>
              <button
                onClick={addTask}
                className="w-full text-white py-xs rounded-lg transition font-base shadow-md breathing-gradient border-0"
              >
                Add Task
              </button>
            </div>
          )}

          <div style={{ maxHeight: '24rem', overflowY: 'auto', overflowX: 'hidden' }} ref={scrollContainerRef}>
            <div className="space-y-xs">
            {tasks.length === 0 ? (
              <p className={`text-center py-lg font-normal ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>No tasks yet. Add one to get started!</p>
            ) : (
              sortedTasks.map((task, index) => (
                <div
                  key={task.id}
                  draggable={taskSortBy === 'manual'}
                  onDragStart={(e) => taskSortBy === 'manual' && handleTaskDragStartLocal(index, e)}
                  onDragOver={(e) => taskSortBy === 'manual' && handleTaskDragOverLocal(e, index)}
                  onDragEnd={handleTaskDragEndWithAnimation}
                  onContextMenu={(e) => handleContextMenu(e, task)}
                  className={`${
                    darkMode
                      ? 'bg-transparent border-transparent hover:bg-[rgba(255,255,255,0.08)]'
                      : 'bg-white/50 border-white/40 hover:bg-white/70'
                  } border p-md rounded-lg flex items-center justify-between hover-lift ${taskSortBy === 'manual' ? 'cursor-move drag-item' : ''} ${completingTaskId === task.id ? 'task-completing' : ''} ${draggedTaskIndex === index ? 'dragging' : ''} ${droppedTaskId === task.id ? 'just-dropped' : ''}`}
                >
                  <div className="flex items-center gap-xs flex-1">
                    {taskSortBy === 'manual' && <GripVertical className={`w-5 h-5 ${darkMode ? 'text-zinc-600' : 'text-zinc-400'}`} />}
                    <div className="flex-1">
                      {editingTask === task.id ? (
                        <div className="space-y-xs">
                          <input
                            type="text"
                            value={task.name}
                            onChange={(e) => setTasks(tasks.map(t => t.id === task.id ? { ...t, name: e.target.value } : t))}
                            className={`w-full p-xs border rounded-lg font-normal ${
                              darkMode ? 'dark-input' : 'bg-white/60 border-white/50 text-zinc-800'
                            }`}
                            autoFocus
                          />
                          <input
                            type="number"
                            value={task.points}
                            onChange={(e) => setTasks(tasks.map(t => t.id === task.id ? { ...t, points: e.target.value === '' ? '' : parseInt(e.target.value) } : t))}
                            className={`points-input w-full p-xs border rounded-lg font-normal ${
                              darkMode ? 'dark-input' : 'bg-white/60 border-white/50 text-zinc-800'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setTasks(tasks.map(t => t.id === task.id ? { ...t, repeatable: !t.repeatable } : t))}
                            className="flex items-center gap-xs cursor-pointer group"
                          >
                            <Repeat
                              className={`w-5 h-5 transition-colors ${
                                task.repeatable ? 'text-amber-500' : 'text-zinc-600'
                              }`}
                              checked={task.repeatable}
                            />
                            <span className={`text-sm font-medium ${darkMode ? 'dark-text-primary' : 'text-zinc-700'}`}>Repeatable</span>
                          </button>
                          <button
                            onClick={() => setEditingTask(null)}
                            className="w-full bg-amber-500 hover:bg-amber-500 text-white py-xs rounded-lg transition font-base"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-xs">
                            <p className={`font-base text-base ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`}>{task.name}</p>
                            {task.repeatable && (
                              <RotateCcw className="w-4 h-4 text-zinc-600" data-tooltip="Repeatable" />
                            )}
                          </div>
                          <p className={`text-lg font-semibold ${darkMode ? 'text-amber-500' : 'text-amber-500'}`}>+{task.points} points</p>
                          <p className={`text-sm mt-xs ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>{task.createdAt}</p>
                        </>
                      )}
                    </div>
                  </div>
                  {editingTask !== task.id && (
                    <button
                      onClick={(e) => handleCompleteTask(task, e)}
                      onMouseEnter={() => {
                        if (previewTimeoutRef.current) {
                          clearTimeout(previewTimeoutRef.current);
                          previewTimeoutRef.current = null;
                        }
                        setHoveredTaskId(task.id);
                        setPreviewPoints(points + task.points);
                      }}
                      onMouseLeave={() => {
                        setHoveredTaskId(null);
                        previewTimeoutRef.current = setTimeout(() => {
                          setPreviewPoints(null);
                        }, 1200);
                      }}
                      className="bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-600 p-xs rounded-lg transition border border-yellow-400/40"
                      data-tooltip={hoveredTaskId === task.id ? `Wallet: ${points + task.points >= 100000 ? window.Utils.formatPoints(points + task.points) : (points + task.points)}` : "Complete task"}
                    >
                      <CheckCircle2 className="w-5 h-5" />
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
            setEditingTask(contextMenu.task.id);
            setContextMenu(null);
          }}
          className={`w-full px-md py-xs text-left transition flex items-center gap-xs font-medium ${
            darkMode ? 'hover:bg-zinc-700/10 text-zinc-400' : 'hover:bg-zinc-600/10 text-zinc-700'
          }`}
        >
          <Edit className="w-4 h-4" />
          Edit Task
        </button>
        <button
          onClick={() => {
            deleteTask(contextMenu.task.id);
            setContextMenu(null);
          }}
          className="w-full px-md py-xs text-left hover:bg-red-500/10 text-red-600 transition flex items-center gap-xs font-medium"
        >
          <Trash2 className="w-4 h-4" />
          Delete Task
        </button>
      </div>
    )}
    </>
  );
};