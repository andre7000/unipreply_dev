import React, { useState, useCallback, useEffect } from 'react';
import { Upload, Loader2, CheckCircle, AlertCircle, RefreshCw, FileText, Link as LinkIcon, Database } from 'lucide-react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/config/firebaseConfig';
import { colleges as collegeList } from '@/data/dataSource';

interface UploadedDataset {
  id: string;
  institution: string;
  cdsYear: string;
}

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
  const [studentType, setStudentType] = useState<'first-year' | 'transfer' | 'both'>('first-year');
  const [uploadedDatasets, setUploadedDatasets] = useState<UploadedDataset[]>([]);
  const [datasetsLoading, setDatasetsLoading] = useState(true);
  const [datasetSearch, setDatasetSearch] = useState('');

  const fetchUploadedDatasets = useCallback(async () => {
    setDatasetsLoading(true);
    try {
      const q = query(collection(db, 'collegeDatasets'));
      const snapshot = await getDocs(q);
      const datasets: UploadedDataset[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const rawYear = data.Common_Data_Set || 'Unknown';
        datasets.push({
          id: doc.id,
          institution: data.Institution || data.A_General_Information?.A1_Address_Information?.Name || doc.id,
          cdsYear: rawYear.replace(/Common Data Set\s*/i, '').trim(),
        });
      });
      datasets.sort((a, b) => a.institution.localeCompare(b.institution));
      setUploadedDatasets(datasets);
    } catch (err) {
      console.error('Error fetching datasets:', err);
    } finally {
      setDatasetsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUploadedDatasets();
  }, [fetchUploadedDatasets]);

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
      
      fetchUploadedDatasets();

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
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Upload college datasets and scholarship information</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: PDF Upload */}
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Upload PDF Document</h2>
                <p className="text-gray-600 mb-6">
                  Upload PDF files containing college datasets. 
                  Processed using Gemini AI and stored in Firestore.
                </p>
              </div>

              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${getStatusColor()}`}
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
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 text-sm">{uploadStatus.message}</p>
                </div>
              )}

              {uploadStatus.status === 'error' && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm">{uploadStatus.message}</p>
                </div>
              )}

              <div className="flex justify-end mt-4">
                <button
                  onClick={handleClearStatus}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Clear Status</span>
                </button>
              </div>
            </div>

            {/* Right: Uploaded Datasets List */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-600" />
                  <h2 className="text-xl font-semibold text-gray-800">Uploaded CDS Data</h2>
                </div>
                <button
                  onClick={fetchUploadedDatasets}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Refresh list"
                >
                  <RefreshCw className={`w-4 h-4 ${datasetsLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              
              <div className="relative mb-3">
                <input
                  type="text"
                  value={datasetSearch}
                  onChange={(e) => setDatasetSearch(e.target.value)}
                  placeholder="Search universities..."
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <svg className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              
              <p className="text-gray-600 text-sm mb-2">
                {datasetSearch 
                  ? `${uploadedDatasets.filter(d => d.institution.toLowerCase().includes(datasetSearch.toLowerCase())).length} of ${uploadedDatasets.length} universities`
                  : `${uploadedDatasets.length} universities in Firestore`
                }
              </p>
              
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-[320px] overflow-y-auto">
                  {datasetsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                      <span className="ml-2 text-gray-500 text-sm">Loading...</span>
                    </div>
                  ) : uploadedDatasets.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      No datasets uploaded yet
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left py-2 px-3 font-medium text-gray-700">University</th>
                          <th className="text-left py-2 px-3 font-medium text-gray-700 w-28">CDS Year</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {uploadedDatasets
                          .filter((d) => d.institution.toLowerCase().includes(datasetSearch.toLowerCase()))
                          .map((dataset) => (
                          <tr key={dataset.id} className="hover:bg-gray-50">
                            <td className="py-2 px-3 text-gray-800">{dataset.institution}</td>
                            <td className="py-2 px-3 text-gray-600">{dataset.cdsYear}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
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
