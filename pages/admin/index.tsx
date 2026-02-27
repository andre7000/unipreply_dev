import React, { useState, useCallback } from 'react';
import { Upload, Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface UploadStatus {
  status: 'idle' | 'uploading' | 'processing' | 'success' | 'error';
  message?: string;
  fileName?: string;
}

export default function AdminPage() {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({ status: 'idle' });
  const [isDragging, setIsDragging] = useState(false);

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
      </div>
    </div>
  );
}
