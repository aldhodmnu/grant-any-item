import { User, Mail, Building, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const Profile = () => {
  const userProfile = {
    name: "John Doe",
    email: "john.doe@company.com",
    department: "IT Department",
    role: "Admin",
    joinDate: "January 2024",
    activeLoans: 3,
    totalRequests: 25,
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6 animate-in">
        <div>
          <h1 className="text-3xl font-bold">My Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your account information</p>
        </div>

        <Card className="neumorphic border-0">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-6">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-3xl font-bold">
                {userProfile.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold">{userProfile.name}</h2>
                  <Badge className="bg-primary/10 text-primary">
                    <Shield className="h-3 w-3 mr-1" />
                    {userProfile.role}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1">
                  Member since {userProfile.joinDate}
                </p>
              </div>
              <Button variant="outline" className="neumorphic border-0">
                Edit Profile
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary/50">
                <Mail className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{userProfile.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary/50">
                <Building className="h-5 w-5 text-accent" />
                <div>
                  <p className="text-sm text-muted-foreground">Department</p>
                  <p className="font-medium">{userProfile.department}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 sm:grid-cols-2">
          <Card className="neumorphic border-0">
            <CardHeader>
              <CardTitle>Activity Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-4 rounded-lg bg-secondary/50">
                <span className="text-muted-foreground">Active Loans</span>
                <span className="text-2xl font-bold text-primary">{userProfile.activeLoans}</span>
              </div>
              <div className="flex justify-between items-center p-4 rounded-lg bg-secondary/50">
                <span className="text-muted-foreground">Total Requests</span>
                <span className="text-2xl font-bold text-accent">{userProfile.totalRequests}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="neumorphic border-0">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                    <div className="h-2 w-2 rounded-full bg-success" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Borrowed Laptop</p>
                      <p className="text-xs text-muted-foreground">{i} days ago</p>
                    </div>
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

export default Profile;