import React from 'react';
import { FiFileText, FiEdit2, FiTrash2, FiChevronRight } from 'react-icons/fi';
import './CollectionCard.css';
import { useTranslation } from '../../hooks/useTranslation';

const CollectionCard = ({ 
  collection, 
  onViewDetails, 
  onEdit, 
  onDelete,
  isOwner = false 
}) => {
  const { t } = useTranslation();
  const fileCount = collection.files ? collection.files.length : 0;

  return (
    <div className="collection-card">
      <div className="collection-card-image-container">
        {collection.previewImage ? (
          <img 
            src={collection.previewImage} 
            alt={collection.title}
            className="collection-card-image"
          />
        ) : (
          <div className="collection-card-placeholder">
            <FiFileText size={32} />
          </div>
        )}
        <div className="collection-card-overlay">
          <button 
            className="collection-view-btn"
            onClick={onViewDetails}
            title="Ko'rish"
          >
            Ko'rish <FiChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="collection-card-content">
        <h3 className="collection-card-title">{collection.title}</h3>
        {collection.description && (
          <p className="collection-card-description">{collection.description}</p>
        )}
        
        <div className="collection-card-meta">
          <span className="collection-file-count">
            <FiFileText size={14} /> {fileCount} {t('teacher.resources.files')}
          </span>
          {collection.teacherName && (
            <span className="collection-teacher-name">{collection.teacherName}</span>
          )}
        </div>

        {isOwner && (
          <div className="collection-card-actions">
            <button 
              className="collection-edit-btn"
              onClick={onEdit}
              title="Tahrirlash"
            >
              <FiEdit2 size={16} />
            </button>
            <button 
              className="collection-delete-btn"
              onClick={onDelete}
              title="O'chirish"
            >
              <FiTrash2 size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CollectionCard;
