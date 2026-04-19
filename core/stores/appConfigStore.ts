import { useDebounceFn } from '@vueuse/core';
import { defineStore } from 'pinia';
import { ref, computed, reactive, watch } from 'vue';
import { DEFAULT_EDITOR_CONFIG } from '~/components/base/code-editor/constants';
import {
  RawQueryEditorDefaultSize,
  RawQueryEditorLayout,
  MAX_CUSTOM_LAYOUTS,
  type CustomLayoutDefinition,
} from '~/components/modules/raw-query/constants';
import {
  DEFAULT_TABLE_APPEARANCE_CONFIGS,
  DEFAULT_CHAT_UI_CONFIG,
} from '~/components/modules/settings/constants';
import {
  AIProvider,
  SpaceDisplay,
  type CodeEditorConfigs,
  type ChatUiConfigs,
  type CustomLayoutSizeEntry,
  type AgentApiKeyConfigs,
  type TableAppearanceConfigs,
} from '~/components/modules/settings/types';
import {
  normalizeAppConfigState,
  type AppConfigPersistedState,
} from '~/core/persist/store-state';
import { createStorageApis } from '~/core/storage';

const DEFAULT_APP_LAYOUT_SIZE = [25, 50, 25];

const intiAppLayout = [30, 70, 0];

const initBodyLayout = [100, 0];

const DEFAULT_BODY_LAYOUT_SIZE = [100, 25];

