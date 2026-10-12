import React, { useState } from "react";
import { 
  Bell, 
  CheckCircle2, 
  Clock, 
  MessageSquare, 
  Wrench, 
  Car, 
  AlertTriangle,
  ChevronRight,
  Settings,
  Filter
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const MOCK_NOTIFICATIONS = [
  {
    id: "1",
    type: "lead",
    title: "New Web Lead",
    message: "Sarah Jenkins submitted a credit app for the 2024 Toyota Camry.",
    time: "2 mins ago",
    read: false,
    priority: "high",
    icon: MessageSquare,
    color: "text-blue-500",
    bg: "bg-blue-500/10"
  },
  {
    id: "2",
    type: "service",
    title: "Service RO Completed",
    message: "RO #4592 (2019 Honda Civic) is ready for pickup.",
    time: "15 mins ago",
    read: false,
    priority: "normal",
    icon: Wrench,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10"
  },
  {
    id: "3",
    type: "inventory",
    title: "Price Drop Alert",
    message: "2023 Ford F-150 has been in inventory for 60 days. Price dropped by $500.",
    time: "1 hour ago",
    read: true,
    priority: "normal",
    icon: Car,
    color: "text-amber-500",
    bg: "bg-amber-500/10"
  },
  {
    id: "4",
    type: "system",
    title: "Compliance Warning",
    message: "Missing signatures on Deal #8839 (John Doe).",
    time: "2 hours ago",
    read: true,
    priority: "high",
    icon: AlertTriangle,
    color: "text-destructive",
    bg: "bg-destructive/10"
  },
  {
    id: "5",
    type: "lead",
    title: "Appointment Reminder",
    message: "Test drive with Mike Smith in 30 minutes.",
    time: "3 hours ago",
    read: true,
    priority: "normal",
    icon: Clock,
    color: "text-purple-500",
    bg: "bg-purple-500/10"
  }
];

export default function PushNotifications() {
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [filter, setFilter] = useState("all");

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === "all") return true;
    if (filter === "unread") return !n.read;
    return n.type === filter;
  });

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden">
      <div className="p-4 md:p-6 pb-0 flex-shrink-0">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Notifications</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                You have {unreadCount} unread messages
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="hidden sm:flex">
              <Settings className="h-4 w-4" />
            </Button>
            {unreadCount > 0 && (
              <Button variant="secondary" size="sm" onClick={markAllAsRead}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="all" value={filter} onValueChange={setFilter} className="w-full">
          <div className="w-full overflow-x-auto pb-2 scrollbar-hide">
            <TabsList className="bg-slate-200/50 dark:bg-slate-800/50 inline-flex w-max">
              <TabsTrigger value="all" className="rounded-md">All</TabsTrigger>
              <TabsTrigger value="unread" className="rounded-md">Unread</TabsTrigger>
              <TabsTrigger value="lead" className="rounded-md">Leads</TabsTrigger>
              <TabsTrigger value="service" className="rounded-md">Service</TabsTrigger>
              <TabsTrigger value="inventory" className="rounded-md">Inventory</TabsTrigger>
            </TabsList>
          </div>
        </Tabs>
      </div>

      <ScrollArea className="flex-1 p-4 md:p-6">
        <div className="max-w-3xl mx-auto space-y-4 pb-20">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <Bell className="h-8 w-8 text-slate-300 dark:text-slate-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">All caught up!</h3>
              <p className="text-slate-500 max-w-sm mt-2">
                You don't have any new notifications in this category.
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => {
              const Icon = notification.icon;
              return (
                <Card 
                  key={notification.id} 
                  className={`border-l-4 transition-all hover:shadow-md cursor-pointer ${
                    !notification.read ? 'border-l-primary bg-white dark:bg-slate-950' : 'border-l-transparent bg-slate-50/50 dark:bg-slate-900/50 opacity-75'
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <CardContent className="p-4 flex gap-4 items-start">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 mt-1 ${notification.bg} ${notification.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className={`font-semibold text-base truncate ${!notification.read ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                          {notification.title}
                        </h4>
                        <span className="text-xs text-slate-500 whitespace-nowrap shrink-0 mt-1">
                          {notification.time}
                        </span>
                      </div>
                      <p className={`text-sm line-clamp-2 ${!notification.read ? 'text-slate-600 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                        {notification.message}
                      </p>
                      
                      {notification.priority === 'high' && (
                        <Badge variant="destructive" className="mt-3 text-[10px] uppercase font-bold tracking-wider">
                          High Priority
                        </Badge>
                      )}
                    </div>
                    <div className="shrink-0 self-center">
                      {!notification.read ? (
                        <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-slate-300 dark:text-slate-600" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
