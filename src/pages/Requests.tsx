import { Clock, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const Requests = () => {
  const requests = [
    {
      id: 1,
      item: "Laptop Dell XPS 15",
      user: "John Doe",
      department: "IT Department",
      requestDate: "2025-10-08",
      returnDate: "2025-10-15",
      status: "pending",
      quantity: 1,
    },
    {
      id: 2,
      item: "Projector Epson EB-S05",
      user: "Jane Smith",
      department: "Marketing",
      requestDate: "2025-10-07",
      returnDate: "2025-10-14",
      status: "approved",
      quantity: 1,
    },
    {
      id: 3,
      item: "Conference Room Chair",
      user: "Bob Johnson",
      department: "HR",
      requestDate: "2025-10-06",
      returnDate: "2025-10-13",
      status: "rejected",
      quantity: 5,
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "approved":
        return <CheckCircle className="h-4 w-4" />;
      case "rejected":
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-warning/10 text-warning";
      case "approved":
        return "bg-success/10 text-success";
      case "rejected":
        return "bg-destructive/10 text-destructive";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6 animate-in">
        <div>
          <h1 className="text-3xl font-bold">Borrow Requests</h1>
          <p className="text-muted-foreground mt-1">Review and manage borrowing requests</p>
        </div>

        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id} className="neumorphic border-0 transition-all hover:elevated">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{request.item}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Requested by {request.user} • {request.department}
                    </p>
                  </div>
                  <Badge className={`gap-1 ${getStatusColor(request.status)}`}>
                    {getStatusIcon(request.status)}
                    {request.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Quantity</p>
                    <p className="font-medium">{request.quantity}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Request Date</p>
                    <p className="font-medium">{request.requestDate}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Expected Return</p>
                    <p className="font-medium">{request.returnDate}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="font-medium">7 days</p>
                  </div>
                </div>

                {request.status === "pending" && (
                  <div className="flex gap-3">
                    <Button className="flex-1 bg-success hover:bg-success/90">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button variant="outline" className="flex-1 neumorphic border-0">
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Requests;