import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createCitizenMcpServer } from './citizenServer';

async function main() {
  const server = createCitizenMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[Sewa Setu MCP] Citizen Assistant MCP Server running on stdio');
}

main().catch((err) => {
  console.error('[Sewa Setu MCP] Fatal startup error:', err);
  process.exit(1);
});
