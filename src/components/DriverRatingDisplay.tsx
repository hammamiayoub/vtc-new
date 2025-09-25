import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, User, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Rating } from '../types';

interface DriverRatingDisplayProps {
  driverId: string;
  showDetails?: boolean;
}

interface RatingStats {
  averageRating: number;
  totalRatings: number;
  ratingDistribution: {
    five: number;
    four: number;
    three: number;
    two: number;
    one: number;
  };
}

export const DriverRatingDisplay: React.FC<DriverRatingDisplayProps> = ({
  driverId,
  showDetails = false
}) => {
  const [stats, setStats] = useState<RatingStats | null>(null);
  const [recentRatings, setRecentRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRatingStats();
    if (showDetails) {
      fetchRecentRatings();
    }
  }, [driverId, showDetails]);

  const fetchRatingStats = async () => {
    try {
      const { data, error } = await supabase
        .from('driver_rating_stats')
        .select('*')
        .eq('driver_id', driverId)
        .single();

      if (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        return;
      }

      if (data) {
        setStats({
          averageRating: parseFloat(data.average_rating) || 0,
          totalRatings: data.total_ratings || 0,
          ratingDistribution: {
            five: data.five_star_count || 0,
            four: data.four_star_count || 0,
            three: data.three_star_count || 0,
            two: data.two_star_count || 0,
            one: data.one_star_count || 0
          }
        });
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentRatings = async () => {
    try {
      const { data, error } = await supabase
        .from('ratings')
        .select(`
          *,
          client:clients(first_name, last_name)
        `)
        .eq('driver_id', driverId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Erreur lors de la récupération des notes récentes:', error);
        return;
      }

      setRecentRatings(data || []);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const renderStars = (rating: number, size: number = 16) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={size}
            className={`${
              star <= rating
                ? 'text-yellow-400 fill-current'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
        <span className="text-sm">Chargement des notes...</span>
      </div>
    );
  }

  if (!stats || stats.totalRatings === 0) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <Star size={16} className="text-gray-400" />
        <span className="text-sm">Aucune note</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Note moyenne et nombre total */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {renderStars(Math.round(stats.averageRating), 20)}
          <span className="text-lg font-semibold text-gray-900">
            {stats.averageRating.toFixed(1)}
          </span>
        </div>
        <div className="text-sm text-gray-600">
          ({stats.totalRatings} {stats.totalRatings === 1 ? 'note' : 'notes'})
        </div>
      </div>

      {/* Répartition des notes */}
      {showDetails && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Répartition des notes</h4>
          {[5, 4, 3, 2, 1].map((star) => {
            const count = stats.ratingDistribution[
              star === 5 ? 'five' : 
              star === 4 ? 'four' : 
              star === 3 ? 'three' : 
              star === 2 ? 'two' : 'one'
            ];
            const percentage = stats.totalRatings > 0 ? (count / stats.totalRatings) * 100 : 0;
            
            return (
              <div key={star} className="flex items-center gap-2">
                <span className="text-sm text-gray-600 w-8">{star}</span>
                <Star size={14} className="text-yellow-400 fill-current" />
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-8">{count}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Notes récentes */}
      {showDetails && recentRatings.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <MessageSquare size={16} />
            Avis récents
          </h4>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {recentRatings.map((rating) => (
              <div key={rating.id} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-gray-500" />
                    <span className="text-sm font-medium text-gray-900">
                      {rating.client?.first_name} {rating.client?.last_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {renderStars(rating.rating, 14)}
                    <span className="text-xs text-gray-500 ml-1">
                      {new Date(rating.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
                {rating.comment && (
                  <p className="text-sm text-gray-700 italic">
                    "{rating.comment}"
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
