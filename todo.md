[x] bugs ui when user select data in json-editor-vue component this selectd color is overlayed content and make it hard to read -> need to fix this
[x] enhance show env tags in connection , need to show more in ConnectionSelector when user selected connection need show env tags in value selected connection, current show only connection selected icon , name (remember after update need check ui for case content connection name is long)
show in StatusBar > CurrentPositionPath
[x] error when user update value 0 -> when parser -> null -> show error ( in quick query)
[ ] in raw quick query -> function , when i updat function / procidure somehow i got error , but i copy to raw query -> this worked fine -> need to check why this happen
[ ] in raw query when i comment code in where this include variable :varname then i run query i got error can not paser sql -> need to check this case and fix
[ ] fix query get and format data in query statsment like `'short_type_name',
                    CASE
                      WHEN format_type(a.atttypid, a.atttypmod) LIKE 'character varying%' 
                          THEN REPLACE(format_type(a.atttypid, a.atttypmod), 'character varying', 'varchar')
                      WHEN format_type(a.atttypid, a.atttypmod) LIKE 'character%' 
                          THEN REPLACE(format_type(a.atttypid, a.atttypmod), 'character', 'char')
                      WHEN format_type(a.atttypid, a.atttypmod) = 'double precision' THEN 'float8'
                      WHEN format_type(a.atttypid, a.atttypmod) = 'integer' THEN 'int4'
                      WHEN format_type(a.atttypid, a.atttypmod) = 'smallint' THEN 'int2'
                      WHEN format_type(a.atttypid, a.atttypmod) = 'bigint' THEN 'int8'
                      WHEN format_type(a.atttypid, a.atttypmod) = 'real' THEN 'float4'
                      WHEN format_type(a.atttypid, a.atttypmod) = 'serial' THEN 'serial4'
                      WHEN format_type(a.atttypid, a.atttypmod) = 'smallserial' THEN 'serial2'
                      WHEN format_type(a.atttypid, a.atttypmod) = 'bigserial' THEN 'serial8'
                      WHEN format_type(a.atttypid, a.atttypmod) LIKE 'bit varying%' 
                          THEN REPLACE(format_type(a.atttypid, a.atttypmod), 'bit varying', 'varbit')
                      WHEN format_type(a.atttypid, a.atttypmod) = 'boolean' THEN 'bool'
                      WHEN format_type(a.atttypid, a.atttypmod) LIKE 'numeric%' 
                      THEN REPLACE(format_type(a.atttypid, a.atttypmod), 'numeric', 'decimal')
                      WHEN format_type(a.atttypid, a.atttypmod) = 'timestamp with time zone' THEN 'timestamptz'
                      WHEN format_type(a.atttypid, a.atttypmod) = 'timestamp without time zone' THEN 'timestamp'
                      WHEN format_type(a.atttypid, a.atttypmod) = 'time with time zone' THEN 'timetz'
                      ELSE format_type(a.atttypid, a.atttypmod)
                    END -- short type with length, user-friendly `
or
`'short_type_name',
                      CASE
                        WHEN format_type(a.atttypid, a.atttypmod) LIKE 'character varying%'
                          THEN REPLACE(format_type(a.atttypid, a.atttypmod), 'character varying', 'varchar')
                        WHEN format_type(a.atttypid, a.atttypmod) = 'integer' THEN 'int4'
                        WHEN format_type(a.atttypid, a.atttypmod) = 'bigint' THEN 'int8'
                        WHEN format_type(a.atttypid, a.atttypmod) = 'boolean' THEN 'bool'
                        WHEN format_type(a.atttypid, a.atttypmod) LIKE 'numeric%'
                          THEN REPLACE(format_type(a.atttypid, a.atttypmod), 'numeric', 'decimal')
                        WHEN format_type(a.atttypid, a.atttypmod) = 'timestamp without time zone' THEN 'timestamp'
                        WHEN format_type(a.atttypid, a.atttypmod) = 'timestamp with time zone' THEN 'timestamptz'
                        ELSE format_type(a.atttypid, a.atttypmod)
                      END`
i want to create js consant to maping data type not stick in query

