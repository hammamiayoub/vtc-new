import React, { useState, useRef } from 'react';
import { Upload, Car, X, Camera, Loader2, Trash2 } from 'lucide-react';
import { Button } from './Button';

interface VehicleImageUploadProps {
  currentImageUrl?: string;
  onImageUpload: (file: File) => Promise<void>;
  onImageDelete?: () => Promise<void>;
  loading?: boolean;
  className?: string;
}

export const VehicleImageUpload: React.FC<VehicleImageUploadProps> = ({
  currentImageUrl,
  onImageUpload,
  onImageDelete,
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

  const handleDelete = async () => {
    if (onImageDelete && window.confirm('Êtes-vous sûr de vouloir supprimer cette photo ?')) {
      try {
        await onImageDelete();
        setPreviewUrl(null);
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        alert('Erreur lors de la suppression de la photo');
      }
    }
  };

  const currentImage = previewUrl || currentImageUrl;

  return (
    <div className={`relative ${className}`}>
      <div
        className={`relative w-full h-48 rounded-xl border-2 border-dashed transition-all duration-200 ${
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
          <div className="relative w-full h-full">
            <img
              src={currentImage}
              alt="Photo du véhicule"
              className="w-full h-full rounded-xl object-cover"
            />
            
            {/* Overlay de chargement */}
            {loading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-xl flex items-center justify-center">
                <Loader2 size={32} className="text-white animate-spin" />
              </div>
            )}

            {/* Boutons d'action */}
            {!loading && (
              <div className="absolute top-2 right-2 flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg transition-colors"
                  title="Changer la photo"
                >
                  <Camera size={16} />
                </button>
                {onImageDelete && (
                  <button
                    onClick={handleDelete}
                    className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-lg transition-colors"
                    title="Supprimer la photo"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <Car size={48} className="text-gray-400 mb-4" />
            <p className="text-gray-600 font-medium mb-2">Photo de votre véhicule</p>
            <p className="text-sm text-gray-500 text-center mb-4">
              Cliquez pour ajouter une photo ou glissez-déposez
            </p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="flex items-center gap-2"
              disabled={loading}
            >
              <Upload size={16} />
              Ajouter une photo
            </Button>
          </div>
        )}

        {/* Zone de drop */}
        {dragOver && (
          <div className="absolute inset-0 bg-blue-500 bg-opacity-20 rounded-xl flex items-center justify-center border-2 border-dashed border-blue-500">
            <div className="text-center">
              <Upload size={32} className="text-blue-600 mx-auto mb-2" />
              <p className="text-blue-600 font-medium">Déposer l'image du véhicule</p>
            </div>
          </div>
        )}
      </div>

      {/* Input file caché */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Instructions */}
      <div className="text-center mt-3">
        <p className="text-xs text-gray-500">
          JPG, PNG ou GIF • Max 5MB • Recommandé: 800x600px
        </p>
      </div>
    </div>
  );
};