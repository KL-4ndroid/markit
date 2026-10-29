-- Owner can recover basic product edits made by an authorized manager.
-- The product's actual owner, never the event actor/team membership, defines scope.
BEGIN;
SET LOCAL lock_timeout = '5s';
DROP POLICY IF EXISTS owner_product_metadata_events_read ON public.events;
CREATE POLICY owner_product_metadata_events_read ON public.events
 FOR SELECT TO authenticated USING (
  market_id IS NULL AND type IN ('product_updated','product_deleted')
  AND EXISTS (SELECT 1 FROM public.products p
   WHERE p.id::text=COALESCE(payload->>'productId',payload->>'product_id') AND p.owner_id=auth.uid())
 );
COMMIT;
