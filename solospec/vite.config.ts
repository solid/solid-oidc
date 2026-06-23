import { defineConfig } from 'vite';
import { solospecPlugin } from '@openuji/solospec/vite';

export default defineConfig({
  plugins: [
    solospecPlugin({
      entry: './index.md',
      configPath: './config.json',
      options: {
        client: {
          likec4Workspace: './diagrams',
        },
      },
      theme: {
        name: 'bikeshed'
      },
    })
  ],
});
