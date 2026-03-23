import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PhoneIcon, ShieldExclamationIcon, XMarkIcon } from '@heroicons/react/24/solid';

const EmergencyAlert = ({ currentLocation, onEmergencyActivate }) => {
  const [isSOSActive, setIsSOSActive] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [emergencyContacts, setEmergencyContacts] = useState([
    { id: 1, name: 'Police Control Room', number: '112' },
    { id: 2, name: 'Women Helpline', number: '1091' },
    { id: 3, name: 'Ambulance', number: '108' }
  ]);

  useEffect(() => {
    let timer;
    if (isSOSActive && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      handleEmergencyActivation();
    }
    return () => clearInterval(timer);
  }, [isSOSActive, countdown]);

  const handleSOSClick = () => {
    setIsSOSActive(true);
    setCountdown(5);
  };

  const cancelSOS = () => {
    setIsSOSActive(false);
    setCountdown(5);
  };

  const handleEmergencyActivation = () => {
    const emergencyData = {
      location: currentLocation,
      timestamp: new Date().toISOString(),
      contacts: emergencyContacts
    };
    onEmergencyActivate(emergencyData);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <AnimatePresence>
        {isSOSActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-lg shadow-xl p-4 mb-4 w-80"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-red-600">Emergency Alert</h3>
              <button
                onClick={cancelSOS}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <p className="text-gray-600 mb-4">
              Emergency services will be contacted in {countdown} seconds. Click cancel to stop.
            </p>
            <div className="space-y-2">
              {emergencyContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <span className="text-sm font-medium">{contact.name}</span>
                  <a
                    href={`tel:${contact.number}`}
                    className="flex items-center text-blue-600 hover:text-blue-800"
                  >
                    <PhoneIcon className="h-4 w-4 mr-1" />
                    {contact.number}
                  </a>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={handleSOSClick}
        className={`flex items-center justify-center w-16 h-16 rounded-full ${
          isSOSActive ? 'bg-red-600' : 'bg-red-500 hover:bg-red-600'
        } text-white shadow-lg transition-colors duration-200`}
      >
        <ShieldExclamationIcon className="h-8 w-8" />
      </motion.button>
    </div>
  );
};

export default EmergencyAlert; 