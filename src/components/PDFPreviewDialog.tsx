import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share2, Loader2, ExternalLink } from "lucide-react";
import { downloadPDF, sharePDF } from "@/lib/pdfService";
import { useState } from "react";
import { toast } from "sonner";

interface PDFPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfUrl: string | null;
  title: string;
  isGenerating?: boolean;
}

export function PDFPreviewDialog({
  open,
  onOpenChange,
  pdfUrl,
  title,
  isGenerating = false
}: PDFPreviewDialogProps) {
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);

  const handleDownload = async () => {
    if (!pdfUrl) {
      toast.error('PDF belum tersedia');
      return;
    }

    setDownloading(true);
    const filename = `Surat_Peminjaman_${title.replace(/\s+/g, '_')}.pdf`;
    await downloadPDF(pdfUrl, filename);
    setDownloading(false);
  };

  const handleShare = async () => {
    if (!pdfUrl) {
      toast.error('PDF belum tersedia');
      return;
    }

    setSharing(true);
    await sharePDF(pdfUrl, title);
    setSharing(false);
  };

  const handleOpenInNewTab = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4">
          {isGenerating ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Sedang membuat PDF...</p>
            </div>
          ) : pdfUrl ? (
            <>
              {/* PDF Preview - Mobile optimized */}
              <div className="flex-1 bg-muted rounded-lg overflow-hidden">
                <iframe
                  src={pdfUrl}
                  className="w-full h-full border-0"
                  title="PDF Preview"
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Button
                  onClick={handleOpenInNewTab}
                  variant="outline"
                  className="w-full"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Buka Tab Baru
                </Button>

                <Button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="w-full"
                >
                  {downloading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Download
                </Button>

                <Button
                  onClick={handleShare}
                  disabled={sharing}
                  variant="secondary"
                  className="w-full"
                >
                  {sharing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Share2 className="h-4 w-4 mr-2" />
                  )}
                  Bagikan
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <p className="text-muted-foreground">PDF tidak tersedia</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
