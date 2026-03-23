import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import {
  CalendarIcon,
  ChartBarIcon,
  MapIcon,
  ClockIcon,
} from '@heroicons/react/24/solid';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const SafetyHistory = ({ safetyData, timeRange = 'month' }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedMetric, setSelectedMetric] = useState('safety_score');
  const [chartData, setChartData] = useState(null);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: ChartBarIcon },
    { id: 'trends', label: 'Trends', icon: LineElement },
    { id: 'locations', label: 'Locations', icon: MapIcon },
    { id: 'time', label: 'Time Analysis', icon: ClockIcon },
  ];

  const metrics = [
    { id: 'safety_score', label: 'Safety Score' },
    { id: 'incidents', label: 'Incidents' },
    { id: 'route_deviations', label: 'Route Deviations' },
    { id: 'emergency_alerts', label: 'Emergency Alerts' },
  ];

  useEffect(() => {
    if (safetyData) {
      prepareChartData();
    }
  }, [safetyData, timeRange, selectedMetric]);

  const prepareChartData = () => {
    // Process and format data based on selected metric and time range
    const labels = safetyData.map((entry) => entry.date);
    const data = safetyData.map((entry) => entry[selectedMetric]);

    setChartData({
      labels,
      datasets: [
        {
          label: metrics.find((m) => m.id === selectedMetric)?.label,
          data,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          tension: 0.4,
        },
      ],
    });
  };

  const renderOverview = () => (
    <div className="grid grid-cols-2 gap-4 mb-6">
      {metrics.map((metric) => (
        <motion.div
          key={metric.id}
          whileHover={{ scale: 1.02 }}
          className="bg-white p-4 rounded-lg shadow-sm border border-gray-100"
        >
          <h4 className="text-sm font-medium text-gray-500">{metric.label}</h4>
          <p className="text-2xl font-semibold mt-2">
            {calculateMetricAverage(metric.id)}
          </p>
          <div className="text-sm text-gray-500 mt-1">
            {calculateMetricTrend(metric.id)}
          </div>
        </motion.div>
      ))}
    </div>
  );

  const renderTrends = () => (
    <div>
      <div className="mb-4">
        <select
          value={selectedMetric}
          onChange={(e) => setSelectedMetric(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md"
        >
          {metrics.map((metric) => (
            <option key={metric.id} value={metric.id}>
              {metric.label}
            </option>
          ))}
        </select>
      </div>
      {chartData && (
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <Line
            data={chartData}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'top',
                },
                title: {
                  display: true,
                  text: `${
                    metrics.find((m) => m.id === selectedMetric)?.label
                  } Over Time`,
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                },
              },
            }}
          />
        </div>
      )}
    </div>
  );

  const renderLocations = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Safety by Location</h3>
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <Bar
          data={{
            labels: ['Area 1', 'Area 2', 'Area 3', 'Area 4', 'Area 5'],
            datasets: [
              {
                label: 'Average Safety Score',
                data: [85, 75, 90, 65, 80],
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
              },
            ],
          }}
          options={{
            responsive: true,
            plugins: {
              legend: {
                position: 'top',
              },
            },
            scales: {
              y: {
                beginAtZero: true,
                max: 100,
              },
            },
          }}
        />
      </div>
    </div>
  );

  const renderTimeAnalysis = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Safety by Time of Day</h3>
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <Line
          data={{
            labels: [
              '12am',
              '3am',
              '6am',
              '9am',
              '12pm',
              '3pm',
              '6pm',
              '9pm',
            ],
            datasets: [
              {
                label: 'Average Safety Score',
                data: [75, 70, 85, 90, 88, 85, 80, 78],
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                tension: 0.4,
              },
            ],
          }}
          options={{
            responsive: true,
            plugins: {
              legend: {
                position: 'top',
              },
            },
            scales: {
              y: {
                beginAtZero: true,
                max: 100,
              },
            },
          }}
        />
      </div>
    </div>
  );

  const calculateMetricAverage = (metricId) => {
    if (!safetyData || !safetyData.length) return '0';
    const sum = safetyData.reduce((acc, entry) => acc + entry[metricId], 0);
    const avg = sum / safetyData.length;
    return metricId === 'safety_score'
      ? `${(avg * 100).toFixed(1)}%`
      : avg.toFixed(1);
  };

  const calculateMetricTrend = (metricId) => {
    if (!safetyData || safetyData.length < 2) return 'No trend data';
    const latest = safetyData[safetyData.length - 1][metricId];
    const previous = safetyData[safetyData.length - 2][metricId];
    const change = ((latest - previous) / previous) * 100;
    return change > 0
      ? `↑ ${change.toFixed(1)}% increase`
      : `↓ ${Math.abs(change).toFixed(1)}% decrease`;
  };

  return (
    <div className="bg-gray-50 p-6 rounded-xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Safety History</h2>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="week">Last Week</option>
          <option value="month">Last Month</option>
          <option value="year">Last Year</option>
        </select>
      </div>

      <div className="flex space-x-4 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
              activeTab === tab.id
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <tab.icon className="h-5 w-5" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg p-6">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'trends' && renderTrends()}
        {activeTab === 'locations' && renderLocations()}
        {activeTab === 'time' && renderTimeAnalysis()}
      </div>
    </div>
  );
};

export default SafetyHistory; 