const { useState } = React;

function Sidebar({ activeTab, onTabChange, darkMode }) {
  const [collapsed, setCollapsed] = useState(true);

  const navItems = [
    { id: 'home', icon: 'Home', label: 'Home' },
    { id: 'timer', icon: 'Clock', label: 'Work Timer' },
    { id: 'streak', icon: 'Flame', label: 'Calendar' },
    { id: 'coop', icon: 'Users', label: 'Co-op' },
    { id: 'settings', icon: 'Settings', label: 'Settings' },
  ];

  const getIcon = (iconName) => {
    const iconProps = { className: `${collapsed ? 'mx-auto' : ''} w-5 h-5 flex-shrink-0` };
    switch(iconName) {
      case 'Home':
        return <Icons.Home {...iconProps} />;
      case 'Clock':
        return <Icons.Clock {...iconProps} />;
      case 'Users':
        return <Icons.Users {...iconProps} />;
      case 'Flame':
        return <Icons.Flame {...iconProps} />;
      case 'Settings':
        return <Icons.Settings {...iconProps} />;
      default:
        return null;
    }
  };

  return (
    <div
      className={`${
        collapsed ? 'w-16' : 'w-56'
      } ${darkMode ? 'bg-[#2a2a2a] border-r border-[rgba(255,255,255,0.1)]' : 'bg-white border-r border-gray-200'} flex flex-col transition-all duration-300 ease-in-out flex-shrink-0`}
    >
      {/* Logo/Brand */}
      <div className={`h-16 flex items-center justify-between px-base ${darkMode ? 'border-b border-[rgba(255,255,255,0.1)]' : 'border-b border-gray-200'}`}>
        {!collapsed && (
          <div className="flex items-center gap-xs">
            <img src="src/icons/logo.png" alt="Poppy" className="w-8 h-8 rounded-lg object-cover" />
            <span className={`font-semibold ${darkMode ? 'text-[#e8e8e8]' : 'text-gray-800'}`}>Poppy</span>
          </div>
        )}
        {collapsed && (
          <img src="src/icons/logo.png" alt="Poppy" className="w-8 h-8 rounded-lg object-cover mx-auto" />
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 py-sm">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-sm px-base py-md transition-colors relative group ${
                isActive
                  ? darkMode
                    ? 'bg-[rgba(245,158,11,0.15)] text-amber-500'
                    : 'bg-orange-50 text-orange-600'
                  : darkMode
                  ? 'text-[#a8a8a8] hover:bg-[rgba(255,255,255,0.05)]'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              title={collapsed ? item.label : ''}
            >
              {isActive && (
                <div className={`absolute left-0 w-1 h-8 rounded-r ${darkMode ? 'bg-amber-500' : 'bg-orange-500'}`} />
              )}
              {getIcon(item.icon)}
              {!collapsed && (
                <span className="font-semibold">{item.label}</span>
              )}

              {/* Tooltip for collapsed state */}
              {collapsed && (
                <div className="absolute left-full ml-xs px-sm py-xs text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 font-semibold" style={{ backgroundColor: 'rgba(24, 24, 27, 0.98)', color: '#ffffff' }}>
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={`h-12 flex items-center justify-center transition-colors ${
          darkMode
            ? 'border-t border-[rgba(255,255,255,0.1)] text-[#a8a8a8] hover:bg-[rgba(255,255,255,0.05)]'
            : 'border-t border-gray-200 text-gray-500 hover:bg-gray-50'
        }`}
      >
        {collapsed ? (
          <Icons.ChevronRight className="w-5 h-5" />
        ) : (
          <Icons.ChevronLeft className="w-5 h-5" />
        )}
      </button>
    </div>
  );
}