import {
  reactive,
  ref,
  watch,
  computed,
  toRef,
  type MaybeRefOrGetter,
} from 'vue';
import dayjs from 'dayjs';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { uuidv4 } from '~/core/helpers';
import { isElectron } from '~/core/helpers/environment';
import type { Connection } from '~/core/stores';
import { useEnvironmentTagStore } from '~/core/stores';
import { DEFAULT_DB_PORTS } from '../constants';
import {
  connectionService,
  type ConnectionHealthCheckBody,
} from '../services/connection.service';
import { EConnectionMethod, ESSLMode, ESSHAuthMethod } from '../types';

type FormHealthCheckBody = Extract<
  ConnectionHealthCheckBody,
  { method: EConnectionMethod.FORM }
>;
type FormConnectionPayload = Omit<FormHealthCheckBody, 'type' | 'method'>;

const NETWORK_CONNECTION_METHODS = new Set([
  EConnectionMethod.STRING,
  EConnectionMethod.FORM,
]);

const getSupportedConnectionMethods = (
  type: DatabaseClientType | null
): EConnectionMethod[] => {
  if (!type) return [];

  if (type === DatabaseClientType.SQLITE3) {
    return [EConnectionMethod.FILE];
  }

  return [EConnectionMethod.STRING, EConnectionMethod.FORM];
};

const getStructuredTargetKey = (type: DatabaseClientType | null) => {
  return type === DatabaseClientType.ORACLE ? 'serviceName' : 'database';
};

const getConnectionStringScheme = (type: DatabaseClientType | null) => {
  switch (type) {
    case DatabaseClientType.POSTGRES:
      return 'postgresql';
    case DatabaseClientType.MARIADB:
      return 'mariadb';
    case DatabaseClientType.ORACLE:
      return 'oracledb';
    case DatabaseClientType.MYSQL:
    case DatabaseClientType.MYSQL2:
      return 'mysql';
    default:
      return '';
  }
};

const buildSqliteConnectionString = (filePath: string) => {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const prefix = normalizedPath.startsWith('/') ? '' : '/';
  return `sqlite3://${prefix}${normalizedPath}`;
};

const getFileNameStem = (filePath: string) => {
  const name = filePath.split(/[\\/]/).pop() || '';
  return name.replace(/\.(sqlite3?|db3?)$/i, '') || name;
};

