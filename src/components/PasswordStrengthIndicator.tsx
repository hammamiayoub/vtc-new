import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { validatePassword } from '../utils/validation';

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  className = ''
}) => {
  const requirements = validatePassword(password);
  const strength = requirements.filter(req => req.met).length;
  
  const getStrengthColor = () => {
    if (strength <= 2) return 'text-red-500';
    if (strength <= 4) return 'text-orange-500';
    return 'text-green-500';
  };

  const getStrengthText = () => {
    if (strength <= 2) return 'Faible';
    if (strength <= 4) return 'Moyen';
    return 'Fort';
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Force du mot de passe</span>
        <span className={`text-sm font-bold ${getStrengthColor()}`}>
          {getStrengthText()}
        </span>
      </div>
      
      <div className="grid grid-cols-5 gap-2">
        {requirements.map((_, index) => (
          <div
            key={index}
            className={`h-2 rounded-full transition-all duration-300 ${
              index < strength ? getStrengthColor().replace('text-', 'bg-') : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      <div className="space-y-2">
        {requirements.map((req, index) => (
          <div key={index} className="flex items-center gap-2">
            {req.met ? (
              <CheckCircle2 size={16} className="text-green-500" />
            ) : (
              <Circle size={16} className="text-gray-300" />
            )}
            <span className={`text-sm ${req.met ? 'text-green-600' : 'text-gray-500'}`}>
              {req.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};