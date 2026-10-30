# Project Status

## 2026-10-31 05:42 唯讀驗收受阻，暫停檢查等待查詢修復授權

本輪先讀最新checkpoint及Supabase技能，確認無執行/排隊workflow、staging ACTIVE_HEALTHY、其他active SQL=0/清理SQL=0/Preview可讀，DB6279687315 bytes。未DELETE/匯入、改API/view/index、提高timeout或調整配額。

進一步只讀確認公開API每頁都使用select(...,{count:"exact"})，較廣sale的計數EXPLAIN（不執行ANALYZE）為Aggregate -> Bitmap Heap Scan，包含canonical alias去重子查詢，估算35005筆。角色設定可讀得anon3s、authenticated8s、authenticator8s；service_role未有獨立statement_timeout設定列。這些設定與先前57014查詢取消是效能查證線索，仍不足以確定實際生效取消來源；沒有將「調高timeout」當作修復，也不聲稱容量超額。

範圍刪除目標已於前輪耗盡cursor1504397，前次精確核對只剩彰化sale36053/presale4623、111071明細，範圍外及孤兒0。買賣/預售明細、車位、官方備註欄位與跨期間history已有具體通過案例；較廣sale連續多輪503仍未排除。本輪不再重送同一失敗請求，不把既有案例或清理完成視為完整驗收完成。

目前任務被限定為只讀查證，不能在本輪擅自改變查詢去重/計數路徑；等待狀態已非單次短暫錯誤。需要阿勇另行授權Preview查詢效能修復，且須維持去重語義、精確筆數/分頁、官方備註、明細對應、安全權限與所有既有限制。依執行規則，將本清理檢查暫停並只通知這個阻礙一次；cleanup_complete保持false，不能發「彰化範圍整理完成」。歷史回補尚未完成且仍禁止恢復追加。Production、資料庫欄位、前台layout、7GB線、原檔與對帳紀錄不變。


## 2026-10-31 04:52 買賣車位案例補驗通過

本輪只讀，未DELETE/匯入或改API/schema。先讀最新checkpoint，確認無執行/排隊workflow，staging ACTIVE_HEALTHY；預檢與收尾其他active SQL=0、清理SQL=0、Preview view可讀，DB6279687315 bytes。

以公開行政區/日期條件查彰化sale、秀水鄉、2026-08-01～2026-08-31（未傳私有DB地址/ID），回3筆交易、8筆對應明細，含1筆車位及1筆有官方備註，縣市/資料類型正確。補足前次13筆日期樣本沒有車位的案例缺口。這是API資料案例，不擴大聲稱重新完成所有UI或原始來源對帳。

讀pg_stat_user_tables確認主檔在16:44:25Z自動vacuum、16:44:33Z自動analyze；明細16:45:09Z自動vacuum、16:44:45Z自動analyze。統計n_live_tup/n_dead_tup僅為估值，不取代前次精確40676主檔/111071明細核對。本輪沒有手動執行vacuum或analyze。前次log查詢新增嘗試body欄，工具回Field body does not exist，故仍只能確認先前57014取消，未確認確切取消原因，不循環猜欄位。

較廣sale查詢已連續多輪503且有取消證據，本輪不再重送相同失敗請求。待驗收仍為較廣sale正常；sale車位/明細/備註欄位、預售及跨期間history已有具體通過案例。cleanup_complete維持false，任務保持啟用，禁止宣告完成或恢復歷史追加。cursor1504397、範圍外/孤兒0是前次全表核對；Production、欄位、版面、7GB保護、來源ZIP及對帳紀錄不變。


## 2026-10-31 03:08 唯讀查證確認Preview查詢取消

本輪只讀，未DELETE、匯入或改API/schema。staging ACTIVE_HEALTHY、無執行/排隊workflow，預檢與收尾其他active SQL=0、清理SQL=0、Preview view可讀，DB6279687315 bytes。

修正前次log欄位讀取方式：先讀mapKeys(log_attributes)，確認欄位採flattened keys，例如parsed.sql_state_code。18:40:30Z～18:41:20Z的postgres log確認PostgREST 14.5、severity ERROR、SQLSTATE57014，對應moi_preview_transactions查詢。這證明查詢被取消，尚不證明確切取消來源；不能說成容量超額。

僅EXPLAIN（未ANALYZE、不實際執行）較廣sale列表，計畫為Limit -> Sort -> Bitmap Heap Scan，先估算35005筆買賣並包含canonical alias去重子查詢後才LIMIT20。這是後續效能查證線索，沒有修改view、索引、timeout或放寬保護。

恢復repo中的公開驗證腳本內容後，以無私有DB資料的獨立Python唯讀驗證：日期/彰化市sale回13筆、22明細、10筆有官方備註；該樣本0車位，不能當作sale車位案例通過。僅用同站公開回應IDs查history，1組跨期間且排序正確。較廣sale仍11.4秒回503 `{"error":"query_unavailable"}`，立即停止未重試。presale20筆/48明細/8車位/2備註是前輪已驗證，本輪未重做。

scope_pruning_complete仍true，cursor1504397；前次全表40676主檔、111071明細、範圍外/孤兒0保留，本輪未重做全表或資料指紋。cleanup_complete仍false，任務維持啟用，尚待較廣sale正常及sale車位/備註驗收；不能宣告完成或恢復歷史追加。原檔、對帳紀錄、Production、欄位、版面、7GB保護不變。


## 2026-10-31 02:42 預售公開驗收通過，較廣買賣仍503

本輪只讀，未DELETE或匯入。先讀最新checkpoint並確認無執行/排隊workflow，staging ACTIVE_HEALTHY；預檢與收尾其他active SQL=0、清理SQL=0、Preview view可讀，DB6279687315 bytes。

為補足尚未到達的預售驗收，先用一般公開條件查詢彰化presale（不帶私有DB地址/ID）。回傳20筆、總數4623，縣市/資料類型均吻合，含48筆明細、8筆車位明細、2筆有官方備註，10.279秒通過。接著較廣彰化sale查詢仍於11.508秒回HTTP503，原始本文 `{"error":"query_unavailable"}`；停止未自動重試。此結果不可擴大成完整公開驗收通過。

已嘗試只讀查前次錯誤時間窗17:39:50Z～17:41:10Z的Supabase logs：來源有postgres_logs1、postgrest_logs2、edge_logs7。event_message/parsed鍵均空白，wildcard結果欄被工具限制，未得到足以判定503原因的訊息；沒有據此斷言容量或連線問題，也未盲目反覆查log。一般日期列表/跨期歷史先前通過，本輪未在503後重試或重驗。

範圍清理已耗盡cursor1504397，前次全表範圍外/孤兒均0；保留40676主檔及111071明細，累計刪除下限1438127主檔/4822474明細與先前未知批次另記，均維持。cleanup_complete仍false，任務維持啟用，只讀接續待完成的買賣明細/車位/官方備註與查詢驗收。禁止恢復歷史追加；Production、schema、layout、7GB保護、原檔與對帳紀錄未變。


## 2026-10-31 01:41 唯讀驗收仍遇較廣查詢503

先讀最新checkpoint，確認範圍清理已於上一輪耗盡，游標1504397，不再執行DELETE。本輪無匯入/清理workflow、staging ACTIVE_HEALTHY，預檢與收尾其他active SQL=0、清理SQL=0、Preview view可讀，DB6279687315 bytes。

一般行政區/日期公開列表13筆及跨期historyAPI再次通過。額外未限定日期的彰化sale公開查詢仍於12.401秒回HTTP503，本文為 `{"error":"query_unavailable"}`。未自動重試；presale與額外明細/車位/官方備註公開驗收未到達，不計通過，也不臆測503為容量或連線原因。

