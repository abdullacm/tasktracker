import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, BarChart3, Settings, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Timer from "@/components/Timer";

export default function Dashboard() {
  const { user } = useAuth();
  
  const { data: timeSessions = [] } = useQuery({
    queryKey: ["/api/time-sessions"],
  });

  const { data: todaySummary } = useQuery({
    queryKey: ["/api/time-sessions", new Date().toISOString().split('T')[0]],
    queryFn: async () => {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      
      const response = await fetch(
        `/api/time-sessions?startDate=${startOfDay.toISOString()}&endDate=${endOfDay.toISOString()}`,
        { credentials: "include" }
      );
      
      if (!response.ok) throw new Error("Failed to fetch today's summary");
      return response.json();
    },
  });

  const calculateTodayStats = () => {
    if (!todaySummary || todaySummary.length === 0) {
      return { totalTime: "0h 0m", tasksCompleted: 0, averageFocus: "0h 0m" };
    }

    const completedSessions = todaySummary.filter(session => session.endTime);
    const totalSeconds = completedSessions.reduce((sum, session) => sum + (session.duration || 0), 0);
    const totalMinutes = Math.floor(totalSeconds / 60);
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    const averageSeconds = completedSessions.length > 0 ? totalSeconds / completedSessions.length : 0;
    const avgMinutes = Math.floor(averageSeconds / 60);
    const avgHours = Math.floor(avgMinutes / 60);
    const avgMins = avgMinutes % 60;

    return {
      totalTime: `${hours}h ${minutes}m`,
      tasksCompleted: completedSessions.length,
      averageFocus: `${avgHours}h ${avgMins}m`,
    };
  };

  const todayStats = calculateTodayStats();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center mr-3">
                <Clock className="text-primary-foreground text-sm h-4 w-4" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">TaskTimer</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/reports">
                <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Reports
                </Button>
              </Link>
              <Link href="/settings">
                <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Button>
              </Link>
              <Button
                variant="ghost"
                onClick={() => window.location.href = "/api/logout"}
                className="h-8 w-8 bg-gray-300 rounded-full p-0"
              >
                <User className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Timer Section */}
          <div className="lg:col-span-2">
            <Timer />
          </div>
          
          {/* Today's Summary */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Time</span>
                    <span className="font-semibold text-gray-900">{todayStats.totalTime}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Tasks Completed</span>
                    <span className="font-semibold text-gray-900">{todayStats.tasksCompleted}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Average Focus</span>
                    <span className="font-semibold text-green-600">{todayStats.averageFocus}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Recent Tasks */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Tasks</h3>
                <div className="space-y-3">
                  {todaySummary && todaySummary.length > 0 ? (
                    todaySummary.slice(0, 3).map((session, index) => {
                      const duration = session.duration || 0;
                      const hours = Math.floor(duration / 3600);
                      const minutes = Math.floor((duration % 3600) / 60);
                      const displayTime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                      
                      return (
                        <div key={index} className="flex items-center justify-between py-2">
                          <div>
                            <div className="font-medium text-gray-900 text-sm">{session.taskName}</div>
                            <div className="text-gray-500 text-xs">{displayTime}</div>
                          </div>
                          <div className={`w-2 h-2 rounded-full ${session.endTime ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-gray-500 text-sm text-center py-4">
                      No tasks tracked today
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
