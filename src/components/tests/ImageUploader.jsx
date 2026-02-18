import { useState, useRef } from 'react';
import { FiUpload, FiX, FiImage, FiPlus } from 'react-icons/fi';
import { toast } from 'react-toastify';
import './ImageUploader.css';

const ImageUploader = ({ initialImageUrl, initialFileName, onImageChange, onRemove }) => {
  const [imageUrl, setImageUrl] = useState(initialImageUrl || null);
  const [fileName, setFileName] = useState(initialFileName || null);
  const [imageFile, setImageFile] = useState(null); // Local file for preview
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Faqat rasm fayllari (JPG, PNG, GIF, WebP) qabul qilinadi');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('Rasm hajmi 5MB dan oshmasligi kerak');
      return;
    }

    // Create local preview (NOT uploading yet)
    const previewUrl = URL.createObjectURL(file);
    setImageUrl(previewUrl);
    setFileName(file.name);
    setImageFile(file);
    
    if (onImageChange) {
      onImageChange({
        file: file,
        fileName: file.name,
        isLocal: true  // Mark as local, not uploaded
      });
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = () => {
    // Clean up local preview URL
    if (imageUrl && imageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imageUrl);
    }
    
    setImageUrl(null);
    setFileName(null);
    setImageFile(null);
    
    if (onRemove) {
      onRemove();
    }
  };

  return (
    <div className="image-uploader">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="image-file-input"
        id="image-upload-input"
        style={{ display: 'none' }}
      />
      {!imageUrl ? (
        <button
          type='button'
          className="image-upload-btn"
          onClick={() => fileInputRef.current?.click()}
          title="Rasm qo'shish"
        >
          <FiPlus size={20} />
          <span>Rasm qo'shish</span>
        </button>
      ) : (
        <div className="image-uploaded">
          <div className="image-preview-container">
            <img src={imageUrl} alt="Question" className="image-preview" />
            <button
              type='button'
              className="image-remove-btn"
              onClick={handleRemove}
              title="Rasmni olib tashlash"
              aria-label="Remove image"
            >
              <FiX size={16} />
            </button>
          </div>
          <small className="image-filename">{fileName}</small>
        </div>
      )}


    </div>
  );
};

export default ImageUploader;
