import { cva, type VariantProps } from 'class-variance-authority';

export const dialogContentVariants = cva(
  'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border shadow-lg duration-200',
  {
    variants: {
      size: {
        sm: 'sm:max-w-md',
        default: 'sm:max-w-lg',
        lg: 'sm:max-w-xl',
        xl: 'sm:max-w-2xl',
        '2xl': 'sm:max-w-3xl',
        preview: 'sm:max-w-[55vw]',
        panel: 'sm:max-w-[70vw]',
        full: 'max-w-[calc(100%-1rem)] sm:max-w-[calc(100%-2rem)]',
      },
      padding: {
        default: 'p-6',
        compact: 'p-4',
        none: 'p-0',
      },
      scroll: {
        none: '',
        content: 'max-h-[85vh] overflow-hidden',
        viewport: 'max-h-[85vh] overflow-y-auto',
      },
    },
    defaultVariants: {
      size: 'default',
      padding: 'default',
      scroll: 'none',
    },
  }
);

type DialogContentVariantProps = VariantProps<typeof dialogContentVariants>;

export type DialogContentSize = NonNullable<DialogContentVariantProps['size']>;
export type DialogContentPadding = NonNullable<
  DialogContentVariantProps['padding']
>;
export type DialogContentScroll = NonNullable<
  DialogContentVariantProps['scroll']
>;
