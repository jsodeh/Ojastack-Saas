/**
 * Template Rating System
 * Allows users to rate and review templates
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import {
  Star,
  ThumbsUp,
  MessageSquare,
  User,
  Calendar,
  CheckCircle
} from 'lucide-react';
import { templateManager, type TemplateReview } from '../../lib/template-manager';
import { supabase } from '../../lib/supabase';

interface TemplateRatingProps {
  templateId: string;
  currentUserRating?: TemplateReview;
  onRatingChange?: (rating: TemplateReview) => void;
  className?: string;
}

export const TemplateRating: React.FC<TemplateRatingProps> = ({
  templateId,
  currentUserRating,
  onRatingChange,
  className = ''
}) => {
  const [reviews, setReviews] = useState<TemplateReview[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  
  // Review form state
  const [selectedRating, setSelectedRating] = useState(currentUserRating?.rating || 0);
  const [reviewText, setReviewText] = useState(currentUserRating?.review || '');
  const [hoveredRating, setHoveredRating] = useState(0);

  useEffect(() => {
    loadReviews();
  }, [templateId]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const { reviews: reviewData, totalCount: count } = await templateManager.getTemplateReviews(templateId);
      setReviews(reviewData);
      setTotalCount(count);
    } catch (error) {
      console.error('Failed to load reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (selectedRating === 0) {
      alert('Please select a rating');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please log in to submit a review');
        return;
      }

      const review = await templateManager.reviewTemplate(
        templateId,
        user.id,
        selectedRating,
        reviewText.trim() || undefined
      );

      if (review) {
        await loadReviews();
        setShowReviewForm(false);
        
        if (onRatingChange) {
          onRatingChange(review);
        }
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
      alert('Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const calculateAverageRating = () => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return sum / reviews.length;
  };

  const getRatingDistribution = () => {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(review => {
      distribution[review.rating as keyof typeof distribution]++;
    });
    return distribution;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderStars = (rating: number, interactive: boolean = false, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'h-3 w-3',
      md: 'h-4 w-4',
      lg: 'h-5 w-5'
    };

    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className={`${sizeClasses[size]} ${
              star <= (interactive ? (hoveredRating || selectedRating) : rating)
                ? 'text-yellow-400 fill-current'
                : 'text-gray-300'
            } ${interactive ? 'cursor-pointer hover:text-yellow-400' : ''}`}
            onClick={interactive ? () => setSelectedRating(star) : undefined}
            onMouseEnter={interactive ? () => setHoveredRating(star) : undefined}
            onMouseLeave={interactive ? () => setHoveredRating(0) : undefined}
          />
        ))}
      </div>
    );
  };

  const averageRating = calculateAverageRating();
  const distribution = getRatingDistribution();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Rating Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Ratings & Reviews</span>
            <Badge variant="outline">
              {totalCount} review{totalCount !== 1 ? 's' : ''}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Average Rating */}
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">
                {averageRating.toFixed(1)}
              </div>
              <div className="mb-2">
                {renderStars(averageRating, false, 'lg')}
              </div>
              <p className="text-sm text-gray-600">
                Based on {totalCount} review{totalCount !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Rating Distribution */}
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map(rating => (
                <div key={rating} className="flex items-center space-x-2">
                  <span className="text-sm w-8">{rating}</span>
                  <Star className="h-3 w-3 text-yellow-400 fill-current" />
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-400 h-2 rounded-full"
                      style={{
                        width: totalCount > 0 
                          ? `${(distribution[rating as keyof typeof distribution] / totalCount) * 100}%`
                          : '0%'
                      }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-8">
                    {distribution[rating as keyof typeof distribution]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* User Review Section */}
          <div className="mt-6 pt-6 border-t">
            {currentUserRating ? (
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Your Review</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowReviewForm(true)}
                  >
                    Edit Review
                  </Button>
                </div>
                <div className="flex items-center space-x-2 mb-2">
                  {renderStars(currentUserRating.rating)}
                  <span className="text-sm text-gray-600">
                    {formatDate(currentUserRating.createdAt)}
                  </span>
                </div>
                {currentUserRating.review && (
                  <p className="text-sm text-gray-700">{currentUserRating.review}</p>
                )}
              </div>
            ) : (
              <div className="text-center">
                <Button onClick={() => setShowReviewForm(true)}>
                  <Star className="h-4 w-4 mr-2" />
                  Write a Review
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Review Form */}
      {showReviewForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {currentUserRating ? 'Edit Your Review' : 'Write a Review'}
            </CardTitle>
            <CardDescription>
              Share your experience with this template
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Rating *</label>
              {renderStars(selectedRating, true, 'lg')}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Review (Optional)
              </label>
              <Textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Share your thoughts about this template..."
                rows={4}
              />
            </div>

            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  setShowReviewForm(false);
                  setSelectedRating(currentUserRating?.rating || 0);
                  setReviewText(currentUserRating?.review || '');
                }}
              >
                Cancel
              </Button>
              
              <Button onClick={handleSubmitReview} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Review'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="text-center py-8">
              <div className="animate-pulse">Loading reviews...</div>
            </CardContent>
          </Card>
        ) : reviews.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-gray-500">No reviews yet</p>
              <p className="text-sm text-gray-400">Be the first to review this template!</p>
            </CardContent>
          </Card>
        ) : (
          reviews.map(review => (
            <Card key={review.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      {review.user?.avatar ? (
                        <img
                          src={review.user.avatar}
                          alt={review.user.name}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <User className="h-4 w-4 text-gray-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {review.user?.name || 'Anonymous'}
                      </p>
                      <div className="flex items-center space-x-2">
                        {renderStars(review.rating, false, 'sm')}
                        <span className="text-xs text-gray-500">
                          <Calendar className="h-3 w-3 inline mr-1" />
                          {formatDate(review.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {review.helpfulCount > 0 && (
                    <div className="flex items-center space-x-1 text-sm text-gray-500">
                      <ThumbsUp className="h-3 w-3" />
                      <span>{review.helpfulCount}</span>
                    </div>
                  )}
                </div>

                {review.review && (
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {review.review}
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Load More Reviews */}
      {totalCount > reviews.length && (
        <div className="text-center">
          <Button variant="outline" onClick={loadReviews}>
            Load More Reviews
          </Button>
        </div>
      )}
    </div>
  );
};

export default TemplateRating;