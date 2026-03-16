<script setup lang="ts">
import type { NuxtError } from '#app';
import figlet from 'figlet';
import graffiti from 'figlet/importable-fonts/Graffiti.js';
import { Button } from '@/components/ui/button';

const props = defineProps({
  error: Object as () => NuxtError,
});

const handleError = () => clearError({ redirect: '/' });

const errorCode = computed(() => props.error?.statusCode || 500);
const errorMessage = computed(
  () => props.error?.statusMessage || 'An unexpected error occurred'
);
const errorDescription = computed(
  () =>
    props.error?.message ||
    'We apologize for the inconvenience. Please try again or return to the home page.'
);

const config = useRuntimeConfig();
const isDev = computed(() => config.public.isDev);

// Register the Graffiti font with figlet
figlet.parseFont('Graffiti', graffiti);

// Compute the ASCII representation of the error code using figlet Graffiti style
const asciiErrorCode = computed(() => {
  return figlet.textSync(errorCode.value.toString(), {
    font: 'Graffiti',
  });
});
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-background p-6">
    <div class="max-w-3xl w-full text-center space-y-6">
      <!-- Top ASCII Decoration -->
      <pre
        class="ascii-art text-xxs leading-[1] font-mono text-muted-foreground inline-block text-left mb-2"
      >
                                     ↑↑↑↑↑↑↑       
                                ↑↑↑↑↑↑↑↑↑↑↑       
                 ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑         
                 ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑         
             ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑         
         ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑       
       ↑↑↑↑↑↑↑↑↑↑↑↑↗←←←←←←↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑       
       ↑↑↑↑↑↑↑↑→←←←←   ↖→→↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑       
     ↑↑↑↑↑↑↑↑↑↑↘     ↖↓↘↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑     
     ↑↑↑↑↑↑↑↑→↓↙ ←↓↓↓↘↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑     
   ↑↑↑↑↑↑↑↑↑↑↘←←←↘↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑   
   ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑   
   ↑↑↑↑↑↑↑↑↑                ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑   
   ↑↑↑↑↑↑↑                  ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑   
   ↑↑↑↑↑↑↑↑↑↑↑↑↑          ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑   
   ↑↑↑↑↑↑↑↑↑↑↑↑↑        ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑   
                     ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑   
                   ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑   
                   ↑↑↑↑↑↑↑↑↑↑↑↑↑↑   ↑↑↑↑↑↑↑↑↑     
                                    ↑↑↑↑↑↑↑↑↑     
       ↑↑↑↑↑↑↑↑↑          ↑↑      ↑↑↑↑↑↑↑↑↑↑↑     
       ↑↑↑↑↑↑↑↑↑       ↑↑↑↑↑↑     ↑↑↑↑↑↑↑↑↑       
         ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑      ↑↑↑↑↑↑↑↑↑         
           ↑↑↑↑↑↑↑↑↑↑↑↑↑    ↑↑↑↑↑↑↑↑↑↑↑           
           ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑           
             ↑↑↑↑↑↑↑↑↑↑Cinny↑↑↑↑↑↑↑↑↑           
                   ↑↑↑↑↑↑↑↑↑↑↑↑                    
      </pre>

      <div class="space-y-2">
        <!-- ASCII Error Code -->
        <div class="flex justify-center">
          <pre
            class="ascii-code font-mono text-[10px] sm:text-xs md:text-sm font-bold text-primary/50 leading-none"
            >{{ asciiErrorCode }}
          </pre>
        </div>

        <div class="space-y-2">
          <h2 class="text-2xl font-semibold tracking-tight">
            {{ errorMessage }}
          </h2>
          <p class="text-muted-foreground max-w-lg mx-auto">
            {{ errorDescription }}
          </p>
        </div>
      </div>

      <div class="flex flex-col gap-2 sm:flex-row sm:justify-center pt-4">
        <Button variant="default" @click="handleError">
          <Icon name="hugeicons:arrow-left-02"></Icon>

          Go back home
        </Button>
        <Button variant="outline" @click="() => $router.back()">
          Go back
        </Button>
      </div>

      <div
        v-if="isDev"
        class="mt-8 p-4 bg-muted rounded-lg text-left overflow-auto max-h-64 border border-border"
      >
        <p class="text-xs font-mono whitespace-pre-wrap text-muted-foreground">
          {{ error?.stack }}
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Ensure ASCII art is perfectly aligned */
.ascii-art,
.ascii-code {
  font-family:
    'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas',
    'Liberation Mono', 'Courier New', monospace;
  line-height: 1 !important;
  white-space: pre;
}

.min-h-screen {
  min-height: 100vh;
}
.flex {
  display: flex;
}
.items-center {
  align-items: center;
}
.justify-center {
  justify-content: center;
}
.text-center {
  text-align: center;
}
</style>
