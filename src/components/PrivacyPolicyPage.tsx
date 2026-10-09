import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PrivacyPolicy } from './PrivacyPolicy';
import { useLocale } from '../i18n/locale';
import { updateSEO } from '../utils/seo';

export const PrivacyPolicyPage: React.FC = () => {
  const navigate = useNavigate();
  const { locale, logicalPath, href } = useLocale();

  useEffect(() => {
    updateSEO('privacy-policy', locale, logicalPath);
  }, [locale, logicalPath]);

  return (
    <PrivacyPolicy onBack={() => navigate(href('/'))} />
  );
};
