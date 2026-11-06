-- Require the status shown to the merchant so retries cannot skip steps.
begin;
drop function public.commerce_advance_order(uuid);

create function public.commerce_advance_order(order_id uuid, expected_status text)
returns text language plpgsql security definer set search_path = '' as $$
declare next_status text;
begin
 if expected_status is null or expected_status not in ('placed', 'accepted', 'preparing', 'out_for_delivery') then
   raise exception 'Invalid order status';
 end if;
 update public.commerce_orders o
 set status = case o.status when 'placed' then 'accepted' when 'accepted' then 'preparing' when 'preparing' then 'out_for_delivery' when 'out_for_delivery' then 'delivered' end
 where o.id = order_id and o.status = expected_status
   and exists(select 1 from public.commerce_shops s where s.id = o.shop_id and s.owner_id = auth.uid())
 returning status into next_status;
 if not found then raise exception 'Order changed or is unavailable; refresh and try again'; end if;
 return next_status;
end $$;
revoke all on function public.commerce_advance_order(uuid,text) from public, anon;
grant execute on function public.commerce_advance_order(uuid,text) to authenticated;
commit;
