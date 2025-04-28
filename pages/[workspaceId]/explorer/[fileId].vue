<script setup lang="ts">
import {
  completionKeymap,
  startCompletion,
  acceptCompletion,
  type Completion,
  autocompletion,
} from '@codemirror/autocomplete';
import {
  sql,
  PostgreSQL,
  type SQLNamespace,
  schemaCompletionSource,
} from '@codemirror/lang-sql';
import { Compartment } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { format } from 'sql-formatter';
import {
  type SyntaxTreeNodeData,
  shortCutExecuteCurrentStatement,
  shortCutFormatOnSave,
} from '~/components/base/code-editor/extensions';
import { useAppContext } from '~/shared/contexts/useAppContext';

definePageMeta({
  keepalive: true,
});

const { schemaStore } = useAppContext();

// 1) Metadata cho Postgres keywords với boost chuyên nghiệp
const pgKeywordMeta: Record<string, { info: string; boost: number }> = {
  // Core DML/DQL (mức cao nhất)
  SELECT: { info: 'Chọn dữ liệu từ bảng', boost: 105 },
  FROM: { info: 'Nguồn dữ liệu (bảng/view)', boost: 104 },
  WHERE: { info: 'Điều kiện lọc bản ghi', boost: 103 },
  JOIN: { info: 'Kết hợp bảng', boost: 100 },
  ON: { info: 'Điều kiện JOIN', boost: 100 },

  // INSERT/UPDATE/DELETE (rất thường dùng)
  INSERT: { info: 'Chèn bản ghi mới', boost: 90 },
  UPDATE: { info: 'Cập nhật bản ghi', boost: 90 },
  DELETE: { info: 'Xóa bản ghi', boost: 90 },

  // Clause bổ trợ
  GROUP: { info: 'Nhóm kết quả', boost: 95 },
  HAVING: { info: 'Lọc sau GROUP BY', boost: 95 },
  ORDER: { info: 'Sắp xếp kết quả', boost: 95 },
  LIMIT: { info: 'Giới hạn số bản ghi', boost: 90 },
  OFFSET: { info: 'Bỏ qua số bản ghi đầu', boost: 90 },
  DISTINCT: { info: 'Loại bỏ bản ghi trùng lặp', boost: 90 },

  // Các phép toán & logic
  AND: { info: 'Phép AND logic', boost: 85 },
  OR: { info: 'Phép OR logic', boost: 85 },
  NOT: { info: 'Phủ định', boost: 85 },
  IN: { info: 'Trong tập hợp', boost: 85 },
  EXISTS: { info: 'Kiểm tra tồn tại subquery', boost: 85 },
  BETWEEN: { info: 'Trong khoảng', boost: 85 },
  LIKE: { info: 'So khớp chuỗi', boost: 85 },
  ILIKE: { info: 'So khớp không phân biệt hoa thường', boost: 85 },
  NULL: { info: 'Giá trị NULL', boost: 85 },

  // DDL (ít dùng hơn, nhưng vẫn quan trọng)
  CREATE: { info: 'Tạo schema/table/index/view', boost: 80 },
  ALTER: { info: 'Thay đổi cấu trúc schema/table', boost: 80 },
  DROP: { info: 'Xóa schema/table/index/view', boost: 80 },
  TRUNCATE: { info: 'Xóa nhanh nội dung table', boost: 75 },
  COMMENT: { info: 'Thêm/chỉnh comment', boost: 75 },

  // DCL
  GRANT: { info: 'Phân quyền', boost: 70 },
  REVOKE: { info: 'Thu hồi quyền', boost: 70 },

  // Transaction
  BEGIN: { info: 'Bắt đầu transaction', boost: 65 },
  COMMIT: { info: 'Lưu thay đổi', boost: 65 },
  ROLLBACK: { info: 'Hoàn tác', boost: 65 },

  // Subquery / CTE
  WITH: { info: 'Common Table Expression', boost: 75 },
  RECURSIVE: { info: 'CTE đệ quy', boost: 70 },
  UNION: { info: 'Gộp kết quả SELECT', boost: 75 },
  INTERSECT: { info: 'Giao SELECT', boost: 70 },
  EXCEPT: { info: 'Trừ SELECT', boost: 70 },

  // Conditional CASE
  CASE: { info: 'CASE ... WHEN ... THEN ... END', boost: 80 },
  WHEN: { info: 'Khi', boost: 80 },
  THEN: { info: 'Thì', boost: 80 },
  ELSE: { info: 'Ngược lại', boost: 80 },
  END: { info: 'Kết thúc CASE', boost: 80 },

  // Aggregate Functions
  COUNT: { info: 'Đếm số bản ghi', boost: 85 },
  SUM: { info: 'Tổng giá trị', boost: 85 },
  AVG: { info: 'Trung bình', boost: 85 },
  MIN: { info: 'Giá trị nhỏ nhất', boost: 85 },
  MAX: { info: 'Giá trị lớn nhất', boost: 85 },

  // System / Date-Time
  NOW: { info: 'Thời gian hiện tại', boost: 80 },
  CURRENT_DATE: { info: 'Ngày hiện tại', boost: 80 },
  CURRENT_TIME: { info: 'Giờ hiện tại', boost: 80 },
  CURRENT_TIMESTAMP: { info: 'Timestamp hiện tại', boost: 80 },

  // JSON & Type-casting
  CAST: { info: 'Ép kiểu, ví dụ CAST(x AS INT)', boost: 75 },
  COALESCE: { info: 'Chọn giá trị không null đầu tiên', boost: 75 },
  JSONB_BUILD_OBJECT: { info: 'Xây dựng object JSONB', boost: 70 },
  JSONB_AGG: { info: 'Gộp JSONB', boost: 70 },
};

const dummySchema: SQLNamespace = schemaStore.currentSchema?.tableDetails ?? {};

const code = ref('');

const sqlCompartment = new Compartment();

function myKeywordCompletion(label: string, type: string): Completion {
  const up = label.toUpperCase();

  const meta = pgKeywordMeta[up];

  return meta
    ? { label: up, type, info: meta.info, boost: meta.boost }
    : { label: up, type };
}

const extensions = [
  shortCutExecuteCurrentStatement((currentStatement: SyntaxTreeNodeData) => {
    console.log(
      '🚀 ~ shortCutCurrentStatementExecute ~ currentStatement:',
      currentStatement
    );
  }),
  shortCutFormatOnSave((fileContent: string) => {
    const formatted = format(fileContent, {
      language: 'postgresql',
      keywordCase: 'upper',
    });

    return formatted;
  }),

  keymap.of([
    { key: 'Mod-i', run: startCompletion },
    { key: 'Tab', run: acceptCompletion },
  ]),

  sqlCompartment.of(
    sql({
      dialect: PostgreSQL,
      upperCaseKeywords: true, // từ khóa in hoa
      keywordCompletion: myKeywordCompletion,
      schema: dummySchema,
    })
  ),
];
</script>

<template>
  <CodeEditor v-model="code" :extensions="extensions" :disabled="false" />
</template>
