/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  Shield, 
  Fingerprint, 
  User, 
  Activity, 
  Droplets, 
  Phone, 
  Lock, 
  Unlock, 
  Plus, 
  FileText, 
  AlertCircle, 
  ChevronRight, 
  LogOut, 
  X, 
  Upload, 
  Calendar,
  Stethoscope,
  Pill,
  History,
  AlertTriangle,
  ArrowLeft,
  Scale,
  Ruler,
  Edit2,
  Users,
  Camera,
  Image as ImageIcon,
  Trash2,
  Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
type Screen = 'login' | 'dashboard' | 'critical' | 'emergency';

interface CriticalDocument {
  id: string;
  image: string;
  type: string;
  notes?: string;
  date: string;
}

interface PatientData {
  name: string;
  age: number;
  gender: string;
  bloodGroup: string;
  height: number; // in cm
  weight: number; // in kg
  emergencyContact: string;
  emergencyContactName: string;
  allergies: string[];
  medications: string[];
  history: string[];
  chronicConditions: string[];
  surgeries: string[];
  documents: { id: string; name: string; date: string; type: string }[];
  criticalDocuments: CriticalDocument[];
}

// --- Mock Data ---
const INITIAL_PATIENT_DATA: PatientData = {
  name: "John Doe",
  age: 32,
  gender: "Male",
  bloodGroup: "O+",
  height: 180,
  weight: 75,
  emergencyContact: "+1 (555) 123-4567",
  emergencyContactName: "Jane Doe (Wife)",
  allergies: ["Penicillin", "Peanuts", "Latex"],
  medications: ["Lisinopril 10mg", "Metformin 500mg"],
  history: ["Type 2 Diabetes", "Hypertension"],
  chronicConditions: ["Asthma"],
  surgeries: ["Appendectomy (2015)", "Knee Surgery (2019)"],
  documents: [
    { id: '1', name: "Blood Test Results", date: "Oct 12, 2025", type: "Lab Result" },
    { id: '2', name: "Dr. Smith Prescription", date: "Oct 10, 2025", type: "Prescription" },
    { id: '3', name: "Annual Physical Report", date: "Aug 24, 2025", type: "Report" },
  ],
  criticalDocuments: []
};

