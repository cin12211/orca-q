<script setup lang="ts">
import { ref } from 'vue';
import {
  Sparkles,
  Layers,
  Info,
  Settings,
  Mail,
  HelpCircle,
  ChevronDown,
  RefreshCw,
  Trash2,
  Lock,
} from 'lucide-vue-next';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import Badge from '../ui/badge/Badge.vue';
// Import UI components
import Button from '../ui/button/Button.vue';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../ui/card';
import Checkbox from '../ui/checkbox/Checkbox.vue';
import Input from '../ui/input/Input.vue';
import { Kbd, KbdGroup } from '../ui/kbd';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
} from '../ui/select';
import Switch from '../ui/switch/Switch.vue';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import Textarea from '../ui/textarea/Textarea.vue';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '../ui/tooltip';
// Import Base components
import BaseEmpty from './base-empty/BaseEmpty.vue';
import BaseNotice from './base-notice/BaseNotice.vue';
import CodeHighlightPreview from './code-highlight-preview/CodeHighlightPreview.vue';
import BaseContextMenu from './context-menu/BaseContextMenu.vue';
import {
  ContextMenuItemType,
  type ContextMenuItem,
} from './context-menu/menuContext.type';
import LoadingOverlay from './loading-overlay/LoadingOverlay.vue';
import ScrambleText from './scramble-text/ScrambleText.vue';
import Shimmer from './shimmer/Shimmer.vue';
import Typography from './typography/Typography.vue';

// Sizes lists for showcasing
const buttonSizes = ['lg', 'default', 'sm', 'xs', 'xxs'] as const;
const buttonIconSizes = ['icon', 'iconMd', 'iconSm'] as const;
const inputSizes = ['lg', 'default', 'sm', 'xs'] as const;
const selectSizes = ['lg', 'default', 'sm', 'xs', 'xxs'] as const;
const tabsSizes = ['lg', 'default', 'sm', 'xs', 'xxs'] as const;

// Interactive states
const activeMockTab = ref('tables');
const selectVal = ref('postgres');
const checkboxState = ref(true);
const switchState = ref(false);
const showLoadingDemo = ref(false);

const triggerLoading = () => {
  showLoadingDemo.value = true;
  setTimeout(() => {
    showLoadingDemo.value = false;
  }, 1500);
};

// BaseContextMenu Config Items
const contextMenuItems: ContextMenuItem[] = [
  { type: ContextMenuItemType.LABEL, title: 'Database Actions' },
  {
    type: ContextMenuItemType.ACTION,
    title: 'Refresh Schema',
    icon: 'lucide:refresh-cw',
    select: () => alert('Refresh schema action triggered'),
  },
  {
    type: ContextMenuItemType.ACTION,
    title: 'View Settings',
    icon: 'lucide:settings',
    select: () => alert('View settings action triggered'),
    shortcut: '⌘,',
  },
  { type: ContextMenuItemType.SEPARATOR },
  {
    type: ContextMenuItemType.ACTION,
    title: 'Delete Connection',
    icon: 'lucide:trash',
    select: () => alert('Delete action triggered'),
    disabled: true,
  },
];
</script>

