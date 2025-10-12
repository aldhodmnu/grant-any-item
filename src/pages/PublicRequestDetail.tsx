import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  User, 
  Phone, 
  FileText, 
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Home,
  Download,
  Printer,
  X
} from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PublicRequestDetail {
  id: string;
  status: string;
  purpose: string;
  start_date: string;
  end_date: string;
  location_usage: string;
  pic_name: string;
  pic_contact: string;
  letter_number: string;
  created_at: string;
  borrower: {
    full_name: string;
    unit: string;
    phone: string;
  };
  request_items: {
    id: string;
    quantity: number;
    items: {
      id: string;
      name: string;
      code: string;
      image_url: string;
      description: string | null;
      departments: {
        name: string;
      };
    };
  }[];
}

export default function PublicRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [request, setRequest] = useState<PublicRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLetterPreview, setShowLetterPreview] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchRequestDetail = async () => {
      try {
        const { data, error } = await supabase
          .from("borrow_requests")
          .select(`
            id,
            status,
            purpose,
            start_date,
            end_date,
            location_usage,
            pic_name,
            pic_contact,
            letter_number,
            created_at,
            request_items(
              id,
              quantity,
              items(
                id,
                name,
                code,
                image_url,
                description,
                departments(name)
              )
            ),
            borrower:profiles!borrow_requests_borrower_id_fkey(full_name, unit, phone)
          `)
          .eq("id", id)
          .single();

        if (error) throw error;
        if (isMounted) {
          setRequest(data as PublicRequestDetail);
        }
      } catch (error) {
        console.error("Error fetching request:", error);
        if (isMounted) {
          toast.error("Gagal memuat detail permintaan");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (id) {
      fetchRequestDetail();
    }
    
    return () => {
      isMounted = false;
    };
  }, [id]);

  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { label: string; color: string; icon: typeof FileText }> = {
      draft: { label: "Draft", color: "bg-gray-100 text-gray-700", icon: FileText },
      pending_owner: { label: "Menunggu Owner", color: "bg-yellow-100 text-yellow-700", icon: Clock },
      pending_headmaster: { label: "Menunggu Kepsek", color: "bg-blue-100 text-blue-700", icon: Clock },
      approved: { label: "Disetujui", color: "bg-green-100 text-green-700", icon: CheckCircle },
      active: { label: "Sedang Dipinjam", color: "bg-blue-100 text-blue-700", icon: Package },
      completed: { label: "Selesai", color: "bg-green-100 text-green-700", icon: CheckCircle },
      rejected: { label: "Ditolak", color: "bg-red-100 text-red-700", icon: XCircle },
    };
    return statusMap[status] || { label: status, color: "bg-gray-100 text-gray-700", icon: AlertCircle };
  };

  const handleDownloadLetter = async () => {
    if (!request) return;
    
    try {
      setLoadingPdf(true);
      // Fetch PDF from verify endpoint
      const response = await fetch(`/verify/${request.id}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch PDF');
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Surat-Peminjaman-${request.letter_number || request.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("Surat berhasil didownload");
    } catch (error) {
      console.error('Error downloading letter:', error);
      toast.error("Gagal mendownload surat. Pastikan surat sudah dibuat.");
    } finally {
      setLoadingPdf(false);
    }
  };

  const handlePrintLetter = async () => {
    if (!request) return;
    
    try {
      setLoadingPdf(true);
      // Fetch PDF from verify endpoint
      const response = await fetch(`/verify/${request.id}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch PDF');
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      
      toast.success("Surat dibuka untuk print");
    } catch (error) {
      console.error('Error printing letter:', error);
      toast.error("Gagal membuka surat untuk print. Pastikan surat sudah dibuat.");
    } finally {
      setLoadingPdf(false);
    }
  };

  const loadPdfPreview = useCallback(async () => {
    if (!request || pdfUrl) return;
    
    try {
      setLoadingPdf(true);
      // Fetch PDF from verify endpoint
      const response = await fetch(`/verify/${request.id}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch PDF');
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (error) {
      console.error('Error loading PDF preview:', error);
      toast.error("Gagal memuat preview surat. Pastikan surat sudah dibuat.");
    } finally {
      setLoadingPdf(false);
    }
  }, [request, pdfUrl]);

  // Load PDF when preview is opened
  useEffect(() => {
    if (showLetterPreview && !pdfUrl) {
      loadPdfPreview();
    }
  }, [showLetterPreview, pdfUrl, loadPdfPreview]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
        <div className="neu-raised p-8 text-center">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Memuat detail permintaan...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
        <div className="neu-raised p-8 text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Permintaan Tidak Ditemukan</h1>
          <p className="text-gray-600 mb-6">Data permintaan yang Anda cari tidak tersedia.</p>
          <div className="space-y-3">
            <Button onClick={() => navigate("/realtime")} className="neu-button-raised w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali ke Realtime
            </Button>
            <Button onClick={() => navigate("/")} variant="outline" className="neu-button-raised w-full">
              <Home className="w-4 h-4 mr-2" />
              Beranda
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(request.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
      {/* Header dengan Neumorphism - Mobile Optimized */}
      <div className="neu-raised sticky top-0 z-50 mx-4 sm:mx-6 mt-4 sm:mt-6 mb-6 sm:mb-8">
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-0 sm:justify-between">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <Button 
                variant="ghost" 
                size="lg" 
                onClick={() => navigate("/realtime")}
                className="neu-button-raised bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 sm:px-6 sm:py-3"
              >
                <ArrowLeft className="w-5 h-5 sm:mr-2" />
                <span className="hidden sm:inline text-base">Kembali</span>
              </Button>
              <div className="flex-1">
                <h1 className="text-lg sm:text-xl font-bold text-gray-800">Detail Peminjaman</h1>
                <div className="flex items-center gap-3 mt-2">
                  <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                  <p className="text-sm sm:text-base text-gray-600">Mode Tampilan Publik</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              {request.letter_number && (
                <Button 
                  onClick={() => setShowLetterPreview(true)}
                  size="lg"
                  className="neu-button-raised bg-blue-500 hover:bg-blue-600 text-white flex-1 sm:flex-none px-5 py-3"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  <span className="text-sm sm:text-base">Lihat Surat</span>
                </Button>
              )}
              <Badge className={`${statusInfo.color} neu-flat border-0 text-sm sm:text-base px-3 py-2`}>
                <StatusIcon className="w-4 h-4 mr-2" />
                {statusInfo.label}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Content dengan Container Neumorphism - Mobile Optimized */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6 sm:space-y-8 pb-8 sm:pb-12">
        
        {/* Informasi Peminjam */}
        <div className="neu-raised p-6 sm:p-8">
          <div className="flex items-center gap-4 mb-6 sm:mb-8">
            <div className="neu-sunken w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center">
              <User className="h-6 w-6 sm:h-7 sm:w-7 text-green-600" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Informasi Peminjam</h2>
          </div>
          <div className="space-y-6">
            <div className="flex items-start gap-4 sm:gap-6">
              <div className="neu-flat w-16 h-16 sm:w-18 sm:h-18 flex items-center justify-center bg-green-50 flex-shrink-0">
                <User className="h-8 w-8 sm:h-9 sm:w-9 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 mb-2 text-lg sm:text-xl break-words">{request.borrower?.full_name}</p>
                <p className="text-gray-600 font-medium text-base sm:text-lg break-words">{request.borrower?.unit}</p>
                {request.borrower?.phone && (
                  <p className="text-gray-600 flex items-center gap-3 mt-3 text-base sm:text-lg">
                    <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                    <span className="break-words">{request.borrower.phone}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="neu-sunken p-5 sm:p-6 mt-6 sm:mt-8">
              <div className="grid grid-cols-1 gap-6 sm:gap-8">
                <div className="flex items-start gap-4 sm:gap-6">
                  <div className="neu-flat w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center bg-blue-50 flex-shrink-0">
                    <Calendar className="h-6 w-6 sm:h-7 sm:w-7 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 mb-2 text-base sm:text-lg">Periode Peminjaman</p>
                    <p className="text-gray-700 leading-relaxed text-base sm:text-lg break-words">
                      {format(new Date(request.start_date), "dd MMM yyyy", { locale: idLocale })} - {format(new Date(request.end_date), "dd MMM yyyy", { locale: idLocale })}
                    </p>
                  </div>
                </div>

                {request.location_usage && (
                  <div className="flex items-start gap-4 sm:gap-6">
                    <div className="neu-flat w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center bg-orange-50 flex-shrink-0">
                      <MapPin className="h-6 w-6 sm:h-7 sm:w-7 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 mb-2 text-base sm:text-lg">Lokasi Penggunaan</p>
                      <p className="text-gray-700 leading-relaxed text-base sm:text-lg break-words">{request.location_usage}</p>
                    </div>
                  </div>
                )}

                {request.purpose && (
                  <div className="flex items-start gap-4 sm:gap-6">
                    <div className="neu-flat w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center bg-purple-50 flex-shrink-0">
                      <FileText className="h-6 w-6 sm:h-7 sm:w-7 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 mb-2 text-base sm:text-lg">Keperluan/Alasan</p>
                      <p className="text-gray-700 leading-relaxed text-base sm:text-lg break-words">{request.purpose}</p>
                    </div>
                  </div>
                )}

                {request.pic_name && (
                  <div className="flex items-start gap-4 sm:gap-6">
                    <div className="neu-flat w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center bg-indigo-50 flex-shrink-0">
                      <User className="h-6 w-6 sm:h-7 sm:w-7 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 mb-2 text-base sm:text-lg">Penanggung Jawab</p>
                      <p className="text-gray-700 text-base sm:text-lg break-words">{request.pic_name}</p>
                      {request.pic_contact && (
                        <p className="text-gray-600 flex items-center gap-3 mt-3 text-base sm:text-lg">
                          <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600 flex-shrink-0" />
                          <span className="break-words">{request.pic_contact}</span>
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Daftar Alat - Mobile Optimized */}
        <div className="neu-raised p-6 sm:p-8">
          <div className="flex items-center gap-4 mb-6 sm:mb-8">
            <div className="neu-sunken w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center">
              <Package className="h-6 w-6 sm:h-7 sm:w-7 text-green-600" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Daftar Alat yang Dipinjam</h2>
          </div>
          <div className="space-y-5 sm:space-y-6">
            {request.request_items?.map((item) => (
              <div key={item.id} className="neu-flat p-5 sm:p-6 bg-white">
                <div className="flex items-start gap-4 sm:gap-6">
                  {item.items?.image_url ? (
                    <img 
                      src={item.items.image_url} 
                      alt={item.items?.name}
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg object-cover neu-sunken flex-shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 neu-sunken flex items-center justify-center flex-shrink-0">
                      <Package className="h-8 w-8 sm:h-10 sm:w-10 text-gray-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-6">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 text-lg sm:text-xl leading-snug break-words mb-2">
                          {item.items?.name}
                        </h4>
                        {item.items?.code && (
                          <p className="text-sm sm:text-base text-gray-500 font-mono mt-2 bg-gray-100 px-3 py-2 rounded inline-block break-all">
                            {item.items.code}
                          </p>
                        )}
                        {item.items?.departments?.name && (
                          <Badge variant="outline" className="mt-3 neu-flat border-0 bg-green-50 text-green-700 text-sm px-3 py-1">
                            {item.items.departments.name}
                          </Badge>
                        )}
                        {item.items?.description && (
                          <p className="text-gray-600 mt-4 leading-relaxed text-base sm:text-lg break-words">
                            {item.items.description}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0 self-start">
                        <div className="neu-sunken bg-green-50 px-4 py-3 sm:px-5 sm:py-3">
                          <span className="text-lg sm:text-xl font-bold text-green-700">
                            {item.quantity}x
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Informasi Surat - Mobile Optimized */}
        {request.letter_number && (
          <div className="neu-raised p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-6 sm:mb-8">
              <div className="neu-sunken w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center">
                <FileText className="h-6 w-6 sm:h-7 sm:w-7 text-green-600" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Informasi Surat</h2>
            </div>
            <div className="neu-flat p-6 sm:p-8 bg-green-50">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <div className="neu-sunken w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center bg-green-100 flex-shrink-0">
                  <FileText className="h-8 w-8 sm:h-10 sm:w-10 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 mb-3 text-lg sm:text-xl">Nomor Surat Peminjaman</p>
                  <div className="neu-sunken bg-white px-4 py-3 sm:px-6 sm:py-4">
                    <p className="font-mono text-green-700 font-bold text-base sm:text-xl break-all">
                      {request.letter_number}
                    </p>
                  </div>
                </div>
                <div className="flex flex-row sm:flex-col gap-3 w-full sm:w-auto">
                  <Button
                    onClick={handlePrintLetter}
                    size="lg"
                    disabled={loadingPdf}
                    className="neu-button-raised bg-blue-500 hover:bg-blue-600 text-white flex-1 sm:flex-none px-6 py-3"
                  >
                    <Printer className="w-5 h-5 sm:mr-2" />
                    <span className="text-sm sm:text-base">Print</span>
                  </Button>
                  <Button
                    onClick={handleDownloadLetter}
                    size="lg"
                    disabled={loadingPdf}
                    className="neu-button-raised bg-green-500 hover:bg-green-600 text-white flex-1 sm:flex-none px-6 py-3"
                  >
                    <Download className="w-5 h-5 sm:mr-2" />
                    <span className="text-sm sm:text-base">Download</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Info - Mobile Optimized */}
        <div className="text-center py-6 sm:py-8">
          <div className="neu-flat inline-flex items-center gap-3 px-6 py-3 sm:px-8 sm:py-4 bg-blue-50 text-blue-700 font-medium mb-4 sm:mb-6 text-base sm:text-lg">
            <Eye className="w-5 h-5 sm:w-6 sm:h-6" />
            Mode Tampilan Publik
          </div>
          <p className="text-gray-600 mb-3 text-base sm:text-lg px-6">
            Halaman ini menampilkan informasi publik peminjaman alat.
          </p>
          <p className="text-sm sm:text-base text-gray-400 mb-6 sm:mb-8 px-6">
            Diakses pada {format(new Date(), "dd MMM yyyy, HH:mm", { locale: idLocale })}
          </p>
          <Button 
            onClick={() => navigate("/realtime")} 
            size="lg"
            className="neu-button-raised bg-gray-100 hover:bg-gray-200 text-gray-700 mx-6 px-8 py-3"
          >
            <ArrowLeft className="w-5 h-5 mr-3" />
            Kembali ke Monitoring Realtime
          </Button>
        </div>
      </div>

      {/* Dialog Preview Surat dengan PDF Real */}
      <Dialog open={showLetterPreview} onOpenChange={setShowLetterPreview}>
        <DialogContent className="max-w-[96vw] sm:max-w-5xl max-h-[96vh] overflow-hidden neu-raised border-0 p-0">
          <DialogHeader className="p-5 sm:p-6 border-b bg-gray-50">
            <DialogTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <span className="flex items-center gap-3 text-lg sm:text-xl font-bold">
                <FileText className="w-6 h-6 text-green-600" />
                Preview Surat Peminjaman
              </span>
              <div className="flex gap-3 w-full sm:w-auto">
                <Button
                  onClick={handlePrintLetter}
                  size="lg"
                  disabled={loadingPdf}
                  className="neu-button-raised bg-blue-500 hover:bg-blue-600 text-white flex-1 sm:flex-none px-5 py-3"
                >
                  <Printer className="w-5 h-5 sm:mr-2" />
                  <span className="text-sm sm:text-base">Print</span>
                </Button>
                <Button
                  onClick={handleDownloadLetter}
                  size="lg"
                  disabled={loadingPdf}
                  className="neu-button-raised bg-green-500 hover:bg-green-600 text-white flex-1 sm:flex-none px-5 py-3"
                >
                  <Download className="w-5 h-5 sm:mr-2" />
                  <span className="text-sm sm:text-base">Download</span>
                </Button>
                <Button
                  onClick={() => setShowLetterPreview(false)}
                  size="lg"
                  variant="outline"
                  className="neu-button-raised flex-shrink-0 px-4 py-3"
                >
                  <X className="w-5 h-5 sm:mr-2" />
                  <span className="hidden sm:inline text-sm sm:text-base">Tutup</span>
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {loadingPdf ? (
              <div className="neu-sunken p-8 bg-white h-[50vh] sm:h-[70vh] flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                  <p className="text-gray-600 text-base sm:text-lg font-medium">Memuat preview surat...</p>
                  <p className="text-sm sm:text-base text-gray-400 mt-2">Harap tunggu sebentar</p>
                </div>
              </div>
            ) : pdfUrl ? (
              <iframe
                src={pdfUrl}
                className="w-full h-[50vh] sm:h-[70vh] neu-sunken"
                title="Preview Surat Peminjaman"
              />
            ) : (
              <div className="neu-sunken p-8 bg-white h-[50vh] sm:h-[70vh] flex items-center justify-center">
                <div className="text-center">
                  <FileText className="w-16 h-16 sm:w-20 sm:h-20 text-gray-400 mx-auto mb-6" />
                  <p className="text-gray-600 mb-4 text-base sm:text-lg font-medium">Gagal memuat preview surat</p>
                  <p className="text-sm sm:text-base text-gray-400 px-6">
                    Pastikan surat sudah dibuat. 
                    Gunakan tombol Print atau Download untuk melihat surat.
                  </p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}