上一輪完整全表範圍/無孤兒核對結果保留：彰化sale36053、presale4623，共40676主檔；土地70412、建物30379、車位10280，共111071明細。累計確認刪除下限1438127主檔/4822474明細，以及先前25000主檔批次未知明細另記，均未變。本輪未重做整表核對或資料指紋，不將舊核對偽稱本輪重驗。

cleanup_complete仍false，任務維持啟用等待後續只讀驗收，尚無必須使用者處理的明確阻礙，因此不發完成或一般進度通知。歷史追加仍禁止恢復，Production、schema、layout、7GB保護、原檔與對帳紀錄未變。


## 2026-10-31 00:48 範圍清理已耗盡目標，公開驗收待完成

本輪預檢通過後，從1461307完成43個最多1000筆序列小批次，確認刪除42127主檔、125808明細，游標到1504397；下一批回覆0筆，快照目標耗盡。累計確認刪除下限1438127主檔、4822474明細，先前25000主檔批次未知明細數仍另記。全部成功批次低於20秒，最長9003ms。

已執行全表核對：範圍外主檔0、快照上限外主檔0、孤兒明細0。保留彰化縣sale 36053筆、presale 4623筆，共40676主檔；土地70412、建物30379、車位10280明細，共111071明細。20筆保留主檔/完整明細指紋與筆數前後一致。本輪只執行符合範圍外條件的DELETE，未更新官方備註或保留資料。

staging ACTIVE_HEALTHY，收尾其他active SQL=0、清理SQL=0、Preview view可讀，DB6279687315 bytes。既有一般日期/行政區公開列表13筆與跨期間historyAPI通過；額外不限定日期的較廣公開sale/presale驗收在首個請求收到HTTP503（未確定後續presale），立即停止，不連續重試，不把這筆驗收視為通過。尚未完成本次額外明細/車位/備註公開驗收，不宣告「彰化範圍整理完成」。

任務維持啟用，下輪先健康及無工作核對，再做只讀驗收；範圍已清乾淨，不需盲目再DELETE。若公開驗收仍失敗，保留待驗收狀態並記錄實際錯誤。通過完整驗收後才發一次完成通知並停用本清理檢查。歷史回補尚未完成，仍禁止恢復歷史追加；7GB保護、Production、schema、layout、原檔及對帳紀錄不變。DELETE不保證配置大小立即縮小。


## 2026-10-30 23:47 小批清理checkpoint

本輪健康、無工作及公開讀取預檢通過後，從1361307完成100個1000筆序列小批次，新增確認刪除100000主檔、344250明細。累計確認下限1396000主檔、4696666明細，另先前25000主檔批次明細數仍未知。最新成功提交游標1461307，快照上限1504397。

每10批健康與Preview view讀取正常，全部小批低於20秒（最長10077ms），無工具錯誤。收尾ACTIVE_HEALTHY、其他active SQL=0、清理SQL=0、Preview可讀；20筆保留交易主檔/完整明細指紋與筆數一致，公開列表13筆及跨期間歷史API再次通過。DB6279679123 bytes，7GB線不變。DELETE不代表配置容量已按刪除資料量縮小。

本輪達100批上限正常停止。1461307由成功批次確認，本輪未重做全範圍殘留計數；上一完整檢查至847588為0。任務維持啟用，下一輪讀最新checkpoint，先健康及無工作再從1461307接續。若目標耗盡，仍須完整核對範圍、無孤兒、保留資料及公開查詢後，才可宣告範圍整理完成。歷史追加仍暫停；Production、schema、layout、來源ZIP及對帳紀錄未變。


## 2026-10-30 22:43 小批清理checkpoint

本輪健康、無工作及公開讀取預檢通過後，從1260145完成100個1000筆序列小批次，新增確認刪除100000主檔、342612明細。累計確認下限1296000主檔、4352416明細，另先前25000主檔批次明細數仍未知。最新成功提交游標1361307，快照上限1504397。

每10批健康與Preview view讀取正常，全部小批低於20秒（最長10762ms），無工具錯誤。收尾ACTIVE_HEALTHY、其他active SQL=0、清理SQL=0、Preview可讀；20筆保留交易主檔/完整明細指紋與筆數一致，公開列表13筆及跨期間歷史API再次通過。DB6279597203 bytes，7GB線不變。DELETE不代表配置容量已按刪除資料量縮小。

本輪達100批上限正常停止。1361307由成功批次確認，本輪未重做全範圍殘留計數；上一完整檢查至847588為0。任務維持啟用，下一輪讀最新checkpoint，先健康及無工作再從1361307接續。範圍清理未完成，歷史追加暫停；Production、schema、layout、來源ZIP及對帳紀錄未變。


## 2026-10-30 21:27 小批清理checkpoint

本輪健康、無工作及公開讀取預檢通過後，從1160145完成100個1000筆序列小批次，新增確認刪除100000主檔、347064明細。累計確認下限1196000主檔、4009804明細，另先前25000主檔批次明細數仍未知。最新成功提交游標1260145，快照上限1504397。

每10批健康與Preview view讀取正常，全部小批低於20秒，無工具錯誤。收尾ACTIVE_HEALTHY、其他active SQL=0、清理SQL=0、Preview可讀；20筆保留交易主檔/完整明細指紋與筆數一致，公開列表13筆及跨期間歷史API再次通過。DB6279523475 bytes，7GB線不變。DELETE不代表配置容量已按刪除資料量縮小。

本輪達100批上限正常停止。1260145由成功批次確認，本輪未重做全範圍殘留計數；上一完整檢查至847588為0。任務維持啟用，下一輪讀最新checkpoint，先健康及無工作再從1260145接續。範圍清理未完成，歷史追加暫停；Production、schema、layout、來源ZIP及對帳紀錄未變。


## 2026-10-30 20:32 小批清理checkpoint

本輪健康、無工作及公開讀取預檢通過後，從1059450完成100個1000筆序列小批次，新增確認刪除100000主檔、356702明細。累計確認下限1096000主檔、3662740明細，另先前25000主檔批次明細數仍未知。最新成功提交游標1160145，快照上限1504397。

每10批健康與Preview view讀取正常，全部小批低於20秒，無工具錯誤。收尾ACTIVE_HEALTHY、其他active SQL=0、清理SQL=0、Preview可讀；20筆保留交易主檔/完整明細指紋與筆數一致，公開列表13筆及跨期間歷史API再次通過。DB6279548051 bytes，7GB線不變。

本輪達100批上限正常停止。1160145由成功批次確認，本輪未重做全範圍殘留計數；上一完整檢查至847588為0。任務維持啟用，下一輪讀最新checkpoint，先健康及無工作再從1160145接續。範圍清理未完成，歷史追加暫停；Production、schema、layout、來源ZIP及對帳紀錄未變。


## 2026-10-30 19:12 小批清理遇其他查詢後停止

本輪健康、無工作及公開讀取預檢通過後，從1039450完成20個1000筆序列小批次，新增確認刪除20000主檔、64977明細。累計確認下限996000主檔、3306038明細，另先前25000主檔批次明細數仍未知。最新成功提交游標1059450，快照上限1504397。

第20批後其他active SQL=1，依保護條件停，不送第21批、不終止他人。後續只讀確認其他active SQL=0、清理SQL=0、Preview可讀，未在同輪恢復清理。staging仍ACTIVE_HEALTHY；20筆保留主檔/完整明細指紋與筆數一致，公開列表13筆及跨期間歷史API再次通過。DB6279498899 bytes，7GB線不變。

1059450由成功批次確認，本輪未重做全範圍殘留計數；上一完整殘留檢查至847588為0。任務維持啟用，下一輪讀最新checkpoint，先健康及無工作再從1059450接續。範圍清理未完成，歷史追加暫停；Production、schema、layout、來源ZIP及對帳紀錄未變。


## 2026-10-30 18:21 小批清理checkpoint

本輪重新核對無匯入/清理/其他active SQL、staging健康及公開讀取後，從938588完成100個1000筆序列小批次，新增確認刪除100000主檔、335484明細。累計確認下限976000主檔、3241061明細，另先前25000主檔批次明細數仍未知。最新已提交游標1039450，快照上限1504397。

