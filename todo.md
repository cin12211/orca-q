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
