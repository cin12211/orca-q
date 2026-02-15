import type { Ref } from 'vue';
import type { FileNode } from '~/components/base/tree-folder/types';
import { getFormatParameters } from '~/components/modules/management-schemas/utils';
import { TabViewType } from '~/core/stores/useTabViewsStore';
import { FunctionSchemaEnum, ViewSchemaEnum } from '~/core/types';
import { SchemaFolderType } from '../constants';

export const useSchemaTreeData = (
  activeSchema: Ref<any>,
  debouncedSearch: Ref<string>
) => {
  const defaultFolderOpenId = computed(
    () => `${activeSchema?.value?.schemaName}.${SchemaFolderType.Tables}`
  );

  const fileTreeData = computed<Record<string, FileNode>>(() => {
    const schemaName = activeSchema?.value?.schemaName;
    const tables = activeSchema?.value?.tables || [];
    const functions = activeSchema?.value?.functions || [];
    const views = activeSchema?.value?.views || [];

    const nodes: Record<string, FileNode> = {};

    const formatFunctionName = (name: string, parameters: string) => {
      const formatParameters = getFormatParameters(parameters);
      return `${name}(${formatParameters})`;
    };

    const addFolder = (
      id: string,
      name: string,
      iconOpen: string,
      iconClose: string,
      tabViewType: TabViewType,
      iconClass?: string
    ) => {
      nodes[id] = {
        id,
        parentId: null,
        name,
        type: 'folder',
        depth: 0,
        iconOpen,
        iconClose,
        iconClass,
        children: [],
        data: { tabViewType },
      };
    };

    const functionParentId = `${schemaName}.${SchemaFolderType.Functions}`;
    const tableParentId = defaultFolderOpenId.value;
    const viewParentId = `${schemaName}.${SchemaFolderType.Views}`;

    addFolder(
      functionParentId,
      SchemaFolderType.Functions,
      'material-icon-theme:folder-functions-open',
      'material-icon-theme:folder-functions',
      TabViewType.FunctionsOverview
    );

    addFolder(
      tableParentId,
      SchemaFolderType.Tables,
      'material-icon-theme:folder-database-open',
      'material-icon-theme:folder-database',
      TabViewType.TableOverview
    );

    addFolder(
      viewParentId,
      SchemaFolderType.Views,
      'material-icon-theme:folder-enum-open',
      'material-icon-theme:folder-enum',
      TabViewType.ViewOverview
    );

    functions.forEach(({ name, oId, type, parameters }: any) => {
      const nodeId = `${schemaName}.${String(oId)}`;
      const displayName = formatFunctionName(name, parameters);

      nodes[nodeId] = {
        id: nodeId,
        parentId: functionParentId,
        name: displayName,
        type: 'file',
        depth: 1,
        iconOpen: 'gravity-ui:function',
        iconClose: 'gravity-ui:function',
        iconClass:
          type === FunctionSchemaEnum.Function
            ? 'text-blue-400'
            : 'text-orange-400',
        data: {
          tabViewType: TabViewType.FunctionsDetail,
          itemValue: {
            title: displayName,
            name,
            id: oId,
            parameters,
            tabViewType: TabViewType.FunctionsDetail,
            icon: 'gravity-ui:function',
            iconClass:
              type === FunctionSchemaEnum.Function
                ? 'text-blue-400'
                : 'text-orange-400',
          },
          parameters,
        },
      };

      nodes[functionParentId].children!.push(nodeId);
    });

    tables.forEach((tableName: string) => {
      const nodeId = `${schemaName}.${tableName}`;

      nodes[nodeId] = {
        id: nodeId,
        parentId: tableParentId,
        name: tableName,
        type: 'file',
        depth: 1,
        iconOpen: 'hugeicons:grid-table',
        iconClose: 'hugeicons:grid-table',
        iconClass: 'text-yellow-400',
        data: {
          tabViewType: TabViewType.TableDetail,
          itemValue: {
            title: tableName,
            name: tableName,
            id: tableName,
            tabViewType: TabViewType.TableDetail,
            icon: 'hugeicons:grid-table',
            iconClass: 'text-yellow-400',
          },
        },
      };

      nodes[tableParentId].children!.push(nodeId);
    });

    views.forEach(({ name, oid, type }: any) => {
      const nodeId = `${schemaName}.${String(oid)}`;

      nodes[nodeId] = {
        id: nodeId,
        parentId: viewParentId,
        name,
        type: 'file',
        depth: 1,
        iconOpen:
          type === ViewSchemaEnum.View
            ? 'hugeicons:property-view'
            : 'hugeicons:property-new',
        iconClose:
          type === ViewSchemaEnum.View
            ? 'hugeicons:property-view'
            : 'hugeicons:property-new',
        iconClass:
          type === ViewSchemaEnum.View ? 'text-green-700' : 'text-orange-500',
        data: {
          tabViewType: TabViewType.ViewDetail,
          itemValue: {
            title: name,
            name,
            id: oid,
            tabViewType: TabViewType.ViewDetail,
            icon:
              type === ViewSchemaEnum.View
                ? 'hugeicons:property-view'
                : 'hugeicons:property-new',
            iconClass:
              type === ViewSchemaEnum.View
                ? 'text-green-700'
                : 'text-orange-500',
          },
        },
      };

      nodes[viewParentId].children!.push(nodeId);
    });

    if (debouncedSearch.value) {
      const query = debouncedSearch.value.toLowerCase();
      const filtered: Record<string, FileNode> = {};

      [functionParentId, tableParentId, viewParentId].forEach(folderId => {
        const folder = nodes[folderId];
        if (!folder) return;

        const matchingChildren = folder.children?.filter(childId => {
          const child = nodes[childId];
          return child?.name.toLowerCase().includes(query);
        });

        if (matchingChildren && matchingChildren.length > 0) {
          filtered[folderId] = {
            ...folder,
            children: matchingChildren,
          };

          matchingChildren.forEach(childId => {
            filtered[childId] = nodes[childId];
          });
        }
      });

      return filtered;
    }

    return nodes;
  });

  return {
    fileTreeData,
    defaultFolderOpenId,
  };
};