<template>
  <div class="min-h-screen bg-background text-foreground p-6 sm:p-10 font-sans">
    <!-- Title Header -->
    <div class="mb-10 border-b border-border pb-6">
      <div class="flex items-center gap-2 mb-3">
        <Badge variant="secondary" class="font-semibold text-xs py-0.5 px-2.5"
          >HeraQ Design System</Badge
        >
        <span class="text-xs text-muted-foreground font-mono">v1.1.5</span>
      </div>
      <h1 class="text-3xl font-semibold tracking-tight text-foreground mb-2">
        Design System Overview
      </h1>
      <p class="text-muted-foreground text-sm max-w-3xl leading-relaxed">
        Unified catalog showcasing components native to
        <code class="text-xs font-mono bg-muted px-1 py-0.5 rounded"
          >components/ui</code
        >
        and
        <code class="text-xs font-mono bg-muted px-1 py-0.5 rounded"
          >components/base</code
        >. This page renders components exactly as they appear in the app
        workspace, respecting all global variables, borders, and themes.
      </p>
    </div>

    <!-- MAIN GRID SHOWCASE -->
    <div class="space-y-12">
      <!-- ==================== 1. ACTIONS & STATUS ==================== -->
      <section class="space-y-6">
        <h2
          class="text-base font-semibold border-l-4 border-primary pl-3 text-foreground tracking-tight"
        >
          Actions & Status Indicators
        </h2>

        <div
          class="grid grid-cols-1 gap-6 border border-border rounded-xl p-6 bg-card"
        >
          <!-- BUTTONS -->
          <div class="space-y-6">
            <div>
              <h3 class="text-sm font-medium text-foreground mb-1">
                Button Variants
              </h3>
              <p class="text-xs text-muted-foreground mb-3">
                Standard button types exported by
                <code class="font-mono text-xs">ui/button</code>.
              </p>
              <div class="flex flex-wrap gap-3 items-center">
                <Button variant="default">Default (Primary)</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="ghost">Ghost Button</Button>
                <Button variant="link">Link Style</Button>
                <Button> <Mail class="mr-2 size-4" /> With Icon </Button>
                <Button disabled>Disabled State</Button>
              </div>
            </div>

            <!-- BUTTON SIZES -->
            <div class="border-t border-border pt-4">
              <h3 class="text-sm font-medium text-foreground mb-1">
                Button Sizes Sizing
              </h3>
              <p class="text-xs text-muted-foreground mb-4">
                Complete size configurations demonstrating how scale operates in
                buttons.
              </p>

              <!-- Standard sizes -->
              <div class="space-y-4">
                <div class="flex flex-wrap gap-4 items-end">
                  <div
                    v-for="size in buttonSizes"
                    :key="size"
                    class="flex flex-col gap-1.5"
                  >
                    <span
                      class="text-[10px] font-mono text-muted-foreground uppercase"
                      >{{ size }}</span
                    >
                    <Button :size="size">Button {{ size }}</Button>
                  </div>
                </div>

                <!-- Icon sizes -->
                <div class="flex flex-wrap gap-4 items-end pt-2">
                  <div
                    v-for="size in buttonIconSizes"
                    :key="size"
                    class="flex flex-col gap-1.5"
                  >
                    <span
                      class="text-[10px] font-mono text-muted-foreground uppercase"
                      >{{ size }}</span
                    >
                    <Button :size="size" variant="outline">
                      <Sparkles class="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- BADGES -->
          <div class="border-t border-border pt-6 space-y-4">
            <div>
              <h3 class="text-sm font-medium text-foreground mb-1">
                Badge Variants
              </h3>
              <p class="text-xs text-muted-foreground mb-3">
                Pills and status tags exported by
                <code class="font-mono text-xs">ui/badge</code>.
              </p>
              <div class="flex flex-wrap gap-3">
                <Badge variant="default">Default Badge</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge variant="outline">Outline</Badge>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ==================== 2. INPUTS & FORMS ==================== -->
      <section class="space-y-6">
        <h2
          class="text-base font-semibold border-l-4 border-primary pl-3 text-foreground tracking-tight"
        >
          Inputs & Form Controls
        </h2>

        <div
          class="grid grid-cols-1 gap-6 border border-border rounded-xl p-6 bg-card"
        >
          <!-- INPUT SIZES -->
          <div class="space-y-4">
            <h3 class="text-sm font-medium text-foreground mb-1">
              Input Sizing Configurations
            </h3>
            <p class="text-xs text-muted-foreground mb-4">
              Demonstration of all available height/padding sizes for
              <code class="font-mono text-xs">ui/input</code>.
            </p>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div v-for="size in inputSizes" :key="size" class="space-y-1.5">
                <label
                  class="text-[10px] font-mono text-muted-foreground uppercase"
                  >Size: {{ size }}</label
                >
                <Input :size="size" :placeholder="'Input ' + size" />
              </div>
            </div>
          </div>

          <!-- SELECT SIZES -->
          <div class="border-t border-border pt-6 space-y-4">
            <h3 class="text-sm font-medium text-foreground mb-1">
              Select Dropdown Sizing
            </h3>
            <p class="text-xs text-muted-foreground mb-4">
              Demonstration of all height configurations for Select dropdown
              elements.
            </p>
            <div class="flex flex-wrap gap-4 items-end">
              <div
                v-for="size in selectSizes"
                :key="size"
                class="flex flex-col gap-1.5 w-40"
              >
                <span
                  class="text-[10px] font-mono text-muted-foreground uppercase"
                  >Size: {{ size }}</span
                >
                <Select v-model="selectVal" :size="size">
                  <SelectTrigger class="w-full">
                    <SelectValue placeholder="Select db" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="postgres">PostgreSQL</SelectItem>
                      <SelectItem value="mysql">MySQL</SelectItem>
                      <SelectItem value="sqlite">SQLite</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <!-- TEXTAREA, CHECKBOX & SWITCH -->
          <div
            class="border-t border-border pt-6 grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <div class="space-y-3">
              <h3 class="text-sm font-medium text-foreground">Textarea</h3>
              <Textarea
                placeholder="Multi-line SQL console notes..."
                rows="3"
              />
            </div>

            <div class="space-y-4">
              <h3 class="text-sm font-medium text-foreground">
                Toggles & Checks
              </h3>
              <div class="space-y-3">
                <div class="flex items-center gap-3">
                  <Checkbox id="kbd-check" v-model:checked="checkboxState" />
                  <label
                    for="kbd-check"
                    class="text-xs font-medium cursor-pointer select-none"
                    >Enable hotkeys navigation</label
                  >
                </div>

                <div class="flex items-center gap-3">
                  <Switch id="sidebar-switch" v-model:checked="switchState" />
                  <label
                    for="sidebar-switch"
                    class="text-xs font-medium cursor-pointer select-none"
                    >Collapse schema sidebar explorer</label
                  >
                </div>
              </div>
            </div>
          </div>

          <!-- KEYBOARD KBD -->
          <div class="border-t border-border pt-6 space-y-3">
            <h3 class="text-sm font-medium text-foreground">
              Keyboard Kbd Shortcuts
            </h3>
            <div class="flex flex-wrap gap-6 items-center">
              <div class="flex items-center gap-2">
                <span class="text-xs text-muted-foreground">Save Changes:</span>
                <KbdGroup>
                  <Kbd>⌘</Kbd>
                  <Kbd>S</Kbd>
                </KbdGroup>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-muted-foreground">Command Bar:</span>
                <KbdGroup>
                  <Kbd>⌘</Kbd>
                  <Kbd>K</Kbd>
                </KbdGroup>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ==================== 3. FEEDBACK & PANELS ==================== -->
      <section class="space-y-6">
        <h2
          class="text-base font-semibold border-l-4 border-primary pl-3 text-foreground tracking-tight"
        >
          Feedback & Navigation Panels
        </h2>

        <div
          class="grid grid-cols-1 gap-6 border border-border rounded-xl p-6 bg-card"
        >
          <!-- TABS SIZES -->
          <div class="space-y-4">
            <h3 class="text-sm font-medium text-foreground mb-1">
              Tabs Sizing Scale
            </h3>
            <p class="text-xs text-muted-foreground mb-4">
              Complete size scale for folder-like division tabs configurations.
            </p>
            <div class="space-y-5">
              <div v-for="size in tabsSizes" :key="size" class="space-y-1.5">
                <div
                  class="text-[10px] font-mono text-muted-foreground uppercase"
                >
                  Size: {{ size }}
                </div>
                <Tabs
                  v-model="activeMockTab"
                  :size="size"
                  class="w-full max-w-md"
                >
                  <TabsList class="grid grid-cols-3">
                    <TabsTrigger value="tables">Tables</TabsTrigger>
                    <TabsTrigger value="queries">Queries</TabsTrigger>
                    <TabsTrigger value="logs">Logs</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </div>

          <!-- ACCORDION -->
          <div class="border-t border-border pt-6 space-y-3">
            <h3 class="text-sm font-medium text-foreground">
              Accordion Panels
            </h3>
            <Accordion type="single" collapsible class="w-full max-w-lg">
              <AccordionItem value="acc-1" class="border-b border-border">
                <AccordionTrigger class="text-xs font-medium"
                  >Workspace Auto-save Frequency</AccordionTrigger
                >
                <AccordionContent class="text-xs text-muted-foreground pb-2">
                  Workspaces save state changes to the SQLite storage client
                  every 5 seconds or upon active tab change.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="acc-2" class="border-b border-border">
                <AccordionTrigger class="text-xs font-medium"
                  >Local Storage Decryption Keys</AccordionTrigger
                >
                <AccordionContent class="text-xs text-muted-foreground pb-2">
                  All passwords and credentials stored inside the Electron app
                  are securely encrypted locally via AES-256 keys.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <!-- AVATAR & TOOLTIP -->
          <div
            class="border-t border-border pt-6 grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <div class="space-y-3">
              <h3 class="text-sm font-medium text-foreground">
                Avatar Profiles
              </h3>
              <div class="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback
                    class="bg-primary/10 text-primary font-medium text-xs uppercase flex items-center justify-center size-10 rounded-full"
                    >AD</AvatarFallback
                  >
                </Avatar>
                <Avatar>
                  <AvatarFallback
                    class="bg-muted text-muted-foreground font-medium text-xs uppercase flex items-center justify-center size-10 rounded-full"
                    >DB</AvatarFallback
                  >
                </Avatar>
                <span class="text-xs text-muted-foreground"
                  >User Session profiles</span
                >
              </div>
            </div>

            <div class="space-y-3">
              <h3 class="text-sm font-medium text-foreground">
                Interactive Hover Tooltips
              </h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm"
                      >Hover trigger tooltip</Button
                    >
                  </TooltipTrigger>
                  <TooltipContent>
                    <p class="text-xs">Port mapping configuration help</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          <!-- ALERTS & NOTICE -->
          <div
            class="border-t border-border pt-6 grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <div class="space-y-3">
              <h3 class="text-sm font-medium text-foreground">
                Structured Alerts
              </h3>
              <Alert variant="default">
                <Info class="size-4" />
                <AlertTitle class="font-medium">Sync Completed</AlertTitle>
                <AlertDescription class="text-xs">
                  Your metadata indexes have been successfully refreshed.
                </AlertDescription>
              </Alert>
            </div>

            <div class="space-y-2">
              <h3 class="text-sm font-medium text-foreground">
                Inline BaseNotices
              </h3>
              <BaseNotice variant="default"
                >Tips: Use indexes to speed up raw SQL query
                retrieval.</BaseNotice
              >
              <BaseNotice variant="secondary"
                >Notice: Key store hydration is currently active in the
                background.</BaseNotice
              >
              <BaseNotice variant="destructive"
                >Warning: Permanent deletion cannot be undone.</BaseNotice
              >
            </div>
          </div>
        </div>
      </section>

      <!-- ==================== 4. CUSTOM BASE & STYLING ==================== -->
      <section class="space-y-6">
        <h2
          class="text-base font-semibold border-l-4 border-primary pl-3 text-foreground tracking-tight"
        >
          Custom Base & Typography
        </h2>

        <div
          class="grid grid-cols-1 gap-6 border border-border rounded-xl p-6 bg-card"
        >
          <!-- TYPOGRAPHY SCALE -->
          <div class="space-y-3">
            <h3 class="text-sm font-medium text-foreground">
              Typography Scale
            </h3>
            <div
              class="border border-border p-4 rounded-lg space-y-2 bg-background"
            >
              <Typography type="h1" font="semibold" size="xl"
                >Header H1 Size</Typography
              >
              <Typography type="h2" font="semibold" size="lg"
                >Header H2 Size</Typography
              >
              <Typography
                type="p"
                font="normal"
                size="sm"
                class="text-muted-foreground"
                >Standard paragraph text inside design scales.</Typography
              >
              <Typography
                type="blockquote"
                font="normal"
                size="sm"
                class="text-primary italic"
                >"Humble client-side database workbench."</Typography
              >
            </div>
          </div>

          <!-- BASEEMPTY STATE -->
          <div class="border-t border-border pt-6 space-y-3">
            <h3 class="text-sm font-medium text-foreground">BaseEmpty State</h3>
            <div
              class="border border-border p-6 rounded-lg bg-background flex items-center justify-center"
            >
              <BaseEmpty
                title="No schemas loaded"
                desc="Refresh schema metadata inside explorer sidebar to display database tables."
              />
            </div>
          </div>

          <!-- CYBER SCRAMBLETEXT & TEXT SHIMMER -->
          <div
            class="border-t border-border pt-6 grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <div class="space-y-3">
              <h3 class="text-sm font-medium text-foreground">
                ScrambleText Loops
              </h3>
              <div
                class="h-16 border border-border rounded-lg p-4 flex items-center justify-center bg-background"
              >
                <ScrambleText
                  :texts="[
                    'CONNECTED TO POSTGRESQL',
                    'REFRESHING DATABASE SCHEMAS',
                    'DECRYPTING STORAGE CLIENTKEYS',
                  ]"
                  :duration="1000"
                  :speed="45"
                  :loop-delay="1500"
                  class="font-mono text-xs font-medium text-primary tracking-wider"
                />
              </div>
            </div>

            <div class="space-y-3">
              <h3 class="text-sm font-medium text-foreground">
                Text Shimmer Effect
              </h3>
              <div
                class="h-16 border border-border rounded-lg p-4 flex items-center justify-center bg-background"
              >
                <Shimmer
                  as="h3"
                  :duration="2.5"
                  class="text-xs font-medium font-mono tracking-wider text-center"
                >
                  DATABASE WORKBENCH HYDRATING
                </Shimmer>
              </div>
            </div>
          </div>

          <!-- ADDED MISSING BASE COMPONENTS: LOADING OVERLAY, CODE HIGHLIGHT & CONTEXT MENU -->
          <div
            class="border-t border-border pt-6 grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <!-- LoadingOverlay Showcase -->
            <div
              class="space-y-3 relative overflow-hidden min-h-[160px] border border-border rounded-lg p-4 bg-background flex flex-col justify-between"
            >
              <div>
                <h3 class="text-sm font-medium text-foreground">
                  LoadingOverlay
                </h3>
                <p class="text-xs text-muted-foreground mt-1">
                  Full container loading overlay with blur backdrop.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                class="w-full mt-2"
                @click="triggerLoading"
              >
                Simulate Loading (1.5s)
              </Button>
              <LoadingOverlay :visible="showLoadingDemo" />
            </div>

            <!-- CodeHighlightPreview Showcase -->
            <div class="space-y-3">
              <h3 class="text-sm font-medium text-foreground">
                CodeHighlightPreview
              </h3>
              <CodeHighlightPreview
                code="SELECT u.id, u.username, count(o.id) as orders_count FROM users u LEFT JOIN orders o ON o.user_id = u.id GROUP BY u.id;"
                language="sql"
                :show-copy-button="true"
                max-height="120px"
              />
            </div>

            <!-- BaseContextMenu Showcase -->
            <div class="space-y-3">
              <h3 class="text-sm font-medium text-foreground">
                BaseContextMenu
              </h3>
              <BaseContextMenu :context-menu-items="contextMenuItems">
                <div
                  class="border border-dashed border-border rounded-lg p-6 text-center text-xs text-muted-foreground cursor-context-menu hover:bg-muted/30 transition-colors h-[100px] flex items-center justify-center select-none"
                >
                  Right-click here to view actions
                </div>
              </BaseContextMenu>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
/* No special custom layouts beyond standard utility sync */
</style>
