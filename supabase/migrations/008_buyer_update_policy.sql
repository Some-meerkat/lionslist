-- Allow buyers to report items as sold (update sale_pending and buyer_id)
-- This is additive to the existing seller update policy
create policy "Buyers can report sales"
  on listings for update to authenticated
  using (
    exists (
      select 1 from buy_requests
      where buy_requests.listing_id = listings.id
      and buy_requests.buyer_id = auth.uid()
    )
  );
