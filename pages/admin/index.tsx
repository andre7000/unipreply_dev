import React, { useState, useCallback } from 'react';
import { Upload, Loader2, CheckCircle, AlertCircle, RefreshCw, FileText, Link as LinkIcon } from 'lucide-react';
import { colleges as collegeList } from '@/data/dataSource';

interface UploadStatus {
  status: 'idle' | 'uploading' | 'processing' | 'success' | 'error';
  message?: string;
  fileName?: string;
}

interface ScholarshipStatus {
  status: 'idle' | 'processing' | 'success' | 'error';
  message?: string;
  metadata?: {
    name: string;
    amount?: string;
    deadline?: string;
  };
}

export default function AdminPage() {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({ status: 'idle' });
  const [isDragging, setIsDragging] = useState(false);
  const [scholarshipText, setScholarshipText] = useState('');
  const [scholarshipStatus, setScholarshipStatus] = useState<ScholarshipStatus>({ status: 'idle' });
  const [selectedCollege, setSelectedCollege] = useState('');
  const [scholarshipUrl, setScholarshipUrl] = useState('');
  const [studentType, setStudentType] = useState<'first-year' | 'transfer' | 'both'>('both');

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processPDFWithGemini = async (file: File): Promise<any> => {
    // Convert PDF to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    
    const response = await fetch('/api/gemini/parse-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: base64,
        fileName: file.name,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Failed to process PDF');
    }

    return data;
  };


  const handleFileUpload = async (file: File) => {
    if (!file.type.includes('pdf')) {
      setUploadStatus({
        status: 'error',
        message: 'Please upload a PDF file only.',
        fileName: file.name
      });
      return;
    }

    setUploadStatus({
      status: 'uploading',
      message: 'Uploading file...',
      fileName: file.name
    });

    try {
      setUploadStatus({
        status: 'processing',
        message: 'Processing PDF with Gemini AI and storing in Firestore...',
        fileName: file.name
      });

      const result = await processPDFWithGemini(file);

      setUploadStatus({
        status: 'success',
        message: `Successfully processed and stored! Document ID: ${result.docId}`,
        fileName: file.name
      });

    } catch (error) {
      setUploadStatus({
        status: 'error',
        message: error instanceof Error ? error.message : 'An unknown error occurred',
        fileName: file.name
      });
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, []);

  const clearStatus = useCallback(() => {
    setUploadStatus({ status: 'idle' });
  }, []);

  const handleClearStatus = () => {
    clearStatus();
  };

  const handleScholarshipSubmit = async () => {
    if (!scholarshipText.trim() || scholarshipText.trim().length < 10) {
      setScholarshipStatus({
        status: 'error',
        message: 'Please enter at least 10 characters of scholarship information.',
      });
      return;
    }

    if (!selectedCollege) {
      setScholarshipStatus({
        status: 'error',
        message: 'Please select a college for this scholarship.',
      });
      return;
    }

    setScholarshipStatus({ status: 'processing', message: 'Generating embeddings and extracting metadata...' });

    const college = collegeList.find(c => c.value === selectedCollege);

    try {
      const response = await fetch('/api/scholarships/embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: scholarshipText,
          collegeId: selectedCollege,
          collegeName: college?.label || selectedCollege,
          sourceUrl: scholarshipUrl || null,
          studentType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to process scholarship');
      }

      setScholarshipStatus({
        status: 'success',
        message: `Saved! Doc ID: ${data.docId}${data.embeddingAvailable ? ` | Embedding: ${data.embeddingDimension} dimensions` : ' (no embedding)'}`,
        metadata: data.metadata,
      });
      setScholarshipText('');
      setScholarshipUrl('');
    } catch (err) {
      setScholarshipStatus({
        status: 'error',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  };

  const clearScholarshipStatus = () => {
    setScholarshipStatus({ status: 'idle' });
  };

  const getStatusIcon = () => {
    switch (uploadStatus.status) {
      case 'uploading':
      case 'processing':
        return <Loader2 className="w-5 h-5 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Upload className="w-5 h-5" />;
    }
  };

  const getStatusColor = () => {
    switch (uploadStatus.status) {
      case 'success':
        return 'border-green-500 bg-green-50';
      case 'error':
        return 'border-red-500 bg-red-50';
      case 'uploading':
      case 'processing':
        return 'border-blue-500 bg-blue-50';
      default:
        return isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Upload college datasets and scholarship information</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Upload PDF Document</h2>
            <p className="text-gray-600 mb-6">
              Upload PDF files containing college datasets or scholarship information. 
              The documents will be processed using Gemini AI and stored in Firestore.
            </p>
          </div>

          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${getStatusColor()}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploadStatus.status === 'uploading' || uploadStatus.status === 'processing'}
            />
            
            <div className="flex flex-col items-center space-y-4">
              {getStatusIcon()}
              <div>
                <p className="text-lg font-medium text-gray-700">
                  {uploadStatus.status === 'idle' ? 'Drop PDF here or click to browse' : uploadStatus.fileName}
                </p>
                {uploadStatus.message && (
                  <p className="text-sm text-gray-500 mt-2">{uploadStatus.message}</p>
                )}
              </div>
              {uploadStatus.status === 'idle' && (
                <p className="text-sm text-gray-400">PDF files only, max 10MB</p>
              )}
            </div>
          </div>

          {uploadStatus.status === 'success' && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800">{uploadStatus.message}</p>
            </div>
          )}

          {uploadStatus.status === 'error' && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{uploadStatus.message}</p>
            </div>
          )}

          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Uploads</h3>
            <button
              onClick={handleClearStatus}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              <span>Clear Status</span>
            </button>
          </div>
        </div>

        {/* Scholarship Section */}
        <div className="bg-white rounded-lg shadow-md p-8 mt-8">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-6 h-6 text-purple-600" />
              <h2 className="text-xl font-semibold text-gray-800">Add Scholarship</h2>
            </div>
            <p className="text-gray-600 mb-2">
              Paste unstructured scholarship information below. The system will:
            </p>
            <ul className="text-sm text-gray-500 list-disc list-inside mb-4">
              <li>Generate vector embeddings for semantic search</li>
              <li>Extract metadata (name, amount, deadline, eligibility)</li>
              <li>Store in Firestore with vector indexing</li>
            </ul>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">College *</label>
              <select
                value={selectedCollege}
                onChange={(e) => setSelectedCollege(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                disabled={scholarshipStatus.status === 'processing'}
              >
                <option value="">Select a college...</option>
                {collegeList.map((college) => (
                  <option key={college.value} value={college.value}>
                    {college.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Student Type</label>
              <select
                value={studentType}
                onChange={(e) => setStudentType(e.target.value as 'first-year' | 'transfer' | 'both')}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                disabled={scholarshipStatus.status === 'processing'}
              >
                <option value="both">Both (First-year & Transfer)</option>
                <option value="first-year">First-year only</option>
                <option value="transfer">Transfer only</option>
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <span className="flex items-center gap-1">
                <LinkIcon className="w-4 h-4" />
                Source URL (optional)
              </span>
            </label>
            <input
              type="url"
              value={scholarshipUrl}
              onChange={(e) => setScholarshipUrl(e.target.value)}
              placeholder="https://admit.washington.edu/costs/scholarships/"
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              disabled={scholarshipStatus.status === 'processing'}
            />
          </div>

          <textarea
            value={scholarshipText}
            onChange={(e) => setScholarshipText(e.target.value)}
            placeholder="Paste scholarship information here...

Example:
Presidential Scholar
The Presidential Scholarship is a $10,000 award given to selected Washington residents who show exceptional leadership, community engagement and promise. It is renewable for up to four years. Washington residents are considered automatically with their application to the UW."
            className="w-full h-48 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm"
            disabled={scholarshipStatus.status === 'processing'}
          />

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {scholarshipText.length} characters
            </div>
            <div className="flex gap-2">
              {scholarshipStatus.status !== 'idle' && (
                <button
                  onClick={clearScholarshipStatus}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Clear
                </button>
              )}
              <button
                onClick={handleScholarshipSubmit}
                disabled={scholarshipStatus.status === 'processing' || scholarshipText.trim().length < 10}
                className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {scholarshipStatus.status === 'processing' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Generate Embeddings & Save
                  </>
                )}
              </button>
            </div>
          </div>

          {scholarshipStatus.status === 'success' && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-medium">{scholarshipStatus.message}</p>
              {scholarshipStatus.metadata && (
                <div className="mt-2 text-sm text-green-700">
                  <p><strong>Extracted:</strong> {scholarshipStatus.metadata.name}</p>
                  {scholarshipStatus.metadata.amount && <p>Amount: {scholarshipStatus.metadata.amount}</p>}
                  {scholarshipStatus.metadata.deadline && <p>Deadline: {scholarshipStatus.metadata.deadline}</p>}
                </div>
              )}
            </div>
          )}

          {scholarshipStatus.status === 'error' && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{scholarshipStatus.message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
