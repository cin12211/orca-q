import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';

// import {
//   ClientSideRowModelModule,
//   TextFilterModule,
//   NumberFilterModule,
//   DateFilterModule,
//   ColumnApiModule,
//   ValidationModule,
//   TextEditorModule,
//   CellStyleModule,
//   RowSelectionModule,
//   UndoRedoEditModule,
//   RowStyleModule,
//   NumberEditorModule,
//   CheckboxEditorModule,
//   GridStateModule,
// } from 'ag-grid-community';

export default defineNuxtPlugin(() => {
  if (import.meta.client) {
    console.log('[AG-Grid Plugin] Registering Community Modules.');
    // Register all Community features globally
    ModuleRegistry.registerModules([
      AllCommunityModule,
      // ClientSideRowModelModule,
      // TextFilterModule,
      // NumberFilterModule,
      // DateFilterModule,
      // ColumnApiModule,
      // ValidationModule,
      // TextEditorModule,
      // CellStyleModule,
      // RowSelectionModule,
      // UndoRedoEditModule,
      // RowStyleModule,
      // NumberEditorModule,
      // CheckboxEditorModule,
      // GridStateModule,
    ]);
  }
});
