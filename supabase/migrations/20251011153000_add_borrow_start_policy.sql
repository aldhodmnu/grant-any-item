-- Policy tambahan untuk memungkinkan borrower atau owner memulai peminjaman (approved -> active)
-- Timestamp: 2025-10-11
BEGIN;

-- Policy spesifik update status menjadi 'active' jika sebelumnya 'approved'
-- Borrower sendiri atau role owner/admin boleh melakukan transition ini.
DROP POLICY IF EXISTS "Borrower start approved request" ON public.borrow_requests;
CREATE POLICY "Borrower start approved request"
  ON public.borrow_requests FOR UPDATE
  USING (
    (
      borrower_id = auth.uid() OR
      public.has_role(auth.uid(),'owner') OR
      public.has_role(auth.uid(),'admin')
    )
    AND status = 'approved'
  )
  WITH CHECK (
    (
      borrower_id = auth.uid() OR
      public.has_role(auth.uid(),'owner') OR
      public.has_role(auth.uid(),'admin')
    )
    AND status = 'active'
  );

COMMIT;