每10批健康及Preview view讀取正常，所有小批回覆均低於20秒，沒有工具錯誤。收尾ACTIVE_HEALTHY、其他active SQL=0、清理SQL=0；20筆保留交易主檔/完整明細指紋及筆數一致，公開列表13筆及跨期間歷史API再次通過。DB6279449747 bytes，7GB線不變，未啟動任何匯入。

本輪達100批上限正常停止。1039450由成功批次回覆確認，本輪未重做全範圍殘留計數；上一完整殘留檢查至847588為0。下一輪讀最新checkpoint先健康及無其他工作，再從1039450接續。範圍清理未完成，任務維持啟用；Production、schema、layout、原檔及對帳紀錄不變，歷史追加仍暫停。


## 2026-10-30 17:18 小批清理遇其他查詢後停止

本輪先重驗staging健康、無匯入/清理/其他active SQL、公開列表及歷史API，再從848588接續。先前未提交的下一批已在本輪第一批確認成功。共完成90個1000筆小批次，新增確認刪除90000主檔、307357明細。累計確認下限876000主檔、2905577明細，另先前25000主檔批次明細數仍未知。最新成功提交游標938588，快照上限1504397。

第90批後健康檢查發現其他active SQL=1，依保護條件停止，不送第91批，不中止他人查詢。後續只讀確認其他active SQL已回0、清理SQL=0、Preview view可讀，未因恢復正常而在同輪繼續追加清理。staging仍ACTIVE_HEALTHY；20筆保留主檔/完整明細指紋及筆數一致，公開列表13筆與跨期間歷史API再次通過。DB6279400595 bytes，7GB保護不變。

本輪游標由90批成功回覆確認，未執行整段至938588的殘留計數；上一完整殘留檢查至847588為0。下一輪先核對無其他工作及健康，再從938588接續。任務維持啟用，範圍清理未完成，歷史追加仍暫停；Production、schema、layout、來源ZIP及對帳紀錄不變。


## 2026-10-30 16:34 工具錯誤後安全停止

本輪第一個1000筆小批已確認刪除1000主檔、2189明細，游標848588。累計確認下限786000主檔、2598220明細，另先前25000主檔批次明細數仍未知。第二批工具回isError，因此立即停止，未自動重試；原始錯誤本文未保留，不能將原因斷言為DB timeout、自動審核拒絕或容量問題。

只讀對帳確認無清理/匯入SQL執行中，848589至849588這1000筆下一批目標主檔仍完整存在，故不把第二批計為已刪除。最新游標由已成功批次確認；上一次全範圍殘留檢查至847588為0，本輪未再執行截至848588的完整殘留計數。

staging仍ACTIVE_HEALTHY、Preview view可讀，20筆彰化保留主檔/完整明細指紋及筆數一致；公開列表13筆與跨期間歷史API再次通過。DB6279392403 bytes，7GB不變。保留任務啟用，下輪須先重新確認無其他清理/匯入與健康讀取，再從最新checkpoint游標848588接續，遇錯須保留完整工具錯誤本文，不能盲目連續重試。

資料範圍整理未完成。Production、schema、layout、原始ZIP與匯入對帳紀錄不變，歷史追加仍暫停。


## 2026-10-30 15:20 小批清理checkpoint

本輪已先核對為新的檢查輪次，與15:02完成批次不同，才接續處理。完成100個1000筆序列小批次，新增確認刪除100000主檔、332922明細。累計確認下限785000主檔、2596031明細，另先前25000主檔批次明細數仍未知。最新已提交游標847588、快照上限1504397；已核對id<=847588無範圍外殘留。

每10批健康及Preview view讀取正常，所有小批回覆均低於20秒。收尾ACTIVE_HEALTHY、其他active SQL=0，20筆彰化保留交易主檔與完整明細指紋/筆數前後一致；公開列表13筆與跨期間歷史API再次通過。配置大小6279376019 bytes，7GB線不變，未啟動任何匯入。本輪達100批上限正常停止，尚未整理完成，下輪讀最新checkpoint從847588接續。

原始ZIP、raw CSV及chunk對帳紀錄均保留。Production、schema、layout未變更，歷史追加仍暫停。


## 2026-10-30 15:02 小批清理checkpoint

本輪完成100個1000筆序列小批次，新增確認刪除100000主檔、335042明細。累計確認下限685000主檔、2263109明細，另先前25000主檔批次明細數仍未知。最新已提交游標747292、快照上限1504397；已核對id<=747292無範圍外殘留。

每10批健康及Preview view讀取正常，所有小批回覆均低於20秒。收尾ACTIVE_HEALTHY、其他active SQL=0，20筆彰化保留交易主檔與完整明細指紋/筆數前後一致；公開列表13筆與跨期間歷史API再次通過。配置大小6279367827 bytes，7GB線不變，未啟動任何匯入。本輪達100批上限正常停止，尚未整理完成，下輪讀最新checkpoint從747292接續。

原始ZIP、raw CSV及chunk對帳紀錄均保留。DELETE不保證立即縮小配置大小，未執行VACUUM FULL或重建。Production、schema、layout未變更，歷史追加仍暫停。


## 2026-10-30 14:02 小批清理checkpoint

本輪完成100個1000筆序列小批次，新增確認刪除100000主檔、323297明細。累計確認下限585000主檔、1928067明細，另先前25000主檔批次明細數仍未知。最新已提交游標646950、快照上限1504397；已核對id<=646950無範圍外殘留。

每10批健康及Preview view讀取正常，所有小批回覆均低於20秒。收尾ACTIVE_HEALTHY、其他active SQL=0，20筆彰化保留交易主檔與完整明細指紋/筆數前後一致；公開列表13筆與跨期間歷史API再次通過。配置大小6279343251 bytes，7GB線不變，未啟動任何匯入。本輪達100批上限正常停止，尚未整理完成，下輪讀最新checkpoint從646950接續。

阿勇12:51截圖確認秀水有2021-11-12成交可查，此為既有舊日期資料的具體案例，不代表110S4以前或之後各季均完整。原始ZIP、raw CSV及chunk對帳紀錄保留，Production、schema、layout未變更，歷史追加仍暫停。


## 2026-10-30 12:24 小批清理checkpoint

本輪完成100個1000筆序列小批次，新增確認刪除100000主檔、333770明細。累計確認下限485000主檔、1604770明細，另先前25000主檔批次明細數仍未知。最新已提交游標546752、快照上限1504397；已核對id<=546752無範圍外殘留。

每10批健康及Preview view讀取正常，所有小批回覆均低於20秒。收尾ACTIVE_HEALTHY、其他active SQL=0，20筆彰化保留交易主檔與完整明細指紋/筆數前後一致；公開列表13筆與跨期間歷史API再次通過。配置大小6279253139 bytes，7GB線不變，未啟動任何匯入。本輪達100批上限正常停止，尚未整理完成，下輪從最新checkpoint游標546752接續。

阿勇12:06再次確認前台初步驗證OK，並確認先清理、之後只回補彰化縣sale/presale歷史資料的方向。歷史回補須待清理完整核對後，準備明確scope與新chunk版本且容量/健康可行；本清理輪仍不恢復追加、不重跑舊national workflow。Production、schema、layout、原始ZIP及匯入對帳紀錄維持不變。


## 2026-10-30 11:59 小批清理checkpoint

本輪完成100個1000筆小批次，新增確認刪除100000主檔、359051明細。累計確認下限385000主檔、1271000明細；先前額外25000主檔批次明細數未知，仍不宣稱精確總數。最新已提交游標443612，快照上限1504397；已完整核對id<=443612無範圍外殘留。

