-- Food/Shop only. Apply with Supabase migrations or the project's SQL editor.
-- Separate prefixed tables avoid collisions with unrelated ride data.
begin;
create table public.commerce_shops (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 kind text not null check (kind in ('food','shops')), name text not null,
 category text not null, address text not null, area text not null, city text not null default 'Rajkot' check(city = 'Rajkot'),
 latitude double precision not null check(latitude between 22.07 and 22.54),
 longitude double precision not null check(longitude between 70.55 and 71.05),
 delivery_radius numeric not null default 6 check(delivery_radius > 0 and delivery_radius <= 25),
 status text not null default 'closed' check(status in ('open','closed','suspended')),
 opening_time time, closing_time time, image text, rating numeric check(rating between 0 and 5),
 delivery_minutes integer check(delivery_minutes > 0), delivery_fee numeric(10,2) not null default 0 check(delivery_fee >= 0),
 offer text, created_at timestamptz not null default now()
);
create table public.commerce_products (
 id uuid primary key default gen_random_uuid(), shop_id uuid not null references public.commerce_shops(id) on delete cascade,
 name text not null check(length(trim(name)) > 0), category text not null, description text not null default '', image text not null default '',
 mrp numeric(10,2) not null check(mrp >= 0), price numeric(10,2) not null check(price >= 0 and price <= mrp),
 quantity numeric not null default 1 check(quantity > 0), unit text not null default 'piece',
 stock_quantity integer not null default 0 check(stock_quantity >= 0), low_stock_threshold integer not null default 5 check(low_stock_threshold >= 0),
 available boolean not null default true, revision integer not null default 1, created_at timestamptz not null default now()
);
create index on public.commerce_products(shop_id);
create function public.commerce_product_revision() returns trigger language plpgsql set search_path = '' as $$
begin new.revision := old.revision + 1; return new; end $$;
create trigger commerce_product_revision before update on public.commerce_products for each row execute function public.commerce_product_revision();
create table public.commerce_addresses (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 address jsonb not null check(jsonb_typeof(address) = 'object'), created_at timestamptz not null default now()
);
create index on public.commerce_addresses(user_id);
create table public.commerce_orders (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), shop_id uuid not null references public.commerce_shops(id),
 request_key text not null, items jsonb not null, address jsonb not null,
 subtotal numeric(10,2) not null, delivery_fee numeric(10,2) not null, total numeric(10,2) not null,
 payment_method text not null default 'cash', status text not null default 'placed' check(status in ('placed','accepted','preparing','out_for_delivery','delivered')),
 created_at timestamptz not null default now(), unique(user_id, request_key)
);
create index on public.commerce_orders(shop_id, created_at desc);
create index on public.commerce_orders(user_id, created_at desc);

alter table public.commerce_shops enable row level security;
alter table public.commerce_products enable row level security;
alter table public.commerce_addresses enable row level security;
alter table public.commerce_orders enable row level security;
create policy shops_read on public.commerce_shops for select using(status <> 'suspended' or owner_id = auth.uid());
-- Onboarding/ownership changes are admin operations, never client-side writes.
create policy products_read on public.commerce_products for select using(exists(select 1 from public.commerce_shops s where s.id = shop_id and (s.status <> 'suspended' or s.owner_id = auth.uid())));
create policy products_insert on public.commerce_products for insert to authenticated with check(exists(select 1 from public.commerce_shops s where s.id = shop_id and s.owner_id = auth.uid()));
create policy products_update on public.commerce_products for update to authenticated using(exists(select 1 from public.commerce_shops s where s.id = shop_id and s.owner_id = auth.uid())) with check(exists(select 1 from public.commerce_shops s where s.id = shop_id and s.owner_id = auth.uid()));
create policy products_delete on public.commerce_products for delete to authenticated using(exists(select 1 from public.commerce_shops s where s.id = shop_id and s.owner_id = auth.uid()));
create policy addresses_own on public.commerce_addresses for all to authenticated using(user_id = auth.uid()) with check(user_id = auth.uid());
create policy orders_read on public.commerce_orders for select to authenticated using(user_id = auth.uid() or exists(select 1 from public.commerce_shops s where s.id = shop_id and s.owner_id = auth.uid()));
grant select on public.commerce_shops, public.commerce_products to anon, authenticated;
grant insert, update, delete on public.commerce_products to authenticated;
grant select, insert, update, delete on public.commerce_addresses to authenticated;
grant select on public.commerce_orders to authenticated;
revoke insert, update, delete on public.commerce_orders, public.commerce_shops from anon, authenticated;

