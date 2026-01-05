import { useState, useRef } from 'react';
import { FiUpload, FiX, FiMusic } from 'react-icons/fi';
import { audioService } from '../../services/audioService';
import { toast } from 'react-toastify';
import AudioPlayer from './AudioPlayer';
import './AudioUploader.css';

const AudioUploader = ({ testId, initialAudioUrl, initialFileName, initialDuration, onAudioChange, onRemove }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [audioUrl, setAudioUrl] = useState(initialAudioUrl || null);
  const [fileName, setFileName] = useState(initialFileName || null);
  const [duration, setDuration] = useState(initialDuration || 0);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm'];
    if (!validTypes.includes(file.type)) {
      toast.error('Faqat audio fayllar (MP3, WAV, OGG) qabul qilinadi');
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('Audio fayl hajmi 10MB dan oshmasligi kerak');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const result = await audioService.uploadTestAudio(
        testId || 'temp',
        file,
        (progress) => {
          setUploadProgress(progress);
        }
      );

      if (result.success) {
        setAudioUrl(result.url);
        setFileName(result.fileName);
        setDuration(result.duration);
        
        if (onAudioChange) {
          onAudioChange({
            url: result.url,
            fileName: result.fileName,
            duration: result.duration,
            size: result.size
          });
        }
        
        toast.success('Audio muvaffaqiyatli yuklandi');
      } else {
        toast.error(result.error || 'Audio yuklashda xatolik');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Audio yuklashda xatolik');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    setAudioUrl(null);
    setFileName(null);
    setDuration(0);
    
    if (onRemove) {
      onRemove();
    }
    
    toast.success('Audio o\'chirildi');
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="audio-uploader">
      {!audioUrl ? (
        <div className="audio-upload-area">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileSelect}
            className="audio-file-input"
            id="audio-upload-input"
            disabled={uploading}
          />
          <label
            htmlFor="audio-upload-input"
            className={`audio-upload-label ${uploading ? 'uploading' : ''}`}
          >
            {uploading ? (
              <div className="upload-progress">
                <div className="upload-progress-bar">
                  <div
                    className="upload-progress-fill"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <span className="upload-progress-text">
                  {Math.round(uploadProgress)}% yuklanmoqda...
                </span>
              </div>
            ) : (
              <>
                <FiMusic className="upload-icon" />
                <div className="upload-text">
                  <strong>Audio fayl yuklash</strong>
                  <span>MP3, WAV, OGG (maks. 10MB)</span>
                </div>
                <FiUpload className="upload-arrow-icon" />
              </>
            )}
          </label>
        </div>
      ) : (
        <div className="audio-uploaded">
          <div className="audio-info">
            <FiMusic className="audio-info-icon" />
            <div className="audio-info-details">
              <div className="audio-file-name">{fileName}</div>
              <div className="audio-file-meta">
                {formatDuration(duration)} • {formatFileSize(duration * 16000)} {/* Approximate size */}
              </div>
            </div>
            <button
              type="button"
              className="audio-remove-btn"
              onClick={handleRemove}
              title="O'chirish"
            >
              <FiX />
            </button>
          </div>
          <AudioPlayer audioUrl={audioUrl} />
        </div>
      )}
    </div>
  );
};

export default AudioUploader;

