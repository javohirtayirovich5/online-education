import { useTranslation } from '../../hooks/useTranslation';
import './LoadingSpinner.css';

const LoadingSpinner = ({ size = 'medium', fullScreen = false, showText = true }) => {
  const { t } = useTranslation();

  if (fullScreen) {
    return (
      <div className="loading-fullscreen">
        <div className={`loader loader-${size}`}></div>
        {showText && <p className="loading-text">{t('common.loading')}</p>}
      </div>
    );
  }

  return (
    <div className="loading-container">
      <div className={`loader loader-${size}`}></div>
      {showText && <p className="loading-text">{t('common.loading')}</p>}
    </div>
  );
};

export default LoadingSpinner;

