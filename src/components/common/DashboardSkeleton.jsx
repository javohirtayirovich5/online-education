import { useAuth } from '../../contexts/AuthContext';
import './DashboardSkeleton.css';

const DashboardSkeleton = () => {
  const { isAdmin, isTeacher, isStudent } = useAuth();

  return (
    <div className="dashboard-skeleton">
      {/* Header Skeleton */}
      <div className="skeleton-header">
        <div className="skeleton-line skeleton-title"></div>
        <div className="skeleton-line skeleton-subtitle"></div>
      </div>

      {/* Stats Grid Skeleton */}
      <div className="stats-grid-skeleton">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="skeleton-stat-card">
            <div className="skeleton-stat-icon"></div>
            <div className="skeleton-stat-content">
              <div className="skeleton-line skeleton-stat-label"></div>
              <div className="skeleton-line skeleton-stat-value"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Dashboard Grid Skeleton */}
      <div className="dashboard-grid-skeleton">
        {/* Recent Lessons Skeleton */}
        <div className="skeleton-card">
          <div className="skeleton-card-header">
            <div className="skeleton-line skeleton-card-title"></div>
            <div className="skeleton-line skeleton-link"></div>
          </div>
          <div className="skeleton-activities">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="skeleton-activity-item">
                <div className="skeleton-activity-icon"></div>
                <div className="skeleton-activity-info">
                  <div className="skeleton-line skeleton-activity-title"></div>
                  <div className="skeleton-line skeleton-activity-meta"></div>
                </div>
                <div className="skeleton-arrow"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Deadlines Skeleton */}
        <div className="skeleton-card">
          <div className="skeleton-card-header">
            <div className="skeleton-line skeleton-card-title"></div>
            <div className="skeleton-line skeleton-link"></div>
          </div>
          <div className="skeleton-deadlines">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="skeleton-deadline-item">
                <div className="skeleton-deadline-icon"></div>
                <div className="skeleton-deadline-info">
                  <div className="skeleton-line skeleton-deadline-title"></div>
                  <div className="skeleton-line skeleton-deadline-meta"></div>
                </div>
                <div className="skeleton-badge"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions Skeleton */}
        <div className="skeleton-card">
          <div className="skeleton-card-header">
            <div className="skeleton-line skeleton-card-title"></div>
          </div>
          <div className="skeleton-quick-actions">
            {[...Array(isAdmin ? 3 : 4)].map((_, index) => (
              <div key={index} className="skeleton-action-btn"></div>
            ))}
          </div>
        </div>

        {/* Progress Overview Skeleton (Student only) */}
        {isStudent && (
          <div className="skeleton-card">
            <div className="skeleton-card-header">
              <div className="skeleton-line skeleton-card-title"></div>
            </div>
            <div className="skeleton-progress">
              {[...Array(2)].map((_, index) => (
                <div key={index} className="skeleton-progress-item">
                  <div className="skeleton-progress-header">
                    <div className="skeleton-line skeleton-progress-label"></div>
                    <div className="skeleton-line skeleton-progress-value"></div>
                  </div>
                  <div className="skeleton-progress-bar"></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Tests Skeleton (Student only) */}
        {isStudent && (
          <div className="skeleton-card">
            <div className="skeleton-card-header">
              <div className="skeleton-line skeleton-card-title"></div>
              <div className="skeleton-line skeleton-link"></div>
            </div>
            <div className="skeleton-tests">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="skeleton-test-item">
                  <div className="skeleton-test-icon"></div>
                  <div className="skeleton-test-info">
                    <div className="skeleton-line skeleton-test-title"></div>
                    <div className="skeleton-line skeleton-test-score"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardSkeleton;
