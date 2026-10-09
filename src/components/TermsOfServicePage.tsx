import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TermsOfService } from './TermsOfService';
import { useLocale } from '../i18n/locale';
import { updateSEO } from '../utils/seo';

export const TermsOfServicePage: React.FC = () => {
  const navigate = useNavigate();
  const { locale, logicalPath, href } = useLocale();

  useEffect(() => {
    updateSEO('terms-of-service', locale, logicalPath);
  }, [locale, logicalPath]);

  return (
    <TermsOfService onBack={() => navigate(href('/'))} />
  );
};
