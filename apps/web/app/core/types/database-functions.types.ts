export interface FunctionParameter {
  name: string;
  type: string;
  mode: 'IN' | 'OUT' | 'INOUT' | 'VARIADIC';
  has_default: boolean;
  default_value: string | null;
}

export interface FunctionSignature {
  name: string;
  schema: string;
  parameters: FunctionParameter[];
  return_type: string;
}

export interface RoutineMetadata {
  name: string;
  schema: string;
  kind: string;
  owner: string;
  comment: string | null;
}

export interface RenameFunctionResponse {
  success: boolean;
  queryTime: number;
}

export interface UpdateFunctionResponse {
  success: boolean;
  error?: string;
  queryTime: number;
}

export interface DeleteFunctionResponse {
  success: boolean;
  queryTime: number;
}
