import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface GeneratePDFOptions {
  requestId: string;
  letterType?: 'internal' | 'official';
  onProgress?: (status: string) => void;
}

export interface GeneratePDFResult {
  success: boolean;
  pdfUrl?: string;
  error?: string;
}

/**
 * Generate PDF letter using backend Edge Function
 * This ensures compatibility across all devices including Android PWA
 */
export async function generatePDFLetter(
  options: GeneratePDFOptions
): Promise<GeneratePDFResult> {
  const { requestId, letterType = 'internal', onProgress } = options;

  try {
    onProgress?.('Memulai generate PDF...');

    const { data, error } = await supabase.functions.invoke('generate-borrow-letter', {
      body: { requestId, letterType }
    });

    if (error) {
      console.error('[pdfService] Edge function error:', error);
      throw new Error(error.message || 'Gagal generate PDF');
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Generate PDF gagal');
    }

    onProgress?.('PDF berhasil dibuat!');
    return {
      success: true,
      pdfUrl: data.pdfUrl
    };

  } catch (error) {
    console.error('[pdfService] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan';
    
    onProgress?.(`Error: ${errorMessage}`);
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Download PDF from URL with proper Android PWA support
 */
export async function downloadPDF(url: string, filename: string): Promise<boolean> {
  try {
    // For Android PWA, we need to handle download differently
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isPWA = window.matchMedia('(display-mode: standalone)').matches;

    if (isAndroid && isPWA) {
      // Android PWA: Open in new tab to trigger download
      window.open(url, '_blank');
      toast.success('PDF dibuka di tab baru');
      return true;
    }

    // Desktop/iOS: Use standard download approach
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    window.URL.revokeObjectURL(blobUrl);
    toast.success('PDF berhasil diunduh');
    return true;

  } catch (error) {
    console.error('[pdfService] Download error:', error);
    toast.error('Gagal mengunduh PDF');
    return false;
  }
}

/**
 * Preview PDF with proper mobile support
 */
export function previewPDF(url: string): void {
  // Open in new tab for maximum compatibility
  window.open(url, '_blank');
}

/**
 * Share PDF using native share API (mobile-friendly)
 */
export async function sharePDF(url: string, title: string): Promise<boolean> {
  try {
    if (navigator.share) {
      await navigator.share({
        title,
        text: `Surat Peminjaman - ${title}`,
        url
      });
      return true;
    } else {
      // Fallback: Copy link to clipboard
      await navigator.clipboard.writeText(url);
      toast.success('Link PDF disalin ke clipboard');
      return true;
    }
  } catch (error) {
    console.error('[pdfService] Share error:', error);
    toast.error('Gagal berbagi PDF');
    return false;
  }
}
