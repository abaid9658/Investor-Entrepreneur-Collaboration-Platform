import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import {
  Upload, FileText, X, Download, Eye, Trash2,
  PenTool, RotateCcw, Check, Shield, Lock
} from 'lucide-react';
import {
  getMyDocuments,
  uploadDocument,
  deleteDocument,
  signDocument,
  getDocumentVersions,
} from '../../api/services/documentService';
import toast from 'react-hot-toast';

type DrawingMode = 'draw' | 'text' | 'none';

export const DocumentVaultPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [showSignModal, setShowSignModal] = useState(false);
  const [signingDoc, setSigningDoc] = useState<any>(null);
  const [drawMode, setDrawMode] = useState<DrawingMode>('none');
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureText, setSignatureText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const { data: docsData } = useQuery({
    queryKey: ['documents'],
    queryFn: getMyDocuments,
  });

  const documents = docsData?.data || [];

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => uploadDocument(formData),
    onSuccess: () => {
      toast.success('Document uploaded to vault!');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Upload failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      toast.success('Document removed');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  const signMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => signDocument(id, payload),
    onSuccess: () => {
      toast.success('Document signed and sealed!');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setShowSignModal(false);
      setSigningDoc(null);
      clearCanvas();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Signing failed'),
  });

  // -- Canvas Drawing Logic --
  const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (drawMode !== 'draw') return;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    lastPos.current = getPos(e.nativeEvent as MouseEvent | TouchEvent, canvas);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || drawMode !== 'draw') return;
    const canvas = canvasRef.current;
    if (!canvas || !lastPos.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e.nativeEvent as MouseEvent | TouchEvent, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#1e1b4b';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    lastPos.current = pos;
  };

  const stopDraw = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureText('');
  };

  const renderTextSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !signatureText) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'italic 48px "Dancing Script", cursive, serif';
    ctx.fillStyle = '#1e1b4b';
    ctx.textAlign = 'center';
    ctx.fillText(signatureText, canvas.width / 2, canvas.height / 2 + 20);
  }, [signatureText]);

  useEffect(() => {
    if (drawMode === 'text') renderTextSignature();
  }, [signatureText, drawMode, renderTextSignature]);

  const handleSign = () => {
    const canvas = canvasRef.current;
    if (!canvas || !signingDoc) return;
    const signatureDataURL = canvas.toDataURL('image/png');
    // Check canvas isn't blank
    const ctx = canvas.getContext('2d');
    const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
    const hasContent = imageData?.data.some(v => v !== 0);
    if (!hasContent) { toast.error('Please draw or type your signature first'); return; }
    signMutation.mutate({
      id: signingDoc._id,
      payload: { signatureImage: signatureDataURL, signerNote: 'Signed via Nexus Vault' },
    });
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    Array.from(files).forEach(file => {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('title', file.name.replace(/\.[^.]+$/, ''));
      uploadMutation.mutate(formData);
    });
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType?.includes('pdf')) return '📄';
    if (mimeType?.includes('image')) return '🖼️';
    if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) return '📊';
    if (mimeType?.includes('word')) return '📝';
    return '📎';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Document Vault</h1>
          <p className="text-gray-500 text-sm mt-1">Securely store, sign and manage your documents</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 border border-green-200 px-3 py-2 rounded-xl">
          <Shield size={14} />
          <span>AES-256 Encrypted</span>
        </div>
      </div>

      {/* Upload Dropzone */}
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-purple-500 bg-purple-50'
            : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          hidden
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
          onChange={e => handleFileUpload(e.target.files)}
        />
        <Upload className="mx-auto text-purple-400 mb-3" size={40} />
        <p className="text-gray-700 font-semibold text-lg">
          {uploadMutation.isPending ? 'Uploading...' : 'Drop files here or click to upload'}
        </p>
        <p className="text-gray-400 text-sm mt-1">PDF, Word, Excel, Images — Max 25MB each</p>
      </div>

      {/* Documents Grid */}
      {documents.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No documents yet</p>
          <p className="text-sm">Upload your first document to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc: any) => (
            <div key={doc._id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{getFileIcon(doc.mimeType)}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm leading-tight">{doc.title}</h3>
                    <p className="text-gray-400 text-xs mt-0.5">
                      {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : '—'} · {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {doc.isSigned && (
                    <span className="text-green-500" title="Signed">
                      <Check size={14} />
                    </span>
                  )}
                  {doc.isEncrypted && (
                    <span className="text-blue-500" title="Encrypted">
                      <Lock size={14} />
                    </span>
                  )}
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2 mb-4">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  doc.isSigned ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {doc.isSigned ? 'Signed' : 'Unsigned'}
                </span>
                {doc.status && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 capitalize">
                    {doc.status}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {doc.mimeType?.includes('pdf') && (
                  <button
                    onClick={() => setPreviewDoc(doc)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-purple-50 hover:bg-purple-100 text-purple-600 py-2 rounded-lg transition-colors font-medium"
                  >
                    <Eye size={13} /> Preview
                  </button>
                )}
                {!doc.isSigned && (
                  <button
                    onClick={() => { setSigningDoc(doc); setShowSignModal(true); clearCanvas(); setDrawMode('draw'); }}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 py-2 rounded-lg transition-colors font-medium"
                  >
                    <PenTool size={13} /> Sign
                  </button>
                )}
                {doc.fileUrl && (
                  <a
                    href={doc.fileUrl}
                    download={doc.title}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center p-2 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-lg transition-colors"
                  >
                    <Download size={13} />
                  </a>
                )}
                <button
                  onClick={() => deleteMutation.mutate(doc._id)}
                  className="flex items-center justify-center p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PDF Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-purple-500" />
                <h3 className="font-semibold text-gray-900">{previewDoc.title}</h3>
              </div>
              <button onClick={() => setPreviewDoc(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden rounded-b-2xl">
              <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                <Viewer fileUrl={previewDoc.fileUrl} />
              </Worker>
            </div>
          </div>
        </div>
      )}

      {/* E-Signature Modal */}
      {showSignModal && signingDoc && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <PenTool size={18} className="text-purple-500" />
                <h2 className="text-xl font-bold text-gray-900">E-Signature</h2>
              </div>
              <button onClick={() => { setShowSignModal(false); setSigningDoc(null); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <p className="text-gray-600 text-sm">Signing: <span className="font-semibold text-gray-900">{signingDoc.title}</span></p>

              {/* Mode Toggle */}
              <div className="flex bg-gray-100 rounded-xl p-1">
                {(['draw', 'text'] as DrawingMode[]).map(mode => (
                  <button
                    key={mode}
                    onClick={() => { setDrawMode(mode); clearCanvas(); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                      drawMode === mode ? 'bg-white shadow-sm text-purple-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {mode === 'draw' ? '✍️ Draw' : '🖊️ Type'}
                  </button>
                ))}
              </div>

              {/* Signature Canvas */}
              <div className="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
                <canvas
                  ref={canvasRef}
                  width={460}
                  height={180}
                  className="w-full rounded-xl cursor-crosshair touch-none"
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={stopDraw}
                  onMouseLeave={stopDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={stopDraw}
                />
              </div>

              {drawMode === 'text' && (
                <input
                  type="text"
                  placeholder="Type your full name..."
                  value={signatureText}
                  onChange={e => setSignatureText(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 text-sm"
                />
              )}

              <div className="flex items-center gap-2 text-xs text-gray-500 bg-blue-50 p-3 rounded-xl">
                <Shield size={14} className="text-blue-500 flex-shrink-0" />
                This signature is legally binding. By signing, you confirm you have read and agree to the document contents.
              </div>

              <div className="flex gap-3">
                <button
                  onClick={clearCanvas}
                  className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  <RotateCcw size={14} /> Clear
                </button>
                <button
                  id="confirm-sign-btn"
                  onClick={handleSign}
                  disabled={signMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-xl transition-colors text-sm font-semibold disabled:opacity-50"
                >
                  {signMutation.isPending ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <PenTool size={14} /> Apply Signature
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
