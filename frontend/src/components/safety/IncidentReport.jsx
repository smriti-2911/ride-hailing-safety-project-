import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ExclamationTriangleIcon,
  CameraIcon,
  MapPinIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/solid';

const IncidentReport = ({ currentLocation, onSubmit }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    incidentType: '',
    description: '',
    location: currentLocation,
    images: [],
    witnesses: false,
    policeReport: false,
    contactPreference: 'phone',
  });

  const incidentTypes = [
    { id: 'accident', label: 'Accident', icon: '🚗' },
    { id: 'harassment', label: 'Harassment', icon: '⚠️' },
    { id: 'theft', label: 'Theft', icon: '💼' },
    { id: 'dangerous_driving', label: 'Dangerous Driving', icon: '🚫' },
    { id: 'vehicle_issue', label: 'Vehicle Issue', icon: '🔧' },
    { id: 'other', label: 'Other', icon: '❓' },
  ];

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);
    const imagePromises = files.map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(imagePromises).then((images) => {
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...images],
      }));
    });
  };

  const handleSubmit = () => {
    const reportData = {
      ...formData,
      timestamp: new Date().toISOString(),
      status: 'submitted',
    };
    onSubmit(reportData);
    setStep(4);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
          >
            <h3 className="text-lg font-medium mb-4">What type of incident occurred?</h3>
            <div className="grid grid-cols-2 gap-4">
              {incidentTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, incidentType: type.id }));
                    setStep(2);
                  }}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    formData.incidentType === type.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <span className="text-2xl mb-2">{type.icon}</span>
                  <p className="font-medium">{type.label}</p>
                </button>
              ))}
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
          >
            <h3 className="text-lg font-medium mb-4">Incident Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows="4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Please provide detailed information about the incident..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Images
                </label>
                <div className="flex items-center space-x-4">
                  <label className="cursor-pointer bg-blue-50 hover:bg-blue-100 p-4 rounded-lg border-2 border-dashed border-blue-300">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                    <CameraIcon className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                    <span className="text-sm text-blue-600">Add Photos</span>
                  </label>
                  {formData.images.length > 0 && (
                    <div className="flex space-x-2">
                      {formData.images.map((img, index) => (
                        <div
                          key={index}
                          className="relative w-16 h-16 rounded-lg overflow-hidden"
                        >
                          <img
                            src={img}
                            alt={`Incident ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => setStep(3)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Continue
              </button>
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
          >
            <h3 className="text-lg font-medium mb-4">Additional Information</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <MapPinIcon className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-600">
                  Location: {formData.location.lat}, {formData.location.lng}
                </span>
              </div>

              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.witnesses}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        witnesses: e.target.checked,
                      }))
                    }
                    className="rounded text-blue-600"
                  />
                  <span>There were witnesses</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.policeReport}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        policeReport: e.target.checked,
                      }))
                    }
                    className="rounded text-blue-600"
                  />
                  <span>Police report filed</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Contact Method
                </label>
                <select
                  value={formData.contactPreference}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      contactPreference: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="phone">Phone</option>
                  <option value="email">Email</option>
                  <option value="app">In-App Message</option>
                </select>
              </div>

              <button
                onClick={handleSubmit}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Submit Report
              </button>
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-8"
          >
            <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Report Submitted Successfully
            </h3>
            <p className="text-gray-600">
              Thank you for reporting this incident. Our safety team will review it
              and contact you via your preferred method.
            </p>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
      {step < 4 && (
        <div className="flex items-center space-x-2 mb-6">
          <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
          <h2 className="text-xl font-semibold">Report an Incident</h2>
        </div>
      )}
      {renderStep()}
    </div>
  );
};

export default IncidentReport; 