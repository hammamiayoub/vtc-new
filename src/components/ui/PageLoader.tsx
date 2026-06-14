import React from 'react';

interface PageLoaderProps {
  label?: string;
  fullScreen?: boolean;
}

export const PageLoader: React.FC<PageLoaderProps> = ({
  label = 'Chargement…',
  fullScreen = false,
}) => (
  <div
    className={`flex items-center justify-center ${
      fullScreen ? 'min-h-screen bg-gray-50' : 'min-h-[40vh] py-16'
    }`}
    role="status"
    aria-live="polite"
  >
    <div className="text-center">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-gray-900 mx-auto mb-3" />
      <p className="text-sm text-gray-600">{label}</p>
    </div>
  </div>
);
