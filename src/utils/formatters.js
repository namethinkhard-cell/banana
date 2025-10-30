// src/utils/formatters.js - Utility functions

window.Utils = {
  formatTime: (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  },

  getTodayDateString: () => {
    const today = new Date();
    return `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
  },

  getMonthYear: () => {
    const today = new Date();
    return today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  },

  generateCalendarDays: () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    return days;
  },

  sanitizeInput: (input) => {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  },

  formatDateTime: () => {
    const date = new Date();
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  },

  formatPoints: (value) => {
    if (value >= 1000000000) { // Billions (10+ digits)
      return (value / 1000000000).toFixed(2) + 'B';
    } else if (value >= 1000000) { // Millions (7+ digits)
      return (value / 1000000).toFixed(2) + 'M';
    } else if (value >= 100000) { // 100K-999K range (5 characters)
      return (value / 1000).toFixed(1) + 'K';
    }
    return value.toString();
  },

  initTooltips: () => {
    let tooltipElement = null;
    let tooltipTimeout = null;

    const createTooltip = () => {
      const tooltip = document.createElement('div');
      tooltip.className = 'custom-tooltip';
      tooltip.style.cssText = `
        position: fixed;
        padding: 6px 12px;
        background-color: rgba(24, 24, 27, 0.98);
        color: #ffffff;
        border-radius: 6px;
        font-size: 0.875rem;
        font-weight: 500;
        white-space: nowrap;
        z-index: 10000;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.2s ease-out;
      `;
      document.body.appendChild(tooltip);
      return tooltip;
    };

    const showTooltip = (element, text) => {
      if (!tooltipElement) {
        tooltipElement = createTooltip();
      }

      tooltipElement.textContent = text;

      const rect = element.getBoundingClientRect();
      const tooltipRect = tooltipElement.getBoundingClientRect();

      const left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
      const top = rect.top - tooltipRect.height - 8;

      tooltipElement.style.left = `${left}px`;
      tooltipElement.style.top = `${top}px`;

      // Show after 250ms delay
      clearTimeout(tooltipTimeout);
      tooltipTimeout = setTimeout(() => {
        tooltipElement.style.opacity = '1';
      }, 250);
    };

    const hideTooltip = () => {
      clearTimeout(tooltipTimeout);
      if (tooltipElement) {
        tooltipElement.style.opacity = '0';
      }
    };

    // Handle mouseover for tooltip elements
    document.addEventListener('mouseover', (e) => {
      const element = e.target.closest('[data-tooltip]');
      if (element && element.dataset.tooltip) {
        showTooltip(element, element.dataset.tooltip);
      }
    });

    // Handle mouseout
    document.addEventListener('mouseout', (e) => {
      const element = e.target.closest('[data-tooltip]');
      if (element) {
        hideTooltip();
      }
    });
  }
};

// Initialize tooltips when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', window.Utils.initTooltips);
} else {
  window.Utils.initTooltips();
}