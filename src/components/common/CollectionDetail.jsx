import React, { useState } from 'react';
import {
  FiX,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiDownload,
  FiFile,
  FiImage,
  FiVideo,
  FiMusic,
  FiFileText,
  FiChevronDown,
  FiChevronUp
} from 'react-icons/fi';
import './CollectionDetail.css';

const getFileIcon = (fileName) => {
  const ext = fileName.split('.').pop().toLowerCase();
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return <FiImage />;
  if (['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(ext)) return <FiVideo />;
  if (['mp3', 'wav', 'aac', 'flac'].includes(ext)) return <FiMusic />;
  if (['pdf', 'doc', 'docx', 'txt', 'xlsx'].includes(ext)) return <FiFileText />;
  
  return <FiFile />;
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

const CollectionDetail = ({
  collection,
  onClose,
  onAddFile,
  onEditFile,
  onDeleteFile,
  onDownloadFile,
  isOwner = false,
  isLoading = false
}) => {
  const [expandedFiles, setExpandedFiles] = useState(new Set());

  const toggleFileExpand = (fileId) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(fileId)) {
      newExpanded.delete(fileId);
    } else {
      newExpanded.add(fileId);
    }
    setExpandedFiles(newExpanded);
  };

  const files = collection.files || [];

  return (
    <div className="collection-detail-overlay" onClick={onClose}>
      <div className="collection-detail-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="collection-detail-header">
          <div className="collection-detail-header-content">
            <h2 className="collection-detail-title">{collection.title}</h2>
            {collection.description && (
              <p className="collection-detail-description">{collection.description}</p>
            )}
            {collection.teacherName && (
              <p className="collection-detail-teacher">
                O'qituvchi: <strong>{collection.teacherName}</strong>
              </p>
            )}
          </div>
          <button className="collection-detail-close" onClick={onClose}>
            <FiX size={24} />
          </button>
        </div>

        {/* Add File Button (only for owner) */}
        {isOwner && (
          <div className="collection-detail-toolbar">
            <button 
              className="collection-add-file-btn"
              onClick={onAddFile}
              disabled={isLoading}
            >
              <FiPlus size={18} /> Fayl qo'shish
            </button>
          </div>
        )}

        {/* Files List */}
        <div className="collection-detail-files">
          {files.length === 0 ? (
            <div className="collection-no-files">
              <FiFile size={48} />
              <p>Hech qanday fayl yo'q</p>
              {isOwner && (
                <small>Boshlanish uchun fayl qo'shish tugmasini bosing</small>
              )}
            </div>
          ) : (
            <div className="collection-files-list">
              <h3 className="collection-files-title">
                Fayllar ({files.length})
              </h3>
              {files.map((file, index) => (
                <div key={file.id || index} className="collection-file-row">
                  <div className="collection-file-main">
                    <div className="collection-file-icon">
                      {getFileIcon(file.name)}
                    </div>
                    
                    <div className="collection-file-info">
                      <div className="collection-file-header">
                        <h4 className="collection-file-name">{file.name}</h4>
                        {file.size && (
                          <span className="collection-file-size">
                            {formatFileSize(file.size)}
                          </span>
                        )}
                      </div>
                      {file.description && (
                        <p className="collection-file-description">
                          {file.description}
                        </p>
                      )}
                      {file.uploadedAt && (
                        <p className="collection-file-meta">
                          {new Date(file.uploadedAt).toLocaleDateString('uz-UZ')}
                        </p>
                      )}
                    </div>

                    {/* Expand button */}
                    <button
                      className="collection-file-toggle"
                      onClick={() => toggleFileExpand(file.id || index)}
                    >
                      {expandedFiles.has(file.id || index) ? (
                        <FiChevronUp />
                      ) : (
                        <FiChevronDown />
                      )}
                    </button>
                  </div>

                  {/* Expanded actions */}
                  {expandedFiles.has(file.id || index) && (
                    <div className="collection-file-actions">
                      <button
                        className="collection-file-download"
                        onClick={() => onDownloadFile(file)}
                        title="Yuklab olish"
                      >
                        <FiDownload size={18} />
                        <span>Yuklab olish</span>
                      </button>

                      {isOwner && (
                        <>
                          <button
                            className="collection-file-edit"
                            onClick={() => onEditFile(file, index)}
                            title="Tahrirlash"
                          >
                            <FiEdit2 size={18} />
                            <span>Tahrirlash</span>
                          </button>
                          <button
                            className="collection-file-delete"
                            onClick={() => onDeleteFile(file, index)}
                            title="O'chirish"
                          >
                            <FiTrash2 size={18} />
                            <span>O'chirish</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CollectionDetail;
