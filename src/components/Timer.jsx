import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Pause, Square } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import TrelloTaskSelector from "./TrelloTaskSelector";

export default function Timer() {
  const { toast } = useToast();
  const [taskName, setTaskName] = useState("");
  const [timerDisplay, setTimerDisplay] = useState("00:00:00");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timerInterval, setTimerInterval] = useState(null);

  const { data: activeSession, refetch: refetchActiveSession } = useQuery({
    queryKey: ["/api/time-sessions/active"],
  });

  const startTimerMutation = useMutation({
    mutationFn: async (taskName) => {
      const response = await apiRequest("POST", "/api/time-sessions/start", {
        taskName,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Timer Started",
        description: `Started tracking "${data.taskName}"`,
      });
      refetchActiveSession();
      queryClient.invalidateQueries({ queryKey: ["/api/time-sessions"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to start timer",
        variant: "destructive",
      });
    },
  });

  const stopTimerMutation = useMutation({
    mutationFn: async (sessionId) => {
      const response = await apiRequest("POST", `/api/time-sessions/${sessionId}/stop`);
      return response.json();
    },
    onSuccess: (data) => {
      const duration = data.duration || 0;
      const hours = Math.floor(duration / 3600);
      const minutes = Math.floor((duration % 3600) / 60);
      const displayTime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      
      toast({
        title: "Timer Stopped",
        description: `Completed "${data.taskName}" in ${displayTime}`,
      });
      refetchActiveSession();
      queryClient.invalidateQueries({ queryKey: ["/api/time-sessions"] });
      setTaskName("");
      setElapsedTime(0);
      setTimerDisplay("00:00:00");
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to stop timer",
        variant: "destructive",
      });
    },
  });

  // Update timer display when active session changes
  useEffect(() => {
    if (activeSession) {
      setTaskName(activeSession.taskName);
      const startTime = new Date(activeSession.startTime).getTime();
      
      // Start the display timer
      const interval = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        setElapsedTime(elapsed);
        
        const hours = Math.floor(elapsed / 3600);
        const minutes = Math.floor((elapsed % 3600) / 60);
        const seconds = elapsed % 60;
        
        setTimerDisplay(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }, 1000);
      
      setTimerInterval(interval);
      
      return () => {
        if (interval) clearInterval(interval);
      };
    } else {
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }
      setTimerDisplay("00:00:00");
      setElapsedTime(0);
    }
  }, [activeSession]);

  const handleStartTimer = () => {
    if (!taskName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a task name before starting the timer",
        variant: "destructive",
      });
      return;
    }

    startTimerMutation.mutate(taskName.trim());
  };

  const handleStopTimer = () => {
    if (activeSession) {
      stopTimerMutation.mutate(activeSession.id);
    }
  };

  const handleTaskSelect = (selectedTask) => {
    setTaskName(selectedTask);
  };

  const isRunning = !!activeSession;

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Current Task</h2>
        
        {/* Task Input */}
        <div className="space-y-4 mb-6">
          <div>
            <Label htmlFor="taskName" className="block text-sm font-medium text-gray-700 mb-2">
              Task Name
            </Label>
            <div className="relative">
              <Input
                id="taskName"
                type="text"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="Enter task name or select from Trello..."
                disabled={isRunning}
              />
              <div className="absolute right-3 top-3">
                <TrelloTaskSelector onTaskSelect={handleTaskSelect} disabled={isRunning} />
              </div>
            </div>
          </div>
        </div>
        
        {/* Timer Display */}
        <div className="text-center mb-8">
          <div className="text-6xl font-light text-gray-900 mb-4">{timerDisplay}</div>
          <div className="text-lg text-gray-600 mb-6">
            {isRunning ? `Tracking: ${activeSession.taskName}` : "No active task"}
          </div>
          
          {/* Timer Controls */}
          <div className="flex justify-center space-x-4">
            {!isRunning ? (
              <Button 
                onClick={handleStartTimer}
                disabled={startTimerMutation.isPending}
                className="bg-green-500 hover:bg-green-600 px-8 py-3"
              >
                <Play className="mr-2 h-4 w-4" />
                {startTimerMutation.isPending ? "Starting..." : "Start"}
              </Button>
            ) : (
              <Button 
                onClick={handleStopTimer}
                disabled={stopTimerMutation.isPending}
                className="bg-red-500 hover:bg-red-600 px-8 py-3"
              >
                <Square className="mr-2 h-4 w-4" />
                {stopTimerMutation.isPending ? "Stopping..." : "Stop"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
