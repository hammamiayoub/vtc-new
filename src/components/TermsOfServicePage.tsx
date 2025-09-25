import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TermsOfService } from './TermsOfService';

export const TermsOfServicePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <TermsOfService onBack={() => navigate('/')} />
  );
};
