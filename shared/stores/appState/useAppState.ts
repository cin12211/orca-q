import { useManagementConnectionStore } from '../managementConnectionStore';
import { useSchemaStore } from '../useSchemaStore';

export const useAppState = () => {
  const connectionStore = useManagementConnectionStore();
  const schemaStore = useSchemaStore();

  return {};
};
