'use client';

import { useState, useEffect } from 'react';

/**
 * Reusable countdown hook with live tick and clean formatting
 * @param {string | Date | number | null} targetDate
 * @returns {{ days: number, hours: number, minutes: number, seconds: number, isFinished: boolean, formatted: string, isUrgent: boolean }}
 */
export function useCountdown(targetDate) {
  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(targetDate));

  useEffect(() => {
    if (!targetDate) return;

    // Immediately calculate
    setTimeLeft(calculateTimeLeft(targetDate));

    const interval = setInterval(() => {
      const updated = calculateTimeLeft(targetDate);
      setTimeLeft(updated);
      if (updated.isFinished) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}

function calculateTimeLeft(targetDate) {
  if (!targetDate) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isFinished: true, formatted: '', isUrgent: false };
  }

  const targetMs = new Date(targetDate).getTime();
  const diff = targetMs - Date.now();

  if (isNaN(diff) || diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isFinished: true, formatted: '', isUrgent: false };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  const pad = (n) => String(n).padStart(2, '0');

  let formatted = '';
  if (days > 0) {
    formatted = `${days}j ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  } else {
    formatted = `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  }

  const isUrgent = days === 0 && hours < 2;

  return { days, hours, minutes, seconds, isFinished: false, formatted, isUrgent };
}

export default useCountdown;
