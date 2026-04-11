import { isProxy, ref } from 'vue';
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useConnectionForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
