import { useState } from "react";
import { Search, Plus, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const Items = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const items = [
    {
      id: 1,
      name: "Laptop Dell XPS 15",
      code: "LP-001",
      category: "Electronics",
      quantity: 15,
      available: 12,
      status: "available",
    },
    {
      id: 2,
      name: "Projector Epson EB-S05",
      code: "PJ-002",
      category: "Electronics",
      quantity: 8,
      available: 2,
      status: "low",
    },
    {
      id: 3,
      name: "Whiteboard Marker Set",
      code: "ST-003",
      category: "Stationery",
      quantity: 50,
      available: 45,
      status: "available",
    },
    {
      id: 4,
      name: "Conference Room Chair",
      code: "FR-004",
      category: "Furniture",
      quantity: 0,
      available: 0,
      status: "unavailable",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-success/10 text-success";
      case "low":
        return "bg-warning/10 text-warning";
      case "unavailable":
        return "bg-destructive/10 text-destructive";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6 animate-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Item Inventory</h1>
            <p className="text-muted-foreground mt-1">Browse and manage all items</p>
          </div>
          <Button className="gap-2 bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 neumorphic border-0"
            />
          </div>
          <Button variant="outline" className="gap-2 neumorphic border-0">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Card key={item.id} className="neumorphic border-0 transition-all hover:elevated cursor-pointer">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{item.name}</h3>
                      <p className="text-sm text-muted-foreground">{item.code}</p>
                    </div>
                    <Badge variant="outline" className={getStatusColor(item.status)}>
                      {item.status}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Category</span>
                      <span className="font-medium">{item.category}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Available</span>
                      <span className="font-medium">{item.available} / {item.quantity}</span>
                    </div>
                  </div>

                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all"
                      style={{ width: `${(item.available / item.quantity) * 100}%` }}
                    />
                  </div>

                  <Button variant="outline" className="w-full neumorphic border-0">
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Items;