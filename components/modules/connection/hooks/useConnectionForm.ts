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
import type { Connection } from '~/core/stores';
import { connectionService } from '../services/connection.service';
import { EConnectionMethod, ESSLMode, ESSHAuthMethod } from '../types';

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
  const connectionName = ref('');
  const connectionMethod = ref<EConnectionMethod>(EConnectionMethod.STRING);
  const connectionString = ref('');
  const formData = reactive({
    host: '',
    port: '',
    username: '',
    password: '',
    database: '',
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
  const testStatus = ref<'idle' | 'testing' | 'success' | 'error'>('idle');

  const getDefaultPort = (type: DatabaseClientType | null) => {
    switch (type) {
      case DatabaseClientType.POSTGRES:
        return '5432';
      case DatabaseClientType.MYSQL:
      case DatabaseClientType.MYSQL2:
        return '3306';
      default:
        return '';
    }
  };

  const resetForm = () => {
    step.value = 1;
    dbType.value = DatabaseClientType.POSTGRES;
    connectionName.value = '';
    connectionMethod.value = EConnectionMethod.STRING;
    connectionString.value = '';

    formData.host = '';
    formData.port = getDefaultPort(DatabaseClientType.POSTGRES);
    formData.username = '';
    formData.password = '';
    formData.database = '';

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

    testStatus.value = 'idle';
  };

  const handleNext = () => {
    if (step.value === 1 && dbType.value) {
      step.value = 2;
    }
  };

  const handleBack = () => {
    step.value = 1;
    testStatus.value = 'idle';
  };

  const handleTestConnection = async () => {
    testStatus.value = 'testing';

    const body: any = {
      type: dbType.value,
    };

    if (connectionMethod.value === EConnectionMethod.STRING) {
      body.stringConnection = connectionString.value;
    } else {
      body.host = formData.host;
      body.port = formData.port || getDefaultPort(dbType.value);
      body.username = formData.username;
      body.password = formData.password;
      body.database = formData.database;

      if (formData.sslEnabled) {
        body.ssl = {
          mode: formData.sslMode,
          ca: formData.sslCA,
          cert: formData.sslCert,
          key: formData.sslKey,
          rejectUnauthorized: formData.sslRejectUnauthorized,
        };
      }

      if (formData.sshEnabled) {
        body.ssh = {
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
      }
    }

    try {
      const result = await connectionService.healthCheck(body);

      if (result.isConnectedSuccess) {
        testStatus.value = 'success';
        return true;
      } else {
        testStatus.value = 'error';
        return false;
      }
    } catch (error) {
      testStatus.value = 'error';
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
    };

    if (connectionMethod.value === EConnectionMethod.STRING) {
      connection.connectionString = connectionString.value;
    } else {
      connection.host = formData.host;
      connection.port = formData.port || getDefaultPort(dbType.value);
      connection.username = formData.username;
      connection.password = formData.password;
      connection.database = formData.database;

      if (formData.sslEnabled) {
        connection.ssl = {
          mode: formData.sslMode,
          ca: formData.sslCA,
          cert: formData.sslCert,
          key: formData.sslKey,
          rejectUnauthorized: formData.sslRejectUnauthorized,
        };
      }

      if (formData.sshEnabled) {
        connection.ssh = {
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
      }

      // Generate connection string for compatibility with other modules
      const prefix =
        dbType.value === DatabaseClientType.POSTGRES ? 'postgresql' : 'mysql';
      connection.connectionString = `${prefix}://${formData.username}:${formData.password}@${formData.host}:${connection.port}/${formData.database}`;
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
      default:
        return '';
    }
  };

  const isFormValid = computed(() => {
    if (!connectionName.value) return false;

    if (connectionMethod.value === EConnectionMethod.STRING) {
      return !!connectionString.value;
    } else {
      return !!(
        formData.host &&
        (formData.port || getDefaultPort(dbType.value)) &&
        formData.username &&
        formData.database
      );
    }
  });

  // Watch for dbType changes to auto-fill port (only for new connections)
  watch(dbType, newType => {
    if (newType && !editingConnection.value) {
      formData.port = getDefaultPort(newType);
    }
  });

  // Reset form when modal opens or editing connection changes
  watch(
    () => [isOpen.value, editingConnection.value],
    () => {
      if (isOpen.value) {
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

          formData.sslEnabled = !!conn.ssl;
          if (conn.ssl) {
            formData.sslMode = conn.ssl.mode;
            formData.sslCA = conn.ssl.ca || '';
            formData.sslCert = conn.ssl.cert || '';
            formData.sslKey = conn.ssl.key || '';
            formData.sslRejectUnauthorized =
              conn.ssl.rejectUnauthorized ?? true;
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

          step.value = 2;
        } else {
          resetForm();
        }
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
    testStatus,
    handleNext,
    handleBack,
    handleTestConnection,
    handleCreateConnection,
    getDefaultPort: () => getDefaultPort(dbType.value),
    getConnectionPlaceholder,
    isFormValid,
    resetForm,
  };
}