每10批健康及Preview view讀取正常，所有小批回覆均低於20秒。收尾ACTIVE_HEALTHY、其他active SQL=0，20筆彰化保留交易主檔與完整明細指紋/筆數前後一致；公開列表13筆與跨期間歷史API再次通過。配置大小6279146643 bytes，沒有新增匯入，7GB線不變。使用者11:32錄影亦確認彰化查詢、換頁/跳頁、跨期歷史展開與明細等具體案例。

本輪因達100批上限正常停止，尚未整理完成；下輪讀最新checkpoint從443612接續。原始ZIP、raw CSV、chunk紀錄保留；原chunk紀錄不代表刪除後全國覆蓋。Production、schema、layout未更動，歷史追加維持暫停。


## 2026-10-30 Preview查詢改為彰化縣範圍

依使用者指示，頁面主標題與metadata改為「彰化縣實價登錄查詢」，說明、範圍提醒及選單同步調整。縣市預設且僅可選彰化縣，資料類型保留買賣／預售；layout、篩選欄位位置、明細與歷史面板樣式不變。

Preview staging主查詢API未帶縣市時明確套用彰化縣；外縣市或租賃回400 scope_unavailable，不再落入全國查詢。此API限制只在原feature分支＋staging＋Pages host保護條件內生效，不更動Production的既有發布開關及查詢邏輯。Preview專用歷史API的anchor亦限彰化縣，歷史仍對全部已匯入期間比對。

TypeScript、ESLint、build已通過。83896b5已部署至32571364.good-m2-cc.pages.dev，公開HTML標題與選單驗證通過；未帶county的彰化市9月sale回13筆、presale回8筆且全部為彰化縣，外縣市與租賃回400 scope_unavailable。穩定Preview公開列表與跨期間歷史API再次通過。資料刪除尚未全部完成，歷史回補仍暫停，不能把文字範圍調整解讀為資料已完整。

## 2026-10-30 10:24 小批清理checkpoint

本輪每批1000筆，已完成93批：新增確認刪除93000主檔、324992明細。累計確認下限285000主檔、911949明細，另前輪25000主檔批次的明細數未知，仍不編造精確總數。最新已提交游標343612，快照上限1504397，尚未完成範圍整理。

每10批核對健康與Preview view均通過；20筆保留交易來源指紋及明細數重新核對一致。前台公開列表13筆與跨期間歷史API再次通過；使用者截圖確認秀水956筆結果及歷史展開案例。配置大小6278966419 bytes，7GB線不變，沒有新增匯入。

第94批因工具目錄更新在送出前被拒絕，本輪不重送。這不是DB連線故障或自動審核拒絕。後續只讀確認沒有清理SQL仍在執行、Preview view可讀；任務維持啟用，下輪從343612接續。歷史回補仍暫停，沒有全國資料完整聲明。詳細checkpoint見 `docs/moi-changhua-scope-cleanup-2026-10-30.json`。

## 2026-10-30 10:07 彰化買賣／預售保留範圍清理進行中

使用者已授權刪除測試專案niorteztdbuyusemsgwa的非彰化縣交易及租賃，保留彰化買賣／預售與對應土地、建物、車位明細。Production、欄位與layout不變。已下載驗證使用者原始113/114/115年度ZIP及當期ZIP：所有12個已登錄來源SHA均有逐位元相符備份，年度ZIP CRC通過，當期SHA8295980亦相符，不需重新請使用者下載。

明細外鍵為ON DELETE RESTRICT。清理使用同一SQL交易先刪目標明細，再刪主檔，條件固定county IS DISTINCT FROM 彰化縣 OR dataset_type=rental，快照上限id1504397。保留來源原檔及匯入對帳紀錄。20筆保留交易的原始指紋及明細數抽查一致。

已逐批確認至少192000主檔、586957明細刪除；另一個25000主檔批次在客戶端停止等待後已完成，但缺少明細回覆，不將未知數列為精確總計。10:07確認id<=247751已無範圍外殘留，且沒有清理SQL仍在執行。尚有後續範圍外資料，不能宣稱清理完成。原25000筆批次耗時升高，因此停止連續大批，縮為1000筆批次，小批已實測成功。

staging仍ACTIVE_HEALTHY，公開列表13筆、跨期間歷史API均再次通過。資料庫配置大小仍6278876307 bytes；DELETE只讓頁面可重用，不承諾立即縮小磁碟。未執行VACUUM FULL或重建表。

既有檢查任務接續小批範圍整理，禁止自動匯入全國或重跑舊已完成chunk。清理後須盤點並處理「舊chunk紀錄仍在，但範圍外資料已移除」的語意，任何未來彰化限定回補必須用明確scope及新chunk版本。完整歷年彰化回補尚未完成，7GB保護保留。

## 2026-10-30 精簡儲存第一輪離線試驗完成

依使用者指示保留所有欄位與layout，試驗不再在DB重複保存不供目前查詢使用的完整原始JSON；正式importer尚未啟用。主檔保留標準化全部欄位、備註原文、原始指紋及ZIP定位；明細保留全部標準化欄位與原始指紋，異常持分原文仍保留，其餘raw_record可為空物件。沒有刪除欄位、既有DB資料或改前台API/畫面。

以113S2完整63檔、180310筆交易、616679筆明細離線逐筆驗證，JSON payload由695392664降至360335437 bytes（減48.18%）。所有標準化欄位、指紋、官方備註及異常持分原文比對一致。只讀DB抽樣主檔10000列與明細13368列亦顯示重複JSON有顯著占用。這不是已回收磁碟量，不能保證47季能全部容納7GB。

已新增離線試驗腳本、回歸案例及可重現報告，見 `docs/MOI_COMPACT_STORAGE_TRIAL.md` 與 `docs/moi-compact-storage-trial-2026-10-30.json`。Python兩個精簡案例及六個來源修復案例、TypeScript、ESLint、build通過。長期原檔備份/還原驗證、來源對照、新chunk版本及有限staging實寫試驗仍是啟用前必要工作；不把Actions七天artifact當長期備份。回補與自動檢查仍暫停，7GB檢查不變；未變更Production或付費配額。

## 2026-10-29 22:31 113S2對帳完成，容量安全暫停

113S2 attempt8 job123477089076於22:02:23成功。已讀artifact12902733416完整報告：63份主來源檔、180,310筆有效主檔、616,679筆連結明細、1,839批。從該artifact原始ZIP以實際checkout23adff7 parser重算全部預期chunk SHA，與DB本次批次集合逐一比對，1,839批完全吻合，無缺漏或額外批次。

報告complete=false，唯一來源例外為官方持分7/5（分子大於分母）。DB獨立核對：raw_record完整保留7與5，標準化分子/分母均null；未反轉、猜測或刪掉整筆明細。已記錄為原文保留、持分不可用的明確處置，非漏匯。不能僅用job綠燈宣稱全國完整。

22:26:40資料庫6,278,876,307 bytes，last_chunk15531，staging ACTIVE_HEALTHY，Preview view及一般公開列表/跨期歷史API仍通過。距7,000,000,000僅剩721,123,693 bytes；最近兩季分別增約0.81GB及0.61GB，已接近安全上限。本輪未啟動113S1，暫停所有追加（含小範圍修復），不修改Production、不刪資料、不增加付費容量、不調高或繞過7GB檢查。

目前當期+10歷史季（113S2～115S3）已執行，47歷史季未執行。原3主檔/69明細修復、2筆日期隔離與101S1/S2可取得範圍仍待處理。需要先確定符合7GB限制的儲存方案，才能恢復；已停止此項重複檢查，避免無條件重試或重複通知。這是容量阻礙通知，不是資料補齊完成通知。

## 2026-10-29 21:30 113S3逐批SHA對帳通過，續跑113S2

