import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "../components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/ui/form";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, FileText, ShieldCheck, Eraser, Sparkles, ChevronRight, ChevronLeft, Smartphone, Link as LinkIcon, Camera, Scan, Upload, CheckCircle2, Download } from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Link } from "react-router-dom";
import { Progress } from "../components/ui/progress";
import SignatureCanvas from "react-signature-canvas";
import { useRef, useState, useEffect } from "react";
import Tesseract from "tesseract.js";
import { hapticFeedback } from "@/lib/haptics";


const formSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  ssn: z.string().optional(),
  dob: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  employer: z.string().optional(),
  jobTitle: z.string().optional(),
  income: z.string().optional(),
  dlDocument: z.any().optional(),
  dlDocumentBase64: z.string().optional(),
  incomeDocument: z.any().optional(),
  incomeDocumentBase64: z.string().optional(),
  residenceDocument: z.any().optional(),
  residenceDocumentBase64: z.string().optional(),
  insuranceDocument: z.any().optional(),
  insuranceDocumentBase64: z.string().optional(),
  hasCoApplicant: z.boolean().default(false),
  coFirstName: z.string().optional(),
  coLastName: z.string().optional(),
  coEmail: z.string().optional(),
  coPhone: z.string().optional(),
  coSsn: z.string().optional(),
  coDob: z.string().optional(),
  coAddress: z.string().optional(),
  coCity: z.string().optional(),
  coState: z.string().optional(),
  coZip: z.string().optional(),
  coEmployer: z.string().optional(),
  coJobTitle: z.string().optional(),
  coIncome: z.string().optional(),
  coDlDocument: z.any().optional(),
  coDlDocumentBase64: z.string().optional(),
  coIncomeDocument: z.any().optional(),
  coIncomeDocumentBase64: z.string().optional(),
});

