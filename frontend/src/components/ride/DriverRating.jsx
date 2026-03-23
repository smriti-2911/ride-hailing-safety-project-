import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  StarIcon,
  FlagIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/solid';

const DriverRating = ({ rideDetails, onSubmit, onReport }) => {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [safetyIssues, setSafetyIssues] = useState([]);
  const [submitted, setSubmitted] = useState(false);

  const safetyOptions = [
    { id: 'speeding', label: 'Speeding' },
    { id: 'route_deviation', label: 'Route Deviation' },
    { id: 'behavior', label: 'Inappropriate Behavior' },
    { id: 'vehicle', label: 'Vehicle Condition' },
    { id: 'driving', label: 'Unsafe Driving' },
  ];

  const handleSubmit = () => {
    const reviewData = {
      rating,
      feedback,
      safetyIssues,
      rideId: rideDetails.id,
      driverId: rideDetails.driverId,
      timestamp: new Date().toISOString(),
    };

    onSubmit(reviewData);
    setSubmitted(true);
  };

  const handleSafetyReport = () => {
    if (safetyIssues.length > 0) {
      onReport({
        issues: safetyIssues,
        rideDetails,
        description: feedback,
      });
    }
  };

  const toggleSafetyIssue = (issueId) => {
    setSafetyIssues((prev) =>
      prev.includes(issueId)
        ? prev.filter((id) => id !== issueId)
        : [...prev, issueId]
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
      <AnimatePresence>
        {!submitted ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <h2 className="text-xl font-semibold mb-4">Rate Your Ride</h2>
            
            <div className="flex items-center space-x-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <motion.button
                  key={star}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setRating(star)}
                  className="focus:outline-none"
                >
                  <StarIcon
                    className={`h-8 w-8 ${
                      star <= rating
                        ? 'text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </motion.button>
              ))}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Feedback
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                rows="4"
                placeholder="Share your experience..."
              />
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Safety Concerns
              </h3>
              <div className="space-y-2">
                {safetyOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => toggleSafetyIssue(option.id)}
                    className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium mr-2 ${
                      safetyIssues.includes(option.id)
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <FlagIcon className="h-4 w-4 mr-1" />
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={handleSubmit}
                disabled={!rating}
                className={`flex-1 px-4 py-2 rounded-md text-white font-medium ${
                  rating
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                Submit Review
              </button>
              {safetyIssues.length > 0 && (
                <button
                  onClick={handleSafetyReport}
                  className="px-4 py-2 rounded-md text-white font-medium bg-red-600 hover:bg-red-700"
                >
                  Report Issues
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-8"
          >
            <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Thank You for Your Feedback!
            </h3>
            <p className="text-gray-600">
              Your feedback helps us improve our service and ensure safer rides for everyone.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DriverRating; 