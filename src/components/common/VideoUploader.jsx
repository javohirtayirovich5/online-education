import { useState, useRef } from 'react';
import { FiUploadCloud, FiX, FiVideo, FiCheck } from 'react-icons/fi';
import { storageService } from '../../services/storageService';
import './VideoUploader.css';

const VideoUploader = ({ lessonId, onUploadComplete, currentVideoURL }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    // Validate file type
    const validTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo'];
    if (!validTypes.includes(file.type)) {
      alert('Faqat video fayllar (MP4, WebM, OGG, MOV, AVI) qabul qilinadi');
      return;
    }

    // Validate file size (max 500MB)
    if (file.size > 500 * 1024 * 1024) {
      alert('Video hajmi 500MB dan oshmasligi kerak');
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setProgress(0);

    try {
      const result = await storageService.uploadVideo(
        lessonId,
        `video_${Date.now()}`,
        selectedFile,
        (progress) => setProgress(Math.round(progress))
      );

      if (result.success) {
        onUploadComplete(result.url);
        setSelectedFile(null);
      } else {
        alert('Video yuklashda xatolik yuz berdi');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Video yuklashda xatolik yuz berdi');
    }

    setUploading(false);
  };

  const cancelSelection = () => {
    setSelectedFile(null);
    setProgress(0);
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(1) + ' KB';
    }
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="video-uploader">
      {!selectedFile ? (
        <div 
          className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleChange}
            style={{ display: 'none' }}
          />
          
          <div className="upload-icon">
            <FiUploadCloud />
          </div>
          
          <div className="upload-text">
            <h4>Video yuklash</h4>
            <p>Faylni shu yerga tashlang yoki <span>tanlang</span></p>
            <span className="upload-hint">MP4, WebM, MOV, AVI • Maksimum 500MB</span>
          </div>
        </div>
      ) : (
        <div className="selected-file">
          <div className="file-info">
            <FiVideo className="file-icon" />
            <div className="file-details">
              <span className="file-name">{selectedFile.name}</span>
              <span className="file-size">{formatFileSize(selectedFile.size)}</span>
            </div>
            {!uploading && (
              <button className="cancel-btn" onClick={cancelSelection}>
                <FiX />
              </button>
            )}
          </div>

          {uploading ? (
            <div className="upload-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div className="progress-info">
                <span>{progress}%</span>
                <span>Yuklanmoqda...</span>
              </div>
            </div>
          ) : (
            <button className="btn btn-primary upload-btn" onClick={handleUpload}>
              <FiUploadCloud /> Yuklash
            </button>
          )}
        </div>
      )}

      {currentVideoURL && (
        <div className="current-video-info">
          <FiCheck className="check-icon" />
          <span>Video yuklangan</span>
        </div>
      )}
    </div>
  );
};

export default VideoUploader;