create function public.commerce_distance(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision language sql immutable strict set search_path = '' as $$
 select 6371 * 2 * asin(least(1.0, sqrt(power(sin(radians(lat2-lat1)/2),2) + cos(radians(lat1))*cos(radians(lat2))*power(sin(radians(lng2-lng1)/2),2))));
$$;

create function public.commerce_adjust_stock(product_id uuid, delta integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare remaining integer;
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 update public.commerce_products p set stock_quantity = stock_quantity + delta
 where p.id = product_id and stock_quantity + delta >= 0
 and exists(select 1 from public.commerce_shops s where s.id = p.shop_id and s.owner_id = auth.uid())
 returning stock_quantity into remaining;
 if not found then raise exception 'Stock cannot be negative, or you do not own this product'; end if;
 return remaining;
end $$;

create function public.commerce_place_order(target_shop uuid, items jsonb, delivery_address jsonb, request_id text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
 merchant public.commerce_shops%rowtype; product public.commerce_products%rowtype;
 existing public.commerce_orders%rowtype; entry jsonb; qty integer; product_key uuid;
 subtotal numeric(10,2) := 0; snapshots jsonb := '[]'; lat double precision; lng double precision;
begin
 if auth.uid() is null then raise exception 'Sign in to place your order'; end if;
 if request_id is null or length(request_id) not between 5 and 100 then raise exception 'Invalid order reference'; end if;
 -- Serialize retries for this user/reference, including uncertain network responses.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text || request_id, 0));
 select * into existing from public.commerce_orders where user_id = auth.uid() and request_key = request_id;
 if found then return to_jsonb(existing); end if;
 if jsonb_typeof(items) is distinct from 'array' then raise exception 'Invalid cart'; end if;
 if jsonb_array_length(items) not between 1 and 100 then raise exception 'Cart must contain between 1 and 100 products'; end if;
 if jsonb_typeof(delivery_address) is distinct from 'object' or coalesce(length(trim(delivery_address->>'addressLine')), 0) = 0 then raise exception 'A complete delivery address is required'; end if;
 lat := (delivery_address->>'latitude')::double precision; lng := (delivery_address->>'longitude')::double precision;
 if lat is null or lng is null or not (lat between 22.07 and 22.54 and lng between 70.55 and 71.05) or public.commerce_distance(22.3039,70.8022,lat,lng) > 25 then raise exception 'UniGoMoto Food & Shop is currently available in Rajkot.'; end if;
 select * into merchant from public.commerce_shops where id = target_shop for share;
 if not found or merchant.status <> 'open' then raise exception 'This merchant is not accepting orders'; end if;
 if public.commerce_distance(lat,lng,merchant.latitude,merchant.longitude) > merchant.delivery_radius then raise exception 'This address is outside the merchant delivery radius'; end if;
 if (select count(distinct value->>'product_id') from jsonb_array_elements(items)) <> jsonb_array_length(items) then raise exception 'Duplicate products in cart'; end if;
 -- Stable lock order prevents cross-cart deadlocks. All stock changes roll back on any error.
 for entry in select value from jsonb_array_elements(items) order by value->>'product_id' loop
   if coalesce(entry->>'quantity','') !~ '^[1-9][0-9]{0,3}$' then raise exception 'Invalid quantity'; end if;
   qty := (entry->>'quantity')::integer; product_key := (entry->>'product_id')::uuid;
   select * into product from public.commerce_products where id = product_key and shop_id = target_shop for update;
   if not found then raise exception 'A product was removed; refresh your cart'; end if;
   if not product.available or product.stock_quantity < qty then raise exception 'Insufficient stock for %; refresh your cart', product.name; end if;
   update public.commerce_products set stock_quantity = stock_quantity - qty where id = product.id;
   subtotal := subtotal + product.price * qty;
   snapshots := snapshots || jsonb_build_array(jsonb_build_object('product_id',product.id,'name',product.name,'price',product.price,'quantity',qty,'unit',product.unit));
 end loop;
 insert into public.commerce_orders(user_id,shop_id,request_key,items,address,subtotal,delivery_fee,total)
 values(auth.uid(),target_shop,request_id,snapshots,delivery_address,subtotal,merchant.delivery_fee,subtotal+merchant.delivery_fee) returning * into existing;
 return to_jsonb(existing);
end $$;

create function public.commerce_advance_order(order_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare next_status text;
begin
 update public.commerce_orders o set status = case o.status when 'placed' then 'accepted' when 'accepted' then 'preparing' when 'preparing' then 'out_for_delivery' when 'out_for_delivery' then 'delivered' end
 where o.id = order_id and o.status <> 'delivered' and exists(select 1 from public.commerce_shops s where s.id = o.shop_id and s.owner_id = auth.uid()) returning status into next_status;
 if not found then raise exception 'Order unavailable or not owned by your shop'; end if;
 return next_status;
end $$;
revoke all on function public.commerce_adjust_stock(uuid,integer), public.commerce_place_order(uuid,jsonb,jsonb,text), public.commerce_advance_order(uuid) from public, anon;
grant execute on function public.commerce_adjust_stock(uuid,integer), public.commerce_place_order(uuid,jsonb,jsonb,text), public.commerce_advance_order(uuid) to authenticated;
commit;
