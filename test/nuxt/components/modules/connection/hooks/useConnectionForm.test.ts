import { isProxy, nextTick, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useConnectionForm } from '~/components/modules/connection/hooks/useConnectionForm';
import { EConnectionMethod } from '~/components/modules/connection/types';
import { DatabaseClientType } from '~/core/constants/database-client-type';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockHealthCheck = vi.fn();

vi.mock('~/components/modules/connection/services/connection.service', () => ({
  connectionService: {
    healthCheck: (...args: any[]) => mockHealthCheck(...args),
  },
}));

vi.mock('@/components/modules/environment-tag', () => ({
  useEnvironmentTagStore: () => ({
    tags: [],
  }),
}));

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

function createForm(overrides?: {
  open?: boolean;
  editingConnection?: any;
  workspaceId?: string;
  onAddNew?: ReturnType<typeof vi.fn>;
  onUpdate?: ReturnType<typeof vi.fn>;
  onClose?: ReturnType<typeof vi.fn>;
}) {
  const {
    open = true,
    editingConnection = null,
    workspaceId = 'ws-test',
    onAddNew = vi.fn(),
    onUpdate = vi.fn(),
    onClose = vi.fn(),
  } = overrides ?? {};

  return useConnectionForm({
    open: ref(open),
    editingConnection: ref(editingConnection),
    workspaceId: ref(workspaceId),
    onAddNew: onAddNew as any,
    onUpdate: onUpdate as any,
    onClose: onClose as any,
  });
}

