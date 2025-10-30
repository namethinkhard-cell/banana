// src/components/Header.jsx
window.Header = ({ points, previewPoints, totalPointsEarned, countdown, darkMode }) => {
  const { PoppyIcon } = window.Icons;
  const [displayPoints, setDisplayPoints] = React.useState(points);
  const [previousPoints, setPreviousPoints] = React.useState(points);
  const [animatingValue, setAnimatingValue] = React.useState(points);
  const [isAnimating, setIsAnimating] = React.useState(false);
  const [showOldValue, setShowOldValue] = React.useState(false);
  const levelBarRef = React.useRef(null);
  const previousTotalPointsRef = React.useRef(totalPointsEarned);
  const [animatedProgress, setAnimatedProgress] = React.useState((totalPointsEarned % 1000) / 10);
  const animationFrameRef = React.useRef(null);

  // Use preview points when hovering, otherwise use actual points
  const effectivePoints = previewPoints !== null ? previewPoints : points;

  React.useEffect(() => {
    if (effectivePoints !== displayPoints) {
      setPreviousPoints(displayPoints);
      setShowOldValue(true);
      setIsAnimating(true);
      setDisplayPoints(effectivePoints);

      // Animation duration
      setTimeout(() => {
        setIsAnimating(false);
        setShowOldValue(false);
      }, 500);
    }
  }, [effectivePoints, displayPoints]);

  const level = Math.floor(totalPointsEarned / 1000);
  const pointsInCurrentLevel = totalPointsEarned % 1000;
  const progressToNextLevel = (pointsInCurrentLevel / 1000) * 100;

  // Smooth XP bar animation with level up handling
  React.useEffect(() => {
    const previousTotal = previousTotalPointsRef.current;
    const currentTotal = totalPointsEarned;

    if (previousTotal === currentTotal) return;

    const previousProgress = (previousTotal % 1000) / 1000 * 100;
    const targetProgress = (currentTotal % 1000) / 1000 * 100;
    const previousLevel = Math.floor(previousTotal / 1000);
    const currentLevel = Math.floor(currentTotal / 1000);

    // Cancel any ongoing animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Easing function for fluid motion with more inertia
    const easeInOutCubic = (t) => {
      return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const duration = 1200; // ms - increased for more fluid feel
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const rawProgress = Math.min(elapsed / duration, 1);
      const easedProgress = easeInOutCubic(rawProgress);

      if (currentLevel > previousLevel) {
        // Level up occurred
        if (rawProgress < 0.5) {
          // First half: fill to 100%
          const fillProgress = easeInOutCubic(rawProgress * 2); // 0 to 1
          setAnimatedProgress(previousProgress + (100 - previousProgress) * fillProgress);
        } else {
          // Trigger fireworks at 50% (when bar is full)
          if (rawProgress >= 0.5 && rawProgress < 0.52) {
            createFireworks();
          }
          // Second half: fill from 0 to target
          const fillProgress = easeInOutCubic((rawProgress - 0.5) * 2); // 0 to 1
          setAnimatedProgress(targetProgress * fillProgress);
        }
      } else {
        // Normal XP gain without level up
        setAnimatedProgress(previousProgress + (targetProgress - previousProgress) * easedProgress);
      }

      if (rawProgress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setAnimatedProgress(targetProgress);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    previousTotalPointsRef.current = currentTotal;

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [totalPointsEarned]);

  const createFireworks = () => {
    if (!levelBarRef.current) return;

    const rect = levelBarRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Create 30 particles
    for (let i = 0; i < 30; i++) {
      const particle = document.createElement('div');
      particle.className = 'firework-particle';

      // Random colors from orange/yellow/pastel palette
      const colors = [
        'rgba(251, 146, 60, 0.9)',  // orange
        'rgba(253, 230, 138, 0.9)',  // light yellow
        'rgba(252, 211, 77, 0.9)',   // yellow
        'rgba(254, 215, 170, 0.9)',  // peach
        'rgba(255, 237, 213, 0.8)',  // pastel orange
        'rgba(254, 249, 195, 0.8)',  // pastel yellow
      ];
      const color = colors[Math.floor(Math.random() * colors.length)];

      // Random angle and distance
      const angle = (Math.PI * 2 * i) / 30;
      const velocity = 100 + Math.random() * 100;
      const tx = Math.cos(angle) * velocity;
      const ty = Math.sin(angle) * velocity;

      particle.style.left = `${centerX}px`;
      particle.style.top = `${centerY}px`;
      particle.style.backgroundColor = color;
      particle.style.setProperty('--tx', `${tx}px`);
      particle.style.setProperty('--ty', `${ty}px`);

      document.body.appendChild(particle);

      // Remove particle after animation
      setTimeout(() => particle.remove(), 1000);
    }
  };

  const formattedDisplayPoints = displayPoints >= 100000 ? window.Utils.formatPoints(displayPoints) : displayPoints;
  const formattedPreviousPoints = previousPoints >= 100000 ? window.Utils.formatPoints(previousPoints) : previousPoints;

  return (
    <div className={`${darkMode ? 'dark-glass-panel dark-shadow' : 'glass-panel shadow-lg'} rounded-xl p-lg mb-xl hover-lift`} style={{ WebkitAppRegion: 'drag' }}>
      <div className="flex items-start justify-between mb-md gap-lg">
        <div className="flex items-center gap-sm flex-1">
          <PoppyIcon className="w-10 h-10" />
          <div>
            <h1 className={`text-3xl font-semibold ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`}>banana</h1>
            <p className={`text-sm font-medium mb-xs ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>{countdown}</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0 min-w-[120px]">
          <p className={`text-sm font-semibold ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>Wallet</p>
          <div className="relative h-14 overflow-visible flex items-center justify-end" data-tooltip={`${displayPoints.toLocaleString()} points`}>
            {/* Old value - slides down and fades out */}
            {showOldValue && (
              <div className="absolute w-full text-right text-4xl font-semibold breathing-gradient-wallet wallet-slide-out">
                {formattedPreviousPoints}
              </div>
            )}
            {/* New value - slides in from top */}
            <div
              className={`absolute w-full text-right text-4xl font-semibold ${
                isAnimating ? 'wallet-slide-in' : ''
              } ${previewPoints !== null ? '' : 'breathing-gradient-wallet'}`}
              style={previewPoints !== null ? { color: darkMode ? '#a1a1aa' : '#71717a' } : {}}
            >
              {formattedDisplayPoints}
            </div>
          </div>
        </div>
      </div>

      <div className={`mt-md pt-md ${darkMode ? 'border-t border-[rgba(255,255,255,0.1)]' : 'border-t border-white/30'}`}>
        <div className="flex items-center justify-between mb-xs">
          <div className="flex items-center gap-xs">
            <span className={`text-lg font-semibold cursor-help ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`} data-tooltip={`${totalPointsEarned.toLocaleString()} total points`}>Level {level}</span>
          </div>
          <span className={`text-sm font-medium ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>{pointsInCurrentLevel}/1000</span>
        </div>
        <div className={`w-full rounded-full h-3 overflow-hidden ${darkMode ? 'bg-[#2a2a2a]' : 'bg-white/50'}`} ref={levelBarRef}>
          <div
            className="h-full breathing-gradient-level rounded-full"
            style={{ width: `${animatedProgress}%` }}
          ></div>
        </div>
        <p className={`text-xs mt-xs text-right ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>
          {1000 - pointsInCurrentLevel} points to Level {level + 1}
        </p>
      </div>
    </div>
  );
};