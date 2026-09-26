# 公寓／華廈／大樓 Excel 匯出 mapping（Phase 1）

來源模板：`新接物件明細表大樓華廈-空白標準版(1).xlsx`

## 匯出路由

- `property_type=apartment` → 本模板，型態勾選「無電梯公寓」
- `property_type=building + building_subtype=huaxia` → 本模板，型態勾選「華廈」
- `property_type=building + building_subtype=highrise` → 本模板，型態勾選「大樓」
- 其他物件 → 維持既有土地／透天模板

`building_subtype` 由後台人工選擇，不以樓層自動判定。

## 主要欄位

| Excel | 資料來源 |
|---|---|
| C11 契約編號 | listing_no |
| I11 銷售期限 | listing_start_date / listing_end_date |
| L11 簽約日 | contract_signed_date |
| C12 案名 | title |
| I12 售屋動機 | sale_motivation |
| C13 總價 | price |
| I13 KEY | showing_key_available |
| C14 底價 | floor_price |
| I14 經紀人 | developer_names |
| C15 地址 | address_private / address_public |
| I15 帶看注意 | showing_instructions |
| I16 現況 | current_condition_type |
| C17 屋主／年齡／性別／工作 | owner_name / owner_age / owner_gender / owner_occupation |
| I17 完工日期 | completion_date |
| C19 地坪 | land_area_ping |
| H19 格局 | layout |
| H20 座向 | orientation |
| D21 主建／附建 | main_building_area_ping / auxiliary_building_area_ping |
| C22 主附建坪 | 主建＋附建 |
| H21 現況用途 | current_usage |
| H22 型態 | property_type / building_subtype |
| J22 / L22 | above_ground_floors / basement_floors |
| C23 公設 | shared_area_ping |
| H23 車位 | parking_space_features |
| C24 車位坪數 | parking_area_ping |
| H24 車道 | parking_access_types |
| C25 總建坪 | building_area_ping |
| H25 車位樓層 | parking_floor |
| J25 車位型態 | parking_arrangement |
| C26 加建坪 | addition_area_ping |
| H26 車位編號 | parking_space_no |
| C27 管理方式 | management_types |
| H27 管理費 | management_fee |
| J27 繳費方式 | management_fee_payment |
| H28 清潔費 | cleaning_fee |
| C30 路寬 | road_width |
| F30 / F31 | elementary_school_district / junior_high_school_district |
| C31 / C32 / F32 | market_area / park_green_space / medical_facility |
| C33 / F33 | nearby_train_station / nearby_bus_stop |
| C34 社區大樓 | community_name |
| C35 / C36 / F36 | total_units / elevator_count / units_per_floor |
| C37 設定 | mortgage_setting_amount |
| C38 / F38 | has_courtyard / is_corner_unit |
| C39 外壁材質 | exterior_materials |
| C41 建物結構 | building_structures |
| B44:G44, A47:G47 | public_facilities |
| A46 | public_facility_floor_notes |
| I48 約看地點 | showing_meeting_location |

## 公開／內部界線

Phase 1 只建立資料來源與匯出，不改前台。

預設後台限定：屋主資料、底價、售屋動機、契約資料、KEY、帶看細節、約看地點、設定金額、追蹤紀錄。

其餘建物面積、樓層、社區、車位、管理、周邊、結構與公共設施保留給 Phase 2 前台揭露設計。
