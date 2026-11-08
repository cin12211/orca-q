import { showMinimap } from '@replit/codemirror-minimap';

export const minimapFactory = () => {
  const create = () => {
    const dom = document.createElement('div');
    return { dom };
  };
  return showMinimap.compute([], () => {
    return {
      create,
      displayText: 'blocks',
      showOverlay: 'always',
      gutters: [{ 1: '#00FF00', 2: 'green', 3: 'rgb(0, 100, 50)' }],
    };
  });
};
