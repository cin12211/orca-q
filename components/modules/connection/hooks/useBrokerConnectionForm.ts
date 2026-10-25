import {
  computed,
  reactive,
  ref,
  toRef,
  watch,
  type MaybeRefOrGetter,
} from 'vue';
import dayjs from 'dayjs';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { uuidv4 } from '~/core/helpers';
import type { Connection } from '~/core/stores';
import { useEnvironmentTagStore } from '~/core/stores';
import { DEFAULT_DB_PORTS } from '../constants';
import {
  brokerConnectionService,
  type BrokerHealthCheckBody,
} from '../services/broker-connection.service';
import {
  EConnectionMethod,
  EConnectionProviderKind,
  EKafkaSaslMechanism,
  ESSHAuthMethod,
  ESSLMode,
  type IBrokerConfig,
} from '../types';
import { parseBrokerList } from '../utils';

export type BrokerClientType =
  | DatabaseClientType.RABBITMQ
  | DatabaseClientType.KAFKA;

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

const DEFAULT_CONNECTION_NAME = {
  [DatabaseClientType.RABBITMQ]: 'my-rabbitmq',
  [DatabaseClientType.KAFKA]: 'my-kafka',
} as const;
const DEFAULT_ERROR_MESSAGE =
  'Connection failed. Please check your details and try again.';

const createFormState = (type: BrokerClientType) => ({
  host: '',
  port: DEFAULT_DB_PORTS[type] ?? '',
  username: '',
  password: '',
  vhost: '/',
  brokers: '',
  saslMechanism: EKafkaSaslMechanism.NONE,
  sslEnabled: false,
  sslMode: ESSLMode.REQUIRE,
  sslCA: '',
  sslCert: '',
  sslKey: '',
  sslRejectUnauthorized: true,
  sshEnabled: false,
  sshHost: '',
  sshPort: 22,
  sshUsername: '',
  sshPassword: '',
  sshPrivateKey: '',
  sshStoreInKeychain: true,
  sshUseKey: false,
});

/**
 * State for the RabbitMQ / Kafka connection forms. Kept apart from
 * `useConnectionForm` so the SQL form does not grow broker-only branches.
 */
