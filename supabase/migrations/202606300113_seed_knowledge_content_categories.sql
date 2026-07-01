insert into public.content_categories (content_type, name, slug, sort_order)
values
  ('knowledge', '買屋指南', 'buying-guide', 100),
  ('knowledge', '賣屋指南', 'selling-guide', 200),
  ('knowledge', '稅務', 'tax', 300),
  ('knowledge', '貸款', 'loan', 400),
  ('knowledge', '農地', 'farmland', 500),
  ('knowledge', '農舍', 'farmhouse', 600),
  ('knowledge', '繼承贈與', 'inheritance-gift', 700),
  ('knowledge', '法規', 'legal', 800),
  ('knowledge', '彰化市場', 'changhua-market', 900),
  ('knowledge', '常見問題', 'faq', 1000)
on conflict (content_type, slug) do update
set
  name = excluded.name,
  sort_order = excluded.sort_order,
  updated_at = now(),
  deleted_at = null;
