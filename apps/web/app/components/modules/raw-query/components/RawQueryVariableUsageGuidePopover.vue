<template>
  <Tooltip>
    <Popover>
      <TooltipTrigger as-child>
        <PopoverTrigger as-child>
          <Button
            size="iconSm"
            variant="ghost"
            class="h-4 w-4 p-0 text-muted-foreground hover:text-foreground"
            title="How to use query variables"
            aria-label="How to use query variables"
          >
            <Icon name="hugeicons:help-circle" class="size-3.5!" />
          </Button>
        </PopoverTrigger>
      </TooltipTrigger>

      <TooltipContent>
        <p>How to use query variables</p>
      </TooltipContent>

      <PopoverContent side="top" align="start" class="w-[440px] p-4 text-xs">
        <p class="mb-2 flex items-center gap-1.5 text-sm font-semibold">
          <Icon name="hugeicons:help-circle" class="size-4!" />
          Passing variables in queries
        </p>

        <p class="mb-3 text-muted-foreground">
          Use <code class="rounded bg-muted px-1">:variable_name</code> syntax
          to bind parameters. For array operators, cast to the correct type:
        </p>

        <div class="space-y-3">
          <div>
            <p class="mb-1 font-medium text-foreground">
              <code class="rounded bg-muted px-1">= ANY()</code>
            </p>
            <pre
              class="overflow-x-auto whitespace-pre-wrap break-all rounded bg-muted p-2 text-xs"
            >
WHERE id = ANY (ARRAY[:your_variable]::integer[])
WHERE status = ANY (ARRAY[:statuses]::text[])</pre
            >
          </div>

          <div>
            <p class="mb-1 font-medium text-foreground">
              <code class="rounded bg-muted px-1">IN()</code>
            </p>
            <pre
              class="overflow-x-auto whitespace-pre-wrap break-all rounded bg-muted p-2 text-xs"
            >
WHERE id IN (:your_variable)
WHERE name IN (:names)</pre
            >
          </div>

          <div>
            <p class="mb-1 font-medium text-foreground">Scalar variable</p>
            <pre
              class="overflow-x-auto whitespace-pre-wrap break-all rounded bg-muted p-2 text-xs"
            >
WHERE created_at > :start_date
WHERE user_id = :user_id</pre
            >
          </div>
        </div>

        <p class="mt-3 border-t pt-2 text-muted-foreground">
          Replace <code class="rounded bg-muted px-1">alias_type</code> with the
          actual PostgreSQL type, e.g.
          <code class="rounded bg-muted px-1">integer</code>,
          <code class="rounded bg-muted px-1">uuid</code>,
          <code class="rounded bg-muted px-1">text</code>.
        </p>
      </PopoverContent>
    </Popover>
  </Tooltip>
</template>
