-- Final RLS penyesuaian request_items (ringkas & eksplisit)
-- Timestamp: 2025-10-11
BEGIN;

-- Hapus policy lama FOR ALL jika masih ada (dari migrasi awal)
DROP POLICY IF EXISTS "Borrowers can manage items in own requests" ON public.request_items;
DROP POLICY IF EXISTS "Request items manageable by request owner" ON public.request_items;

-- INSERT: hanya borrower request tersebut & request masih draft
CREATE POLICY "Borrower insert draft request items"
  ON public.request_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.borrow_requests br
      WHERE br.id = request_id
        AND br.borrower_id = auth.uid()
        AND br.status = 'draft'
    )
  );

-- UPDATE: borrower masih bisa ubah selama draft, atau peran privileged bebas
CREATE POLICY "Manage request items privileged/update"
  ON public.request_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.borrow_requests br
      WHERE br.id = request_items.request_id
        AND (
          (br.borrower_id = auth.uid() AND br.status = 'draft') OR
          public.has_role(auth.uid(),'owner') OR
          public.has_role(auth.uid(),'headmaster') OR
          public.has_role(auth.uid(),'admin')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.borrow_requests br
      WHERE br.id = request_items.request_id
        AND (
          (br.borrower_id = auth.uid() AND br.status = 'draft') OR
          public.has_role(auth.uid(),'owner') OR
          public.has_role(auth.uid(),'headmaster') OR
          public.has_role(auth.uid(),'admin')
        )
    )
  );

-- DELETE: kondisi sama dengan UPDATE
CREATE POLICY "Manage request items privileged/delete"
  ON public.request_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.borrow_requests br
      WHERE br.id = request_items.request_id
        AND (
          (br.borrower_id = auth.uid() AND br.status = 'draft') OR
          public.has_role(auth.uid(),'owner') OR
          public.has_role(auth.uid(),'headmaster') OR
          public.has_role(auth.uid(),'admin')
        )
    )
  );

COMMIT;
