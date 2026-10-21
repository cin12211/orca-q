<template>
  <Tooltip>
    <Popover>
      <TooltipTrigger as-child>
        <PopoverTrigger as-child>
          <Button
            size="iconSm"
            variant="ghost"
            class="h-4 w-4 p-0 text-muted-foreground hover:text-foreground"
            title="How to use MongoDB raw query"
            aria-label="How to use MongoDB raw query"
          >
            <Icon name="hugeicons:help-circle" class="size-3.5!" />
          </Button>
        </PopoverTrigger>
      </TooltipTrigger>

      <TooltipContent>
        <p>How to use MongoDB raw query</p>
      </TooltipContent>

      <PopoverContent side="top" align="start" class="w-[480px] p-4 text-xs">
        <p class="mb-2 flex items-center gap-1.5 text-sm font-semibold">
          <Icon name="hugeicons:command-line" class="size-4!" />
          MongoDB raw query guide
        </p>

        <p class="mb-3 text-muted-foreground">
          Mongo scripts must return a value. Use the injected variables and
          helpers below; output from
          <code class="rounded bg-muted px-1">console</code>
          appears in the Console result tab.
        </p>

        <div class="space-y-3">
          <div>
            <p class="mb-1 font-medium">Injected runtime variables</p>
            <pre
              class="overflow-x-auto whitespace-pre-wrap rounded bg-muted p-2 text-xs"
            >
db      active database (selected in connection panel)
console console.log/info/warn/error for debugging
ObjectId, Long, Int32, Double, Decimal128, Binary, UUID, Timestamp
BSON, EJSON</pre
            >
          </div>

          <div>
            <p class="mb-1 font-medium">Query the active database</p>
            <pre
              class="overflow-x-auto whitespace-pre-wrap rounded bg-muted p-2 text-xs"
            >
// db is already set to the active database
return db.collection('&lt;collection_name&gt;').find({})</pre
            >
          </div>

          <div>
            <p class="mb-1 font-medium">Switch to another database</p>
            <pre
              class="overflow-x-auto whitespace-pre-wrap rounded bg-muted p-2 text-xs"
            >
// getSiblingDB() returns a db handle — assign it to a local const
const other = db.getSiblingDB('&lt;database_name&gt;')
return other.collection('&lt;collection_name&gt;').find({})</pre
            >
          </div>

          <div>
            <p class="mb-1 font-medium">Use params &amp; BSON helpers</p>
            <pre
              class="overflow-x-auto whitespace-pre-wrap rounded bg-muted p-2 text-xs"
            >
// params come from the Variables tab as Extended JSON
const id = new ObjectId(params.id)
return db.collection('users').findOne({ _id: id })</pre
            >
          </div>
        </div>

        <div class="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t pt-2">
          <a
            href="https://www.mongodb.com/docs/drivers/node/current/databases-collections/"
            target="_blank"
            rel="noreferrer"
            class="text-primary underline underline-offset-2"
          >
            Database &amp; collection docs
          </a>
          <a
            href="https://www.mongodb.com/docs/drivers/node/current/data-formats/bson/"
            target="_blank"
            rel="noreferrer"
            class="text-primary underline underline-offset-2"
          >
            BSON / EJSON docs
          </a>
        </div>
      </PopoverContent>
    </Popover>
  </Tooltip>
</template>