113S3 job123441695682於20:55:23成功，已讀取實際artifact12899280573完整報告：64份主來源檔、199,333筆有效主檔、686,910筆連結明細、2,025批、來源issues為0。從artifact原始ZIP以該run舊版parser重算全部預期chunk SHA，與此季本次寫入的DB批次集合逐一比對：2,025筆全部吻合、無缺漏/額外chunk。排除本季先前41筆舊批次紀錄，避免將同來源舊試匯的4,059筆重複相加。舊run整體cancelled是因其餘未執行jobs仍取消，不代表本季失敗。

21:27:42確認staging ACTIVE_HEALTHY、無其他執行中匯入、其他active SQL為0、容量5,669,555,347 bytes、last_chunk13692、Preview view可讀；一般公開列表13筆、跨期間歷史API再次通過。故僅續跑113S2，run40639000903 attempt8，job123477089076，21:29:31開始。此attempt完整58jobs為10成功、47取消、1執行中；沒有併發其他季度。21:29:57容量與last_chunk尚未變動，來源下載/驗證或匯入準備中，不宣稱已追加或完成。

下一輪先核對113S2最終report、來源例外及預期chunk；若仍跑只監看。餘額約1.33GB且上一季增加約0.81GB，後續接近7GB須停追加，不可依固定順序盲目連續續跑。Production與7GB RPC保護未變更。尚有既有3主檔/69明細修復、2筆日期隔離與101S1/S2可取得來源範圍待釐清，全國仍未完整。

## 2026-10-29 20:19 單季113S3續跑

20:17確認staging為ACTIVE_HEALTHY、無其他匯入工作、其他active SQL為0，容量4,857,547,923 bytes，Preview view可讀。一般公開條件查詢13筆及跨期間歷史API再次通過。使用者19:43～19:44提供實際iPad截圖，已確認數筆歷史按鈕展開、跨年度紀錄、官方交易備註與車位標示；此為具體畫面案例驗證，不代表所有配對或資料完整。

僅續跑取消的113S3，run40639000903 attempt7，job123441695682，20:18:23開始。讀取本attempt全部58jobs，只有113S3在執行，既有9成功保留、48項仍取消。來源下載/匯入步驟執行中，尚無本季最終report，不能計為完成。沿用23adff7 parser，新增修復規則不在此run內，完成後仍須讀取完整異常report及chunk核對。

20:19:36容量4,865,264,787 bytes、last_chunk11696，Preview view仍可讀，確認已開始追加。保留7GB檢查，不再啟動另一季。後續先檢查本job及其artifact；成功亦須完成對帳才可接續113S2（本attempt取消job123441691396）。原可恢復3主檔/69明細及2筆異常日期隔離仍待處理。

## 2026-10-29 19:31 指定113S4來源修復及公開歷史API驗證

run `40865549847` 已成功，先以無DB憑證的公開查詢驗證通過，才執行113S4指定2個來源鍵修復；沒有重跑整季或其他季度。已讀取選定來源對帳artifact `12893511793`：2筆主檔、7筆明細（5土地、2車位）均已追加，兩個RPC批次各processed=1、preserved_newer=0。DB獨立核對主檔/明細數及官方備註、棟及號原文相符。報告import_scope=selected_source_keys、import_complete=true、complete=false，不能解讀為全季或全國已完整。

19:30容量為4,857,531,539 bytes，last_chunk_id=11667；7GB限制及新期資料保護未更動。其餘可恢復來源仍有3筆主檔/69筆明細（114S3、115S1、115S3），另2筆5碼日期維持隔離，不猜日期。舊run仍為9成功/49取消；下一未執行季為113S3。本輪已處理113S4小範圍修復，不再啟動另一季。

最新版Preview公開列表回傳13筆9月交易，從該公開回應取得ID再查同站歷史API，取得至少2筆成交的一個群組，且包含9月之前的成交；回應按日期遞減。跨期間歷史API驗證通過，瀏覽器按鈕顯示/操作端到端仍未驗證。測試未使用私有DB查得的地址或ID。實際部署為 `b5b12e74.good-m2-cc.pages.dev`，穩定Preview入口不變。全國資料尚未補齊，沒有發送完成或邀請測試通知。

## 2026-10-29 歷史交易整棟樓層標示相容修正

實際公開查詢確認主列表可讀取，但歷史比對因舊來源「全棟／2層」與官方來源「全」的文字差異漏掉同一整棟成交。新增明確整棟標示的相容規則；「一層」及「非全棟」不會被併為整棟。仍保留完整門牌、地號組合與面積比對。新增真實格式回歸案例，部署後再核對跨日期歷史API；未將空的歷史回應當作功能已通過。

## 2026-10-29 公開Preview驗證及113S4小範圍修復流程

新增 `.github/workflows/moi-preview-source-repair.yml`：以沒有資料庫憑證的獨立job，使用一般行政區與日期篩選讀取公開Preview；歷史驗證的ID僅取自同一公開列表回應，不使用從私有DB查得的地址或ID。使用誠實CI User-Agent，不偽裝瀏覽器、不調低Cloudflare保護。若公開查詢失敗，後續修復job不執行。

403的body已確認為Cloudflare1010；依[官方文件](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/error-1010/)使用明確識別應用程式的User-Agent後，只讀公開查詢已成功返回13筆9月交易。這是正常API客戶端設定，沒有關閉或略過保護；沒有再執行先前被拒絕的私有地址/ID外傳測試。

只有公開查詢成功才依序下載、核對原始113S4 ZIP SHA，使用最新parser與`MOI_ONLY_SOURCE_KEYS`修復指定2筆主檔（最多7筆連結明細）；並核對每筆RPC回覆。與既有匯入共用concurrency鎖、staging目的地保護、保留新期及7GB RPC檢查。不是重跑全國或整個季度。歷史API驗證另記狀態，不將尚未驗證的UI功能混報通過。此流程狀態以實際Actions報告為準。

## 2026-10-29 18:53 全國歷史回補對帳與來源修復準備

run `40639000903` attempt6 的全部58項jobs（兩頁）已讀取：9項成功、49項取消；113S4於18:48完成本次續跑。已下載當期及113S4～115S3共9份最新對帳報告，從原始季度ZIP用舊版parser重建每個預期chunk SHA，逐一與資料庫批次紀錄核對，9份均無遺漏chunk。此結論只表示舊parser接受的資料已寫入，不代表來源異常列或其餘49季完成。完整數字見 `docs/moi-backfill-audit-2026-10-29.json`；跨來源批次或筆數不可相加當作去重後成交筆數。

測試資料庫4,857,523,347 bytes，7GB檢查仍保留。土地/建物/車位明細對交易的外鍵已驗證，但外鍵本身不證明來源明細齊全。113S4原報告仍有10項異常，因此沒有宣稱全國完整。

本次準備parser修復（尚未追加至DB）：僅對4個已人工核對且整列SHA吻合的官方「棟及號」未跳脫逗號列合併欄位，保留原值與修復紀錄，不改交易備註；另1筆鄉鎮欄空白、官方地址明確寫鼓山區的指定來源列，僅補正標準化行政區，raw_record保留空白原值。實測可回復5筆主檔與76筆對應明細。異常持分保留官方原值且標準化值維持null；2筆日期只有5碼，無其他已匯入官方版本可供核對，持續隔離，不猜日期。

新增 `MOI_ONLY_SOURCE_KEYS` JSON清單模式，可限制修復最多100筆指定來源；缺少來源或格式錯誤直接停止。此模式的report標示 `selected_source_keys`，不會將整季 `complete` 標成true。未受影響的主檔payload不新增空欄位，以保留原chunk SHA及安全重跑辨識。Python六項測試及9個原始檔案解析驗證通過。

後續作業必須用含本次修復的commit；重跑舊run會checkout舊SHA `23adff7`，不會套用新parser。尚未修改workflow或啟動新的整批重匯。因本次瀏覽器連線逾時、執行環境讀Preview API收到403，無法重新確認Preview讀取，因此遵照健康檢查條件，本輪未啟動113S3或來源修復追加。這不是已判定網站故障；待可驗證Preview正常後，才安全接續一季或指定來源修復。

