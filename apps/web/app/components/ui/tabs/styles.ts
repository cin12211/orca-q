import { cva } from 'class-variance-authority';

export const tabsListVariants = cva(
  'bg-muted text-muted-foreground inline-flex w-fit items-center justify-center rounded-lg',
  {
    variants: {
      size: {
        lg: 'h-10 p-1',
        default: 'h-9 p-[3px]',
        sm: 'h-8 p-[3px]',
        xs: 'h-7 p-[2px]',
        xxs: 'h-6 p-[2px]',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
);

export const tabsTriggerVariants = cva(
  "data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      size: {
        lg: 'px-3 py-1.5 text-sm',
        default: 'px-2 py-1 text-sm',
        sm: 'px-2 py-1 text-sm',
        xs: 'gap-1 px-2 py-0.5 text-xs',
        xxs: 'gap-1 px-1.5 py-0.5 text-xs',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
);
