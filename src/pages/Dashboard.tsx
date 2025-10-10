import { Package, Users, FileText, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Dashboard = () => {
  const stats = [
    {
      title: "Total Items",
      value: "1,234",
      change: "+12%",
      icon: Package,
      color: "text-primary",
    },
    {
      title: "Active Loans",
      value: "89",
      change: "+5%",
      icon: FileText,
      color: "text-accent",
    },
    {
      title: "Users",
      value: "456",
      change: "+8%",
      icon: Users,
      color: "text-success",
    },
    {
      title: "Requests",
      value: "23",
      change: "+3",
      icon: TrendingUp,
      color: "text-warning",
    },
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8 animate-in">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Item Grant System
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your inventory, track loans, and handle requests efficiently
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="neumorphic border-0 transition-all hover:elevated">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stat.value}</div>
                  <p className="text-xs text-success mt-1">
                    {stat.change} from last month
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="neumorphic border-0">
            <CardHeader>
              <CardTitle>Recent Requests</CardTitle>
              <CardDescription>Latest borrowing requests from users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                    <div>
                      <p className="font-medium">Laptop Dell XPS 15</p>
                      <p className="text-sm text-muted-foreground">Requested by John Doe</p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning">
                      Pending
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="neumorphic border-0">
            <CardHeader>
              <CardTitle>Low Stock Items</CardTitle>
              <CardDescription>Items that need restocking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                    <div>
                      <p className="font-medium">Projector Epson EB-S05</p>
                      <p className="text-sm text-muted-foreground">Only 2 remaining</p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
                      Low
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;