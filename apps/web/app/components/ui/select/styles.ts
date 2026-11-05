import { cva } from 'class-variance-authority';

export const selectTriggerVariants = cva(
  "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex w-fit items-center justify-between gap-2 rounded-md border bg-transparent whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      size: {
        lg: 'h-10 px-4 py-2 text-sm',
        default: 'h-9 px-3 py-2 text-sm',
        sm: 'h-8 px-3 py-1.5 text-sm',
        xs: 'h-7 px-2 py-1 text-sm',
        xxs: 'h-6 px-1.5 py-1 text-sm',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
);

export const selectItemVariants = cva(
  "focus:bg-accent focus:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
  {
    variants: {
      size: {
        lg: 'min-h-10 py-2 pr-9 pl-3 text-sm',
        default: 'min-h-9 py-1.5 pr-8 pl-2 text-sm',
        sm: 'min-h-8 py-1 pr-7 pl-2 text-sm',
        xs: 'min-h-7 py-1 pr-6 pl-2 text-sm',
        xxs: 'min-h-6 py-1 pr-6 pl-1.5 text-sm',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
);

export const selectItemIndicatorWrapperVariants = cva(
  'absolute flex items-center justify-center',
  {
    variants: {
      size: {
        lg: 'right-2.5 size-4',
        default: 'right-2 size-3.5',
        sm: 'right-2 size-3.5',
        xs: 'right-1.5 size-3',
        xxs: 'right-1.5 size-3',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
);

export const selectItemIndicatorIconVariants = cva('', {
  variants: {
    size: {
      lg: 'size-4',
      default: 'size-4',
      sm: 'size-4',
      xs: 'size-3.5',
      xxs: 'size-3',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

export const selectLabelVariants = cva('font-semibold text-muted-foreground', {
  variants: {
    size: {
      lg: 'px-3 py-2 text-sm',
      default: 'px-2 py-1.5 text-sm',
      sm: 'px-2 py-1 text-sm',
      xs: 'px-2 py-1 text-sm',
      xxs: 'px-1.5 py-1 text-sm',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});