// --- Components ---

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string; key?: React.Key }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-4 ${className}`}>
    {children}
  </div>
);

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className = "",
  disabled = false
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  className?: string;
  disabled?: boolean;
}) => {
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-md",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
    danger: "bg-rose-600 text-white hover:bg-rose-700 shadow-md",
    outline: "border-2 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50",
    ghost: "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
  };

  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-3 rounded-xl font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

// --- Main App ---

export default function App() {
  const [patientData, setPatientData] = useState<PatientData>(() => {
    const saved = localStorage.getItem('med_v_patient_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migration: Ensure all array fields exist
        const arrayFields: (keyof PatientData)[] = ['allergies', 'medications', 'history', 'chronicConditions', 'surgeries', 'documents', 'criticalDocuments'];
        arrayFields.forEach(field => {
          if (!parsed[field] || !Array.isArray(parsed[field])) {
            parsed[field] = [];
          }
        });

        // Specific migration for criticalDocuments if old criticalImages existed
        if (parsed.criticalImages && Array.isArray(parsed.criticalImages) && parsed.criticalDocuments.length === 0) {
          parsed.criticalDocuments = parsed.criticalImages.map((img: string, idx: number) => ({
            id: `migrated-${idx}`,
            image: img,
            type: 'Migrated Record',
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          }));
          delete parsed.criticalImages;
        }
        return parsed;
      } catch (e) {
        console.error("Failed to parse saved patient data", e);
      }
    }
    return INITIAL_PATIENT_DATA;
  });

  useEffect(() => {
    localStorage.setItem('med_v_patient_data', JSON.stringify(patientData));
  }, [patientData]);

  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [isBiometricVerified, setIsBiometricVerified] = useState(false);
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [showEditVitalsModal, setShowEditVitalsModal] = useState(false);
  const [showImagePreviewModal, setShowImagePreviewModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [biometricError, setBiometricError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [uploadForm, setUploadForm] = useState<{ type: string; notes: string; image: string | null }>({
    type: 'Prescription',
    notes: '',
    image: null
  });
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const calculateBMI = (weight: number, height: number) => {
    if (!height || !weight) return 0;
    const heightInMeters = height / 100;
    return (weight / (heightInMeters * heightInMeters)).toFixed(1);
  };

  // Reset verification when returning to dashboard
  useEffect(() => {
    if (currentScreen === 'dashboard') {
      setIsBiometricVerified(false);
    }
  }, [currentScreen]);

  const handleLogin = () => {
    setCurrentScreen('dashboard');
  };

  const triggerBiometric = (onSuccess: () => void) => {
    setBiometricError(null);
    if (isBiometricVerified) {
      onSuccess();
    } else {
      setPendingAction(() => onSuccess);
      setShowBiometricModal(true);
    }
  };

  const simulateScan = () => {
    setIsScanning(true);
    setBiometricError(null);
    setTimeout(() => {
      setIsScanning(false);
      setIsBiometricVerified(true);
      setShowBiometricModal(false);
      if (pendingAction) {
        pendingAction();
        setPendingAction(null);
      }
    }, 1500);
  };

  // --- Screen Renderers ---

  const deleteImage = (id: string) => {
    triggerBiometric(() => {
      const newDocs = (patientData.criticalDocuments || []).filter(doc => doc.id !== id);
      setPatientData({ ...patientData, criticalDocuments: newDocs });
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("File size exceeds 10MB limit.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadForm({ ...uploadForm, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSecureUpload = () => {
    if (!uploadForm.image) return;
    
    triggerBiometric(() => {
      const newDoc: CriticalDocument = {
        id: Date.now().toString(),
        image: uploadForm.image!,
        type: uploadForm.type,
        notes: uploadForm.notes,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      };
      
      setPatientData({
        ...patientData,
        criticalDocuments: [newDoc, ...(patientData.criticalDocuments || [])]
      });
      
      setUploadForm({
        type: 'Prescription',
        notes: '',
        image: null
      });
      
      alert("Document securely uploaded!");
    });
  };

  const ImagePreviewModal = () => (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/95 backdrop-blur-md"
        onClick={() => setShowImagePreviewModal(false)}
      />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative max-w-full max-h-full"
      >
        <button 
          onClick={() => setShowImagePreviewModal(false)}
          className="absolute -top-12 right-0 p-2 text-white hover:bg-white/10 rounded-full transition-colors"
        >
          <X className="w-8 h-8" />
        </button>
        <img 
          src={selectedImage || ''} 
          alt="Preview" 
          className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
          referrerPolicy="no-referrer"
        />
      </motion.div>
    </div>
  );

  const renderLogin = () => (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-200">
              <Shield className="text-white w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Med-V</h1>
            <p className="text-slate-500 mt-1">Secure Medical Access</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <input 
                type="email" 
                defaultValue="john.doe@example.com"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="Enter your email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input 
                type="password" 
                defaultValue="password123"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="Enter your password"
              />
            </div>
            <Button onClick={handleLogin} className="w-full mt-4">
              Secure Login
            </Button>
            <div className="text-center mt-4">
              <button className="text-sm text-blue-600 font-medium hover:underline">Forgot Password?</button>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );

  const renderDashboard = () => (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
            <User className="text-slate-600 w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Welcome back,</p>
            <h2 className="text-lg font-bold text-slate-900">{patientData.name}</h2>
          </div>
        </div>
        <Button variant="ghost" className="p-2" onClick={() => setCurrentScreen('login')}>
          <LogOut className="w-5 h-5" />
        </Button>
      </header>

      <main className="p-6 space-y-6 max-w-2xl mx-auto">
        {/* Vitals Grid */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Basic Vitals</h3>
            <button 
              onClick={() => setShowEditVitalsModal(true)}
              className="text-blue-600 flex items-center gap-1 text-sm font-semibold hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Card className="flex flex-col items-center text-center">
              <Activity className="text-blue-500 w-5 h-5 mb-2" />
              <p className="text-xs text-slate-500">Age</p>
              <p className="text-lg font-bold">{patientData.age}</p>
            </Card>
            <Card className="flex flex-col items-center text-center">
              <Users className="text-indigo-500 w-5 h-5 mb-2" />
              <p className="text-xs text-slate-500">Gender</p>
              <p className="text-lg font-bold">{patientData.gender}</p>
            </Card>
            <Card className="flex flex-col items-center text-center">
              <Droplets className="text-rose-500 w-5 h-5 mb-2" />
              <p className="text-xs text-slate-500">Blood Group</p>
              <p className="text-lg font-bold text-rose-600">{patientData.bloodGroup}</p>
            </Card>
            <Card className="flex flex-col items-center text-center">
              <Activity className="text-emerald-500 w-5 h-5 mb-2" />
              <p className="text-xs text-slate-500">BMI</p>
              <p className="text-lg font-bold text-emerald-600">{calculateBMI(patientData.weight, patientData.height)}</p>
            </Card>
            <Card className="flex flex-col items-center text-center">
              <Ruler className="text-slate-500 w-5 h-5 mb-2" />
              <p className="text-xs text-slate-500">Height</p>
              <p className="text-lg font-bold">{patientData.height} cm</p>
            </Card>
            <Card className="flex flex-col items-center text-center">
              <Scale className="text-slate-500 w-5 h-5 mb-2" />
              <p className="text-xs text-slate-500">Weight</p>
              <p className="text-lg font-bold">{patientData.weight} kg</p>
            </Card>
            <Card className="flex flex-col items-center text-center col-span-2">
              <Phone className="text-emerald-500 w-5 h-5 mb-2" />
              <p className="text-xs text-slate-500">Emergency Contact</p>
              <p className="text-md font-bold">{patientData.emergencyContactName}</p>
              <p className="text-sm text-slate-600">{patientData.emergencyContact}</p>
            </Card>
          </div>
        </section>

        {/* Secure Upload Section */}
        <section className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="text-blue-600 w-5 h-5" />
            <h3 className="font-bold text-slate-900">Secure Upload</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Document Type</label>
              <select 
                value={uploadForm.type}
                onChange={(e) => setUploadForm({ ...uploadForm, type: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option>Prescription</option>
                <option>ID Card</option>
                <option>Medical Report</option>
                <option>Insurance Document</option>
                <option>Vaccination Record</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Notes (Optional)</label>
              <textarea 
                value={uploadForm.notes}
                onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                placeholder="Add any context about this document..."
              />
            </div>

            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${uploadForm.image ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-slate-50 hover:border-blue-400'}`}
            >
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*,.pdf"
                className="hidden"
              />
              {uploadForm.image ? (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-lg overflow-hidden mb-2 border border-blue-200">
                    <img src={uploadForm.image} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <p className="text-sm font-bold text-blue-600">File Selected</p>
                  <button onClick={(e) => { e.stopPropagation(); setUploadForm({ ...uploadForm, image: null }); }} className="text-xs text-rose-500 mt-1 hover:underline">Remove</button>
                </div>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-600">Tap to select from computer</p>
                  <p className="text-xs text-slate-400 mt-1">JPG, PNG or PDF (Max 10MB)</p>
                </>
              )}
            </div>

            <Button 
              className="w-full py-4 text-lg shadow-lg shadow-blue-200" 
              onClick={handleSecureUpload}
              disabled={!uploadForm.image}
            >
              <Shield className="w-5 h-5" />
              Securely Upload
            </Button>
          </div>
        </section>

        {/* Action Area */}
        <section className="space-y-4">
          <Button 
            variant="primary" 
            className="w-full py-6 text-lg"
            onClick={() => triggerBiometric(() => setCurrentScreen('critical'))}
          >
            <Lock className="w-5 h-5" />
            Unlock Critical Info
          </Button>
          
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
            <AlertCircle className="text-blue-600 w-6 h-6 shrink-0" />
            <p className="text-sm text-blue-800">
              Your sensitive medical records are encrypted and require biometric verification to view.
            </p>
          </div>
        </section>

        {/* Emergency Mode */}
        <section className="pt-8">
          <Button 
            variant="outline" 
            className="w-full border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300"
            onClick={() => triggerBiometric(() => setCurrentScreen('emergency'))}
          >
            <AlertTriangle className="w-5 h-5" />
            ENTER EMERGENCY MODE
          </Button>
          <p className="text-center text-xs text-slate-400 mt-3">
            For medical professionals only. Requires patient biometric verification.
          </p>
        </section>
      </main>
    </div>
  );

  const renderCriticalInfo = () => (
    <div className="min-h-screen bg-white">
      <header className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentScreen('dashboard')} className="p-2 -ml-2 hover:bg-slate-100 rounded-full">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h2 className="text-lg font-bold text-slate-900">Critical Information</h2>
        </div>
        <Button variant="secondary" className="px-3 py-2 text-sm" onClick={() => setCurrentScreen('dashboard')}>
          <Lock className="w-4 h-4" />
          Lock
        </Button>
      </header>

      <main className="p-6 space-y-8 max-w-2xl mx-auto">
        {/* Medical History */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <History className="text-blue-600 w-5 h-5" />
            <h3 className="font-bold text-slate-900">Medical History</h3>
          </div>
          <div className="space-y-3">
            {(patientData.history || []).map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span className="text-slate-700 font-medium">{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Medications */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Pill className="text-emerald-600 w-5 h-5" />
            <h3 className="font-bold text-slate-900">Current Medications</h3>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {(patientData.medications || []).map((item, i) => (
              <Card key={i} className="flex items-center justify-between">
                <span className="font-medium text-slate-800">{item}</span>
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-bold">Active</span>
              </Card>
            ))}
          </div>
        </section>

        {/* Allergies */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="text-rose-600 w-5 h-5" />
            <h3 className="font-bold text-slate-900">Allergies</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {(patientData.allergies || []).map((item, i) => (
              <span key={i} className="px-3 py-1.5 bg-rose-50 text-rose-700 rounded-full text-sm font-bold border border-rose-100">
                {item}
              </span>
            ))}
          </div>
        </section>

        {/* Document Timeline */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="text-slate-600 w-5 h-5" />
            <h3 className="font-bold text-slate-900">Document Timeline</h3>
          </div>
          <div className="space-y-4 border-l-2 border-slate-100 ml-3 pl-6">
            {(patientData.documents || []).map((doc) => (
              <div key={doc.id} className="relative">
                <div className="absolute -left-[31px] top-1 w-4 h-4 bg-white border-2 border-blue-500 rounded-full" />
                <Card className="flex items-center justify-between hover:border-blue-200 cursor-pointer transition-colors">
                  <div>
                    <p className="font-bold text-slate-800">{doc.name}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      <Calendar className="w-3 h-3" />
                      {doc.date}
                      <span className="w-1 h-1 bg-slate-300 rounded-full" />
                      {doc.type}
                    </div>
                  </div>
                  <ChevronRight className="text-slate-400 w-5 h-5" />
                </Card>
              </div>
            ))}
          </div>
        </section>

        {/* Critical Documents Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <ImageIcon className="text-indigo-600 w-5 h-5" />
            <h3 className="font-bold text-slate-900">Critical Documents</h3>
          </div>
          
          {(patientData.criticalDocuments || []).length > 0 ? (
            <div className="space-y-4">
              {(patientData.criticalDocuments || []).map((doc) => (
                <Card key={doc.id} className="overflow-hidden p-0">
                  <div className="flex gap-4 p-4">
                    <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 border border-slate-100">
                      <img 
                        src={doc.image} 
                        alt={doc.type} 
                        className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform duration-500"
                        onClick={() => {
                          setSelectedImage(doc.image);
                          setShowImagePreviewModal(true);
                        }}
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[10px] font-black uppercase tracking-wider">
                          {doc.type}
                        </span>
                        <button 
                          onClick={() => deleteImage(doc.id)}
                          className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-400 mb-2">{doc.date}</p>
                      {doc.notes && (
                        <p className="text-sm text-slate-600 line-clamp-2 italic">
                          "{doc.notes}"
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-100 rounded-2xl p-8 text-center bg-slate-50">
              <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No critical documents uploaded yet.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );

  const renderEmergency = () => (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <header className="bg-rose-600 p-6 text-center">
        <h1 className="text-xl font-black tracking-tighter uppercase">Emergency Medical Record</h1>
        <p className="text-rose-100 text-xs font-bold mt-1">READ-ONLY ACCESS • DOCTOR VIEW</p>
      </header>

      <main className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Massive Top Row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-900 border-2 border-rose-500/30 rounded-3xl p-6 text-center">
            <p className="text-rose-500 text-xs font-black uppercase mb-1">Blood Group</p>
            <p className="text-5xl font-black">{patientData.bloodGroup}</p>
          </div>
          <div className="bg-slate-900 border-2 border-rose-500/30 rounded-3xl p-6 text-center">
            <p className="text-rose-500 text-xs font-black uppercase mb-1">BMI</p>
            <p className="text-5xl font-black">{calculateBMI(patientData.weight, patientData.height)}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <p className="text-slate-500 text-[10px] font-black uppercase mb-1">Age</p>
            <p className="text-xl font-bold">{patientData.age}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <p className="text-slate-500 text-[10px] font-black uppercase mb-1">Height</p>
            <p className="text-xl font-bold">{patientData.height}cm</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <p className="text-slate-500 text-[10px] font-black uppercase mb-1">Weight</p>
            <p className="text-xl font-bold">{patientData.weight}kg</p>
          </div>
        </div>
          
        <div className="bg-slate-900 border-2 border-rose-500/30 rounded-3xl p-8">
          <p className="text-rose-500 text-sm font-black uppercase mb-4 text-center">Severe Allergies</p>
          <div className="flex flex-wrap justify-center gap-3">
            {(patientData.allergies || []).map((item, i) => (
              <span key={i} className="text-2xl font-black text-white px-4 py-2 bg-rose-900/40 rounded-xl border border-rose-500/50">
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Medications */}
        <section className="bg-slate-900 rounded-3xl p-6">
          <h3 className="text-slate-400 text-sm font-black uppercase mb-4 flex items-center gap-2">
            <Pill className="w-4 h-4" />
            Current Medications
          </h3>
          <ul className="space-y-4">
            {(patientData.medications || []).map((item, i) => (
              <li key={i} className="text-2xl font-bold border-b border-slate-800 pb-4 last:border-0 last:pb-0">
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* Chronic Conditions */}
        <section className="bg-slate-900 rounded-3xl p-6">
          <h3 className="text-slate-400 text-sm font-black uppercase mb-4 flex items-center gap-2">
            <Stethoscope className="w-4 h-4" />
            Chronic Conditions
          </h3>
          <ul className="space-y-4">
            {(patientData.chronicConditions || []).map((item, i) => (
              <li key={i} className="text-2xl font-bold border-b border-slate-800 pb-4 last:border-0 last:pb-0">
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* Emergency Contact */}
        <section className="bg-slate-900 rounded-3xl p-6">
          <h3 className="text-slate-400 text-sm font-black uppercase mb-4 flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Emergency Contact
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl font-bold">{patientData.emergencyContactName}</p>
              <p className="text-2xl font-black text-rose-500">{patientData.emergencyContact}</p>
            </div>
            <div className="w-16 h-16 bg-rose-600 rounded-full flex items-center justify-center shadow-lg shadow-rose-900/50">
              <Phone className="w-8 h-8" />
            </div>
          </div>
        </section>

        {/* Critical Documents - Emergency View */}
        {(patientData.criticalDocuments || []).length > 0 && (
          <section className="bg-slate-900 rounded-3xl p-6">
            <h3 className="text-slate-400 text-sm font-black uppercase mb-4 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Critical Documents
            </h3>
            <div className="space-y-6">
              {(patientData.criticalDocuments || []).map((doc) => (
                <div key={doc.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-black uppercase tracking-widest">
                      {doc.type}
                    </span>
                    <span className="text-xs text-slate-500">{doc.date}</span>
                  </div>
                  
                  <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-black aspect-video flex items-center justify-center">
                    <img 
                      src={doc.image} 
                      alt={doc.type} 
                      className="max-w-full max-h-full object-contain"
                      onClick={() => {
                        setSelectedImage(doc.image);
                        setShowImagePreviewModal(true);
                      }}
                      referrerPolicy="no-referrer"
                    />
                    <button 
                      onClick={() => {
                        setSelectedImage(doc.image);
                        setShowImagePreviewModal(true);
                      }}
                      className="absolute bottom-4 right-4 p-3 bg-white/10 backdrop-blur-md text-white rounded-full border border-white/20"
                    >
                      <Maximize2 className="w-6 h-6" />
                    </button>
                  </div>
                  
                  {doc.notes && (
                    <div className="p-4 bg-slate-800/50 rounded-xl border-l-4 border-blue-500">
                      <p className="text-sm text-slate-300 italic">"{doc.notes}"</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="p-6 bg-slate-950 border-t border-slate-900">
        <Button 
          variant="outline" 
          className="w-full border-slate-700 text-slate-400 hover:bg-slate-900"
          onClick={() => setCurrentScreen('dashboard')}
        >
          Exit Emergency Mode
        </Button>
      </footer>
    </div>
  );

  // --- Modals ---

  const EditVitalsModal = () => {
    const [formData, setFormData] = useState({
      age: patientData.age,
      gender: patientData.gender,
      bloodGroup: patientData.bloodGroup,
      height: patientData.height,
      weight: patientData.weight,
      emergencyContactName: patientData.emergencyContactName,
      emergencyContact: patientData.emergencyContact
    });

    const handleSave = () => {
      setPatientData({ ...patientData, ...formData });
      setShowEditVitalsModal(false);
    };

    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setShowEditVitalsModal(false)}
        />
        <motion.div 
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="relative bg-white w-full max-w-2xl rounded-t-[32px] p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-slate-900">Edit Basic Vitals</h3>
            <button onClick={() => setShowEditVitalsModal(false)} className="p-2 bg-slate-100 rounded-full">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Age</label>
                <input 
                  type="number" 
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Gender</label>
                <select 
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Height (cm)</label>
                <input 
                  type="number" 
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Weight (kg)</label>
                <input 
                  type="number" 
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Blood Group</label>
              <select 
                value={formData.bloodGroup}
                onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option>A+</option>
                <option>A-</option>
                <option>B+</option>
                <option>B-</option>
                <option>AB+</option>
                <option>AB-</option>
                <option>O+</option>
                <option>O-</option>
              </select>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex justify-between items-center">
              <div>
                <p className="text-xs text-emerald-600 font-bold uppercase">Calculated BMI</p>
                <p className="text-2xl font-black text-emerald-700">{calculateBMI(formData.weight, formData.height)}</p>
              </div>
              <Activity className="text-emerald-500 w-8 h-8" />
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Emergency Contact Name</label>
                <input 
                  type="text" 
                  value={formData.emergencyContactName}
                  onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Emergency Phone</label>
                <input 
                  type="tel" 
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <Button className="w-full py-4 text-lg" onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </motion.div>
      </div>
    );
  };

  const BiometricModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
        onClick={() => !isScanning && setShowBiometricModal(false)}
      />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative bg-white w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl"
      >
        <div className="mb-6 flex justify-center">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 ${isScanning ? 'bg-blue-100 scale-110' : 'bg-slate-50'}`}>
            {isScanning ? (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <Fingerprint className="w-12 h-12 text-blue-600" />
              </motion.div>
            ) : (
              <Fingerprint className="w-12 h-12 text-slate-300" />
            )}
          </div>
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Biometric Verification</h3>
        <p className="text-slate-500 mb-8">Authentication required to access sensitive medical data.</p>
        
        {biometricError && (
          <div className="mb-6 p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2 text-rose-600 text-sm font-medium">
            <AlertCircle className="w-4 h-4" />
            {biometricError}
          </div>
        )}

        <Button 
          variant="primary" 
          className="w-full py-4" 
          onClick={simulateScan}
          disabled={isScanning}
        >
          {isScanning ? 'Scanning...' : 'Simulate Scan'}
        </Button>
        
        {!isScanning && (
          <button 
            onClick={() => {
              setBiometricError("Biometric verification required to upload document.");
              setTimeout(() => {
                setShowBiometricModal(false);
                setBiometricError(null);
              }, 2000);
            }}
            className="mt-4 text-sm text-slate-400 font-medium hover:text-slate-600"
          >
            Cancel
          </button>
        )}
      </motion.div>
    </div>
  );

  return (
    <div className="font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <AnimatePresence mode="wait">
        {currentScreen === 'login' && renderLogin()}
        {currentScreen === 'dashboard' && renderDashboard()}
        {currentScreen === 'critical' && renderCriticalInfo()}
        {currentScreen === 'emergency' && renderEmergency()}
      </AnimatePresence>

      <AnimatePresence>
        {showBiometricModal && <BiometricModal />}
        {showEditVitalsModal && <EditVitalsModal />}
        {showImagePreviewModal && <ImagePreviewModal />}
      </AnimatePresence>
    </div>
  );
}
