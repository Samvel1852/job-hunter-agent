import { defineConnection } from '@cursor/bdk/connections';

export default defineConnection({
  cursorAccount: true,
  servers: ['Canva'],
  advertiseTools: true,
  optional: true,
  description:
    'Canva connector from the signed-in Cursor account. Use it to read the master CV design and to edit or export tailored CV copies.',
});
