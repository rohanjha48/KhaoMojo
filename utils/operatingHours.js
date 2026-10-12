/**
 * Operating Hours Utility for KhaoMojo
 * Operational hours: 10:00 PM (22:00) to 4:00 AM (04:00)
 */

export function isStoreOpen(forcedOverride = null) {
  if (forcedOverride !== null && forcedOverride !== undefined) {
    return Boolean(forcedOverride);
  }

  // Check localStorage test override if available in browser
  if (typeof window !== 'undefined') {
    const override = localStorage.getItem('khaomojo_force_open');
    if (override !== null) {
      return override === 'true';
    }
  }

  const now = new Date();
  const hours = now.getHours();

  // Open between 22:00 (10 PM) and 04:00 (4 AM)
  return hours >= 22 || hours < 4;
}

/**
 * Returns formatted time until next opening or closing
 */
export function getStoreScheduleInfo() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  const isOpen = hours >= 22 || hours < 4;

  if (isOpen) {
    // Calculate time until 4:00 AM
    let target = new Date(now);
    if (hours >= 22) {
      target.setDate(target.getDate() + 1);
    }
    target.setHours(4, 0, 0, 0);
    const diffMs = Math.max(0, target - now);
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return {
      isOpen: true,
      statusText: 'Open Now (10 PM - 4 AM)',
      bannerText: `Night Owl Service Active • Closes in ${diffHours}h ${diffMins}m (at 4:00 AM)`,
      closesAt: '4:00 AM',
      opensAt: '10:00 PM',
    };
  } else {
    // Currently closed (between 4:00 AM and 10:00 PM)
    const target = new Date(now);
    target.setHours(22, 0, 0, 0);
    const diffMs = Math.max(0, target - now);
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return {
      isOpen: false,
      statusText: 'Closed for the Day',
      bannerText: `Opens tonight at 10:00 PM (in ${diffHours}h ${diffMins}m)`,
      closesAt: '4:00 AM',
      opensAt: '10:00 PM',
      countdown: `${diffHours}h ${diffMins}m`,
    };
  }
}
