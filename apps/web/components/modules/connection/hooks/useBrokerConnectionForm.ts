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
import {
  parseBrokerList,
  parseKafkaConnectionString,
  parseRabbitConnectionString,
  type ParsedBrokerConnection,
} from '../utils';

export type BrokerClientType =
  | DatabaseClientType.RABBITMQ
  | DatabaseClientType.KAFKA;

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

const DEFAULT_CONNECTION_NAME = {
  [DatabaseClientType.RABBITMQ]: 'my-rabbitmq',
  [DatabaseClientType.KAFKA]: 'my-kafka',
} as const;
export const BROKER_CONNECTION_METHODS = [
  EConnectionMethod.STRING,
  EConnectionMethod.FORM,
] as const;

export const BROKER_CONNECTION_STRING_EXAMPLE = {
  [DatabaseClientType.RABBITMQ]:
    'amqp://username:password@localhost:5672/vhost',
  [DatabaseClientType.KAFKA]:
    'kafka://username:password@broker-1:9092,broker-2:9092?sasl=SCRAM-SHA-256',
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
  const connectionMethod = ref<EConnectionMethod>(EConnectionMethod.STRING);
  const connectionString = ref('');
  const testStatus = ref<TestStatus>('idle');
  const testErrorMessage = ref('');
  const testErrorHint = ref('');
  const testErrorDetail = ref('');

  const isKafka = computed(() => type.value === DatabaseClientType.KAFKA);
  const needsKafkaCredentials = computed(
    () => formData.saslMechanism !== EKafkaSaslMechanism.NONE
  );

  const isStringMethod = computed(
    () => connectionMethod.value === EConnectionMethod.STRING
  );

  const parsedString = computed<
    { value: ParsedBrokerConnection } | { error: string } | null
  >(() => {
    if (!isStringMethod.value || !connectionString.value.trim()) return null;

    try {
      return {
        value: isKafka.value
          ? parseKafkaConnectionString(connectionString.value)
          : parseRabbitConnectionString(connectionString.value),
      };
    } catch (error) {
      return { error: (error as Error).message };
    }
  });

  const connectionStringError = computed(() =>
    parsedString.value && 'error' in parsedString.value
      ? parsedString.value.error
      : ''
  );

  const isSshValid = computed(
    () =>
      isKafka.value ||
      !formData.sshEnabled ||
      Boolean(
        formData.sshHost &&
          formData.sshUsername &&
          (formData.sshUseKey ? formData.sshPrivateKey : formData.sshPassword)
      )
  );

  const isFormValid = computed(() => {
    if (!connectionName.value) return false;

    if (isStringMethod.value) {
      return Boolean(
        parsedString.value && 'value' in parsedString.value && isSshValid.value
      );
    }

    if (isKafka.value) {
      return (
        parseBrokerList(formData.brokers).length > 0 &&
        (!needsKafkaCredentials.value ||
          Boolean(formData.username && formData.password))
      );
    }

    return Boolean(formData.host && formData.username && isSshValid.value);
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

  /** TLS from the SSL section, or a plain "require" when the string asks for it. */
  const buildStringSSLConfig = (useTls: boolean) =>
    buildSSLConfig() ??
    (useTls ? { mode: ESSLMode.REQUIRE, rejectUnauthorized: true } : undefined);

  const buildHealthCheckBody = (): BrokerHealthCheckBody => {
    const parsed = parsedString.value;

    if (isStringMethod.value && parsed && 'value' in parsed) {
      return {
        type: type.value,
        method: EConnectionMethod.STRING,
        host: parsed.value.host,
        port: parsed.value.port,
        username: parsed.value.username,
        password: parsed.value.password,
        ssl: buildStringSSLConfig(parsed.value.useTls),
        ssh: buildSSHConfig(),
        broker: parsed.value.broker,
      };
    }

    return buildFormHealthCheckBody();
  };

  const buildFormHealthCheckBody = (): BrokerHealthCheckBody => ({
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
      method: body.method,
      connectionString: isStringMethod.value
        ? connectionString.value.trim()
        : undefined,
      providerKind: isKafka.value
        ? EConnectionProviderKind.KAFKA_DIRECT
        : EConnectionProviderKind.RABBITMQ_DIRECT,
      host: isKafka.value ? body.broker.kafka?.brokers[0] : body.host,
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
    connectionMethod.value =
      connection.method === EConnectionMethod.STRING
        ? EConnectionMethod.STRING
        : EConnectionMethod.FORM;
    connectionString.value = connection.connectionString || '';
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
      connectionMethod.value = EConnectionMethod.STRING;
      connectionString.value = '';
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

  watch([formData, connectionString, connectionMethod], () => {
    if (testStatus.value !== 'testing') resetTestState();
  });

  return {
    connectionName,
    tagIds,
    formData,
    connectionMethod,
    connectionString,
    connectionStringError,
    isStringMethod,
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
