import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { SiTrello } from "react-icons/si";

export default function TrelloTaskSelector({ onTaskSelect, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ["/api/trello/cards"],
    enabled: isOpen, // Only fetch when popover is opened
  });

  const handleTaskSelect = (taskName) => {
    onTaskSelect(taskName);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-gray-400 hover:text-gray-600 p-1"
          disabled={disabled}
        >
          <SiTrello className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b">
          <h4 className="font-medium text-sm">Select from Trello</h4>
        </div>
        <ScrollArea className="h-64">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-gray-500">Loading tasks...</span>
            </div>
          ) : cards.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-500">
              <p>No Trello cards found.</p>
              <p className="text-xs mt-1">Check your Trello settings.</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {cards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => handleTaskSelect(card.name)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm transition-colors"
                >
                  <div className="flex items-start">
                    <SiTrello className="text-blue-500 mr-2 mt-0.5 h-3 w-3 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-gray-900">{card.name}</div>
                      {card.list && (
                        <div className="text-gray-500 text-xs">From: {card.list.name}</div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
