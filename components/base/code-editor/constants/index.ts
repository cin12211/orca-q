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

export enum EditorTheme {
  AyuLight = 'ayu-light',
  Clouds = 'clouds',
  Espresso = 'espresso',
  NoctisLilac = 'noctis-lilac',
  RosePineDawn = 'rose-pine-dawn',
  Smoothy = 'smoothy',
  SolarizedLight = 'solarized-light',
  Tomorrow = 'tomorrow',

  Amy = 'amy',
  Barf = 'barf',
  Bespin = 'bespin',
  BirdsOfParadise = 'birds-of-paradise',
  BoysAndGirls = 'boys-and-girls',
  Cobalt = 'cobalt',
  CoolGlow = 'cool-glow',
  Dracula = 'dracula',
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
];

export const DEFAULT_EDITOR_CONFIG = {
  fontSize: 10,
  showMiniMap: false,
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
};
