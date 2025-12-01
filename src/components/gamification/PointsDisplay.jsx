import React from 'react';
import './PointsDisplay.css';

/**
 * Zeigt Punkte und Badges an
 */
export const PointsDisplay = ({ points, badge, streak, showDetails = false }) => {
  if (points === 0 && !badge && !streak) {
    return null;
  }

  return (
    <div className="points-display">
      {points > 0 && (
        <div className="points-badge">
          <span className="points-value">+{points}</span>
          <span className="points-label">Punkte</span>
        </div>
      )}
      {badge && (
        <div className="badge-display">
          <span className="badge-icon">{badge}</span>
        </div>
      )}
      {streak && streak.currentStreak > 0 && (
        <div className="streak-display">
          <span className="streak-icon">🔥</span>
          <span className="streak-value">{streak.currentStreak} Matchdays</span>
        </div>
      )}
      {showDetails && streak && streak.streakBonus > 0 && (
        <div className="streak-bonus">
          <span>Streak-Bonus: +{streak.streakBonus} Punkte</span>
        </div>
      )}
    </div>
  );
};

