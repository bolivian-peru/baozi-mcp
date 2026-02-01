#!/usr/bin/env node
/**
 * Baozi MCP Server V2.0.0
 *
 * Model Context Protocol server for Baozi prediction markets on Solana.
 * Now with mainnet support and transaction building capabilities.
 *
 * Features:
 * - Read markets, positions, quotes
 * - Validate market timing (v6.2 rules)
 * - Build unsigned bet transactions
 * - Simulate transactions before signing
 *
 * Usage:
 *   npx @baozi.bet/mcp-server
 *
 * Or add to Claude Desktop config:
 *   {
 *     "mcpServers": {
 *       "baozi": {
 *         "command": "npx",
 *         "args": ["@baozi.bet/mcp-server"]
 *       }
 *     }
 *   }
 *
 * Environment Variables:
 *   HELIUS_RPC_URL    - Helius RPC endpoint (recommended)
 *   SOLANA_RPC_URL    - Alternative RPC endpoint
 *   SOLANA_NETWORK    - Network: 'mainnet-beta' (default) or 'devnet'
 *   BAOZI_PROGRAM_ID  - Override program ID (default: V4.7.6 mainnet)
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { TOOLS, handleTool } from './tools.js';
import { RESOURCES, handleResource } from './resources.js';
import { PROGRAM_ID, NETWORK, IS_MAINNET, RPC_ENDPOINT } from './config.js';

const VERSION = '2.0.0';

// Create MCP server
const server = new Server(
  {
    name: 'baozi-mcp',
    version: VERSION,
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  return handleTool(name, args || {});
});

// List available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return { resources: RESOURCES };
});

// Read resource content
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  return handleResource(uri);
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log startup info to stderr (stdout is for MCP protocol)
  console.error('');
  console.error('='.repeat(60));
  console.error(`Baozi MCP Server v${VERSION}`);
  console.error('='.repeat(60));
  console.error('');
  console.error(`Network: ${IS_MAINNET ? 'MAINNET' : 'Devnet'} (${NETWORK})`);
  console.error(`Program ID: ${PROGRAM_ID.toBase58()}`);
  console.error(`RPC: ${RPC_ENDPOINT.substring(0, 50)}...`);
  console.error('');
  console.error('Available Tools:');
  console.error('-'.repeat(40));
  TOOLS.forEach(tool => {
    console.error(`  ${tool.name}`);
    console.error(`    ${tool.description.substring(0, 70)}...`);
  });
  console.error('');
  console.error('Available Resources:');
  console.error('-'.repeat(40));
  RESOURCES.forEach(resource => {
    console.error(`  ${resource.uri}`);
    console.error(`    ${resource.description}`);
  });
  console.error('');
  console.error('Dynamic Resources:');
  console.error('-'.repeat(40));
  console.error('  baozi://portfolio/{wallet}');
  console.error('    User portfolio with positions and statistics');
  console.error('');
  console.error('='.repeat(60));
  console.error('Ready for connections...');
  console.error('');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
