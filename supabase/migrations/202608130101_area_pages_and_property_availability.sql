create table if not exists public.area_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null,
  short_name text not null,
  eyebrow text not null default '',
  headline text not null,
  summary text not null default '',
  description text not null default '',
  city text not null default '彰化縣',
  district text not null,
  property_keywords jsonb not null default '[]'::jsonb check (jsonb_typeof(property_keywords) = 'array'),
  audiences jsonb not null default '[]'::jsonb check (jsonb_typeof(audiences) = 'array'),
  features jsonb not null default '[]'::jsonb check (jsonb_typeof(features) = 'array'),
  cautions jsonb not null default '[]'::jsonb check (jsonb_typeof(cautions) = 'array'),
  faqs jsonb not null default '[]'::jsonb check (jsonb_typeof(faqs) = 'array'),
  seo_title text,
  seo_description text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  sort_order integer not null default 1000,
  published_at timestamptz,
  archived_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.properties
  add column if not exists city text,
  add column if not exists district text,
  add column if not exists unavailable_reason text,
  add column if not exists unavailable_at timestamptz;

create index if not exists area_pages_public_order_idx on public.area_pages(status, sort_order, name);
create index if not exists properties_public_district_idx on public.properties(status, city, district) where deleted_at is null;

create or replace function public.set_property_unavailable_state()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.status in ('archived','expired') and old.status is distinct from new.status then
    new.unavailable_at := coalesce(new.unavailable_at, now());
    new.unavailable_reason := coalesce(new.unavailable_reason, case when new.status = 'expired' then '委託到期' else '已停止公開' end);
  elsif new.status = 'published' then
    new.unavailable_at := null;
    new.unavailable_reason := null;
  end if;
  return new;
end $$;
drop trigger if exists properties_set_unavailable_state on public.properties;
create trigger properties_set_unavailable_state before update of status on public.properties
for each row execute function public.set_property_unavailable_state();

drop trigger if exists area_pages_set_updated_at on public.area_pages;
create trigger area_pages_set_updated_at before update on public.area_pages
for each row execute function public.set_updated_at();

alter table public.area_pages enable row level security;
create policy "public read published area pages" on public.area_pages for select to anon, authenticated
using (status = 'published' or public.is_admin_role(array['editor','admin','owner']));
create policy "staff insert area pages" on public.area_pages for insert to authenticated
with check (public.is_admin_role(array['editor','admin','owner']));
create policy "staff update area pages" on public.area_pages for update to authenticated
using (public.is_admin_role(array['editor','admin','owner']))
with check (public.is_admin_role(array['editor','admin','owner']));

revoke all privileges on public.area_pages from anon, authenticated;
grant select on public.area_pages to anon, authenticated;
grant insert, update on public.area_pages to authenticated;

