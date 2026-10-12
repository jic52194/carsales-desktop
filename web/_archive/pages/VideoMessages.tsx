import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, Send, Play, Circle, Square, Trash2, Mail, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface VideoMsg {
  id: string;
  customer: string;
  vehicle: string;
  duration: string;
  recordedAt: string;
  sent: boolean;
}

const MOCK_VIDEOS: VideoMsg[] = [
  { id: "1", customer: "Sarah Jenkins", vehicle: "2024 Luxury SUV", duration: "0:45", recordedAt: "2 hrs ago", sent: true },
  { id: "2", customer: "Mike Ross", vehicle: "2021 Sport Coupe", duration: "1:12", recordedAt: "Yesterday", sent: true },
  { id: "3", customer: "John Doe", vehicle: "2024 Family Sedan", duration: "0:38", recordedAt: "2 days ago", sent: false },
];

export default function VideoMessages() {
  const [videos, setVideos] = useState(MOCK_VIDEOS);
  const [recording, setRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = () => {
    setRecording(true);
    setRecordTime(0);
    timerRef.current = setInterval(() => setRecordTime((t) => t + 1), 1000);
    toast.info("Recording started", { description: "Recording your personalized walkaround video..." });
  };

  const stopRecording = () => {
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    const mins = Math.floor(recordTime / 60);
    const secs = recordTime % 60;
    const duration = `${mins}:${secs.toString().padStart(2, "0")}`;
    const newVideo: VideoMsg = {
      id: Date.now().toString(),
      customer: "New Lead",
      vehicle: "Selected Vehicle",
      duration,
      recordedAt: "Just now",
      sent: false,
    };
    setVideos((prev) => [newVideo, ...prev]);
    toast.success("Video recorded!", { description: `${duration} walkaround video saved.` });
  };

  const sendVideo = (id: string) => {
    setVideos((prev) => prev.map((v) => v.id === id ? { ...v, sent: true } : v));
    toast.success("Video sent!", { description: "Personalized video link sent via SMS + email." });
  };

  const deleteVideo = (id: string) => {
    setVideos((prev) => prev.filter((v) => v.id !== id));
    toast.success("Video deleted");
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <Video className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Video Walkarounds</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Record personalized vehicle videos — proven to lift response rates 3-5x</p>
        </div>
      </div>

      {/* Recording Studio */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">Recording Studio</CardTitle>
          <CardDescription>Record a walkaround video for a lead or customer</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative aspect-video bg-slate-900 dark:bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center">
            {/* Simulated camera view */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center">
              {recording ? (
                <div className="text-center">
                  <div className="h-16 w-16 rounded-full bg-destructive flex items-center justify-center mx-auto mb-3 animate-pulse">
                    <Circle className="h-8 w-8 text-white fill-white" />
                  </div>
                  <p className="text-white text-2xl font-mono font-bold">
                    {Math.floor(recordTime / 60)}:{(recordTime % 60).toString().padStart(2, "0")}
                  </p>
                  <p className="text-white/50 text-sm mt-1">Recording...</p>
                </div>
              ) : (
                <div className="text-center">
                  <Video className="h-16 w-16 text-white/20 mx-auto mb-3" />
                  <p className="text-white/40 text-sm">Camera preview</p>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            {!recording ? (
              <Button onClick={startRecording} className="bg-destructive hover:bg-destructive/90">
                <Circle className="h-4 w-4 mr-2 fill-white" /> Start Recording
              </Button>
            ) : (
              <Button onClick={stopRecording} variant="outline">
                <Square className="h-4 w-4 mr-2" /> Stop & Save
              </Button>
            )}
            <p className="text-xs text-muted-foreground ml-2">Keep videos under 90 seconds for best engagement</p>
          </div>
        </CardContent>
      </Card>

      {/* Video Library */}
      <div>
        <h2 className="text-lg font-bold mb-3">Your Videos</h2>
        <div className="space-y-3">
          {videos.map((v) => (
            <Card key={v.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-14 w-24 rounded-lg bg-slate-900 dark:bg-slate-950 flex items-center justify-center shrink-0 relative">
                  <Play className="h-5 w-5 text-white/60" />
                  <span className="absolute bottom-1 right-1 text-[9px] text-white/80 bg-black/50 px-1 rounded">{v.duration}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">{v.customer}</p>
                  <p className="text-xs text-muted-foreground">{v.vehicle} · {v.recordedAt}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {v.sent ? (
                      <Badge className="text-[10px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40">
                        Sent
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">Not Sent</Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {!v.sent && (
                    <>
                      <Button size="sm" variant="ghost" title="Send via SMS" onClick={() => sendVideo(v.id)}>
                        <MessageSquare className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" title="Send via Email" onClick={() => sendVideo(v.id)}>
                        <Mail className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" title="Send" onClick={() => sendVideo(v.id)}>
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="ghost" title="Delete" onClick={() => deleteVideo(v.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
