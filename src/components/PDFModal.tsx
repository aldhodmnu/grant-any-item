import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import { BorrowLetter } from "@/components/PDF/BorrowLetter";
import { Download, X } from "lucide-react";

interface PDFModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  data: any;
  fileName: string;
}

export function PDFModal({ open, onOpenChange, title, description, data, fileName }: PDFModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] md:max-w-4xl lg:max-w-6xl h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-lg md:text-xl">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-sm">{description}</DialogDescription>
          )}
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden px-6 pb-6">
          <div className="h-full border rounded-lg overflow-hidden bg-gray-50">
            <PDFViewer 
              style={{ width: '100%', height: '100%', border: 'none' }} 
              showToolbar={false}
            >
              <BorrowLetter data={data} />
            </PDFViewer>
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3 justify-end border-t pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="neu-button"
          >
            <X className="h-4 w-4 mr-2" />
            Tutup
          </Button>
          <PDFDownloadLink
            document={<BorrowLetter data={data} />}
            fileName={fileName}
          >
            {({ loading }) => (
              <Button
                disabled={loading}
                className="neu-button bg-primary text-primary-foreground"
              >
                <Download className="h-4 w-4 mr-2" />
                {loading ? 'Mempersiapkan...' : 'Download PDF'}
              </Button>
            )}
          </PDFDownloadLink>
        </div>
      </DialogContent>
    </Dialog>
  );
}
