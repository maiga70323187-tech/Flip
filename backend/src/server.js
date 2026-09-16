import { createApp } from './app.js';
const port = Number(process.env.PORT ?? 8787);
createApp().listen(port, () => console.log(`Flip animation backend écoute sur http://localhost:${port}`));
