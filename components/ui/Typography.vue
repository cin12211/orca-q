<script setup lang="ts">
import { cva, type VariantProps } from 'class-variance-authority';

// Define typography variants using CVA
const typographyVariants = cva(
  '', // Base class
  {
    variants: {
      type: {
        h1: 'text-4xl     ',
        h2: 'text-3xl     ',
        h3: 'mt-8 text-2xl    ',
        p: 'leading-7  ',
        blockquote: '  italic',
      },
      font: {
        normal: 'font-normal',
        bold: 'font-bold',
        extrabold: 'font-extrabold',
        semibold: 'font-semibold',
      },
      size: {
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg',
        xl: 'text-xl',
        '2xl': 'text-2xl',
        '3xl': 'text-3xl',
        '4xl': 'text-4xl',
        '5xl': 'text-5xl',
      },
    },
    defaultVariants: {
      type: 'p',
      font: 'normal',
      size: 'md',
    },
  }
);

type ButtonVariants = VariantProps<typeof typographyVariants>;

// Define props with VariantProps from CVA
interface Props {
  type?: 'h1' | 'h2' | 'h3' | 'p' | 'blockquote';
  font?: ButtonVariants['font'];
  size?: ButtonVariants['size'];
}

const props = defineProps<Props>();
</script>

<template>
  <component
    :is="props.type || 'p'"
    :class="typographyVariants({ type, font, size })"
  >
    <slot />
  </component>
</template>