同物件歷史交易已部署於 `eaf29e2`，核心測試與真實資料SQL比對通過，線上端到端仍待驗證。自動審核拒絕將私有staging查得的精確地址/ID送到公開Preview API的測試；未繞過該拒絕。一般公開篩選讀取亦遇執行環境403，沒有把它當作測試通過。

## 2026-10-29 Preview 同物件歷史交易（實作，待線上驗證）

新增獨立 `/api/public/real-price-history`，只允許既有 Preview 分支及 staging 目的地。依目前頁面最多20筆ID，對全部已匯入買賣資料查詢，不沿用日期、價格、面積與頁次篩選；主列表先顯示，歷史核對不阻塞原查詢。已取得至少2筆不同成交後才顯示「歷史交易」按鈕，按鈕直接展開已取得的完整紀錄，不另查空資料。

採保守比對：完整門牌（含樓層）與縣市行政區、土地組合及房地面積一致；純土地另核對持分。排除門牌範圍、多址、無樓層的集合住宅、缺身分明細及無法辨識個別格位的獨立車位。同一來源別名及同日期/金額/面積的重複事件不計多筆。門牌格式改變、重測改號、面積改變等尚無足夠證據自動串接，不以模糊匹配宣稱同一物件。歷史資料仍未全數回補；此功能僅涵蓋已匯入且可確認相同身分的紀錄。

新增 `scripts/test-real-price-history.ts` 驗證單筆畫面對全部3筆、跨日期、同社區不同戶/樓層、重複來源、不同地號組合、持分及官方備註原文。真實資料「一德南路200巷15號」確認2026-09-02與2026-06-07可同組；線上顯示與錯誤處理仍須部署後驗證。Production、RLS、資料庫schema均未變更。

## 2026-10-29 Preview 第一層車位標示

實價查詢桌機列表與手機卡片，在交易標的為車位或官方明細含車位時顯示 🚗（含車位）。車位填報價格為0仍會標示；不以房屋類型、備註文字或價格推測有車位。歷史 append 已從 run40639000903 attempt6 的113S4續跑，保留7GB檢查與新期資料保護；後續由原每小時檢查任務依容量及連線狀態逐季安全接續，未宣稱歷史資料完整。

## 2026-10-29 Preview 實價查詢段名提示

`feature/real-price-public-search-v1`：地段欄位保留自由輸入，依縣市及鄉鎮市區載入官方段名，直接於輸入框下顯示可點選的備選按鈕，不需展開下拉選單；輸入部分段名即時篩選，切換行政區會清除原段名。清單來自國土測繪中心 ListTown / ListLandSection，獨立於交易資料庫，不代表各段均已有匯入交易。上游有逾時限制及每日快取，讀取失敗仍可手動輸入或留空。Production 未變更；歷年資料完整性及 Preview 首頁穩定性不在本次變更驗收範圍。

## 2026-10-12 銷售 LINE 第二階段（待驗證）

PR #48/#49 已合併，正式後台手機基本操作已由阿勇確認正常。第二階段準備 Production LINE Webhook、獨立 Cron Worker 與通知啟用時間；正式通知尚未啟用，Cloudflare 管理設定與端到端送達驗證尚待完成。設定、驗收與回退以 [docs/SALES_LINE_PRODUCTION_RELEASE.md](docs/SALES_LINE_PRODUCTION_RELEASE.md) 為準。以下舊 Sprint 盤點保留作歷史背景，不代表本次部署狀態。

本文件是 good.m2.cc 目前產品狀態的入口文件。詳細技術架構請以 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) 為準；路由請以 [docs/ROUTE_MAP.md](docs/ROUTE_MAP.md) 為準；安全與上線判斷請以 [docs/SECURITY_CHECKLIST.md](docs/SECURITY_CHECKLIST.md) 與 [docs/GO_LIVE_CHECKLIST.md](docs/GO_LIVE_CHECKLIST.md) 為準；後續排程請以 [ROADMAP.md](ROADMAP.md) 為準。

## Project Overview

good.m2.cc 目前在 `preview/sprint-a-production-wiring` 分支整併為 Next.js App Router + Supabase 的 preview/staging 版本。既有靜態首頁內容已保留，後台物件管理、登入、圖片上傳、封面設定、公開物件頁與詢問單基礎流程已部分完成。

Production 仍不建議直接切換至此分支。原因請見 [docs/GO_LIVE_CHECKLIST.md](docs/GO_LIVE_CHECKLIST.md)。

## Current Branch

`preview/sprint-a-production-wiring`

## Project Governance

所有 Sprint 與專案接手流程請先遵循 [PROJECT_WORKING_AGREEMENT.md](PROJECT_WORKING_AGREEMENT.md)。技術開發規範請參閱 [docs/DEVELOPMENT_GUIDE.md](docs/DEVELOPMENT_GUIDE.md)。

## Documentation

- README
- ROADMAP
- PROJECT_STATUS
- RELEASE_NOTES
- CONTRIBUTING.md：開發規範與 Rule No.5 文件同步標準

`RELEASE_NOTES.md` 作為每個 module 完成後的版本紀錄與驗證摘要。

Engineering Standard:

- CONTRIBUTING.md 為專案開發規範。
- 所有開發遵循 Yongmei OS Engineering Standard Rule No.1~No.6。

## Sprint A Completion

Sprint A 目前是「核心平台 preview 可驗收」狀態，不是 production ready。主要已完成範圍為：Supabase Auth 後台登入、物件 CRUD 基礎、圖片上傳與封面、公開物件頁、部分 audit log、部分詢問單後台。

## Sprint A Milestone 2 Progress

- M2-001 Property Edit：已完成 `/admin/properties/[id]/edit` 四欄位編輯。
- M2-002 Property Publish Workflow：已完成 `/admin/properties` 列表發布與下架回草稿。
- M2-003 Featured Property：已完成 `/admin/properties` 列表精選標記切換，使用既有 `properties.is_featured` 欄位。限制：本階段不做首頁串接、不做 media/delete/SEO。
- M2-004 Homepage Featured API：已完成首頁精選物件資料來源串接，使用 `/api/public/featured-properties`；限制：本階段不做 media/search/SEO/TikTok。

## Sprint 0-16 Status Overview

| No | 功能 | 狀態 | 完成度 |
| --- | --- | --- | --- |
| 0 | Route 規劃 | 部分完成 | 50% |
| 1 | Hero | 已完成 | 90% |
| 2 | 架構與資安規格 | 部分完成 | 55% |
| 3 | 主推物件 | 部分完成 | 70% |
| 4 | 表單安全 | 部分完成 | 50% |
| 5 | Seller Calculator | 未完成 | 15% |
| 6 | Mortgage Calculator | 部分完成 | 35% |
| 7 | Purchase Cost | 未完成 | 0% |
| 8 | Featured Properties | 部分完成 | 65% |
| 9 | TikTok | 未完成 | 0% |
| 10 | Audit Log | 部分完成 | 55% |
| 11 | Blocklist | 部分完成 | 45% |
| 12 | Dashboard | 未完成 | 0% |
| 13 | Inquiries | 部分完成 | 60% |
| 14 | Go Live | 部分完成 | 25% |
| 15 | Maintenance | 未完成 | 10% |
| 16 | Analytics Dashboard | Sprint C / Planned | 0% |

## Completed

- 首頁 Hero 圖片、文案、CTA 與深藍遮罩已保留於 Next 首頁來源。
- `/admin/login` 已使用 Supabase Auth 登入流程。
- `/admin/properties`、`/admin/properties/new`、`/admin/properties/[id]/edit` 已存在。
- `/properties`、`/properties/[slug]` 已存在，前台只顯示公開物件的方向已建立。
- 單張圖片上傳與封面設定已完成 preview 驗收。
- `supabase/migrations/202606250101_sprint_a_core_platform.sql` 已建立核心資料表、RLS 與 storage bucket 規格。