[x] bugs ui when user select data in json-editor-vue component this selectd color is overlayed content and make it hard to read -> need to fix this
[x] enhance show env tags in connection , need to show more in ConnectionSelector when user selected connection need show env tags in value selected connection, current show only connection selected icon , name (remember after update need check ui for case content connection name is long)
show in StatusBar > CurrentPositionPath
[x] error when user update value 0 -> when parser -> null -> show error ( in quick query)
[x] in raw query when i comment code in where stasment this include variable :varname then i run query i got error can not paser sql -> need to check this case and fix
[x] fix query get and format data in query statsment like `'short_type_name',
                    CASE
                      WHEN format_type(a.atttypid, a.atttypmod) LIKE 'character varying%' 
                          THEN REPLACE(format_type(a.atttypid, a.atttypmod), 'character varying', 'varchar')
                      WHEN format_type(a.atttypid, a.atttypmod) LIKE 'character%' 
                          THEN REPLACE(format_type(a.atttypid, a.atttypmod), 'character', 'char')
                      WHEN format_type(a.atttypid, a.atttypmod) = 'double precision' THEN 'float8'
                      WHEN format_type(a.atttypid, a.atttypmod) = 'integer' THEN 'int4'
                      WHEN format_type(a.atttypid, a.atttypmod) = 'smallint' THEN 'int2'
                      WHEN format_type(a.atttypid, a.atttypmod) = 'bigint' THEN 'int8'
                      WHEN format_type(a.atttypid, a.atttypmod) = 'real' THEN 'float4'
                      WHEN format_type(a.atttypid, a.atttypmod) = 'serial' THEN 'serial4'
                      WHEN format_type(a.atttypid, a.atttypmod) = 'smallserial' THEN 'serial2'
                      WHEN format_type(a.atttypid, a.atttypmod) = 'bigserial' THEN 'serial8'
                      WHEN format_type(a.atttypid, a.atttypmod) LIKE 'bit varying%' 
                          THEN REPLACE(format_type(a.atttypid, a.atttypmod), 'bit varying', 'varbit')
                      WHEN format_type(a.atttypid, a.atttypmod) = 'boolean' THEN 'bool'
                      WHEN format_type(a.atttypid, a.atttypmod) LIKE 'numeric%' 
                      THEN REPLACE(format_type(a.atttypid, a.atttypmod), 'numeric', 'decimal')
                      WHEN format_type(a.atttypid, a.atttypmod) = 'timestamp with time zone' THEN 'timestamptz'
                      WHEN format_type(a.atttypid, a.atttypmod) = 'timestamp without time zone' THEN 'timestamp'
                      WHEN format_type(a.atttypid, a.atttypmod) = 'time with time zone' THEN 'timetz'
                      ELSE format_type(a.atttypid, a.atttypmod)
                    END -- short type with length, user-friendly `
or
`'short_type_name',
                      CASE
                        WHEN format_type(a.atttypid, a.atttypmod) LIKE 'character varying%'
                          THEN REPLACE(format_type(a.atttypid, a.atttypmod), 'character varying', 'varchar')
                        WHEN format_type(a.atttypid, a.atttypmod) = 'integer' THEN 'int4'
                        WHEN format_type(a.atttypid, a.atttypmod) = 'bigint' THEN 'int8'
                        WHEN format_type(a.atttypid, a.atttypmod) = 'boolean' THEN 'bool'
                        WHEN format_type(a.atttypid, a.atttypmod) LIKE 'numeric%'
                          THEN REPLACE(format_type(a.atttypid, a.atttypmod), 'numeric', 'decimal')
                        WHEN format_type(a.atttypid, a.atttypmod) = 'timestamp without time zone' THEN 'timestamp'
                        WHEN format_type(a.atttypid, a.atttypmod) = 'timestamp with time zone' THEN 'timestamptz'
                        ELSE format_type(a.atttypid, a.atttypmod)
                      END`
i want to create js consant to maping data type not stick in query, check in all db type
[x] Quick query just add button view change before update (for case user update) add in QuickQueryControlBar when user click just open popup to show query will be update if case user click save
[x] in tabsViewContainer just crate button 'sql' in the firstly tab if user click just open new raw query file with name 'sample.sql' open this file , if this file not exist just create then open
[x] in tabsViewContainer just add button + plus tab -> just show mini option 1 create new raw file -> clieck create new file with name = new-file ,new-file-1 ,.. if case exit . option 2 is schema browser , option 3 is open instance insight
[x] add setting gloabl for table allow user setting sort null first , null last or null unset, show in gloal setting and qucik query bar
[ ] in raw quick query -> function , when i updat function / procidure somehow i got error , but i copy to raw query -> this worked fine -> need to check why this happen
[ ] enhance load schema if database have multiple schema (use wait 20- 50s)
[ ] làm lại chuẩn chị docs, hướng dẫn cho agents 

# Redis issue
- [ ] fix 'No keys matched the current filter.' just use empty component + update guilde for agents when use this case
- [ ] RedisDBSelector just move to selector component + fix hieght for fix size in components/modules/raw-query/components/RawQueryEditorHeader.vue = h-6
- [ ] redis raw query just hidden formator button , eplanin query -> this not support , disable Variables not support in redis raw query
- [ ] brower key tree just update icon for key type ( ưu tiên dùng icon hugeicons)
- [ ] brower key item thì thông tin đi kèm k cần ở dạng bagde có border đầu chỉ cần show text (áp dụng cho cả tree , list), với dạng list thì làm lại cho là vẫn dùng tree để hiển thị cho đồng bộ nhưng sẽ flatent ra
- [ ] view detail key update TTL (seconds) field input i want reduce hieght of input (just update <Input> component just update for this compoent for have size default , small , xs, large)
- [ ] key detail if not found or is remove just show BaseEmpty with icon "icons:404" 
- [ ] Redis Pub/Sub just update width for Live Messages = 2/3 width (current is 3/4) 
- [ ] Redis Pub/Sub Clear all button not work

- [ ] in components/modules/instance-insights/RedisInstanceInsightsPanel.vue fix this  BaseNotice not define , just split componet this componet to big
- [ ] redis detail key can't update ttl
- [ ]
