import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Clock, Search, Download, BarChart3, CheckCircle, TrendingUp, Trophy } from "lucide-react";
import { format } from "date-fns";

export default function Reports() {
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });

  const { data: timeSessions = [], refetch } = useQuery({
    queryKey: ["/api/time-sessions", dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange.startDate) params.append("startDate", dateRange.startDate);
      if (dateRange.endDate) params.append("endDate", dateRange.endDate);
      
      const response = await fetch(`/api/time-sessions?${params}`, {
        credentials: "include",
      });
      
      if (!response.ok) throw new Error("Failed to fetch time sessions");
      return response.json();
    },
    enabled: false, // Only fetch when explicitly triggered
  });

  useEffect(() => {
    // Set default dates (last 7 days)
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    setDateRange({
      startDate: weekAgo.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
    });
  }, []);

  const handleDateChange = (e) => {
    setDateRange({
      ...dateRange,
      [e.target.name]: e.target.value,
    });
  };

  const handleGenerateReport = () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      alert("Please select both start and end dates");
      return;
    }
    refetch();
  };

  const handleExportCSV = () => {
    if (timeSessions.length === 0) {
      alert("No data to export");
      return;
    }

    const csvHeader = "Date,Task,Start Time,End Time,Duration\n";
    const csvData = timeSessions
      .filter(session => session.endTime) // Only completed sessions
      .map(session => {
        const startDate = new Date(session.startTime);
        const endDate = new Date(session.endTime);
        const duration = session.duration || 0;
        const hours = Math.floor(duration / 3600);
        const minutes = Math.floor((duration % 3600) / 60);
        const durationString = `${hours}h ${minutes}m`;
        
        return [
          format(startDate, 'yyyy-MM-dd'),
          `"${session.taskName}"`,
          format(startDate, 'hh:mm a'),
          format(endDate, 'hh:mm a'),
          durationString
        ].join(',');
      })
      .join('\n');

    const csvContent = csvHeader + csvData;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `time-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const calculateStats = () => {
    const completedSessions = timeSessions.filter(session => session.endTime);
    const totalSeconds = completedSessions.reduce((sum, session) => sum + (session.duration || 0), 0);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    
    const averageSeconds = completedSessions.length > 0 ? totalSeconds / completedSessions.length : 0;
    const avgMinutes = Math.floor(averageSeconds / 60);
    const avgHours = Math.floor(avgMinutes / 60);
    const avgMins = avgMinutes % 60;

    // Find most productive day
    const dayStats = {};
    completedSessions.forEach(session => {
      const day = format(new Date(session.startTime), 'EEEE');
      dayStats[day] = (dayStats[day] || 0) + (session.duration || 0);
    });
    
    const mostProductiveDay = Object.keys(dayStats).reduce((a, b) => 
      dayStats[a] > dayStats[b] ? a : b, Object.keys(dayStats)[0] || 'N/A'
    );

    return {
      totalTime: `${totalHours}h ${remainingMinutes}m`,
      tasksCompleted: completedSessions.length,
      averageSession: `${avgHours}h ${avgMins}m`,
      mostProductiveDay: mostProductiveDay.slice(0, 3), // Abbreviated day name
    };
  };

  const stats = calculateStats();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/">
                <Button variant="ghost" className="mr-4 text-gray-600 hover:text-gray-900 p-2">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center mr-3">
                <Clock className="text-primary-foreground text-sm h-4 w-4" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Reports</h1>
            </div>
            <Button
              variant="ghost"
              onClick={() => window.location.href = "/api/logout"}
              className="h-8 w-8 bg-gray-300 rounded-full p-0"
            />
          </div>
        </div>
      </nav>

      {/* Reports Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Date Range Selector */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Time Report</h2>
            <div className="flex flex-col sm:flex-row sm:items-end space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="flex-1">
                <Label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={dateRange.startDate}
                  onChange={handleDateChange}
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  value={dateRange.endDate}
                  onChange={handleDateChange}
                />
              </div>
              <div className="flex space-x-2">
                <Button onClick={handleGenerateReport}>
                  <Search className="mr-2 h-4 w-4" />
                  Generate
                </Button>
                <Button 
                  onClick={handleExportCSV}
                  variant="outline"
                  className="bg-green-500 text-white hover:bg-green-600 border-green-500"
                  disabled={timeSessions.length === 0}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Report Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Time</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.totalTime}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Clock className="text-blue-500 h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Tasks Completed</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.tasksCompleted}</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="text-green-500 h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Average Session</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.averageSession}</p>
                </div>
                <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="text-yellow-500 h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Most Productive Day</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.mostProductiveDay}</p>
                </div>
                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Trophy className="text-purple-500 h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Detailed Report Table */}
        <Card>
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Detailed Time Log</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Task
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Start Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    End Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {timeSessions.length > 0 ? (
                  timeSessions
                    .filter(session => session.endTime) // Only show completed sessions
                    .map((session, index) => {
                      const startDate = new Date(session.startTime);
                      const endDate = new Date(session.endTime);
                      const duration = session.duration || 0;
                      const hours = Math.floor(duration / 3600);
                      const minutes = Math.floor((duration % 3600) / 60);
                      const durationString = `${hours}h ${minutes}m`;

                      return (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {format(startDate, 'yyyy-MM-dd')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {session.taskName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {format(startDate, 'hh:mm a')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {format(endDate, 'hh:mm a')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {durationString}
                          </td>
                        </tr>
                      );
                    })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      No time sessions found for the selected date range
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
