import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { CheckCircle2, Clock, ShieldCheck } from "lucide-react";

export default function ApplicationStatus() {
  const { id } = useParams();
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center p-8 space-y-6">
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
          <Clock className="h-10 w-10 text-amber-600" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Application Pending</h1>
          <p className="text-slate-500">Application ID: {id}</p>
        </div>
        <CardContent className="bg-slate-50 rounded-lg p-4 text-sm text-left space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Credit Check</span>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Identity Verification</span>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Lender Review</span>
            <Clock className="h-4 w-4 text-amber-500 animate-pulse" />
          </div>
        </CardContent>
        <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
          <ShieldCheck className="h-3 w-3" /> Secure Banking Connection
        </p>
      </Card>
    </div>
  );
}
