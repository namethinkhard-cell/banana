// src/components/ColorPicker.jsx
/* DEVELOPER MODE: Right-click color picker - remove this entire file to disable */
window.ColorPicker = ({ darkMode, developerMode }) => {
  const [showPicker, setShowPicker] = React.useState(false);
  const [pickerPosition, setPickerPosition] = React.useState({ x: 0, y: 0 });
  const [selectedElement, setSelectedElement] = React.useState(null);
  const [currentColor, setCurrentColor] = React.useState('#000000');
  const [colorHistory, setColorHistory] = React.useState([]);

  React.useEffect(() => {
    if (!developerMode) return;

    const handleContextMenu = (e) => {
      if (!developerMode) return;

      e.preventDefault();

      const element = e.target;
      const computedStyle = window.getComputedStyle(element);
      const bgColor = computedStyle.backgroundColor;
      const textColor = computedStyle.color;

      // Try to extract color from the element
      let detectedColor = '#000000';
      if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
        detectedColor = rgbToHex(bgColor);
      } else if (textColor) {
        detectedColor = rgbToHex(textColor);
      }

      setSelectedElement(element);
      setCurrentColor(detectedColor);
      setPickerPosition({ x: e.clientX, y: e.clientY });
      setShowPicker(true);
    };

    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, [developerMode]);

  const rgbToHex = (rgb) => {
    const result = rgb.match(/\d+/g);
    if (!result) return '#000000';
    return '#' + result.slice(0, 3).map(x => {
      const hex = parseInt(x).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  };

  const applyColor = () => {
    if (!selectedElement) return;

    const computedStyle = window.getComputedStyle(selectedElement);

    // Apply to background or text based on what's more prominent
    if (computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' && computedStyle.backgroundColor !== 'transparent') {
      selectedElement.style.backgroundColor = currentColor;
    } else {
      selectedElement.style.color = currentColor;
    }

    // Save to history
    const historyItem = {
      color: currentColor,
      element: selectedElement.tagName,
      className: selectedElement.className
    };
    setColorHistory(prev => [historyItem, ...prev.slice(0, 9)]);

    setShowPicker(false);
  };

  if (!showPicker || !developerMode) return null;

  return (
    <div
      className={`fixed z-[10000] ${darkMode ? 'dark-glass-panel' : 'glass-panel'} rounded-lg shadow-xl p-4 border ${
        darkMode ? 'border-[rgba(255,255,255,0.2)]' : 'border-white/50'
      }`}
      style={{
        left: `${Math.min(pickerPosition.x, window.innerWidth - 300)}px`,
        top: `${Math.min(pickerPosition.y, window.innerHeight - 250)}px`
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className={`text-sm font-semibold ${darkMode ? 'dark-text-primary' : 'text-zinc-800'}`}>
          Color Picker
        </h3>
        <button
          onClick={() => setShowPicker(false)}
          className={`text-sm px-2 py-1 rounded ${darkMode ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
        >
          ✕
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            type="color"
            value={currentColor}
            onChange={(e) => setCurrentColor(e.target.value)}
            className="w-16 h-16 rounded cursor-pointer"
          />
          <div className="flex-1">
            <label className={`block text-xs mb-1 ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>
              Hex Color
            </label>
            <input
              type="text"
              value={currentColor}
              onChange={(e) => setCurrentColor(e.target.value)}
              className={`w-full p-2 border rounded text-sm focus:outline-none ${
                darkMode ? 'dark-input' : 'bg-white/60 border-white/50 text-zinc-800'
              }`}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={applyColor}
            className="flex-1 bg-amber-500 hover:bg-amber-500 text-white py-2 rounded-lg transition text-sm font-medium"
          >
            Apply Color
          </button>
          <button
            onClick={() => setShowPicker(false)}
            className={`flex-1 py-2 rounded-lg transition text-sm border ${
              darkMode ? 'dark-button' : 'bg-white/50 hover:bg-white/70 text-zinc-700 border-white/40'
            }`}
          >
            Cancel
          </button>
        </div>

        {colorHistory.length > 0 && (
          <div>
            <p className={`text-xs mb-2 ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>
              Recent Colors
            </p>
            <div className="flex gap-1 flex-wrap">
              {colorHistory.slice(0, 6).map((item, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentColor(item.color)}
                  className="w-8 h-8 rounded border-2 border-white/30 hover:border-white/60 transition"
                  style={{ backgroundColor: item.color }}
                  title={item.color}
                />
              ))}
            </div>
          </div>
        )}

        <p className={`text-xs ${darkMode ? 'dark-text-secondary' : 'text-zinc-600'}`}>
          Target: {selectedElement?.tagName.toLowerCase()}
          {selectedElement?.className && ` .${selectedElement.className.split(' ')[0]}`}
        </p>
      </div>
    </div>
  );
};
/* END DEVELOPER MODE SECTION */
