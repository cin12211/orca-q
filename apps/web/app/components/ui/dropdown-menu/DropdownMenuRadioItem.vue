<script setup lang="ts">
import { computed, inject, type HTMLAttributes } from 'vue';
import { Circle } from 'lucide-vue-next';
import {
  DropdownMenuItemIndicator,
  DropdownMenuRadioItem,
  type DropdownMenuRadioItemEmits,
  type DropdownMenuRadioItemProps,
  useForwardPropsEmits,
} from 'reka-ui';
import { cn } from '@/lib/utils';
import {
  DROPDOWN_MENU_SIZE_INJECTION_KEY,
  type DropdownMenuSize,
} from './context';
import {
  dropdownMenuChoiceItemSizeClasses,
  dropdownMenuIndicatorWrapperClasses,
  dropdownMenuRadioIconClasses,
} from './styles';

const props = defineProps<
  DropdownMenuRadioItemProps & { class?: HTMLAttributes['class'] }
>();

const emits = defineEmits<DropdownMenuRadioItemEmits>();

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props;

  return delegated;
});

const forwarded = useForwardPropsEmits(delegatedProps, emits);
const size = inject(
  DROPDOWN_MENU_SIZE_INJECTION_KEY,
  computed<DropdownMenuSize>(() => 'default')
);
</script>

<template>
  <DropdownMenuRadioItem
    data-slot="dropdown-menu-radio-item"
    :data-size="size"
    v-bind="forwarded"
    :class="
      cn(
        `focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4`,
        dropdownMenuChoiceItemSizeClasses[size],
        props.class
      )
    "
  >
    <span
      :class="
        cn(
          'pointer-events-none absolute flex items-center justify-center',
          dropdownMenuIndicatorWrapperClasses[size]
        )
      "
    >
      <DropdownMenuItemIndicator>
        <Circle
          :class="cn('fill-current', dropdownMenuRadioIconClasses[size])"
        />
      </DropdownMenuItemIndicator>
    </span>
    <slot />
  </DropdownMenuRadioItem>
</template>
