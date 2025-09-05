import React, { useState, useRef } from 'react';
import { Upload, User, X, Camera, Loader2 } from 'lucide-react';
import { Button } from './Button';

interface ImageUploadProps {
  currentImageUrl?: string;
  onImageUpload: (file: File) => Promise<void>;
  loading?: boolean;
  className?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  currentImageUrl,
  onImageUpload,
  loading = false,
  className = ''
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner un fichier image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB max
      alert('La taille du fichier ne doit pas dépasser 5MB');
      return;
    }

    // Créer une preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload du fichier
    try {
      await onImageUpload(file);
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error);
      setPreviewUrl(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const currentImage = previewUrl || currentImageUrl;

  return (
    <div className={`relative ${className}`}>
      <div
        className={`relative w-32 h-32 mx-auto rounded-full border-4 transition-all duration-200 ${
          dragOver 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 bg-gray-50 hover:border-gray-400'
        } ${loading ? 'opacity-50' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {currentImage ? (
          <img
            src={currentImage}
            alt="Photo de profil"
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <div className="w-full h-full rounded-full flex items-center justify-center">
            <User size={48} className="text-gray-400" />
          </div>
        )}

        {/* Overlay de chargement */}
        {loading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
            <Loader2 size={24} className="text-white animate-spin" />
          </div>
        )}

        {/* Bouton de caméra */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="absolute bottom-0 right-0 w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg transition-colors disabled:opacity-50"
          title="Changer la photo"
        >
          <Camera size={16} />
        </button>
      </div>

      {/* Zone de drop */}
      {dragOver && (
        <div className="absolute inset-0 bg-blue-500 bg-opacity-20 rounded-full flex items-center justify-center border-2 border-dashed border-blue-500">
          <div className="text-center">
            <Upload size={24} className="text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-blue-600 font-medium">Déposer l'image</p>
          </div>
        </div>
      )}

      {/* Input file caché */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Instructions */}
      <div className="text-center mt-4">
        <p className="text-sm text-gray-600 mb-2">
          Cliquez sur l'icône caméra ou glissez une image
        </p>
        <p className="text-xs text-gray-500">
          JPG, PNG ou GIF • Max 5MB
        </p>
      </div>
    </div>
  );
};