export const useAppConfigStore = defineStore('app-config-store', () => {
  const storageApis = createStorageApis();
  const isHydratingPersist = ref(false);
  const hasLoadedPersist = ref(false);

  const layoutSize = ref<number[]>(intiAppLayout);
  const historyLayoutSize = ref<number[]>(intiAppLayout);

  const bodySize = ref<number[]>(initBodyLayout);
  const historyBodySize = ref<number[]>(initBodyLayout);

  const isPrimarySidebarCollapsed = computed(() => layoutSize.value[0] === 0);

  const isSecondSidebarCollapsed = computed(() => layoutSize.value[2] === 0);

  const onToggleActivityBarPanel = () => {
    const [left, main] = layoutSize.value;

    if (left === 0) {
      const restoreLeft =
        historyLayoutSize.value[0] || DEFAULT_APP_LAYOUT_SIZE[0];
      layoutSize.value[0] = restoreLeft;
      layoutSize.value[1] = Math.max(main - restoreLeft, 0);
    } else {
      historyLayoutSize.value[0] = left;
      layoutSize.value[0] = 0;
      layoutSize.value[1] = main + left;
    }
  };

  const onToggleSecondSidebar = () => {
    const [_, main, right] = layoutSize.value;

    if (right === 0) {
      const restoreRight =
        historyLayoutSize.value[2] || DEFAULT_APP_LAYOUT_SIZE[2];
      layoutSize.value[2] = restoreRight;
      layoutSize.value[1] = Math.max(main - restoreRight, 0);
    } else {
      historyLayoutSize.value[2] = right;
      layoutSize.value[2] = 0;
      layoutSize.value[1] = main + right;
    }
  };

  const onShowSecondSidebar = () => {
    const [_, main, right] = layoutSize.value;

    if (right === 0) {
      const restoreRight =
        historyLayoutSize.value[2] || DEFAULT_APP_LAYOUT_SIZE[2];
      layoutSize.value[2] = restoreRight;
      layoutSize.value[1] = Math.max(main - restoreRight, 0);
    }
  };

  const onResizeLayout = (resizedLayout: number[]) => {
    const [left, _, right] = resizedLayout;
    layoutSize.value = resizedLayout;

    if (left !== 0) historyLayoutSize.value[0] = left;
    if (right !== 0) historyLayoutSize.value[2] = right;
  };

  const onResizeBody = (resizedLayout: number[]) => {
    const [left, right] = resizedLayout;
    bodySize.value = resizedLayout;

    if (left !== 0) historyBodySize.value[0] = left;
    if (right !== 0) historyBodySize.value[1] = right;
  };

  const onToggleBottomPanel = () => {
    const [top, bottom] = bodySize.value;

    if (bottom === 0) {
      const restoreBottom =
        historyBodySize.value[1] || DEFAULT_BODY_LAYOUT_SIZE[1];
      bodySize.value[1] = restoreBottom;
      bodySize.value[0] = Math.max(top - restoreBottom, 0);
    } else {
      historyBodySize.value[1] = bottom;
      bodySize.value[1] = 0;
      bodySize.value[0] = top + bottom;
    }
  };

  const onCloseBottomPanel = () => {
    const [top, bottom] = bodySize.value;
    historyBodySize.value[1] = bottom;
    bodySize.value[1] = 0;
    bodySize.value[0] = top + bottom;
  };

  const codeEditorLayout = ref<RawQueryEditorLayout>(
    RawQueryEditorLayout.vertical
  );

  const setCodeEditorLayout = (layout: RawQueryEditorLayout) => {
    codeEditorLayout.value = layout;
  };

  const editorLayoutSizes = ref<[number, number]>([
    RawQueryEditorDefaultSize.content,
    RawQueryEditorDefaultSize.result,
  ]);

  const editorLayoutInnerVariableSizes = ref<[number, number]>([
    RawQueryEditorDefaultSize.content,
    RawQueryEditorDefaultSize.variables,
  ]);

  const codeEditorConfigs = reactive<CodeEditorConfigs>({
    fontSize: DEFAULT_EDITOR_CONFIG.fontSize,
    showMiniMap: DEFAULT_EDITOR_CONFIG.showMiniMap,
    theme: DEFAULT_EDITOR_CONFIG.theme,
    indentation: DEFAULT_EDITOR_CONFIG.indentation,
  });

  const chatUiConfigs = reactive<ChatUiConfigs>({
    fontSize: DEFAULT_CHAT_UI_CONFIG.fontSize,
    codeFontSize: DEFAULT_CHAT_UI_CONFIG.codeFontSize,
    thinkingStyle: DEFAULT_CHAT_UI_CONFIG.thinkingStyle,
  });

  // Agent AI settings
  const agentApiKeyConfigs = reactive<AgentApiKeyConfigs>({
    openai: '',
    google: '',
    anthropic: '',
    xai: '',
    openrouter: '',
  });

  const agentSelectedProvider = ref<AIProvider>(AIProvider.Google);
  const agentSelectedModel = ref<string>('gemini-2.5-flash');

  // Quick Query settings
  const quickQuerySafeModeEnabled = ref<boolean>(false);

  // Space display setting
  const spaceDisplay = ref<SpaceDisplay>(SpaceDisplay.Default);

  // Table appearance settings
  const tableAppearanceConfigs = reactive<TableAppearanceConfigs>({
    ...DEFAULT_TABLE_APPEARANCE_CONFIGS,
  });

  const resetTableAppearance = () => {
    Object.assign(tableAppearanceConfigs, DEFAULT_TABLE_APPEARANCE_CONFIGS);
  };

  const resetCodeEditorConfigs = () => {
    Object.assign(codeEditorConfigs, {
      fontSize: DEFAULT_EDITOR_CONFIG.fontSize,
      showMiniMap: DEFAULT_EDITOR_CONFIG.showMiniMap,
      theme: DEFAULT_EDITOR_CONFIG.theme,
      indentation: DEFAULT_EDITOR_CONFIG.indentation,
    });
  };

  const resetChatUiConfigs = () => {
    Object.assign(chatUiConfigs, {
      fontSize: DEFAULT_CHAT_UI_CONFIG.fontSize,
      codeFontSize: DEFAULT_CHAT_UI_CONFIG.codeFontSize,
      thinkingStyle: DEFAULT_CHAT_UI_CONFIG.thinkingStyle,
    });
  };

  // --- Custom Layouts ---
  const customLayouts = ref<CustomLayoutDefinition[]>([]);
  const activeCustomLayoutId = ref<string | null>(null);
  const customLayoutSizes = ref<Record<string, CustomLayoutSizeEntry>>({});

  const isUsingCustomLayout = computed(
    () => activeCustomLayoutId.value !== null
  );

  const activeCustomLayout = computed(() => {
    if (!activeCustomLayoutId.value) return null;
    return (
      customLayouts.value.find(l => l.id === activeCustomLayoutId.value) ?? null
    );
  });

  const addCustomLayout = (layout: CustomLayoutDefinition): boolean => {
    if (customLayouts.value.length >= MAX_CUSTOM_LAYOUTS) return false;

    const isDuplicateName = customLayouts.value.some(
      l => l.name.toLowerCase() === layout.name.toLowerCase()
    );
    if (isDuplicateName) return false;

    customLayouts.value.push(layout);
    return true;
  };

  const updateCustomLayout = (
    id: string,
    partial: Partial<Omit<CustomLayoutDefinition, 'id' | 'createdAt'>>
  ): boolean => {
    const index = customLayouts.value.findIndex(l => l.id === id);
    if (index === -1) return false;

    // Validate unique name if name is being updated
    if (partial.name) {
      const isDuplicateName = customLayouts.value.some(
        l => l.id !== id && l.name.toLowerCase() === partial.name!.toLowerCase()
      );
      if (isDuplicateName) return false;
    }

    customLayouts.value[index] = {
      ...customLayouts.value[index],
      ...partial,
    };
    return true;
  };

  const deleteCustomLayout = (id: string): void => {
    customLayouts.value = customLayouts.value.filter(l => l.id !== id);

    // Clean up persisted sizes
    delete customLayoutSizes.value[id];

    // Switch to preset if the deleted layout was active
    if (activeCustomLayoutId.value === id) {
      activeCustomLayoutId.value = null;
      codeEditorLayout.value = RawQueryEditorLayout.vertical;
    }
  };

  const updateCustomLayoutSizes = (
    layoutId: string,
    panels: number[],
    innerPanels?: number[]
  ): void => {
    customLayoutSizes.value[layoutId] = {
      panels,
      innerPanels:
        innerPanels ?? customLayoutSizes.value[layoutId]?.innerPanels ?? [],
    };
  };

  const applyCustomLayout = (id: string): void => {
    const layout = customLayouts.value.find(l => l.id === id);
    if (!layout) return;
    activeCustomLayoutId.value = id;
  };

  const applyPresetLayout = (preset: RawQueryEditorLayout): void => {
    activeCustomLayoutId.value = null;
    codeEditorLayout.value = preset;
  };

  const getPersistedState = (): AppConfigPersistedState =>
    normalizeAppConfigState({
      layoutSize: layoutSize.value,
      historyLayoutSize: historyLayoutSize.value,
      bodySize: bodySize.value,
      historyBodySize: historyBodySize.value,
      codeEditorLayout: codeEditorLayout.value,
      editorLayoutSizes: editorLayoutSizes.value,
      editorLayoutInnerVariableSizes: editorLayoutInnerVariableSizes.value,
      codeEditorConfigs,
      chatUiConfigs,
      agentApiKeyConfigs,
      agentSelectedProvider: agentSelectedProvider.value,
      agentSelectedModel: agentSelectedModel.value,
      quickQuerySafeModeEnabled: quickQuerySafeModeEnabled.value,
      spaceDisplay: spaceDisplay.value,
      tableAppearanceConfigs,
      customLayouts: customLayouts.value,
      activeCustomLayoutId: activeCustomLayoutId.value,
      customLayoutSizes: customLayoutSizes.value,
    });

  const applyPersistedState = (state: AppConfigPersistedState) => {
    const normalized = normalizeAppConfigState(state);

    layoutSize.value = normalized.layoutSize;
    historyLayoutSize.value = normalized.historyLayoutSize;
    bodySize.value = normalized.bodySize;
    historyBodySize.value = normalized.historyBodySize;
    codeEditorLayout.value = normalized.codeEditorLayout;
    editorLayoutSizes.value = normalized.editorLayoutSizes;
    editorLayoutInnerVariableSizes.value =
      normalized.editorLayoutInnerVariableSizes;
    Object.assign(codeEditorConfigs, normalized.codeEditorConfigs);
    Object.assign(chatUiConfigs, normalized.chatUiConfigs);
    Object.assign(agentApiKeyConfigs, normalized.agentApiKeyConfigs);
    agentSelectedProvider.value = normalized.agentSelectedProvider;
    agentSelectedModel.value = normalized.agentSelectedModel;
    quickQuerySafeModeEnabled.value = normalized.quickQuerySafeModeEnabled;
    spaceDisplay.value = normalized.spaceDisplay;
    Object.assign(tableAppearanceConfigs, normalized.tableAppearanceConfigs);
    customLayouts.value = normalized.customLayouts;
    activeCustomLayoutId.value = normalized.activeCustomLayoutId;
    customLayoutSizes.value = normalized.customLayoutSizes;
  };

  const persistState = useDebounceFn(async (state: AppConfigPersistedState) => {
    await storageApis.appConfigStorage.save(state);
  }, 120);

  const loadPersistData = async () => {
    isHydratingPersist.value = true;

    try {
      const persisted = await storageApis.appConfigStorage.get();
      if (persisted) {
        applyPersistedState(persisted);
      }
    } finally {
      hasLoadedPersist.value = true;
      isHydratingPersist.value = false;
    }
  };

  watch(
    getPersistedState,
    state => {
      if (!hasLoadedPersist.value || isHydratingPersist.value) {
        return;
      }

      void persistState(state);
    },
    { deep: true }
  );

  return {
    hasLoadedPersist,
    historyBodySize,
    layoutSize,
    historyLayoutSize,
    isPrimarySidebarCollapsed,
    isSecondSidebarCollapsed,
    onToggleActivityBarPanel,
    onToggleSecondSidebar,
    onResizeLayout,
    bodySize,
    onResizeBody,
    onToggleBottomPanel,
    onShowSecondSidebar,
    onCloseBottomPanel,
    codeEditorLayout,
    setCodeEditorLayout,
    editorLayoutSizes,
    editorLayoutInnerVariableSizes,
    codeEditorConfigs,
    chatUiConfigs,
    agentApiKeyConfigs,
    agentSelectedProvider,
    agentSelectedModel,
    quickQuerySafeModeEnabled,
    // Custom Layouts
    customLayouts,
    activeCustomLayoutId,
    customLayoutSizes,
    isUsingCustomLayout,
    activeCustomLayout,
    addCustomLayout,
    updateCustomLayout,
    deleteCustomLayout,
    applyCustomLayout,
    applyPresetLayout,
    updateCustomLayoutSizes,
    tableAppearanceConfigs,
    resetTableAppearance,
    resetCodeEditorConfigs,
    resetChatUiConfigs,
    spaceDisplay,
    loadPersistData,
  };
});
