import { supabase } from '../lib/supabase';

export interface OAuthProvider {
  name: string;
  displayName: string;
  icon: string;
  color: string;
}

export const oauthProviders: Record<string, OAuthProvider> = {
  google: {
    name: 'google',
    displayName: 'Google',
    icon: 'chrome',
    color: 'blue'
  },
  facebook: {
    name: 'facebook',
    displayName: 'Facebook',
    icon: 'facebook',
    color: 'blue'
  }
};

export const signInWithOAuth = async (
  provider: 'google' | 'facebook',
  userType: 'driver' | 'client'
) => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?type=${userType}`,
        queryParams: {
          user_type: userType
        }
      }
    });

    if (error) {
      console.error(`Erreur OAuth ${provider}:`, error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Erreur lors de la connexion OAuth:', error);
    throw error;
  }
};

export const handleOAuthCallback = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Erreur lors de la récupération de la session:', error);
      throw error;
    }

    return data.session;
  } catch (error) {
    console.error('Erreur lors du callback OAuth:', error);
    throw error;
  }
};