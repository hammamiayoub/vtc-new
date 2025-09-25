import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PrivacyPolicy } from './PrivacyPolicy';

export const PrivacyPolicyPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <PrivacyPolicy onBack={() => navigate('/')} />
  );
};
