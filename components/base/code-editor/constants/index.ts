import { MariaSQL, MySQL, PostgreSQL, SQLDialect } from '@codemirror/lang-sql';
import {
  tomorrow,
  amy,
  ayuLight,
  smoothy,
  barf,
  bespin,
  birdsOfParadise,
  boysAndGirls,
  clouds,
  cobalt,
  coolGlow,
  dracula,
  noctisLilac,
  espresso,
  rosePineDawn,
  solarizedLight,
} from 'thememirror';
import {
  oceanBreezeLightTheme,
  orcaDarkTheme,
  orcaLightTheme,
} from '../themes';

export enum EditorTheme {
  AyuLight = 'ayu-light',
  Clouds = 'clouds',
  Espresso = 'espresso',
  NoctisLilac = 'noctis-lilac',
  RosePineDawn = 'rose-pine-dawn',
  Smoothy = 'smoothy',
  SolarizedLight = 'solarized-light',
  Tomorrow = 'tomorrow',
  OrcaLight = 'orca-light',
  OceanBreezeLight = 'orca-breeze-light',

  Amy = 'amy',
  Barf = 'barf',
  Bespin = 'bespin',
  BirdsOfParadise = 'birds-of-paradise',
  BoysAndGirls = 'boys-and-girls',
  Cobalt = 'cobalt',
  CoolGlow = 'cool-glow',
  Dracula = 'dracula',
  OrcaDark = 'orca-dark',
}
export const EditorThemeDark: EditorTheme[] = [
  EditorTheme.Amy,
  EditorTheme.Barf,
  EditorTheme.Bespin,
  EditorTheme.BirdsOfParadise,
  EditorTheme.BoysAndGirls,
  EditorTheme.Cobalt,
  EditorTheme.CoolGlow,
  EditorTheme.Dracula,
  EditorTheme.OrcaDark,
];

export const EditorThemeLight: EditorTheme[] = [
  EditorTheme.AyuLight,
  EditorTheme.Clouds,
  EditorTheme.Espresso,
  EditorTheme.NoctisLilac,
  EditorTheme.RosePineDawn,
  EditorTheme.Smoothy,
  EditorTheme.SolarizedLight,
  EditorTheme.Tomorrow,
  EditorTheme.OrcaLight,
  EditorTheme.OceanBreezeLight,
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
  [EditorTheme.Amy]: amy,
  [EditorTheme.AyuLight]: ayuLight,
  [EditorTheme.Smoothy]: smoothy,
  [EditorTheme.Barf]: barf,
  [EditorTheme.Bespin]: bespin,
  [EditorTheme.BirdsOfParadise]: birdsOfParadise,
  [EditorTheme.BoysAndGirls]: boysAndGirls,
  [EditorTheme.Clouds]: clouds,
  [EditorTheme.Cobalt]: cobalt,
  [EditorTheme.CoolGlow]: coolGlow,
  [EditorTheme.Dracula]: dracula,
  [EditorTheme.NoctisLilac]: noctisLilac,
  [EditorTheme.Espresso]: espresso,
  [EditorTheme.RosePineDawn]: rosePineDawn,
  [EditorTheme.SolarizedLight]: solarizedLight,
  [EditorTheme.OrcaDark]: orcaDarkTheme,
  [EditorTheme.OrcaLight]: orcaLightTheme,
  [EditorTheme.OceanBreezeLight]: oceanBreezeLightTheme,
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
