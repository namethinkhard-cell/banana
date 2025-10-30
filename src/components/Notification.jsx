// src/components/Notification.jsx - Reusable Glass Notification Component
window.Notification = ({ message, isVisible, onClose, duration = 5000 }) => {
  const [animationState, setAnimationState] = React.useState('entering');
  const [progress, setProgress] = React.useState(100);
  const timeoutRef = React.useRef(null);
  const progressIntervalRef = React.useRef(null);
  const startTimeRef = React.useRef(null);

  React.useEffect(() => {
    if (isVisible) {
      setAnimationState('entering');
      startTimeRef.current = Date.now();
      setProgress(100);

      // Start progress bar countdown
      progressIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
        setProgress(remaining);
      }, 16); // ~60fps

      // Auto-dismiss after duration
      timeoutRef.current = setTimeout(() => {
        handleClose();
      }, duration);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [isVisible, duration]);

  const handleClose = () => {
    setAnimationState('exiting');
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Wait for exit animation to complete
    setTimeout(() => {
      onClose();
    }, 400);
  };

  if (!isVisible && animationState !== 'exiting') {
    return null;
  }

  return (
    <div className={`glass-notification ${animationState}`}>
      <div style={{ flex: 1, color: 'white', fontSize: '14px', fontWeight: '500' }}>
        {message}
      </div>
      <button
        onClick={handleClose}
        className="notification-close"
        style={{ color: 'white' }}
        aria-label="Close notification"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="4" x2="4" y2="12"></line>
          <line x1="4" y1="4" x2="12" y2="12"></line>
        </svg>
      </button>
      <div
        className="notification-progress"
        style={{ width: `${progress}%`, transitionDuration: '0ms' }}
      ></div>
    </div>
  );
};