export function useConnectionForm(props: {
  open: MaybeRefOrGetter<boolean>;
  editingConnection: MaybeRefOrGetter<Connection | null>;
  workspaceId: MaybeRefOrGetter<string>;
  onAddNew: (connection: Connection) => void;
  onUpdate: (connection: Connection) => void;
  onClose: () => void;
}) {
  const isOpen = toRef(props.open);
  const editingConnection = toRef(props.editingConnection);
  const workspaceId = toRef(props.workspaceId);

  const step = ref<1 | 2>(1);
  const dbType = ref<DatabaseClientType | null>(DatabaseClientType.POSTGRES);
  const connectionName = ref('my-abc-db');
  const connectionMethod = ref<EConnectionMethod>(EConnectionMethod.STRING);
  const connectionString = ref('');
  const formData = reactive({
    host: '',
    port: '',
    username: '',
    password: '',
    database: '',
    serviceName: '',
    filePath: '',
    // SSL
    sslEnabled: false,
    sslMode: ESSLMode.DISABLE,
    sslCA: '',
    sslCert: '',
    sslKey: '',
    sslRejectUnauthorized: true,
    // SSH
    sshEnabled: false,
    sshHost: '',
    sshPort: 22,
    sshUsername: '',
    sshAuthMethod: ESSHAuthMethod.PASSWORD,
    sshPassword: '',
    sshPrivateKey: '',
    sshStoreInKeychain: true,
    sshUseKey: false,
  });
  const tagIds = ref<string[]>([]);
  const testStatus = ref<'idle' | 'testing' | 'success' | 'error'>('idle');
  const testErrorMessage = ref('');

  const tagStore = useEnvironmentTagStore();

  const availableConnectionMethods = computed(() =>
    getSupportedConnectionMethods(dbType.value)
  );
  const isElectronRuntime = computed(() => isElectron());
  const isFileMethod = computed(
    () => connectionMethod.value === EConnectionMethod.FILE
  );
  const canPickSqliteFile = computed(
    () =>
      dbType.value === DatabaseClientType.SQLITE3 &&
      isElectronRuntime.value &&
      typeof window !== 'undefined' &&
      typeof window.electronAPI?.window.pickSqliteFile === 'function'
  );
  const usesServiceName = computed(
    () => getStructuredTargetKey(dbType.value) === 'serviceName'
  );
  const structuredTargetLabel = computed(() =>
    usesServiceName.value ? 'Service Name' : 'Database'
  );
  const structuredTargetPlaceholder = computed(() =>
    usesServiceName.value ? 'ORCLPDB1' : 'my_database'
  );
  const canUseNetworkOptions = computed(() =>
    NETWORK_CONNECTION_METHODS.has(connectionMethod.value)
  );

  const getDefaultPort = (type: DatabaseClientType | null) => {
    if (!type) return '';
    return DEFAULT_DB_PORTS[type] || '';
  };

  const getDefaultTagIds = (): string[] => {
    const devTag = tagStore.tags.find(t => t.name === 'dev');
    return devTag ? [devTag.id] : [];
  };

  const buildSSLConfig = () => {
    if (!formData.sslEnabled || !canUseNetworkOptions.value) {
      return undefined;
    }

    return {
      mode: formData.sslMode,
      ca: formData.sslCA,
      cert: formData.sslCert,
      key: formData.sslKey,
      rejectUnauthorized: formData.sslRejectUnauthorized,
    };
  };

  const buildSSHConfig = () => {
    if (!formData.sshEnabled || !canUseNetworkOptions.value) {
      return undefined;
    }

    return {
      enabled: true,
      host: formData.sshHost,
      port: formData.sshPort,
      username: formData.sshUsername,
      authMethod: formData.sshUseKey
        ? ESSHAuthMethod.KEY
        : ESSHAuthMethod.PASSWORD,
      password: formData.sshPassword,
      privateKey: formData.sshPrivateKey,
      storeInKeychain: formData.sshStoreInKeychain,
      useSshKey: formData.sshUseKey,
    };
  };

  const buildFormConnectionPayload = (): FormConnectionPayload => {
    const payload: FormConnectionPayload = {
      host: formData.host,
      port: formData.port || getDefaultPort(dbType.value),
      username: formData.username,
      password: formData.password,
      ssl: buildSSLConfig(),
      ssh: buildSSHConfig(),
    };

    if (usesServiceName.value) {
      payload.serviceName = formData.serviceName;
    } else {
      payload.database = formData.database;
    }

    return payload;
  };

  const buildGeneratedConnectionString = () => {
    const scheme = getConnectionStringScheme(dbType.value);
    const port = formData.port || getDefaultPort(dbType.value);
    const target = usesServiceName.value
      ? formData.serviceName
      : formData.database;

    if (!scheme || !formData.host || !formData.username || !target) {
      return undefined;
    }

    const credentials = formData.password
      ? `${formData.username}:${formData.password}`
      : formData.username;

    return `${scheme}://${credentials}@${formData.host}${port ? `:${port}` : ''}/${target}`;
  };

  const buildHealthCheckBody = (): ConnectionHealthCheckBody => {
    const type = dbType.value;

    if (!type) {
      throw new Error('Database type is required.');
    }

    if (connectionMethod.value === EConnectionMethod.STRING) {
      return {
        type,
        method: EConnectionMethod.STRING,
        stringConnection: connectionString.value,
      };
    }

    if (connectionMethod.value === EConnectionMethod.FILE) {
      return {
        type: DatabaseClientType.SQLITE3,
        method: EConnectionMethod.FILE,
        filePath: formData.filePath,
      };
    }

    return {
      type,
      method: EConnectionMethod.FORM,
      ...buildFormConnectionPayload(),
    };
  };

  const resetForm = () => {
    step.value = 1;
    dbType.value = DatabaseClientType.POSTGRES;
    connectionName.value = 'my-abc-db';
    connectionMethod.value = EConnectionMethod.STRING;
    connectionString.value = '';

    formData.host = '';
    formData.port = getDefaultPort(DatabaseClientType.POSTGRES);
    formData.username = '';
    formData.password = '';
    formData.database = '';
    formData.serviceName = '';
    formData.filePath = '';

    formData.sslEnabled = false;
    formData.sslMode = ESSLMode.DISABLE;
    formData.sslCA = '';
    formData.sslCert = '';
    formData.sslKey = '';
    formData.sslRejectUnauthorized = true;

    formData.sshEnabled = false;
    formData.sshHost = '';
    formData.sshPort = 22;
    formData.sshUsername = '';
    formData.sshAuthMethod = ESSHAuthMethod.PASSWORD;
    formData.sshPassword = '';
    formData.sshPrivateKey = '';
    formData.sshStoreInKeychain = true;
    formData.sshUseKey = false;

    tagIds.value = getDefaultTagIds();
    testStatus.value = 'idle';
    testErrorMessage.value = '';
  };

  const handleNext = () => {
    if (step.value === 1 && dbType.value) {
      step.value = 2;
    }
  };

  const handleBack = () => {
    step.value = 1;
    testStatus.value = 'idle';
    testErrorMessage.value = '';
  };

  const handleTestConnection = async () => {
    if (
      connectionMethod.value === EConnectionMethod.FILE &&
      !isElectronRuntime.value
    ) {
      testStatus.value = 'error';
      testErrorMessage.value =
        'SQLite file connections are available only in the desktop app.';
      return false;
    }

    testStatus.value = 'testing';
    testErrorMessage.value = '';

    try {
      const result = await connectionService.healthCheck(
        buildHealthCheckBody()
      );

      if (result.isConnectedSuccess) {
        testStatus.value = 'success';
        testErrorMessage.value = '';
        return true;
      }

      testStatus.value = 'error';
      testErrorMessage.value =
        result.message ||
        'Connection failed. Please check your details and try again.';
      return false;
    } catch (error: any) {
      testStatus.value = 'error';
      testErrorMessage.value =
        error?.data?.message ||
        error?.message ||
        'Connection failed. Please check your details and try again.';
      return false;
    }
  };

  const handleCreateConnection = async () => {
    const isEdit = !!editingConnection.value;
    const isCreate = !isEdit;

    if (isCreate) {
      const isConnectedSuccess = await handleTestConnection();

      if (!isConnectedSuccess) {
        return;
      }
    }

    const connection: Connection = {
      workspaceId: workspaceId.value,
      id: editingConnection.value?.id || uuidv4(),
      name: connectionName.value,
      type: dbType.value as DatabaseClientType,
      method: connectionMethod.value,
      createdAt: editingConnection.value?.createdAt || dayjs().toISOString(),
      tagIds: [...tagIds.value],
    };

    if (connectionMethod.value === EConnectionMethod.STRING) {
      connection.connectionString = connectionString.value;
    } else if (connectionMethod.value === EConnectionMethod.FILE) {
      connection.filePath = formData.filePath;
      connection.connectionString = buildSqliteConnectionString(
        formData.filePath
      );
    } else {
      const payload = buildFormConnectionPayload();

      connection.host = payload.host as string;
      connection.port = payload.port as string;
      connection.username = payload.username as string;
      connection.password = payload.password as string;
      connection.database = payload.database as string | undefined;
      connection.serviceName = payload.serviceName as string | undefined;
      connection.ssl = payload.ssl as Connection['ssl'];
      connection.ssh = payload.ssh as Connection['ssh'];
      connection.connectionString = buildGeneratedConnectionString();
    }

    if (isCreate) {
      props.onAddNew(connection);
    } else {
      props.onUpdate(connection);
    }

    props.onClose();
  };

  const getConnectionPlaceholder = () => {
    switch (dbType.value) {
      case DatabaseClientType.POSTGRES:
        return 'postgresql://username:password@localhost:5432/database';
      case DatabaseClientType.MYSQL:
      case DatabaseClientType.MYSQL2:
        return 'mysql://username:password@localhost:3306/database';
      case DatabaseClientType.MARIADB:
        return 'mariadb://username:password@localhost:3306/database';
      case DatabaseClientType.ORACLE:
        return 'oracledb://username:password@localhost:1521/ORCLPDB1';
      case DatabaseClientType.SQLITE3:
        return '/Users/you/data/app.sqlite';
      default:
        return '';
    }
  };

  const pickSqliteFile = async () => {
    if (!canPickSqliteFile.value) {
      return;
    }

    const selectedPath = await window.electronAPI?.window.pickSqliteFile();

    if (!selectedPath) {
      return;
    }

    formData.filePath = selectedPath;

    if (!editingConnection.value && connectionName.value === 'my-abc-db') {
      connectionName.value = getFileNameStem(selectedPath);
    }

    testStatus.value = 'idle';
  };

  const isFormValid = computed(() => {
    if (!connectionName.value) return false;

    if (connectionMethod.value === EConnectionMethod.STRING) {
      return !!connectionString.value;
    }

    if (connectionMethod.value === EConnectionMethod.FILE) {
      return isElectronRuntime.value && !!formData.filePath;
    }

    if (usesServiceName.value) {
      return !!(
        formData.host &&
        (formData.port || getDefaultPort(dbType.value)) &&
        formData.username &&
        formData.password &&
        formData.serviceName
      );
    }

    return !!(
      formData.host &&
      (formData.port || getDefaultPort(dbType.value)) &&
      formData.username &&
      formData.database
    );
  });

  watch(dbType, newType => {
    const supportedMethods = getSupportedConnectionMethods(newType);

    if (
      supportedMethods.length > 0 &&
      !supportedMethods.includes(connectionMethod.value)
    ) {
      connectionMethod.value = supportedMethods[0];
    }

    if (newType === DatabaseClientType.SQLITE3) {
      formData.host = '';
      formData.port = '';
      formData.username = '';
      formData.password = '';
      formData.database = '';
      formData.serviceName = '';
      formData.sslEnabled = false;
      formData.sshEnabled = false;
    } else {
      formData.filePath = '';

      if (newType !== DatabaseClientType.ORACLE) {
        formData.serviceName = '';
      }

      if (!editingConnection.value) {
        formData.port = getDefaultPort(newType);
      }
    }

    testStatus.value = 'idle';
  });

  watch(connectionMethod, method => {
    if (method !== EConnectionMethod.FILE) {
      formData.filePath = '';
    }

    testStatus.value = 'idle';
  });

  watch(
    isOpen,
    open => {
      if (!open) return;

      if (editingConnection.value) {
        const conn = editingConnection.value;
        connectionName.value = conn.name;
        dbType.value = conn.type as DatabaseClientType;
        connectionMethod.value = conn.method;
        connectionString.value = conn.connectionString || '';

        formData.host = conn.host || '';
        formData.port = conn.port || '';
        formData.username = conn.username || '';
        formData.password = conn.password || '';
        formData.database = conn.database || '';
        formData.serviceName = conn.serviceName || '';
        formData.filePath = conn.filePath || '';

        formData.sslEnabled = !!conn.ssl;
        if (conn.ssl) {
          formData.sslMode = conn.ssl.mode;
          formData.sslCA = conn.ssl.ca || '';
          formData.sslCert = conn.ssl.cert || '';
          formData.sslKey = conn.ssl.key || '';
          formData.sslRejectUnauthorized = conn.ssl.rejectUnauthorized ?? true;
        }

        formData.sshEnabled = !!conn.ssh?.enabled;
        if (conn.ssh) {
          formData.sshHost = conn.ssh.host || '';
          formData.sshPort = conn.ssh.port || 22;
          formData.sshUsername = conn.ssh.username || '';
          formData.sshAuthMethod =
            conn.ssh.authMethod || ESSHAuthMethod.PASSWORD;
          formData.sshPassword = conn.ssh.password || '';
          formData.sshPrivateKey = conn.ssh.privateKey || '';
          formData.sshStoreInKeychain = conn.ssh.storeInKeychain ?? true;
          formData.sshUseKey =
            conn.ssh.useSshKey ?? conn.ssh.authMethod === ESSHAuthMethod.KEY;
        }

        tagIds.value = [...(conn.tagIds ?? [])];
        step.value = 2;
      } else {
        resetForm();
      }
    },
    { immediate: true }
  );

  return {
    step,
    dbType,
    connectionName,
    connectionMethod,
    connectionString,
    formData,
    tagIds,
    testStatus,
    testErrorMessage,
    handleNext,
    handleBack,
    handleTestConnection,
    handleCreateConnection,
    getDefaultPort: () => getDefaultPort(dbType.value),
    getConnectionPlaceholder,
    availableConnectionMethods,
    structuredTargetLabel,
    structuredTargetPlaceholder,
    canUseNetworkOptions,
    canPickSqliteFile,
    isFileMethod,
    isFormValid,
    pickSqliteFile,
    resetForm,
  };
}
