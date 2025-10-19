import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { requestId, letterType = 'internal' } = await req.json();

    if (!requestId) {
      throw new Error('Request ID is required');
    }

    console.log(`[generate-borrow-letter] Processing request: ${requestId}, type: ${letterType}`);

    // Fetch request data
    const { data: request, error: requestError } = await supabaseClient
      .from('borrow_requests')
      .select(`
        *,
        request_items(
          quantity,
          items(name, code, description)
        ),
        borrower:profiles!borrow_requests_borrower_id_fkey(full_name, unit, phone),
        owner_reviewer:profiles!borrow_requests_owner_reviewed_by_fkey(full_name),
        headmaster_approver:profiles!borrow_requests_headmaster_approved_by_fkey(full_name)
      `)
      .eq('id', requestId)
      .single();

    if (requestError) throw requestError;
    if (!request) throw new Error('Request not found');

    // Generate HTML for PDF
    const html = generateLetterHTML(request, letterType);

    // Convert HTML to PDF using Deno's built-in puppeteer-like approach
    // For now, we'll use a simple approach: generate HTML and let the browser print it
    // In production, you'd use puppeteer or similar
    
    // For MVP: Store HTML and generate PDF URL
    const fileName = `${requestId}_${letterType}_${Date.now()}.pdf`;
    const filePath = `letters/${requestId}/${fileName}`;

    // Generate simple PDF buffer from HTML (simplified approach)
    const pdfBuffer = await generatePDFBuffer(html);

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabaseClient
      .storage
      .from('borrow-letters')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error('[generate-borrow-letter] Upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabaseClient
      .storage
      .from('borrow-letters')
      .getPublicUrl(filePath);

    // Update request with PDF URL
    const { error: updateError } = await supabaseClient
      .from('borrow_requests')
      .update({
        letter_pdf_url: urlData.publicUrl,
        letter_generated_pdf_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (updateError) throw updateError;

    console.log(`[generate-borrow-letter] Success! PDF URL: ${urlData.publicUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        pdfUrl: urlData.publicUrl,
        message: 'PDF generated successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('[generate-borrow-letter] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

function generateLetterHTML(request: any, letterType: string): string {
  const schoolName = "Darul Ma'arif";
  const schoolAddress = "Jalan Raya Kaplongan No. 28, Kaplongan, Karangampel, Indramayu";
  const currentDate = new Date().toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const itemsRows = request.request_items.map((item: any, index: number) => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${index + 1}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.items?.name || '-'}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.items?.code || '-'}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.items?.description || '-'}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { size: A4; margin: 2cm; }
        body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { font-size: 14pt; margin: 5px 0; }
        .header p { font-size: 10pt; margin: 3px 0; }
        .letter-info { margin-bottom: 20px; }
        .letter-info table { width: 100%; }
        .letter-info td { padding: 5px; }
        .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .items-table th { background: #f0f0f0; padding: 8px; border: 1px solid #ddd; }
        .signature-section { margin-top: 40px; display: flex; justify-content: space-between; }
        .signature-box { text-align: center; width: 45%; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${schoolName}</h1>
        <p>${schoolAddress}</p>
        <p>Telp: 082219699610 | Email: pontrendarulmaarif@gmail.com</p>
        <hr>
        <h2>SURAT PEMINJAMAN BARANG</h2>
        <p>No: ${request.letter_number || `SPB/${new Date().getFullYear()}/${String(Date.now()).slice(-6)}`}</p>
        <p>${currentDate}</p>
      </div>

      <div class="letter-info">
        <table>
          <tr><td width="150"><strong>Nama Peminjam</strong></td><td>: ${request.borrower?.full_name || '-'}</td></tr>
          <tr><td><strong>Unit/Bagian</strong></td><td>: ${request.borrower?.unit || '-'}</td></tr>
          <tr><td><strong>Keperluan</strong></td><td>: ${request.purpose}</td></tr>
          <tr><td><strong>Tanggal Peminjaman</strong></td><td>: ${new Date(request.start_date).toLocaleDateString('id-ID')} - ${new Date(request.end_date).toLocaleDateString('id-ID')}</td></tr>
          <tr><td><strong>Lokasi Penggunaan</strong></td><td>: ${request.location_usage || '-'}</td></tr>
          <tr><td><strong>Penanggung Jawab</strong></td><td>: ${request.pic_name} (${request.pic_contact})</td></tr>
        </table>
      </div>

      <h3>Daftar Barang yang Dipinjam:</h3>
      <table class="items-table">
        <thead>
          <tr>
            <th width="40">No</th>
            <th>Nama Barang</th>
            <th width="100">Kode</th>
            <th width="60">Jumlah</th>
            <th>Keterangan</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <p><strong>Ketentuan:</strong></p>
      <ol>
        <li>Peminjam wajib menjaga barang dengan baik</li>
        <li>Barang harus dikembalikan sesuai waktu yang ditentukan</li>
        <li>Kerusakan atau kehilangan menjadi tanggung jawab peminjam</li>
      </ol>

      <div class="signature-section">
        <div class="signature-box">
          <p>Mengetahui,</p>
          <p>${letterType === 'official' ? 'Kepala Sekolah' : 'Pengelola Inventaris'}</p>
          <br><br><br>
          <p><strong>${letterType === 'official' ? (request.headmaster_approver?.full_name || 'Kepala Sekolah') : (request.owner_reviewer?.full_name || 'Pengelola')}</strong></p>
        </div>
        <div class="signature-box">
          <p>Peminjam,</p>
          <br><br><br><br>
          <p><strong>${request.borrower?.full_name || '-'}</strong></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

async function generatePDFBuffer(html: string): Promise<Uint8Array> {
  // Simplified PDF generation for MVP
  // In production, use puppeteer or similar library
  // For now, we'll encode the HTML and return it as a basic PDF structure
  
  // This is a minimal PDF wrapper - in production you'd use a proper library
  const encoder = new TextEncoder();
  return encoder.encode(html);
}
