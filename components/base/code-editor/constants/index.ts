import { MariaSQL, MySQL, PostgreSQL, SQLDialect } from '@codemirror/lang-sql';
import {
  tomorrow,
  barf,
  bespin,
  dracula,
  noctisLilac,
  rosePineDawn,
} from 'thememirror';
import {
  orcaDarkTheme,
  orcaLightTheme,
  ayuDark,
  ayuMirage,
  ayuLight as ayuLightCustom,
} from '../themes';

export enum EditorTheme {
  AyuLight = 'ayu-light',
  AyuDark = 'ayu-dark',
  AyuMirage = 'ayu-mirage',
  NoctisLilac = 'noctis-lilac',
  RosePineDawn = 'rose-pine-dawn',
  Tomorrow = 'tomorrow',
  OrcaLight = 'orca-light',

  Barf = 'barf',
  Bespin = 'bespin',
  Dracula = 'dracula',
  OrcaDark = 'orca-dark',
}

export const EditorThemeDark: EditorTheme[] = [
  EditorTheme.Barf,
  EditorTheme.Bespin,
  EditorTheme.Dracula,
  EditorTheme.OrcaDark,
  EditorTheme.AyuDark,
  EditorTheme.AyuMirage,
];

export const EditorThemeLight: EditorTheme[] = [
  EditorTheme.AyuLight,
  EditorTheme.NoctisLilac,
  EditorTheme.RosePineDawn,
  EditorTheme.Tomorrow,
  EditorTheme.OrcaLight,
];

export const EDITOR_FONT_SIZES = [
  8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
];

export const DEFAULT_EDITOR_CONFIG = {
  fontSize: 10,
  showMiniMap: false,
  indentation: false,
  theme: EditorTheme.Tomorrow,
};

export const EditorThemeMap: Record<EditorTheme, any> = {
  [EditorTheme.Tomorrow]: tomorrow,
  [EditorTheme.AyuLight]: ayuLightCustom,
  [EditorTheme.AyuDark]: ayuDark,
  [EditorTheme.AyuMirage]: ayuMirage,
  [EditorTheme.Barf]: barf,
  [EditorTheme.Bespin]: bespin,
  [EditorTheme.Dracula]: dracula,
  [EditorTheme.NoctisLilac]: noctisLilac,
  [EditorTheme.RosePineDawn]: rosePineDawn,
  [EditorTheme.OrcaDark]: orcaDarkTheme,
  [EditorTheme.OrcaLight]: orcaLightTheme,
};

export enum CompletionIcon {
  Keyword = 'KEYWORD',
  Variable = 'VARIABLE',
  Type = 'TYPE',
  Function = 'FUNCTION',
  Method = 'METHOD',
  Table = 'TABLE',
  Database = 'DATABASE',
  Numeric = 'NUMERIC',
  String = 'STRING',
  Calendar = 'CALENDAR',
  Brackets = 'BRACKETS',
  Vector = 'VECTOR',
  Field = 'FIELD',
  ForeignKey = 'FOREIGNKEY',
}

const PostgreSQLCustom = SQLDialect.define({
  ...PostgreSQL.spec,
  doubleDollarQuotedStrings: false,
});

export const SQLDialectSupport = {
  PostgreSQL: PostgreSQLCustom,
  MySQL,
  MariaSQL,
};
