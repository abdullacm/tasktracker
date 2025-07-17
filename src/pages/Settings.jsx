import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Clock, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Settings() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    trelloApiKey: "",
    trelloToken: "",
    selectedTrelloBoard: "",
  });
  const [connectionStatus, setConnectionStatus] = useState("");

  const { data: settings } = useQuery({
    queryKey: ["/api/settings"],
  });

  const { data: boards = [] } = useQuery({
    queryKey: ["/api/trello/boards"],
    enabled: !!settings?.trelloApiKey && !!settings?.trelloToken,
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        trelloApiKey: settings.trelloApiKey || "",
        trelloToken: settings.trelloToken || "",
        selectedTrelloBoard: settings.selectedTrelloBoard || "",
      });
    }
  }, [settings]);

  const testConnectionMutation = useMutation({
    mutationFn: async ({ apiKey, token }) => {
      const response = await apiRequest("POST", "/api/trello/test-connection", {
        apiKey,
        token,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setConnectionStatus("Connection successful!");
        toast({
          title: "Success",
          description: "Trello connection established successfully",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/trello/boards"] });
      } else {
        setConnectionStatus("Connection failed");
        toast({
          title: "Error",
          description: data.message || "Failed to connect to Trello",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      setConnectionStatus("Connection failed");
      toast({
        title: "Error",
        description: "Failed to test Trello connection",
        variant: "destructive",
      });
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiRequest("POST", "/api/settings", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Settings saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setConnectionStatus("");
  };

  const handleTestConnection = () => {
    if (!formData.trelloApiKey || !formData.trelloToken) {
      toast({
        title: "Error",
        description: "Please enter both API key and token",
        variant: "destructive",
      });
      return;
    }

    setConnectionStatus("Testing connection...");
    testConnectionMutation.mutate({
      apiKey: formData.trelloApiKey,
      token: formData.trelloToken,
    });
  };

  const handleSaveSettings = () => {
    saveSettingsMutation.mutate(formData);
  };

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
              <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
            </div>
            <Button
              variant="ghost"
              onClick={() => window.location.href = "/api/logout"}
              className="h-8 w-8 bg-gray-300 rounded-full p-0"
            />
          </div>
        </div>
      </nav>

      {/* Settings Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Trello Integration</h2>
            <p className="text-gray-600 mt-1">Connect your Trello account to import tasks</p>
          </div>
          
          <CardContent className="p-6 space-y-6">
            {/* Trello API Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="trelloApiKey" className="block text-sm font-medium text-gray-700 mb-2">
                  Trello API Key
                  <a 
                    href="https://trello.com/app-key" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary ml-1 inline-flex items-center"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Label>
                <Input
                  id="trelloApiKey"
                  name="trelloApiKey"
                  type="password"
                  value={formData.trelloApiKey}
                  onChange={handleInputChange}
                  placeholder="Enter your Trello API key..."
                />
              </div>
              <div>
                <Label htmlFor="trelloToken" className="block text-sm font-medium text-gray-700 mb-2">
                  Trello Token
                  <a 
                    href={`https://trello.com/1/authorize?key=${formData.trelloApiKey}&name=TaskTimer&expiration=never&response_type=token`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary ml-1 inline-flex items-center"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Label>
                <Input
                  id="trelloToken"
                  name="trelloToken"
                  type="password"
                  value={formData.trelloToken}
                  onChange={handleInputChange}
                  placeholder="Enter your Trello token..."
                />
              </div>
            </div>
            
            {/* Test Connection */}
            <div className="flex items-center space-x-4">
              <Button 
                onClick={handleTestConnection}
                disabled={testConnectionMutation.isPending}
                className="bg-blue-500 hover:bg-blue-600"
              >
                {testConnectionMutation.isPending ? "Testing..." : "Test Connection"}
              </Button>
              {connectionStatus && (
                <div className={`text-sm ${
                  connectionStatus.includes('successful') ? 'text-green-600' : 
                  connectionStatus.includes('Testing') ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {connectionStatus}
                </div>
              )}
            </div>
            
            {/* Board Selection */}
            {boards.length > 0 && (
              <div>
                <Label htmlFor="selectedTrelloBoard" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Board
                </Label>
                <Select 
                  value={formData.selectedTrelloBoard} 
                  onValueChange={(value) => setFormData({ ...formData, selectedTrelloBoard: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a board..." />
                  </SelectTrigger>
                  <SelectContent>
                    {boards.map((board) => (
                      <SelectItem key={board.id} value={board.id}>
                        {board.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Save Settings */}
            <div className="flex justify-end pt-4 border-t border-gray-200">
              <Button 
                onClick={handleSaveSettings}
                disabled={saveSettingsMutation.isPending}
              >
                {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