## Partially Complete

- 表單安全已建立 `inquiries`、`blocklist`、Turnstile 驗證入口與 API；首頁服務表單 Phase 1 已改送 `/api/public/inquiries`。Rate limit、Turnstile production 強制驗證與新 API Resend 通知仍未完成。
- Audit log 有資料表與寫入 helper，但尚未建立 `/admin/audit-logs` 查看介面。
- Blocklist 有資料表與表單檢查，但尚未建立 `/admin/blocklist` 管理介面。
- Inquiries 後台已有列表與詳細頁，但篩選、搜尋、CSV、刪除與完整 audit 還未完成。
- 精選物件資料條件、API、後台 `is_featured` 切換與首頁資料串接已存在；媒體、搜尋與 SEO 仍未納入本階段。

## Not Yet Complete

- TikTok 最新影音、影片後台。
- Dashboard 總覽。
- Analytics Dashboard 已移至 Sprint C / Planned，不進入目前 Sprint A 開發。
- GA4 基礎載入尚未完成，建議列為 Sprint A/B boundary 或 Sprint B First Step，先累積 page_view / event 資料後再做 dashboard。
- `/calculator` 工具入口與三個獨立試算工具路由。
- 圖片壓縮、EXIF metadata strip、MP4、YouTube、輪播。
- Production go-live 完整驗收與備份演練。

## Technical Debt Backlog

### A-099 Legacy Static Cleanup

目的：集中管理從靜態網站轉換到 Next.js 後可能殘留的相對路徑、舊 API、SEO、資源載入、路由相容性與前端錯誤問題。

Checklist:

- [ ] HTML 相對路徑
- [ ] Image assets 路徑
- [ ] JS API endpoint
- [ ] CSS resource path
- [ ] favicon
- [ ] OG image
- [ ] manifest
- [ ] robots.txt
- [ ] sitemap.xml
- [ ] canonical URL
- [ ] structured data (JSON-LD)
- [ ] metadata consistency
- [ ] anchor navigation
- [ ] client-side routing compatibility
- [ ] legacy script compatibility
- [ ] browser console warnings
- [ ] Network 404 檢查
- [ ] Mixed Content 檢查
- [ ] Preview 與 Production 一致性
- [ ] Performance
- [ ] Accessibility

分類摘要：

- Technical Debt Backlog
- A-099 Legacy Static Cleanup
- HTML
- Assets
- API
- Routing
- SEO
- Metadata
- Console
- Network
- Performance
- Accessibility

Done Criteria:

Legacy Static Cleanup 完成代表：

- Preview 無 404 Assets
- Preview 無 JS Console Error
- Network 無錯誤資源
- 所有 API Endpoint 正確
- 所有圖片正常載入
- SEO 基本資源完整
- Client-side navigation 正常
- Mobile / Desktop 驗證完成
- Preview 與 Production 行為一致

## Known Production Risk

- 目前不建議正式 production 切換；請先以 preview/staging 驗收。
- CSP 與 HSTS 尚未完整 production 化。
- Turnstile、rate limit、首頁表單 preview 端到端驗證與新 API 通知信需完成。
- D1 與 Supabase 兩套資料來源共存，需避免 production 設定誤用。
- public Supabase key 已放入 Wrangler vars；service role key 不得放到前端或公開設定。

## Next Priority

1. 先補 Sprint A 必須項：表單安全端到端、rate limit、首頁精選物件、audit/blocklist/inquiries 最小管理能力。
2. 再做 production security hardening：CSP、HSTS、Turnstile production、備份與 rollback SOP。
3. 最後才排 Sprint B/C：試算工具、TikTok、Dashboard、Analytics。

## Real-price road search — 2026-10-28 Preview

- Preview staging searches `address_display`: imported `road_name` is null for the reported 民族路129巷14號 and 公園路一段133巷6號 records.
- Road-only input covers every section; specifying a section limits it. Added default-on「包含巷弄」; explicit 巷/弄 overrides that checkbox. Full-width door numbers are supported and numeric lane/alley boundaries remain exact.
- Database regex filtering happens before count/pagination. The verified dataset retains its existing `road_name` source; it does not currently expose complete addresses for lane filtering. Complete address coverage remains a prerequisite for production rollout.
- Regression checks cover sections 1–8, section aliases, lane inclusion/exclusion, explicit lane/alley matching, full-width numbers, and unsafe input. Read-only staging SQL recovered both reported records and a 彰鹿路五段 lane record.
- This change targets `feature/real-price-public-search-v1` Preview.

### Custom transaction dates — 2026-10-28 Preview
- 交易期間新增「自訂日期區間」；接受民國7碼（1100101）及西元ISO（2021-01-01）。起訖日均包含當日。
- UI rejects invalid dates and reversed ranges; the API independently validates actual calendar dates. Existing recent-year presets remain available.

### First historical Preview batch
- Added a push-triggered GitHub trial for official 113S4, restricted to 彰化縣 (n). It downloads with curl, validates CSVs, preserves the source ZIP as an Action artifact, and reconciles RAW rows.
- The first searchable batch includes sale master rows only. Every master is validated before writes; existing transaction source keys are preserved so historical data cannot overwrite newer records. Land/building/parking detail coverage remains pending and the Preview notice still applies.
- A successful workflow and front-end date/location query are required before reporting this batch as available.

### Changhua 113–114 quarterly backfill — 2026-10-28
- First 113S4 batch completed: 18,351 RAW rows in 11 files reconciled; 3,660 sale transaction masters appended. Browser query for 秀水鄉, 1100101–1131231, 房地＋土地 returned 105 records.
- Next batch processes 114S4→114S1 and 113S3→113S1 sequentially. Each quarter validates ZIP/CSV, reconciles RAW rows, then exposes sale masters to Preview; already present master source keys remain unchanged.
- The shared ingestion concurrency group prevents overlap. A failure stops subsequent quarters; completed source files/transaction keys allow safe reruns. Archives and summaries are retained as workflow artifacts.
- Coverage is not complete until every quarter succeeds; presale/rental masters and detailed ownership/parking coverage are separate pending work.

### National source and detail ingestion — 2026-10-28
- National parser covers all official county codes and sale/presale/rental masters, joining land/building/parking rows by the source transaction ID within each county/dataset file.
- Validated full 114S4 (127,554 masters / 422,159 linked details) and 115S3 (150,572 / 494,404) archives. Each contains an official invalid ownership share; raw fields are retained and normalized shares are unavailable with a warning, never reversed or fabricated.
- New service-only SECURITY INVOKER RPC imports a chunk atomically, replaces the matching transaction's authoritative detail set, deduplicates replayed chunks, and preserves newer source periods. Legacy records with differing raw data are preserved and counted separately. Anonymous and authenticated EXECUTE are revoked.
- Service-role rollback tests verified detail counts, replay idempotency, and older-source preservation. UI/API expose ownership shares and parking type/price/area/floor; detail fetches page beyond the Data API row cap. Official zero parking prices are not described as free parking.
- New workflow imports current national data first, then queues 57 quarterly archives from 115S3 back to 101S3 with one concurrent historical job. Exceptions are included in archive reports and keep coverage incomplete. Failed jobs stop pending work; database size above 7GB stops ingestion for capacity review.
- Staging only; production publication gates remain in place. Full national historical completion requires successful job reports for every quarter, not merely a workflow launch.
- Browser verified 臺北市士林區天玉街13號九樓: parking 坡道平面 / 地下二樓 / 32.96㎡ / 300萬元 and land share 3422/200000.
- UI verification exposed legacy `moi:<county>:<dataset>:<official-id>` aliases beside the canonical key. A service-only SECURITY INVOKER Preview view suppresses an alias only when that exact canonical source key exists; it preserves raw rows and does not deduplicate merely by date/address/price. Filtering/count/pagination use this view.

