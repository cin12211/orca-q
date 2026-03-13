import type { Config } from "tailwindcss";

export default <Partial<Config>>{
  theme: {
    extend:{
      fontSize: {
        xxs: '10px',
      },
      fontFamily: {
        my: ['Chillax','sans-serif']
      }
    }
  },
  content: [],
  plugins: [],
  
};
