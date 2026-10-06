# CRM People–Property rollback

此 migration 為 additive。優先回退應用程式並保留 `people_properties`；既有關聯可逐筆以 `status='archived'` 停用，這是可逆的應用層 rollback。未經備份、Preview rehearsal 與明確核准，不得 DROP TABLE、FK 或關聯資料。