### Official transaction notes only — 2026-10-28
- Removed inferred「特殊交易」classification from both API and UI. Desktop/mobile result labels use only「交易備註」when the official 備註 field is nonempty; expanded details display the original text, including its line breaks.
- No keyword-based special-transaction flag or「特殊交易：是」is generated. If the official note itself contains those words, they remain unchanged as part of the source text.

### Result page navigation — 2026-10-28
- Added 首頁/末頁 and a bounded integer page input with 跳頁. Previous/next and current/total pages remain visible; controls wrap on mobile.
- Searching new criteria resets page input to 1. Server pagination accepts safe integer offsets beyond page 1,000, so national-result last pages are reachable.

### National backfill source-width recovery
- 115S1 stopped on an official 32-column row under a 31-column header. Malformed-width rows are now quarantined with original header and values; no guessed merging or data fabrication. Valid neighboring records can continue, and coverage remains incomplete while reports contain exceptions.
- Full 115S1 offline validation now processes 129,056 valid masters and 460,950 linked detail rows with four reported source exceptions. Existing newer-period protections and the 7GB checkpoint remain unchanged.

### Front-end query finalization — 2026-10-29
- User paused historical backfill monitoring to prioritize query acceptance; historical archives will be coordinated separately. Not all 57 official quarter downloads have been verified.
- Removed the placeholder property-history button; this release does not implement same-property transaction history.
- Updated Preview coverage notice to describe partial imported data without claiming that ingestion is running. Road/lane matching, dates, pagination and original official notes remain available.

### Query wait handling — 2026-10-29
- Search cancels after 20 seconds with an explicit service-delay message; timeout is never reported as zero transactions. New searches cancel older requests and ignore stale responses. Database connectivity remains a separate unresolved issue.



### Preview 查詢修復（2026-10-30 UTC）
使用者已明確授權 staging / Preview 後端、SQL 與索引修復。已在 niorteztdbuyusemsgwa 新增 covering index（5,234,688 bytes），DB 6,284,938,387 bytes；未改欄位、view、權限、timeout、Production、layout 或 7GB 保護。精確 sale canonical count 35,845，EXPLAIN ANALYZE 約 1.09 秒；公開首頁/第二頁通過，但末頁仍因寬資料 OFFSET 失敗，因此 Preview API 改為先查該頁 ID 與精確總數，再讀最多 20 筆完整內容。所有篩選及去重仍由同一 view 處理；完整列不符預選頁時回 503。部署後尚待公開深頁、篩選、明細及歷史驗收；cleanup_complete 仍 false。歷史追加仍暫停，未再 DELETE。


### Preview 深頁驗收與空頁邊界修正
82dc16b 部署成功；公開 sale 首頁 20 筆／7.164 秒、第二頁 20 筆／5.598 秒、末頁第 1793 頁 5 筆／6.105 秒，精確總數皆 35,845。超出末頁仍回 HTTP503，驗收立即停止。補上僅 Preview 的 PGRST103 空頁處理，使用相同篩選第一筆查詢取得精確總數，不重送失敗 offset；真正取消與其他錯誤不重試。7 組 route 測試通過，覆蓋篩選、原文備註、車位、空頁、超頁、取消、頁面異動及 Production 隔離；TypeScript、ESLint、build 通過。全表範圍外及孤兒仍 0、40,676 主檔／111,071 明細，20 筆指紋一致。待新部署驗收，cleanup_complete 仍 false，歷史追加仍暫停。


### 彰化範圍整理及 Preview 修復驗收完成（2026-10-31 07:17 台灣時間）
修復部署 bfbb8ea（前置索引／ID 分頁 82dc16b）已通過公開驗收：買賣首頁 20 筆／7.561 秒、第二頁 20 筆／5.184 秒、末頁第 1793 頁 5 筆／5.637 秒；第 1794 頁正常空列表／5.500 秒，精確總數皆 35,845，前兩頁 ID 無交集、排序正確。秀水鄉 2026-08 買賣 3 筆／8 明細／1 車位／1 備註；預售首頁 20 筆、總數 4,623、48 明細／8 車位／2 備註；日期買賣 13 筆及一組跨期歷史排序通過。68 筆公開回應來源交易與 DB 的官方備註原文 MD5、完整明細筆數與車位筆數完全一致；20 筆保留主檔／完整明細指紋亦一致。租賃及外縣市 API 均 400 scope_unavailable。
全表重新精確核對：範圍外 0、快照上限外 0、孤兒明細 0；保留彰化 sale 36,053／presale 4,623，共 40,676 主檔；土地 70,412／建物 30,379／車位 10,280，共 111,071 明細。canonical sale 35,845 與原始 sale 差 208 是既有 view alias 去重語意，未改 view 或刪除保留資料。ACTIVE_HEALTHY、其他 active SQL=0，DB 6,284,938,387 bytes；新增索引 5,234,688 bytes，未調 timeout／配額／7GB 保護，未改 Production、資料庫欄位、layout。累計已確認刪除下限 1,438,127 主檔／4,822,474 明細維持；先前額外 25,000 主檔批次未知明細仍另記，不編造精確刪除總數。
一次只讀對帳工具回 MCP -32603 Internal error，完整回應已存 checkpoint；確認健康與無執行中工作後改用較精簡的聚合雜湊對帳成功，未盲目重送原查詢，不推論 DB timeout 或容量問題。7 組 route 執行測試、TypeScript、ESLint、build 通過（既有 Supabase Edge runtime warning 保留）。cleanup_complete=true；清理檢查 6ae178b105a08191a74779a7b28bb4f1 已確認 is_enabled=false。
**歷史回補尚未完成且仍暫停。** 原始 ZIP、moi_raw_csv_rows、moi_append_chunk_log 與其他對帳/CMS 紀錄保留；append log 僅代表歷史作業紀錄，不表示全國資料完整。未來只能另以明確彰化 sale/presale scope、新 chunk 版本及容量/健康檢查安排回補，本任務未恢復匯入或再 DELETE。


### 2026-10-31 彰化限定回補至 2023 年啟動授權


阿勇明確授權現在恢復回補，直到 2023 年官方四季完整匯入後暫停。僅 staging niorteztdbuyusemsgwa、彰化縣 sale/presale；不恢復任何舊 national workflow，不改 Production、欄位、layout、配額、timeout 或 7GB 保護。清理完成 checkpoint de32302 維持歷史紀錄。
新版本 changhua-sale-presale-through-2023-v1 明確涵蓋 115S3→112S1 共 15 季：先重新核對已匯入季度彰化來源，再補 113S1 與 112 年四季。新 chunk 包含 scope、版本、原始 ZIP SHA，舊全國 chunk log 不作完整證明。每批最多 100 主檔，序列 RPC、無自動重試、20 秒逾時或慢批停止；保留既有較新來源保護與原始官方備註／完整明細。每批獨立核對來源指紋與完整明細集合；每 10 批及每季前後讀取 Preview，任一失敗阻擋後續季度。
先上傳逐位元原始 ZIP 備份至 90 天 artifact，再開始該季 DB 寫入；每季報告另存 repo docs/moi-changhua-through-2023，完整報告／例外也保存 artifact。90 天 artifact 不是長期備份，完成前仍須將新來源保存至使用者檔案並記 SHA。現有年度 ZIP 與 raw/chunk/CMS/對帳紀錄全部保留。
預檢 ACTIVE_HEALTHY、無執行/排隊 workflow、其他 active SQL=0，DB 6,284,938,387 bytes，公開日期列表 13 筆與跨期 history 通過。使用者已有 113 年 ZIP 的 113S1 離線核對：sale 3,239／8,404 明細、presale 746／2,099 明細，無未解來源異常。這是來源筆數，未聲稱已新增或去重後總筆數。6 個新 scope/版本/錯誤/對帳測試與6個既有來源修復測試通過。啟動狀態以新 workflow 及季度 checkpoint 為準，尚未宣告回補完成。
