-- Migration: Allow authenticated users to read borrow_requests for public realtime page
-- Fixed syntax for policy creation

-- Drop existing policy if exists (to avoid conflicts)
DROP POLICY IF EXISTS "Allow read borrow_requests for authenticated" ON public.borrow_requests;

-- Create policy with proper syntax (single quotes for policy name)
CREATE POLICY "Allow read borrow_requests for authenticated" ON public.borrow_requests
    FOR SELECT USING (auth.role() = 'authenticated');

-- Also allow reading request_items for the same purpose
DROP POLICY IF EXISTS "Allow read request_items for authenticated" ON public.request_items;

CREATE POLICY "Allow read request_items for authenticated" ON public.request_items
    FOR SELECT USING (auth.role() = 'authenticated');