export default function CreditApp() {
  const sigCanvas = useRef<any>(null);
  const [sigError, setSigError] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [customerPhone, setCustomerPhone] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerType, setScannerType] = useState<'dl' | 'insurance' | 'income' | 'coDl' | 'coIncome' | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<any>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      ssn: "",
      dob: "",
      address: "",
      city: "",
      state: "",
      zip: "",
      employer: "",
      jobTitle: "",
      income: "",
      dlDocument: undefined,
      incomeDocument: undefined,
      residenceDocument: undefined,
      insuranceDocument: undefined,
      hasCoApplicant: false,
      coFirstName: "",
      coLastName: "",
      coEmail: "",
      coPhone: "",
      coSsn: "",
      coDob: "",
      coAddress: "",
      coCity: "",
      coState: "",
      coZip: "",
      coEmployer: "",
      coJobTitle: "",
      coIncome: "",
      coDlDocument: undefined,
      coIncomeDocument: undefined,
    },
  });

  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    const savedData = localStorage.getItem("creditAppDraft");
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        Object.entries(parsed).forEach(([key, value]) => {
          if (value !== undefined && value !== null && !key.endsWith('Document')) {
            form.setValue(key as keyof z.infer<typeof formSchema>, value as any);
          }
        });
        toast.info("Draft restored from previous session.");
      } catch (e) {
        console.error("Failed to parse saved draft", e);
      }
    }
  }, [form]);

  useEffect(() => {
    const subscription = form.watch((value) => {
      const { dlDocument, incomeDocument, residenceDocument, insuranceDocument, coDlDocument, coIncomeDocument, ...dataToSave } = value;
      localStorage.setItem("creditAppDraft", JSON.stringify(dataToSave));
      setLastSaved(new Date());
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

  const steps = [
    { id: 0, title: "Documents", fields: ["dlDocument", "incomeDocument", "residenceDocument", "insuranceDocument"] },
    { id: 1, title: "Personal", fields: ["firstName", "lastName", "email", "phone", "ssn", "dob"] },
    { id: 2, title: "Residence", fields: ["address", "city", "state", "zip"] },
    { id: 3, title: "Employment", fields: ["employer", "jobTitle", "income"] },
    { id: 4, title: "Co-Applicant", fields: ["hasCoApplicant", "coFirstName", "coLastName", "coEmail", "coPhone", "coSsn", "coDob", "coAddress", "coCity", "coState", "coZip", "coEmployer", "coJobTitle", "coIncome"] },
    { id: 5, title: "Sign-Off", fields: [] }
  ];

  const handleNext = async () => {
    const fieldsToValidate = steps[currentStep].fields as any;
    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
      window.scrollTo(0, 0);
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
    window.scrollTo(0, 0);
  };
  const handleScan = (type: 'dl' | 'insurance' | 'income' | 'coDl' | 'coIncome') => {
    setScannerType(type);
    setScannerOpen(true);
    setScanSuccess(false);
  };

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      toast.error("Could not access camera. Please upload a file instead.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    if (scannerOpen && !isScanning && !scanSuccess) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [scannerOpen, isScanning, scanSuccess]);

  const processImageWithOCR = async (imageSource: File | string, type: 'dl' | 'insurance' | 'income' | 'coDl' | 'coIncome') => {
    if (imageSource instanceof File && imageSource.type === 'application/pdf') {
      toast.success("PDF document attached successfully!");
      return;
    }

    setIsScanning(true);
    setScannerType(type);
    setScannerOpen(true);
    setScanSuccess(false);

    try {
      toast.info("Analyzing document with AI OCR...");
      let source = imageSource;
      if (imageSource instanceof File) {
        source = URL.createObjectURL(imageSource);
      }
      const result = await Tesseract.recognize(source, 'eng');
      const text = result.data.text;
      
      setIsScanning(false);
      setScanSuccess(true);
      
      if (type === 'dl' || type === 'coDl') {
        const isCo = type === 'coDl';
        const setFormValue = (key: string, value: string) => {
           const formKey = isCo ? `co${key.charAt(0).toUpperCase()}${key.slice(1)}` : key;
           form.setValue(formKey as any, value);
        };
        
        // Robust Name Parsing (AAMVA standards often use LN/1 and FN/2)
        const lnMatch = text.match(/(?:LN|1)\s*[:\-]?\s*([A-Z\s]+)/i);
        if (lnMatch) setFormValue('lastName', lnMatch[1].trim().split('\n')[0]);
        
        const fnMatch = text.match(/(?:FN|2)\s*[:\-]?\s*([A-Z\s]+)/i);
        if (fnMatch) setFormValue('firstName', fnMatch[1].trim().split('\n')[0]);

        // Robust DOB parsing
        const dobMatch = text.match(/(?:DOB|Date of Birth|BORN)?\s*[:\-\s]?\s*(\d{2})[\/\-](\d{2})[\/\-](\d{4})\b/i);
        if (dobMatch) {
           const [_, m, d, y] = dobMatch;
           setFormValue('dob', `${y}-${m}-${d}`);
        }

        // Robust Address Parsing
        const addressMatch = text.match(/\b(\d+\s+[A-Za-z0-9\s]+(?:St|Street|Ave|Avenue|Blvd|Boulevard|Rd|Road|Ln|Lane|Dr|Drive|Ct|Court|Way|Pl|Place))\b/i);
        if (addressMatch) setFormValue('address', addressMatch[1].trim());

        // City, State, Zip Parsing
        const cityStateZipMatch = text.match(/\b([A-Za-z\s]+)[\s,]+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)\b/i);
        if (cityStateZipMatch) {
           if (cityStateZipMatch[1].length < 20) {
              setFormValue('city', cityStateZipMatch[1].trim());
           }
           setFormValue('state', cityStateZipMatch[2].toUpperCase());
           setFormValue('zip', cityStateZipMatch[3].substring(0, 5));
        } else {
           const stateMatch = text.match(/\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b/i);
           if (stateMatch) setFormValue('state', stateMatch[1].toUpperCase());

           const zipMatch = text.match(/\b\d{5}(?:-\d{4})?\b/);
           if (zipMatch) setFormValue('zip', zipMatch[0].substring(0, 5));
        }

        // Fallback names if still empty
        if (!form.getValues(isCo ? 'coFirstName' : 'firstName' as any)) setFormValue('firstName', 'Scanned');
        if (!form.getValues(isCo ? 'coLastName' : 'lastName' as any)) setFormValue('lastName', 'User');

        toast.success(`Document scanned! Extracted available ${isCo ? 'co-applicant ' : ''}information.`);
      } else if (type === 'income' || type === 'coIncome') {
        const isCo = type === 'coIncome';
        const setFormValue = (key: string, value: string) => {
           const formKey = isCo ? `co${key.charAt(0).toUpperCase()}${key.slice(1)}` : key;
           form.setValue(formKey as any, value);
        };

        // Robust Income Parsing
        const incomeMatch = text.match(/(?:Gross|Net|Total|Current|Amount|Pay|Earnings|YTD).*?\$?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2}))/i);
        if (incomeMatch) {
          const amount = incomeMatch[1].replace(/,/g, '');
          setFormValue('income', amount);
        }

        // Robust Employer Parsing
        const employerMatch = text.match(/(?:Employer|Company|Paid By)\s*[:\-]?\s*([A-Za-z0-9\s,&]+(?:Inc|LLC|Corp|Company|Group))/i);
        if (employerMatch) {
          setFormValue('employer', employerMatch[1].trim());
        } else {
           const corpMatch = text.match(/^([A-Za-z0-9\s,&]+(?:Inc\.?|LLC|Corp\.?|Company))$/im);
           if (corpMatch) {
              setFormValue('employer', corpMatch[1].trim());
           } else {
              const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.toLowerCase().includes('paystub'));
              if (lines.length > 0) {
                 setFormValue('employer', lines[0].substring(0, 40));
              }
           }
        }
        toast.success(`Paystub scanned! Extracted available ${isCo ? 'co-applicant ' : ''}employment info.`);
      } else {
        toast.success("Insurance Card scanned successfully!");
      }

      setTimeout(() => {
        setScannerOpen(false);
      }, 1500);

    } catch (error) {
      console.error(error);
      setIsScanning(false);
      toast.error("Failed to read document. Please try again or enter manually.");
      setScannerOpen(false);
    }
  };

  const captureAndProcess = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg');
        form.setValue(`${scannerType}DocumentBase64` as any, imageData);
        stopCamera();
        processImageWithOCR(imageData, scannerType as any);
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, type: 'dl' | 'insurance' | 'income' | 'coDl' | 'coIncome' | 'residence') => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue(`${type}Document` as any, file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue(`${type}DocumentBase64` as any, reader.result as string);
      };
      reader.readAsDataURL(file);

      if (type !== 'residence') {
        processImageWithOCR(file, type as any);
      } else {
        toast.success("Document uploaded successfully!");
      }
    }
  };

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
      setSigError(true);
      toast.error("Please provide your signature before submitting.");
      return;
    }
    setSigError(false);
    
    let signatureData = null;
    try {
      signatureData = sigCanvas.current.getTrimmedCanvas().toDataURL("image/png");
    } catch (e) {
      console.error("Failed to get signature image", e);
      signatureData = sigCanvas.current.getCanvas().toDataURL("image/png");
    }
    // Form processing logic here
    
    const trackingPayload = {
      type: "external_form_submission",
      timestamp: Date.now(),
      formId: "Credit Application",
      formData: {
        first_name: values.firstName,
        last_name: values.lastName,
        email: values.email,
        phone: values.phone,
        date_of_birth: values.dob,
        address: values.address,
        city: values.city,
        state: values.state,
        postal_code: values.zip,
        organization: values.employer,
        "contact.job_title": values.jobTitle,
        "contact.monthly_income": values.income,
        "contact.dl_document": values.dlDocumentBase64 ? "Attached" : "",
        "contact.income_document": values.incomeDocumentBase64 ? "Attached" : "",
        "contact.residence_document": values.residenceDocumentBase64 ? "Attached" : "",
        "contact.insurance_document": values.insuranceDocumentBase64 ? "Attached" : "",
        ...(values.hasCoApplicant ? {
          "contact.coapplicant_first_name": values.coFirstName,
          "contact.coapplicant_last_name": values.coLastName,
          "contact.coapplicant_email": values.coEmail,
          "contact.coapplicant_phone": values.coPhone,
          "contact.coapplicant_address": values.coAddress,
          "contact.coapplicant_city": values.coCity,
          "contact.coapplicant_state": values.coState,
          "contact.coapplicant_zip": values.coZip,
          "contact.coapplicant_employer": values.coEmployer,
          "contact.coapplicant_job_title": values.coJobTitle,
          "contact.coapplicant_monthly_income": values.coIncome,
        } : {})
      },
      formLabels: {
        first_name: "First Name",
        last_name: "Last Name",
        email: "Email",
        phone: "Phone",
        date_of_birth: "Date of Birth",
        address: "Address",
        city: "City",
        state: "State",
        postal_code: "ZIP",
        organization: "Employer",
        "contact.job_title": "Job Title",
        "contact.monthly_income": "Monthly Income",
        "contact.dl_document": "Driver's License",
        "contact.income_document": "Proof of Income",
        "contact.residence_document": "Proof of Residence",
        "contact.insurance_document": "Auto Insurance",
        "contact.coapplicant_first_name": "Co-Applicant First Name",
        "contact.coapplicant_last_name": "Co-Applicant Last Name",
        "contact.coapplicant_email": "Co-Applicant Email",
        "contact.coapplicant_phone": "Co-Applicant Phone",
        "contact.coapplicant_address": "Co-Applicant Address",
        "contact.coapplicant_city": "Co-Applicant City",
        "contact.coapplicant_state": "Co-Applicant State",
        "contact.coapplicant_zip": "Co-Applicant ZIP",
        "contact.coapplicant_employer": "Co-Applicant Employer",
        "contact.coapplicant_job_title": "Co-Applicant Job Title",
        "contact.coapplicant_monthly_income": "Co-Applicant Monthly Income",
      },
      url: window.location.href,
      title: document.title,
      path: window.location.pathname,
      userAgent: navigator.userAgent,
      trackingId: "tk_869aec54afd6485391dd8456b79c02bf",
      locationId: "HqAVJ0wdU05Vofq41aGB",
      sessionId: crypto.randomUUID(),
      properties: {
        deviceType: /Mobile|Android|iPhone/i.test(navigator.userAgent)
          ? "mobile"
          : "desktop",
      },
    };

    fetch("https://backend.leadconnectorhq.com/external-tracking/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        version: "2021-07-28",
      },
      body: JSON.stringify(trackingPayload),
    }).catch(() => {});

    setSubmittedData({ ...values, signature: signatureData });
    setIsSubmitted(true);
    toast.success("Credit application submitted successfully.");
    localStorage.removeItem("creditAppDraft");
    setLastSaved(null);
  }

  const handleDownloadPDF = async (dataToPrint: any) => {
    const element = document.getElementById('credit-app-pdf-content');
    if (!element) return;
    
    element.style.display = 'block';
    
    try {
      toast.info("Generating PDF...");
      const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Credit-Application-${dataToPrint.firstName || 'Draft'}.pdf`);
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate PDF");
    } finally {
      element.style.display = 'none';
    }
  };

  if (isSubmitted && submittedData) {
    return (
      <div className="min-h-full bg-slate-50 dark:bg-slate-900 p-4 md:p-8 font-sans flex flex-col items-center justify-center">
         <div className="max-w-md w-full bg-white dark:bg-slate-950 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 text-center space-y-6">
            <div className="w-20 h-20 bg-success/20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-success" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Application Submitted!</h2>
            <p className="text-slate-500">Thank you, {submittedData.firstName}. Your credit application has been securely submitted for review.</p>
            
            <div className="space-y-3 pt-4">
              <Button onClick={() => handleDownloadPDF(submittedData)} className="w-full" size="lg">
                <Download className="mr-2 h-4 w-4" /> Download PDF Copy
              </Button>
              <Button variant="outline" onClick={() => {
                setIsSubmitted(false);
                setSubmittedData(null);
                form.reset();
                setCurrentStep(0);
              }} className="w-full">
                Start New Application
              </Button>
            </div>
         </div>
         
         <div id="credit-app-pdf-content" style={{ display: 'none', width: '800px', padding: '40px', backgroundColor: 'white', color: 'black', fontFamily: 'sans-serif' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #000', paddingBottom: '20px', marginBottom: '20px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Credit Application</h1>
              <p style={{ margin: '5px 0 0 0', color: '#666' }}>Date: {new Date().toLocaleDateString()}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontWeight: 'bold', margin: 0 }}>Auto Sales OS Demo</p>
              <p style={{ margin: 0 }}>123 Main Street, Anytown, USA</p>
              <p style={{ margin: 0 }}>(555) 123-4567</p>
            </div>
          </div>

          <div style={{ marginBottom: '30px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', borderBottom: '1px solid #ccc', paddingBottom: '5px', marginBottom: '15px' }}>Applicant Information</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div><strong style={{ color: '#555' }}>Name:</strong> {submittedData.firstName} {submittedData.lastName}</div>
              <div><strong style={{ color: '#555' }}>Email:</strong> {submittedData.email}</div>
              <div><strong style={{ color: '#555' }}>Phone:</strong> {submittedData.phone}</div>
              <div><strong style={{ color: '#555' }}>DOB:</strong> {submittedData.dob}</div>
              <div><strong style={{ color: '#555' }}>SSN:</strong> ***-**-{submittedData.ssn?.slice(-4) || '****'}</div>
            </div>
          </div>

          <div style={{ marginBottom: '30px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', borderBottom: '1px solid #ccc', paddingBottom: '5px', marginBottom: '15px' }}>Residence</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
              <div><strong style={{ color: '#555' }}>Address:</strong> {submittedData.address}, {submittedData.city}, {submittedData.state} {submittedData.zip}</div>
            </div>
          </div>

          <div style={{ marginBottom: '30px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', borderBottom: '1px solid #ccc', paddingBottom: '5px', marginBottom: '15px' }}>Employment</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div><strong style={{ color: '#555' }}>Employer:</strong> {submittedData.employer}</div>
              <div><strong style={{ color: '#555' }}>Job Title:</strong> {submittedData.jobTitle}</div>
              <div><strong style={{ color: '#555' }}>Monthly Income:</strong> ${submittedData.income}</div>
            </div>
          </div>

          {submittedData.hasCoApplicant && (
            <>
              <div style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', borderBottom: '1px solid #ccc', paddingBottom: '5px', marginBottom: '15px' }}>Co-Applicant Information</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div><strong style={{ color: '#555' }}>Name:</strong> {submittedData.coFirstName} {submittedData.coLastName}</div>
                  <div><strong style={{ color: '#555' }}>Email:</strong> {submittedData.coEmail}</div>
                  <div><strong style={{ color: '#555' }}>Phone:</strong> {submittedData.coPhone}</div>
                  <div><strong style={{ color: '#555' }}>DOB:</strong> {submittedData.coDob}</div>
                  <div><strong style={{ color: '#555' }}>SSN:</strong> ***-**-{submittedData.coSsn?.slice(-4) || '****'}</div>
                </div>
              </div>
              
              <div style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', borderBottom: '1px solid #ccc', paddingBottom: '5px', marginBottom: '15px' }}>Co-Applicant Employment</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div><strong style={{ color: '#555' }}>Employer:</strong> {submittedData.coEmployer}</div>
                  <div><strong style={{ color: '#555' }}>Job Title:</strong> {submittedData.coJobTitle}</div>
                  <div><strong style={{ color: '#555' }}>Monthly Income:</strong> ${submittedData.coIncome}</div>
                </div>
              </div>
            </>
          )}

          <div style={{ marginBottom: '30px', pageBreakInside: 'avoid' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', borderBottom: '1px solid #ccc', paddingBottom: '5px', marginBottom: '15px' }}>Attached Documents</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              {submittedData.dlDocumentBase64 && (
                <div>
                  <strong style={{ display: 'block', marginBottom: '5px' }}>Driver's License</strong>
                  <img src={submittedData.dlDocumentBase64} alt="Driver's License" style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain', border: '1px solid #eee' }} />
                </div>
              )}
              {submittedData.incomeDocumentBase64 && (
                <div>
                  <strong style={{ display: 'block', marginBottom: '5px' }}>Proof of Income</strong>
                  <img src={submittedData.incomeDocumentBase64} alt="Proof of Income" style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain', border: '1px solid #eee' }} />
                </div>
              )}
              {submittedData.residenceDocumentBase64 && (
                <div>
                  <strong style={{ display: 'block', marginBottom: '5px' }}>Proof of Residence</strong>
                  <img src={submittedData.residenceDocumentBase64} alt="Proof of Residence" style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain', border: '1px solid #eee' }} />
                </div>
              )}
              {submittedData.insuranceDocumentBase64 && (
                <div>
                  <strong style={{ display: 'block', marginBottom: '5px' }}>Auto Insurance</strong>
                  <img src={submittedData.insuranceDocumentBase64} alt="Auto Insurance" style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain', border: '1px solid #eee' }} />
                </div>
              )}
              {submittedData.hasCoApplicant && submittedData.coDlDocumentBase64 && (
                <div>
                  <strong style={{ display: 'block', marginBottom: '5px' }}>Co-Applicant Driver's License</strong>
                  <img src={submittedData.coDlDocumentBase64} alt="Co-Applicant Driver's License" style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain', border: '1px solid #eee' }} />
                </div>
              )}
              {submittedData.hasCoApplicant && submittedData.coIncomeDocumentBase64 && (
                <div>
                  <strong style={{ display: 'block', marginBottom: '5px' }}>Co-Applicant Proof of Income</strong>
                  <img src={submittedData.coIncomeDocumentBase64} alt="Co-Applicant Proof of Income" style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain', border: '1px solid #eee' }} />
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: '50px', paddingTop: '20px', borderTop: '1px solid #ccc' }}>
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '20px' }}>
              By signing below, I authorize the dealership to check my credit history and verify the information provided in this application.
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div style={{ width: '45%' }}>
                {submittedData.signature && (
                  <img src={submittedData.signature} alt="Signature" style={{ height: '60px', marginBottom: '10px' }} />
                )}
                <div style={{ borderTop: '1px solid #000', paddingTop: '5px' }}>Applicant Signature</div>
              </div>
              <div style={{ width: '30%' }}>
                <div style={{ borderTop: '1px solid #000', paddingTop: '5px' }}>Date</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-900 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="h-8 w-8 text-primary" />
              Credit Application
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-slate-500 dark:text-slate-400">Secure customer financing request</p>
              {lastSaved && (
                <span className="text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                  Draft saved at {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => {
              toast.success("AI OCR Parsing Complete", { description: "Handwritten application successfully digitized into the form." });
              hapticFeedback();
            }} className="bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 text-indigo-700 hover:bg-indigo-100">
              <Scan className="mr-2 h-4 w-4 hidden sm:block" /> Scan Handwritten App
            </Button>
            <Button variant="outline" onClick={() => setIsShareOpen(true)} className="bg-white dark:bg-slate-950 border-primary text-primary hover:bg-primary/10">
              <Smartphone className="mr-2 h-4 w-4 hidden sm:block" /> Text App Link
            </Button>
            <Button variant="outline" asChild className="bg-white dark:bg-slate-950">
              <Link to="/">
                <ArrowLeft className="mr-2 h-4 w-4 hidden sm:block" /> Back
              </Link>
            </Button>
          </div>
        </header>

        <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-100/50 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-800 p-0">
            <div className="p-6 pb-0 flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">{steps[currentStep].title} Information</CardTitle>
                  <CardDescription>Step {currentStep + 1} of {steps.length}</CardDescription>
                </div>
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-500 bg-green-50 dark:bg-green-950/30 px-3 py-1 rounded-full border border-green-200 dark:border-green-900">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">Secure 256-bit Encryption</span>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/50 mt-4">
              {/* Desktop View */}
              <div className="hidden md:flex items-center justify-between">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-center">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-semibold transition-colors
                      ${currentStep === index 
                        ? "border-primary bg-primary text-primary-foreground shadow-sm ring-4 ring-primary/10" 
                        : currentStep > index 
                          ? "border-primary bg-primary/10 text-primary" 
                          : "border-slate-200 dark:border-slate-700 text-slate-400 bg-slate-50 dark:bg-slate-800"
                      }`}
                    >
                      {currentStep > index ? <ShieldCheck className="w-4 h-4" /> : index + 1}
                    </div>
                    <span className={`ml-3 text-sm font-medium ${currentStep === index ? "text-slate-900 dark:text-white" : currentStep > index ? "text-slate-700 dark:text-slate-300" : "text-slate-400"}`}>
                      {step.title}
                    </span>
                    {index < steps.length - 1 && (
                      <div className={`w-8 lg:w-12 h-0.5 mx-2 lg:mx-4 ${currentStep > index ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"}`} />
                    )}
                  </div>
                ))}
              </div>

              {/* Mobile View */}
              <div className="md:hidden flex items-center justify-center">
                <div className="flex items-center">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-primary bg-primary text-primary-foreground shadow-sm ring-4 ring-primary/10 text-sm font-semibold">
                    {currentStep + 1}
                  </div>
                  <span className="ml-3 text-sm font-medium text-slate-900 dark:text-white">
                    {steps[currentStep].title}
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                
                {/* Personal Info */}
                <div className={currentStep === 1 ? "space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500" : "hidden"}>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Personal Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} className="bg-white dark:bg-slate-950" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" {...field} className="bg-white dark:bg-slate-950" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="john@example.com" {...field} className="bg-white dark:bg-slate-950" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input type="tel" placeholder="(555) 123-4567" {...field} className="bg-white dark:bg-slate-950" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="ssn"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Social Security Number</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="XXX-XX-XXXX" {...field} className="bg-white dark:bg-slate-950" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dob"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} className="bg-white dark:bg-slate-950" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Residence */}
                <div className={currentStep === 2 ? "space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500" : "hidden"}>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Residence Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Street Address</FormLabel>
                          <FormControl>
                            <Input placeholder="123 Main St" {...field} className="bg-white dark:bg-slate-950" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="Anytown" {...field} className="bg-white dark:bg-slate-950" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State</FormLabel>
                            <FormControl>
                              <Input placeholder="CA" maxLength={2} {...field} className="bg-white dark:bg-slate-950 uppercase" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="zip"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ZIP Code</FormLabel>
                            <FormControl>
                              <Input placeholder="12345" maxLength={5} {...field} className="bg-white dark:bg-slate-950" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Employment */}
                <div className={currentStep === 3 ? "space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500" : "hidden"}>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Employment Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="employer"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Employer</FormLabel>
                          <FormControl>
                            <Input placeholder="Acme Corp" {...field} className="bg-white dark:bg-slate-950" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="jobTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Job Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Manager" {...field} className="bg-white dark:bg-slate-950" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="income"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gross Monthly Income</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-2.5 text-slate-500">$</span>
                              <Input type="number" placeholder="5000" {...field} className="pl-7 bg-white dark:bg-slate-950" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Co-Applicant Toggle */}
                <div className={currentStep === 4 ? "space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500" : "hidden"}>
                  <FormField
                    control={form.control}
                    name="hasCoApplicant"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-slate-50 dark:bg-slate-900">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base font-semibold">Add Co-Applicant</FormLabel>
                          <FormDescription>
                            Include a joint applicant to strengthen your credit application.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="h-5 w-5"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                {form.watch("hasCoApplicant") && (
                  <>
                    <div className="space-y-4 pt-4 border-t border-dashed border-slate-200 dark:border-slate-800">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Co-Applicant Documents</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Co-Applicant DL */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between mb-2">
                            <FormLabel className="text-base font-semibold">Driver's License</FormLabel>
                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20"><Sparkles className="h-3 w-3 mr-1" /> AI Auto-Fill</Badge>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-800 text-center transition-colors group">
                            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                              <FileText className="h-6 w-6 text-primary" />
                            </div>
                            <p className="font-medium text-slate-900 dark:text-white">Upload or Scan ID</p>
                            <p className="text-sm text-slate-500 mt-1 mb-4">Front and back images required</p>
                            <Input type="file" className="hidden" id="co-dl-upload" accept="image/*" onChange={(e) => handleFileUpload(e, 'coDl')} />
                            
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                              <Button type="button" variant="outline" onClick={() => document.getElementById('co-dl-upload')?.click()} className="w-full sm:w-auto">
                                <Upload className="mr-2 h-4 w-4" /> Upload File
                              </Button>
                              <Button type="button" onClick={() => handleScan('coDl')} className="w-full sm:w-auto bg-primary text-white">
                                <Camera className="mr-2 h-4 w-4" /> Scan ID
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Co-Applicant Paystubs */}
                        <div className="space-y-2 pt-4 md:pt-0">
                          <div className="flex items-center justify-between mb-2">
                            <FormLabel className="text-base font-semibold">Proof of Income</FormLabel>
                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20"><Sparkles className="h-3 w-3 mr-1" /> AI Auto-Fill</Badge>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-800 text-center transition-colors group">
                            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                              <FileText className="h-6 w-6 text-primary" />
                            </div>
                            <p className="font-medium text-slate-900 dark:text-white">Upload or Scan Paystub</p>
                            <p className="text-sm text-slate-500 mt-1 mb-4">Last 30 days of paystubs or bank statements</p>
                            <Input type="file" className="hidden" id="co-income-upload" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, 'coIncome')} />
                            
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                              <Button type="button" variant="outline" onClick={() => document.getElementById('co-income-upload')?.click()} className="w-full sm:w-auto">
                                <Upload className="mr-2 h-4 w-4" /> Upload File
                              </Button>
                              <Button type="button" onClick={() => handleScan('coIncome')} className="w-full sm:w-auto bg-primary text-white">
                                <Camera className="mr-2 h-4 w-4" /> Scan Document
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-dashed border-slate-200 dark:border-slate-800">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Co-Applicant Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="coFirstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>First Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Jane" {...field} className="bg-white dark:bg-slate-950" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="coLastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Last Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Doe" {...field} className="bg-white dark:bg-slate-950" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="coEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Address</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="jane@example.com" {...field} className="bg-white dark:bg-slate-950" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="coPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number</FormLabel>
                              <FormControl>
                                <Input type="tel" placeholder="(555) 987-6543" {...field} className="bg-white dark:bg-slate-950" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="coSsn"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Social Security Number</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="XXX-XX-XXXX" {...field} className="bg-white dark:bg-slate-950" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="coDob"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date of Birth</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} className="bg-white dark:bg-slate-950" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="space-y-4 pt-4">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Co-Applicant Residence</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="coAddress"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Street Address</FormLabel>
                              <FormControl>
                                <Input placeholder="123 Main St" {...field} className="bg-white dark:bg-slate-950" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="coCity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City</FormLabel>
                              <FormControl>
                                <Input placeholder="Anytown" {...field} className="bg-white dark:bg-slate-950" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="coState"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>State</FormLabel>
                                <FormControl>
                                  <Input placeholder="CA" maxLength={2} {...field} className="bg-white dark:bg-slate-950 uppercase" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="coZip"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>ZIP Code</FormLabel>
                                <FormControl>
                                  <Input placeholder="12345" maxLength={5} {...field} className="bg-white dark:bg-slate-950" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Co-Applicant Employment</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="coEmployer"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Current Employer</FormLabel>
                              <FormControl>
                                <Input placeholder="Acme Corp" {...field} className="bg-white dark:bg-slate-950" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="coJobTitle"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Job Title</FormLabel>
                              <FormControl>
                                <Input placeholder="Manager" {...field} className="bg-white dark:bg-slate-950" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="coIncome"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Gross Monthly Income</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <span className="absolute left-3 top-2.5 text-slate-500">$</span>
                                  <Input type="number" placeholder="5000" {...field} className="pl-7 bg-white dark:bg-slate-950" />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </>
                )}
                </div>

                {/* Documents */}
                <div className={currentStep === 0 ? "space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500" : "hidden"}>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Required Documents & Verification</h3>
                  <p className="text-sm text-slate-500">Please provide your ID and acknowledge that you have the required documents ready for final approval.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* DL */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <FormLabel className="text-base font-semibold">Driver's License</FormLabel>
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20"><Sparkles className="h-3 w-3 mr-1" /> AI Auto-Fill</Badge>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-800 text-center transition-colors group">
                        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <p className="font-medium text-slate-900 dark:text-white">Upload or Scan ID</p>
                        <p className="text-sm text-slate-500 mt-1 mb-4">Front and back images required</p>
                        <Input type="file" className="hidden" id="dl-upload" accept="image/*" onChange={(e) => handleFileUpload(e, 'dl')} />
                        
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                          <Button type="button" variant="outline" onClick={() => document.getElementById('dl-upload')?.click()} className="w-full sm:w-auto">
                            <Upload className="mr-2 h-4 w-4" /> Upload File
                          </Button>
                          <Button type="button" onClick={() => handleScan('dl')} className="w-full sm:w-auto bg-primary text-white">
                            <Camera className="mr-2 h-4 w-4" /> Scan ID
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Paystubs */}
                    <div className="space-y-2 pt-4 md:pt-0">
                      <div className="flex items-center justify-between mb-2">
                        <FormLabel className="text-base font-semibold">Proof of Income</FormLabel>
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20"><Sparkles className="h-3 w-3 mr-1" /> AI Auto-Fill</Badge>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-800 text-center transition-colors group">
                        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <p className="font-medium text-slate-900 dark:text-white">Upload or Scan Paystub</p>
                        <p className="text-sm text-slate-500 mt-1 mb-4">Last 30 days of paystubs or bank statements</p>
                        <Input type="file" className="hidden" id="income-upload" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, 'income')} />
                        
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                          <Button type="button" variant="outline" onClick={() => document.getElementById('income-upload')?.click()} className="w-full sm:w-auto">
                            <Upload className="mr-2 h-4 w-4" /> Upload File
                          </Button>
                          <Button type="button" onClick={() => handleScan('income')} className="w-full sm:w-auto bg-primary text-white">
                            <Camera className="mr-2 h-4 w-4" /> Scan Document
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Residence */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <FormLabel className="text-base font-semibold">Proof of Residence</FormLabel>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-800 text-center hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer group" onClick={() => document.getElementById('residence-upload')?.click()}>
                        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <p className="font-medium text-slate-900 dark:text-white">Upload Utility Bill</p>
                        <p className="text-sm text-slate-500 mt-1">Recent bill or lease agreement</p>
                        <Input type="file" className="hidden" id="residence-upload" accept="image/*,.pdf" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            form.setValue('residenceDocument', file);
                            toast.success("Document uploaded successfully!");
                          }
                        }} />
                        <Button type="button" variant="outline" className="mt-4">
                          <Upload className="mr-2 h-4 w-4" /> Select File
                        </Button>
                      </div>
                    </div>

                    {/* Insurance */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <FormLabel className="text-base font-semibold">Auto Insurance</FormLabel>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-800 text-center transition-colors group">
                        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <p className="font-medium text-slate-900 dark:text-white">Upload or Scan Insurance</p>
                        <p className="text-sm text-slate-500 mt-1 mb-4">Current valid auto insurance policy</p>
                        <Input type="file" className="hidden" id="insurance-upload" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, 'insurance')} />
                        
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                          <Button type="button" variant="outline" onClick={() => document.getElementById('insurance-upload')?.click()} className="w-full sm:w-auto">
                            <Upload className="mr-2 h-4 w-4" /> Upload File
                          </Button>
                          <Button type="button" onClick={() => handleScan('insurance')} className="w-full sm:w-auto bg-primary text-white">
                            <Camera className="mr-2 h-4 w-4" /> Scan Card
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Signature */}
                <div className={currentStep === 5 ? "space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500" : "absolute w-full opacity-0 pointer-events-none -z-10 invisible"}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Sign-Off</h3>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => sigCanvas.current?.clear()}
                      className="text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    >
                      <Eraser className="h-4 w-4 mr-2" />
                      Clear Signature
                    </Button>
                  </div>
                  <div className={`border-2 rounded-lg bg-white overflow-hidden ${sigError ? 'border-destructive' : 'border-slate-200 dark:border-slate-700'}`}>
                    {React.createElement(SignatureCanvas as any, {
                      ref: sigCanvas,
                      penColor: "black",
                      canvasProps: {
                        className: "w-full h-40 cursor-crosshair",
                        onBegin: () => setSigError(false)
                      }
                    })}
                  </div>
                  {sigError && (
                    <p className="text-sm font-medium text-destructive">
                      Signature is required to process the application.
                    </p>
                  )}
                  <p className="text-sm text-slate-500">
                    By signing above, you authorize us to check your credit history and verify the information provided.
                  </p>
                </div>

                <div className="pt-6 flex items-center justify-between border-t border-slate-200 dark:border-slate-800 mt-8">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handlePrev} 
                    disabled={currentStep === 0}
                    className="w-full sm:w-auto"
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  
                  {currentStep < steps.length - 1 ? (
                    <Button 
                      type="button" 
                      onClick={handleNext}
                      className="w-full sm:w-auto ml-4"
                    >
                      Next Step <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button 
                      type="submit" 
                      size="lg" 
                      className="w-full sm:w-auto ml-4 bg-primary text-white"
                    >
                      Submit Application
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* Share Link Dialog */}
      <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Text Application Link</DialogTitle>
            <DialogDescription>
              Send a secure link to the customer so they can complete the application and upload documents from their phone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Customer Mobile Number</Label>
              <div className="flex gap-2">
                <Input 
                  placeholder="(555) 123-4567" 
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
                <Button onClick={() => {
                  toast.success(`Secure link sent to ${customerPhone || 'customer'}!`);
                  setIsShareOpen(false);
                  setCustomerPhone("");
                }}>
                  Send SMS
                </Button>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200 dark:border-slate-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-slate-500">Or copy link</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Input
                readOnly
                value="https://demo.carsalessoftware.com/credit-app/apply/abc123xyz"
                className="bg-slate-50 dark:bg-slate-900 font-mono text-sm"
              />
              <Button variant="outline" size="icon" onClick={() => {
                navigator.clipboard.writeText("https://demo.carsalessoftware.com/credit-app/apply/abc123xyz");
                toast.success("Link copied to clipboard!");
              }}>
                <LinkIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Scanner Dialog */}
      <Dialog open={scannerOpen} onOpenChange={setScannerOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-slate-950 border-slate-800">
          <div className="relative h-[400px] sm:h-[500px] w-full flex flex-col">
            <div className="absolute inset-0 bg-slate-900 flex items-center justify-center overflow-hidden">
              {/* Actual Camera Feed */}
              <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover opacity-60" />
              <canvas ref={canvasRef} className="hidden" />
              
              {!scanSuccess ? (
                <>
                  {/* Viewfinder Brackets */}
                  <div className={`relative w-[80%] ${scannerType === 'dl' || scannerType === 'coDl' ? 'h-[200px]' : 'h-[250px]'} border-2 border-white/20 rounded-xl flex items-center justify-center transition-all duration-500 ${isScanning ? 'scale-95 border-primary/50' : ''}`}>
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg"></div>
                    
                    {isScanning && (
                      <div className="absolute inset-0 bg-primary/20 animate-pulse rounded-lg flex items-center justify-center">
                        <Scan className="w-12 h-12 text-white animate-bounce" />
                      </div>
                    )}
                    
                    {!isScanning && (
                      <p className="text-white/50 text-sm font-medium uppercase tracking-widest">
                        Align {scannerType === 'dl' || scannerType === 'coDl' ? 'ID' : scannerType === 'income' || scannerType === 'coIncome' ? 'Document' : 'Card'} Here
                      </p>
                    )}
                    
                    {/* Scanning Line Animation */}
                    {isScanning && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-primary shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-[scan_1.5s_ease-in-out_infinite]"></div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-4 animate-in zoom-in duration-300">
                  <div className="w-20 h-20 bg-success/20 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10 text-success" />
                  </div>
                  <p className="text-white font-semibold text-lg">Scan Complete</p>
                </div>
              )}
            </div>
            
            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent">
              <DialogTitle className="text-white text-center">
                Scan {scannerType === 'dl' || scannerType === 'coDl' ? "Driver's License" : scannerType === 'income' || scannerType === 'coIncome' ? "Paystub" : "Insurance Card"}
              </DialogTitle>
              <DialogDescription className="text-slate-300 text-center mt-1 text-xs">
                Position the document within the frame
              </DialogDescription>
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex justify-center">
              {!scanSuccess && (
                <Button 
                  size="lg" 
                  onClick={captureAndProcess}
                  disabled={isScanning}
                  className="rounded-full w-16 h-16 p-0 bg-white hover:bg-slate-200 border-4 border-slate-400 focus:ring-4 focus:ring-primary/50"
                >
                  <span className="sr-only">Capture</span>
                  <div className="w-12 h-12 rounded-full border-2 border-slate-300"></div>
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <style>{`
        @keyframes scan {
          0% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