export function useBrokerConnectionForm(props: {
  type: MaybeRefOrGetter<BrokerClientType>;
  editingConnection: MaybeRefOrGetter<Connection | null>;
  workspaceId: MaybeRefOrGetter<string>;
  onSave: (connection: Connection, isEdit: boolean) => void;
}) {
  const type = toRef(props.type);
  const editingConnection = toRef(props.editingConnection);
  const workspaceId = toRef(props.workspaceId);
  const tagStore = useEnvironmentTagStore();

  const connectionName = ref<string>(DEFAULT_CONNECTION_NAME[type.value]);
  const tagIds = ref<string[]>([]);
  const formData = reactive(createFormState(type.value));
  const testStatus = ref<TestStatus>('idle');
  const testErrorMessage = ref('');
  const testErrorHint = ref('');
  const testErrorDetail = ref('');

  const isKafka = computed(() => type.value === DatabaseClientType.KAFKA);
  const needsKafkaCredentials = computed(
    () => formData.saslMechanism !== EKafkaSaslMechanism.NONE
  );

  const isFormValid = computed(() => {
    if (!connectionName.value) return false;

    if (isKafka.value) {
      return (
        parseBrokerList(formData.brokers).length > 0 &&
        (!needsKafkaCredentials.value ||
          Boolean(formData.username && formData.password))
      );
    }

    const isSshValid =
      !formData.sshEnabled ||
      Boolean(
        formData.sshHost &&
          formData.sshUsername &&
          (formData.sshUseKey ? formData.sshPrivateKey : formData.sshPassword)
      );

    return Boolean(formData.host && formData.username && isSshValid);
  });

  const resetTestState = () => {
    testStatus.value = 'idle';
    testErrorMessage.value = '';
    testErrorHint.value = '';
    testErrorDetail.value = '';
  };

  const buildSSLConfig = () =>
    formData.sslEnabled
      ? {
          mode: formData.sslMode,
          ca: formData.sslCA,
          cert: formData.sslCert,
          key: formData.sslKey,
          rejectUnauthorized: formData.sslRejectUnauthorized,
        }
      : undefined;

  const buildSSHConfig = () =>
    !isKafka.value && formData.sshEnabled
      ? {
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
        }
      : undefined;

  const buildBrokerConfig = (): IBrokerConfig =>
    isKafka.value
      ? {
          kafka: {
            brokers: parseBrokerList(formData.brokers),
            saslMechanism: formData.saslMechanism,
          },
        }
      : { rabbitmq: { vhost: formData.vhost || '/' } };

  const buildHealthCheckBody = (): BrokerHealthCheckBody => ({
    type: type.value,
    method: EConnectionMethod.FORM,
    host: isKafka.value ? undefined : formData.host,
    port: isKafka.value
      ? undefined
      : formData.port || DEFAULT_DB_PORTS[type.value],
    username: formData.username || undefined,
    password: formData.password || undefined,
    ssl: buildSSLConfig(),
    ssh: buildSSHConfig(),
    broker: buildBrokerConfig(),
  });

  const handleTestConnection = async () => {
    resetTestState();
    testStatus.value = 'testing';

    try {
      const result = await brokerConnectionService.healthCheck(
        buildHealthCheckBody()
      );

      if (result.isConnectedSuccess) {
        testStatus.value = 'success';
        return true;
      }

      testStatus.value = 'error';
      testErrorMessage.value = result.message || DEFAULT_ERROR_MESSAGE;
      testErrorHint.value = result.hint || '';
      testErrorDetail.value = result.detail || '';
      return false;
    } catch (error: unknown) {
      const data = (error as { data?: Record<string, string> }).data;
      testStatus.value = 'error';
      testErrorMessage.value =
        data?.message || (error as Error).message || DEFAULT_ERROR_MESSAGE;
      testErrorHint.value = data?.hint || '';
      testErrorDetail.value = data?.detail || '';
      return false;
    }
  };

  const handleSave = async () => {
    const isEdit = Boolean(editingConnection.value);

    if (!isEdit && !(await handleTestConnection())) {
      return;
    }

    const body = buildHealthCheckBody();
    const connection: Connection = {
      id: editingConnection.value?.id || uuidv4(),
      workspaceId: workspaceId.value,
      name: connectionName.value,
      type: type.value,
      method: EConnectionMethod.FORM,
      providerKind: isKafka.value
        ? EConnectionProviderKind.KAFKA_DIRECT
        : EConnectionProviderKind.RABBITMQ_DIRECT,
      host: isKafka.value ? parseBrokerList(formData.brokers)[0] : body.host,
      port: body.port,
      username: body.username,
      password: body.password,
      broker: body.broker,
      ssl: body.ssl,
      ssh: body.ssh,
      tagIds: [...tagIds.value],
      createdAt: editingConnection.value?.createdAt || dayjs().toISOString(),
    };

    props.onSave(connection, isEdit);
  };

  const fillFromConnection = (connection: Connection) => {
    connectionName.value = connection.name;
    tagIds.value = [...(connection.tagIds ?? [])];
    formData.host = connection.host || '';
    formData.port = connection.port || DEFAULT_DB_PORTS[type.value] || '';
    formData.username = connection.username || '';
    formData.password = connection.password || '';
    formData.vhost = connection.broker?.rabbitmq?.vhost || '/';
    formData.brokers = (connection.broker?.kafka?.brokers ?? []).join(', ');
    formData.saslMechanism =
      connection.broker?.kafka?.saslMechanism ?? EKafkaSaslMechanism.NONE;
    formData.sslEnabled = Boolean(connection.ssl);
    formData.sslMode = connection.ssl?.mode ?? ESSLMode.REQUIRE;
    formData.sslCA = connection.ssl?.ca || '';
    formData.sslCert = connection.ssl?.cert || '';
    formData.sslKey = connection.ssl?.key || '';
    formData.sslRejectUnauthorized = connection.ssl?.rejectUnauthorized ?? true;
    formData.sshEnabled = Boolean(connection.ssh?.enabled);
    formData.sshHost = connection.ssh?.host || '';
    formData.sshPort = connection.ssh?.port || 22;
    formData.sshUsername = connection.ssh?.username || '';
    formData.sshPassword = connection.ssh?.password || '';
    formData.sshPrivateKey = connection.ssh?.privateKey || '';
    formData.sshStoreInKeychain = connection.ssh?.storeInKeychain ?? true;
    formData.sshUseKey = Boolean(connection.ssh?.useSshKey);
  };

  watch(
    [type, editingConnection],
    () => {
      Object.assign(formData, createFormState(type.value));
      resetTestState();

      if (editingConnection.value?.type === type.value) {
        fillFromConnection(editingConnection.value);
        return;
      }

      connectionName.value = DEFAULT_CONNECTION_NAME[type.value];
      const devTag = tagStore.tags.find(tag => tag.name === 'dev');
      tagIds.value = devTag ? [devTag.id] : [];
    },
    { immediate: true }
  );

  watch(formData, () => {
    if (testStatus.value !== 'testing') resetTestState();
  });

  return {
    connectionName,
    tagIds,
    formData,
    isKafka,
    needsKafkaCredentials,
    isFormValid,
    testStatus,
    testErrorMessage,
    testErrorHint,
    testErrorDetail,
    handleTestConnection,
    handleSave,
  };
}
