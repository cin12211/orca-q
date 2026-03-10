import { reactive, ref, watch } from 'vue';
import dayjs from 'dayjs';
import { uuidv4 } from '~/core/helpers';
import type { Connection } from '~/core/stores';
import { EDatabaseType } from '../constants';
import { EConnectionMethod, ESSLMode, ESSHAuthMethod } from '../types';
import { connectionService } from '../services/connection.service';

export function useConnectionForm(props: {
  open: boolean;
  editingConnection: Connection | null;
  workspaceId: string;
  onAddNew: (connection: Connection) => void;
  onUpdate: (connection: Connection) => void;
  onClose: () => void;
}) {
  const step = ref<1 | 2>(1);
  const dbType = ref<EDatabaseType | null>(EDatabaseType.PG);
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
  });
  const testStatus = ref<'idle' | 'testing' | 'success' | 'error'>('idle');

  const resetForm = () => {
    step.value = 1;
    dbType.value = EDatabaseType.PG;
    connectionName.value = '';
    connectionMethod.value = EConnectionMethod.STRING;
    connectionString.value = '';

    formData.host = '';
    formData.port = '';
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
      body.port = formData.port || getDefaultPort();
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
          authMethod: formData.sshAuthMethod,
          password: formData.sshPassword,
          privateKey: formData.sshPrivateKey,
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
    const isEdit = props.editingConnection;
    const isCreate = !isEdit;

    if (isCreate) {
      const isConnectedSuccess = await handleTestConnection();

      if (!isConnectedSuccess) {
        return;
      }
    }

    const connection: Connection = {
      workspaceId: props.workspaceId,
      id: props.editingConnection?.id || uuidv4(),
      name: connectionName.value,
      type: dbType.value as EDatabaseType,
      method: connectionMethod.value,
      createdAt: props.editingConnection?.createdAt || dayjs().toISOString(),
    };

    if (connectionMethod.value === EConnectionMethod.STRING) {
      connection.connectionString = connectionString.value;
    } else {
      connection.host = formData.host;
      connection.port = formData.port || getDefaultPort();
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
          authMethod: formData.sshAuthMethod,
          password: formData.sshPassword,
          privateKey: formData.sshPrivateKey,
        };
      }

      // Generate connection string for compatibility with other modules
      const prefix = dbType.value === EDatabaseType.PG ? 'postgresql' : 'mysql';
      connection.connectionString = `${prefix}://${formData.username}:${formData.password}@${formData.host}:${connection.port}/${formData.database}`;
    }

    if (isCreate) {
      props.onAddNew(connection);
    } else {
      props.onUpdate(connection);
    }

    props.onClose();
  };

  const getDefaultPort = () => {
    switch (dbType.value) {
      case EDatabaseType.PG:
        return '5432';
      case EDatabaseType.MYSQL:
        return '3306';
      default:
        return '';
    }
  };

  const getConnectionPlaceholder = () => {
    switch (dbType.value) {
      case EDatabaseType.PG:
        return 'postgresql://username:password@localhost:5432/database';
      case EDatabaseType.MYSQL:
        return 'mysql://username:password@localhost:3306/database';
      default:
        return '';
    }
  };

  const isFormValid = () => {
    if (!connectionName.value) return false;

    if (connectionMethod.value === EConnectionMethod.STRING) {
      return !!connectionString.value;
    } else {
      return !!(
        formData.host &&
        (formData.port || getDefaultPort()) &&
        formData.database
      );
    }
  };

  // Reset form when modal opens or editing connection changes
  watch(
    () => [props.open, props.editingConnection],
    () => {
      if (props.open) {
        if (props.editingConnection) {
          connectionName.value = props.editingConnection.name;
          dbType.value = props.editingConnection.type;
          connectionMethod.value = props.editingConnection.method;
          connectionString.value =
            props.editingConnection.connectionString || '';

          formData.host = props.editingConnection.host || '';
          formData.port = props.editingConnection.port || '';
          formData.username = props.editingConnection.username || '';
          formData.password = props.editingConnection.password || '';
          formData.database = props.editingConnection.database || '';

          formData.sslEnabled = !!props.editingConnection.ssl;
          if (props.editingConnection.ssl) {
            formData.sslMode = props.editingConnection.ssl.mode;
            formData.sslCA = props.editingConnection.ssl.ca || '';
            formData.sslCert = props.editingConnection.ssl.cert || '';
            formData.sslKey = props.editingConnection.ssl.key || '';
            formData.sslRejectUnauthorized =
              props.editingConnection.ssl.rejectUnauthorized ?? true;
          }

          formData.sshEnabled = !!props.editingConnection.ssh?.enabled;
          if (props.editingConnection.ssh) {
            formData.sshHost = props.editingConnection.ssh.host || '';
            formData.sshPort = props.editingConnection.ssh.port || 22;
            formData.sshUsername = props.editingConnection.ssh.username || '';
            formData.sshAuthMethod =
              props.editingConnection.ssh.authMethod ||
              ESSHAuthMethod.PASSWORD;
            formData.sshPassword = props.editingConnection.ssh.password || '';
            formData.sshPrivateKey =
              props.editingConnection.ssh.privateKey || '';
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
    getDefaultPort,
    getConnectionPlaceholder,
    isFormValid,
    resetForm,
  };
}
