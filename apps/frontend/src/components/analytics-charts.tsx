'use client';

import React from 'react';
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
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface AnalyticsChartsProps {
  analyticsData: any;
}

export default function AnalyticsCharts({ analyticsData }: AnalyticsChartsProps) {
  if (!analyticsData) return null;

  // Revenue Chart Data
  const revenueData = {
    labels: analyticsData.revenue?.revenueByDay?.map((item: any) => item.date) || [],
    datasets: [
      {
        label: 'Doanh thu (VND)',
        data: analyticsData.revenue?.revenueByDay?.map((item: any) => item.revenue) || [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  // Users by Role Chart Data
  const usersByRoleData = {
    labels: analyticsData.users?.usersByRole?.map((role: any) => role.role) || [],
    datasets: [
      {
        data: analyticsData.users?.usersByRole?.map((role: any) => role.count) || [],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',   // Red for ADMIN
          'rgba(147, 51, 234, 0.8)',   // Purple for MANAGER
          'rgba(59, 130, 246, 0.8)',   // Blue for CASHIER
          'rgba(34, 197, 94, 0.8)',    // Green for WAITER
          'rgba(245, 158, 11, 0.8)',   // Yellow for KITCHEN
        ],
        borderColor: [
          'rgba(239, 68, 68, 1)',
          'rgba(147, 51, 234, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(34, 197, 94, 1)',
          'rgba(245, 158, 11, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  // System Activity Chart Data
  const systemActivityData = {
    labels: ['Total Logs', 'Error Logs', 'Login Attempts'],
    datasets: [
      {
        label: 'System Activity',
        data: [
          analyticsData.system?.totalAuditLogs || 0,
          analyticsData.system?.errorLogs || 0,
          analyticsData.system?.loginLogs || 0,
        ],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(34, 197, 94, 0.8)',
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(34, 197, 94, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  // User Activity Status Chart
  const userStatusData = {
    labels: ['Active Users', 'Inactive Users'],
    datasets: [
      {
        data: [
          analyticsData.users?.activeUsers || 0,
          analyticsData.users?.inactiveUsers || 0,
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(239, 68, 68, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Analytics Dashboard',
      },
    },
  };

  const lineChartOptions = {
    ...chartOptions,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return new Intl.NumberFormat('vi-VN', { 
              style: 'currency', 
              currency: 'VND' 
            }).format(value);
          }
        }
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Revenue Trend Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Revenue Trend</h3>
        <div className="h-80">
          <Line data={revenueData} options={lineChartOptions} />
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users by Role */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Users by Role</h3>
          <div className="h-64">
            <Doughnut data={usersByRoleData} options={chartOptions} />
          </div>
        </div>

        {/* User Status */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">User Status</h3>
          <div className="h-64">
            <Doughnut data={userStatusData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* System Activity */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">System Activity</h3>
        <div className="h-64">
          <Bar data={systemActivityData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
}