function setElectronWindowApi(overrides?: {
  pickSqliteFile?: ReturnType<typeof vi.fn>;
}) {
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: {
      window: {
        pickSqliteFile: overrides?.pickSqliteFile || vi.fn(),
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useConnectionForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: undefined,
    });
  });

  // -- Initial state -------------------------------------------------------

  it('starts at step 1', () => {
    const { step } = createForm();
    expect(step.value).toBe(1);
  });

  it('starts with testStatus idle', () => {
    const { testStatus } = createForm();
    expect(testStatus.value).toBe('idle');
  });

  it('defaults to POSTGRES database type', () => {
    const { dbType } = createForm();
    expect(dbType.value).toBe(DatabaseClientType.POSTGRES);
  });

  it('defaults connection method to STRING', () => {
    const { connectionMethod } = createForm();
    expect(connectionMethod.value).toBe(EConnectionMethod.STRING);
  });

  it('switches to FILE connection method for SQLite connections', async () => {
    const { dbType, connectionMethod } = createForm();

    dbType.value = DatabaseClientType.SQLITE3;
    await nextTick();

    expect(connectionMethod.value).toBe(EConnectionMethod.FILE);
  });

  it('default connection name is set', () => {
    const { connectionName } = createForm();
    expect(connectionName.value).toBeTruthy();
  });

  // -- Step navigation ------------------------------------------------------

  it('handleNext advances step from 1 to 2 when dbType is selected', () => {
    const { step, dbType, handleNext } = createForm();

    dbType.value = DatabaseClientType.POSTGRES;
    handleNext();

    expect(step.value).toBe(2);
  });

  it('handleNext does not advance when dbType is null', () => {
    const { step, dbType, handleNext } = createForm();

    dbType.value = null as any;
    handleNext();

    expect(step.value).toBe(1);
  });

  it('handleBack returns step to 1', () => {
    const { step, dbType, handleNext, handleBack } = createForm();

    dbType.value = DatabaseClientType.POSTGRES;
    handleNext();
    expect(step.value).toBe(2);

    handleBack();
    expect(step.value).toBe(1);
  });

  it('handleBack resets testStatus to idle', () => {
    const { step, dbType, handleNext, handleBack, testStatus } = createForm();

    dbType.value = DatabaseClientType.POSTGRES;
    handleNext();
    testStatus.value = 'success';

    handleBack();
    expect(testStatus.value).toBe('idle');
  });

  // -- handleTestConnection -----------------------------------------------

  it('sets testStatus to "testing" then "success" on successful health check (STRING method)', async () => {
    mockHealthCheck.mockResolvedValue({ isConnectedSuccess: true });

    const {
      connectionMethod,
      connectionString,
      handleTestConnection,
      testStatus,
    } = createForm();

    connectionMethod.value = EConnectionMethod.STRING;
    connectionString.value = 'postgresql://user:pass@localhost:5432/testdb';

    const result = await handleTestConnection();

    expect(result).toBe(true);
    expect(testStatus.value).toBe('success');
    expect(mockHealthCheck).toHaveBeenCalledOnce();

    const body = mockHealthCheck.mock.calls[0][0];
    expect(body.stringConnection).toBe(
      'postgresql://user:pass@localhost:5432/testdb'
    );
    expect(body.type).toBe(DatabaseClientType.POSTGRES);
    expect(body.method).toBe(EConnectionMethod.STRING);
  });

  it('sets testStatus to "error" when health check returns isConnectedSuccess: false', async () => {
    mockHealthCheck.mockResolvedValue({ isConnectedSuccess: false });

    const { handleTestConnection, testStatus } = createForm();

    const result = await handleTestConnection();

    expect(result).toBe(false);
    expect(testStatus.value).toBe('error');
  });

  it('sets testStatus to "error" when health check throws', async () => {
    mockHealthCheck.mockRejectedValue(new Error('Network failure'));

    const { handleTestConnection, testStatus } = createForm();

    const result = await handleTestConnection();

    expect(result).toBe(false);
    expect(testStatus.value).toBe('error');
  });

  it('sends form fields when connectionMethod is FORM', async () => {
    mockHealthCheck.mockResolvedValue({ isConnectedSuccess: true });

    const { connectionMethod, formData, dbType, handleTestConnection } =
      createForm();

    connectionMethod.value = EConnectionMethod.FORM;
    dbType.value = DatabaseClientType.POSTGRES;
    formData.host = 'db.example.com';
    formData.port = '5432';
    formData.username = 'admin';
    formData.password = 'secret';
    formData.database = 'mydb';

    await handleTestConnection();

    const body = mockHealthCheck.mock.calls[0][0];
    expect(body.host).toBe('db.example.com');
    expect(body.port).toBe('5432');
    expect(body.username).toBe('admin');
    expect(body.password).toBe('secret');
    expect(body.database).toBe('mydb');
    expect(body.stringConnection).toBeUndefined();
    expect(body.method).toBe(EConnectionMethod.FORM);
  });

  it('sends serviceName for Oracle form connections', async () => {
    mockHealthCheck.mockResolvedValue({ isConnectedSuccess: true });

    const { connectionMethod, formData, dbType, handleTestConnection } =
      createForm();

    connectionMethod.value = EConnectionMethod.FORM;
    dbType.value = DatabaseClientType.ORACLE;
    formData.host = 'oracle.internal';
    formData.port = '1521';
    formData.username = 'admin';
    formData.password = 'secret';
    formData.serviceName = 'ORCLPDB1';

    await handleTestConnection();

    const body = mockHealthCheck.mock.calls[0][0];
    expect(body.serviceName).toBe('ORCLPDB1');
    expect(body.database).toBeUndefined();
  });

  it('sends filePath for SQLite file connections', async () => {
    mockHealthCheck.mockResolvedValue({ isConnectedSuccess: true });
    setElectronWindowApi();

    const { connectionMethod, formData, dbType, handleTestConnection } =
      createForm();

    dbType.value = DatabaseClientType.SQLITE3;
    await nextTick();
    connectionMethod.value = EConnectionMethod.FILE;
    formData.filePath = '/tmp/app.sqlite';

    await handleTestConnection();

    const body = mockHealthCheck.mock.calls[0][0];
    expect(body.method).toBe(EConnectionMethod.FILE);
    expect(body.filePath).toBe('/tmp/app.sqlite');
  });

  // -- resetForm ------------------------------------------------------------

  it('resetForm resets step to 1', () => {
    const { dbType, handleNext, resetForm, step } = createForm();

    dbType.value = DatabaseClientType.POSTGRES;
    handleNext();
    expect(step.value).toBe(2);

    resetForm();
    expect(step.value).toBe(1);
  });

  it('resetForm resets dbType to POSTGRES', () => {
    const { dbType, resetForm } = createForm();

    dbType.value = DatabaseClientType.MYSQL;
    resetForm();

    expect(dbType.value).toBe(DatabaseClientType.POSTGRES);
  });

  it('resetForm resets connectionMethod to STRING', () => {
    const { connectionMethod, resetForm } = createForm();

    connectionMethod.value = EConnectionMethod.FORM;
    resetForm();

    expect(connectionMethod.value).toBe(EConnectionMethod.STRING);
  });

  it('resetForm resets connectionString to empty string', () => {
    const { connectionString, resetForm } = createForm();

    connectionString.value = 'postgresql://old-value';
    resetForm();

    expect(connectionString.value).toBe('');
  });

  it('resetForm resets testStatus to idle', () => {
    const { testStatus, resetForm } = createForm();

    testStatus.value = 'error';
    resetForm();

    expect(testStatus.value).toBe('idle');
  });

  it('resetForm clears formData host, username, password, database', () => {
    const { formData, resetForm } = createForm();

    formData.host = 'old-host';
    formData.username = 'old-user';
    formData.password = 'old-pass';
    formData.database = 'old-db';
    resetForm();

    expect(formData.host).toBe('');
    expect(formData.username).toBe('');
    expect(formData.password).toBe('');
    expect(formData.database).toBe('');
  });

  // -- isFormValid ----------------------------------------------------------

  it('isFormValid is false for STRING method with empty connectionString', () => {
    const { isFormValid, connectionMethod, connectionString, connectionName } =
      createForm();

    connectionMethod.value = EConnectionMethod.STRING;
    connectionString.value = '';
    connectionName.value = 'my-conn';

    expect(isFormValid.value).toBe(false);
  });

  it('isFormValid is true for STRING method with a connection string and name', () => {
    const { isFormValid, connectionMethod, connectionString, connectionName } =
      createForm();

    connectionMethod.value = EConnectionMethod.STRING;
    connectionString.value = 'postgresql://u:p@host:5432/db';
    connectionName.value = 'my-conn';

    expect(isFormValid.value).toBe(true);
  });

  it('isFormValid is false for FORM method when fields are missing', () => {
    const { isFormValid, connectionMethod, formData, connectionName, dbType } =
      createForm();

    connectionMethod.value = EConnectionMethod.FORM;
    dbType.value = DatabaseClientType.POSTGRES;
    connectionName.value = 'my-conn';
    formData.host = '';
    formData.username = 'user';
    formData.database = 'db';

    expect(isFormValid.value).toBe(false);
  });

  it('isFormValid is true for FORM method when required fields are filled', () => {
    const { isFormValid, connectionMethod, formData, connectionName, dbType } =
      createForm();

    connectionMethod.value = EConnectionMethod.FORM;
    dbType.value = DatabaseClientType.POSTGRES;
    connectionName.value = 'my-conn';
    formData.host = 'localhost';
    formData.port = '5432';
    formData.username = 'user';
    formData.database = 'mydb';

    expect(isFormValid.value).toBe(true);
  });

  it('isFormValid is true for FILE method when filePath is provided', async () => {
    setElectronWindowApi();

    const { isFormValid, formData, connectionName, dbType } = createForm();

    dbType.value = DatabaseClientType.SQLITE3;
    await nextTick();
    connectionName.value = 'local-sqlite';
    formData.filePath = '/tmp/app.sqlite';

    expect(isFormValid.value).toBe(true);
  });

  it('isFormValid is false for FILE method outside Electron', async () => {
    const { isFormValid, formData, connectionName, dbType } = createForm();

    dbType.value = DatabaseClientType.SQLITE3;
    await nextTick();
    connectionName.value = 'local-sqlite';
    formData.filePath = '/tmp/app.sqlite';

    expect(isFormValid.value).toBe(false);
  });

  it('isFormValid is false when connectionName is empty (STRING method)', () => {
    const { isFormValid, connectionMethod, connectionString, connectionName } =
      createForm();

    connectionMethod.value = EConnectionMethod.STRING;
    connectionString.value = 'postgresql://u:p@host:5432/db';
    connectionName.value = '';

    expect(isFormValid.value).toBe(false);
  });

  // -- handleCreateConnection (new connection) -----------------------------

  it('handleCreateConnection for new STRING connection calls onAddNew with correct shape', async () => {
    mockHealthCheck.mockResolvedValue({ isConnectedSuccess: true });

    const onAddNew = vi.fn();
    const onClose = vi.fn();

    const {
      connectionMethod,
      connectionString,
      connectionName,
      dbType,
      handleCreateConnection,
    } = createForm({ onAddNew, onClose, workspaceId: 'ws-123' });

    dbType.value = DatabaseClientType.POSTGRES;
    connectionMethod.value = EConnectionMethod.STRING;
    connectionString.value = 'postgresql://user:pass@localhost:5432/mydb';
    connectionName.value = 'prod-db';

    await handleCreateConnection();

    expect(onAddNew).toHaveBeenCalledOnce();

    const connection = onAddNew.mock.calls[0][0];
    expect(connection.name).toBe('prod-db');
    expect(connection.type).toBe(DatabaseClientType.POSTGRES);
    expect(connection.method).toBe(EConnectionMethod.STRING);
    expect(connection.connectionString).toBe(
      'postgresql://user:pass@localhost:5432/mydb'
    );
    expect(connection.workspaceId).toBe('ws-123');
    expect(connection.id).toBeDefined();
    expect(connection.createdAt).toBeDefined();
  });

  it('handleCreateConnection clones tagIds into a plain array', async () => {
    mockHealthCheck.mockResolvedValue({ isConnectedSuccess: true });

    const onAddNew = vi.fn();

    const {
      connectionMethod,
      connectionString,
      connectionName,
      tagIds,
      handleCreateConnection,
    } = createForm({ onAddNew });

    connectionMethod.value = EConnectionMethod.STRING;
    connectionString.value = 'postgresql://user:pass@localhost:5432/mydb';
    connectionName.value = 'tagged-db';
    tagIds.value = ['tag-dev', 'tag-prod'];

    await handleCreateConnection();

    const connection = onAddNew.mock.calls[0][0];
    expect(connection.tagIds).toEqual(['tag-dev', 'tag-prod']);
    expect(isProxy(connection.tagIds)).toBe(false);
  });

  it('handleCreateConnection does NOT call onAddNew when health check fails', async () => {
    mockHealthCheck.mockResolvedValue({ isConnectedSuccess: false });

    const onAddNew = vi.fn();

    const { connectionMethod, connectionString, handleCreateConnection } =
      createForm({ onAddNew });

    connectionMethod.value = EConnectionMethod.STRING;
    connectionString.value = 'postgresql://user:pass@host:5432/db';

    await handleCreateConnection();

    expect(onAddNew).not.toHaveBeenCalled();
  });

  it('handleCreateConnection calls onClose after successful create', async () => {
    mockHealthCheck.mockResolvedValue({ isConnectedSuccess: true });

    const onAddNew = vi.fn();
    const onClose = vi.fn();

    const {
      connectionMethod,
      connectionString,
      connectionName,
      handleCreateConnection,
    } = createForm({ onAddNew, onClose });

    connectionMethod.value = EConnectionMethod.STRING;
    connectionString.value = 'postgresql://user:pass@localhost:5432/db';
    connectionName.value = 'test-conn';

    await handleCreateConnection();

    expect(onClose).toHaveBeenCalledOnce();
  });

  // -- handleCreateConnection (edit / update) ------------------------------

  it('handleCreateConnection for existing connection calls onUpdate instead of onAddNew', async () => {
    const onUpdate = vi.fn();
    const onAddNew = vi.fn();
    const onClose = vi.fn();

    const existingConn = {
      id: 'conn-existing',
      workspaceId: 'ws-123',
      name: 'existing-conn',
      type: DatabaseClientType.POSTGRES,
      method: EConnectionMethod.STRING,
      connectionString: 'postgresql://u:p@h:5432/d',
      createdAt: '2024-01-01',
    };

    const {
      connectionMethod,
      connectionString,
      connectionName,
      handleCreateConnection,
    } = createForm({
      open: true,
      editingConnection: existingConn,
      onUpdate,
      onAddNew,
      onClose,
      workspaceId: 'ws-123',
    });

    connectionMethod.value = EConnectionMethod.STRING;
    connectionString.value = 'postgresql://new:pass@host:5432/db';
    connectionName.value = 'updated-conn';

    await handleCreateConnection();

    // For edits, no health-check is called (skip test)
    expect(mockHealthCheck).not.toHaveBeenCalled();
    expect(onUpdate).toHaveBeenCalledOnce();
    expect(onAddNew).not.toHaveBeenCalled();
  });

  it('stores serviceName when creating an Oracle form connection', async () => {
    mockHealthCheck.mockResolvedValue({ isConnectedSuccess: true });

    const onAddNew = vi.fn();

    const {
      connectionMethod,
      formData,
      connectionName,
      dbType,
      handleCreateConnection,
    } = createForm({ onAddNew, workspaceId: 'ws-123' });

    dbType.value = DatabaseClientType.ORACLE;
    connectionMethod.value = EConnectionMethod.FORM;
    connectionName.value = 'oracle-prod';
    formData.host = 'oracle.internal';
    formData.port = '1521';
    formData.username = 'admin';
    formData.password = 'secret';
    formData.serviceName = 'ORCLPDB1';

    await handleCreateConnection();

    const connection = onAddNew.mock.calls[0][0];
    expect(connection.type).toBe(DatabaseClientType.ORACLE);
    expect(connection.serviceName).toBe('ORCLPDB1');
    expect(connection.database).toBeUndefined();
    expect(connection.connectionString).toBe(
      'oracledb://admin:secret@oracle.internal:1521/ORCLPDB1'
    );
  });

  it('stores the MariaDB connection string scheme for form connections', async () => {
    mockHealthCheck.mockResolvedValue({ isConnectedSuccess: true });

    const onAddNew = vi.fn();

    const {
      connectionMethod,
      formData,
      connectionName,
      dbType,
      handleCreateConnection,
    } = createForm({ onAddNew, workspaceId: 'ws-123' });

    dbType.value = DatabaseClientType.MARIADB;
    await nextTick();
    connectionMethod.value = EConnectionMethod.FORM;
    connectionName.value = 'maria-prod';
    formData.host = 'maria.internal';
    formData.port = '3306';
    formData.username = 'admin';
    formData.password = 'secret';
    formData.database = 'heraq';

    await handleCreateConnection();

    const connection = onAddNew.mock.calls[0][0];
    expect(connection.type).toBe(DatabaseClientType.MARIADB);
    expect(connection.connectionString).toBe(
      'mariadb://admin:secret@maria.internal:3306/heraq'
    );
  });

  it('stores filePath and sqlite connection string for SQLite file connections', async () => {
    mockHealthCheck.mockResolvedValue({ isConnectedSuccess: true });
    setElectronWindowApi();

    const onAddNew = vi.fn();

    const {
      connectionMethod,
      formData,
      connectionName,
      dbType,
      handleCreateConnection,
    } = createForm({ onAddNew, workspaceId: 'ws-123' });

    dbType.value = DatabaseClientType.SQLITE3;
    await nextTick();
    connectionMethod.value = EConnectionMethod.FILE;
    connectionName.value = 'local-db';
    formData.filePath = '/tmp/app.sqlite';

    await handleCreateConnection();

    const connection = onAddNew.mock.calls[0][0];
    expect(connection.type).toBe(DatabaseClientType.SQLITE3);
    expect(connection.filePath).toBe('/tmp/app.sqlite');
    expect(connection.connectionString).toBe('sqlite3:///tmp/app.sqlite');
  });

  it('reports a desktop-only error when testing SQLite outside Electron', async () => {
    const {
      dbType,
      formData,
      handleTestConnection,
      testErrorMessage,
      testStatus,
    } = createForm();

    dbType.value = DatabaseClientType.SQLITE3;
    await nextTick();
    formData.filePath = '/tmp/app.sqlite';

    const result = await handleTestConnection();

    expect(result).toBe(false);
    expect(testStatus.value).toBe('error');
    expect(testErrorMessage.value).toContain('desktop app');
    expect(mockHealthCheck).not.toHaveBeenCalled();
  });
});