create or replace function public.get_public_property_availability(requested_slug text)
returns table(slug text, status text, unavailable_reason text, unavailable_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select p.slug, p.status, p.unavailable_reason, p.unavailable_at
  from public.properties p
  where p.slug = requested_slug and p.deleted_at is null and p.status in ('archived','expired')
  limit 1
$$;
revoke all on function public.get_public_property_availability(text) from public;
grant execute on function public.get_public_property_availability(text) to anon, authenticated;

insert into public.area_pages (slug,name,short_name,eyebrow,headline,summary,description,city,district,property_keywords,audiences,features,cautions,faqs,seo_title,seo_description,status,sort_order,published_at)
values
('changhua-city','彰化市','彰化市','Changhua City','彰化市買房、賣房與房屋土地資訊','從市區住宅、透天、店面到建地，依照生活圈、通勤需求與預算，協助您整理適合的方向。','彰化市生活機能完整，住宅類型多元，也是北彰化自住、換屋與店面需求集中的區域。不同生活圈的屋齡、停車條件與價格差異明顯，看屋前先釐清通勤、學區及家庭空間需求，更容易找到適合的物件。','彰化縣','彰化市','["大樓","透天","店面","建地"]','["希望兼顧生活機能與通勤的自住家庭","準備換屋、需要較完整空間的家庭","尋找市區店面、辦公或建地的買方"]','[{"title":"生活機能集中","description":"商圈、學校、醫療與日常採買選擇完整，適合重視便利性的家庭。"},{"title":"住宅選擇多元","description":"從華廈、大樓、公寓到透天，可依預算、停車與電梯需求篩選。"},{"title":"通勤選擇彈性","description":"可銜接台74線、國道與台鐵，往台中或彰化周邊鄉鎮皆方便。"}]','["老屋應確認屋況、增建與修繕預算","市區看屋要同步確認停車與進出動線","建地與店面仍須個別確認使用分區、建築線及現況租約"]','[{"question":"彰化市適合先看大樓還是透天？","answer":"要看預算、家庭人數、是否需要電梯及可接受的屋齡。先把停車、房間數與通勤範圍排出優先順序，會比只看總價更有效率。"},{"question":"買彰化市老屋要注意什麼？","answer":"除漏水、管線及結構外，也要確認增建、使用現況、停車方式與未來修繕費用，不要只看室內裝潢。"},{"question":"彰化市不同生活圈價格會差很多嗎？","answer":"會。道路條件、屋齡、產品類型、學校與商圈距離都會影響價格，應以相近時間、相近產品的成交資料比較。"},{"question":"屋主想出售彰化市房屋，可以先做什麼？","answer":"可先整理權狀、現況照片、屋況及貸款資料，再由阿勇協助盤點價格、費用與銷售方式。"}]','彰化市買房、賣房與房屋土地資訊｜阿勇不動產顧問','整理彰化市住宅、透天、店面與建地資訊，依生活圈、通勤需求、停車條件與預算，協助買方找房及屋主規劃出售。','published',100,now()),
('xiushui','秀水鄉','秀水','Xiushui','秀水鄉買房、建地、農地與廠房資訊','鄰近彰化市、鹿港與和美，住宅、土地及產業型不動產各有不同的評估重點。','秀水鄉兼具居住與產業需求，常見透天、建地、農地與廠房。選購時除了總價，也要留意道路、臨路寬度、使用分區、水電條件及實際通勤動線。','彰化縣','秀水鄉','["透天","建地","農地","廠房"]','["希望鄰近彰化市、又需要透天空間的家庭","尋找建地、農地或廠房的買方","在秀水有房地產、準備評估出售的屋主"]','[{"title":"北彰化移動便利","description":"往彰化市、鹿港與和美皆有生活與工作上的連結。"},{"title":"土地產品多元","description":"住宅、建地、農地與產業使用需求並存，適合依用途精確篩選。"},{"title":"空間選擇較充足","description":"相較市區，較容易找到重視土地、停車或工作空間的產品。"}]','["土地應確認使用分區、臨路及建築線","廠房應核對合法使用、水電與消防條件","農地的使用、農舍資格及貸款條件要分別確認"]','[{"question":"秀水買透天最先要看什麼？","answer":"先確認生活動線、道路寬度、停車、屋況與增建情形，再比較總價與修繕成本。"},{"question":"秀水建地都能直接蓋房子嗎？","answer":"不一定。仍須確認使用分區、建築線、臨路條件、地形與相關法規，不能只看謄本上寫建地。"},{"question":"秀水廠房如何判斷是否適合？","answer":"要依實際用途確認土地與建物合法性、道路、裝卸動線、電力、消防及周邊環境。"},{"question":"秀水房地產要出售，怎麼估價？","answer":"應依產品類型分開比較，透天、建地、農地及廠房不能用同一種單價邏輯判斷。"}]',null,null,'published',200,now()),
('lukang','鹿港鎮','鹿港','Lukang','鹿港鎮房屋、店面與土地買賣資訊','從舊市區店面、住宅透天到外圍建地與農地，依用途與生活圈分析真正適合的選擇。','鹿港鎮兼具居住、觀光、商業與產業需求。舊市區與外圍區域的道路、產品類型及價格判斷差異很大，買房或買地前應先確認用途，再比較適合的生活圈。','彰化縣','鹿港鎮','["店面","透天","建地","農地"]','["希望在鹿港自住或換屋的家庭","尋找店面、建地或土地的買方","持有鹿港房屋或土地、準備出售的屋主"]','[{"title":"生活與商業兼具","description":"傳統生活圈、觀光商圈與在地就業需求，使物件用途更為多元。"},{"title":"市區外圍差異明顯","description":"舊市區重視道路與停車，外圍土地則要留意分區、臨路及使用條件。"},{"title":"店面土地各有市場","description":"自用、出租與長期持有的評估方式不同，需從用途出發比較。"}]','["舊市區房屋要確認道路、停車、屋況與產權","店面應核對現況租約、使用及人車動線","土地應確認分區、臨路、建築線與是否有地上物"]','[{"question":"鹿港舊市區買房最常遇到什麼問題？","answer":"道路與停車條件、老屋修繕、增建及產權資料都很重要，應把實際使用便利性一起納入評估。"},{"question":"鹿港店面可以只看租金報酬嗎？","answer":"不建議。還要確認租約、承租狀況、道路、人流、用途及未來維修成本。"},{"question":"鹿港土地出價前要查什麼？","answer":"至少先確認地目與使用分區、臨路、建築線、地形、地上物及水電條件。"},{"question":"鹿港物件出售前需要整理哪些資料？","answer":"可先準備權狀、謄本、稅單、租約與現況說明，再依住宅、店面或土地分別評估。"}]',null,null,'published',300,now()),
('fuxing','福興鄉','福興','FUXING','福興鄉農舍、建地、農地與住宅資訊','從福興市區、番婆、沿海聚落到產業道路周邊，依土地用途、交通條件及生活需求，協助您整理適合的方向。','福興鄉鄰近鹿港，區域內住宅、農舍、建地、農地與產業型不動產並存。不同地段的道路條件、使用分區、水電設施及生活便利性差異較大，看屋或看地前應先確認用途、通行條件與未來規劃。','彰化縣','福興鄉','["農舍","建地","農地","透天","廠房"]','["希望鄰近鹿港生活圈，又需要較大使用空間的家庭","尋找農舍、農地、建地或產業型不動產的買方","持有福興鄉房屋或土地、準備評估出售的屋主"]','[{"title":"鄰近鹿港生活圈","description":"福興鄉與鹿港往來密切，可共享採買、就學與工作機能，但仍要確認實際通勤路線。"},{"title":"產品類型多元","description":"區域內有透天、農舍、建地、農地及產業型不動產，評估方式與貸款條件各不相同。"},{"title":"道路與使用條件重要","description":"看地或農舍除了價格，也要確認臨路寬度、使用分區、水電及合法使用情形。"}]','["農地應先確認農業使用、臨路及灌排水條件","農舍須查明使用執照、保存登記及現況增建","建地須確認使用分區、建築線、排水及實際界址","廠房或倉儲應確認合法用途、消防、電力及大型車進出條件"]','[{"question":"福興鄉適合買農舍自住嗎？","answer":"要確認生活機能、交通、屋況及合法性，也要評估日常採買、就醫與通勤距離。"},{"question":"福興鄉農地可以蓋房子嗎？","answer":"農地不代表可以直接興建住宅，仍須依土地使用、農業設施及農舍相關規定個別確認。"},{"question":"購買福興鄉建地要注意什麼？","answer":"應確認使用分區、建築線、道路權利、排水、水電及實際界址，不能只看謄本上的地目或面積。"},{"question":"福興鄉農舍有建物權狀就一定合法嗎？","answer":"不一定，仍要核對使用執照、登記範圍與現況，確認是否有未登記增建或用途差異。"},{"question":"屋主想出售福興鄉房屋或土地，可以先做什麼？","answer":"可先整理權狀、地籍資料、現況照片、使用情形及貸款資料，再由阿勇協助評估價格與銷售方式。"}]','福興鄉農舍、建地、農地與住宅資訊｜阿勇不動產顧問','整理彰化縣福興鄉農舍、建地、農地、透天與廠房資訊，依用途、道路、生活圈及預算，協助買方找房找地與屋主規劃出售。','draft',400,null)
on conflict (slug) do nothing;

alter table public.properties disable trigger properties_enforce_role_rules;

update public.properties set city = '彰化縣', district = case
  when coalesce(address_public,'') || ' ' || title like '%彰化市%' then '彰化市'
  when coalesce(address_public,'') || ' ' || title like '%秀水%' then '秀水鄉'
  when coalesce(address_public,'') || ' ' || title like '%鹿港%' then '鹿港鎮'
  else district end
where city is null or district is null;

alter table public.properties enable trigger properties_enforce_role_rules;


notify pgrst, 'reload schema';
