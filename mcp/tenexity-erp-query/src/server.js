import express from 'express';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { getConfig } from './config.js';
import { registerErpTools } from './tools.js';

function buildServer(config) {
  const server = new McpServer({
    name: 'tenexity-erp-query',
    version: '0.1.0',
  });

  registerErpTools(server, config);
  return server;
}

async function startStdio(config) {
  const server = buildServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

async function startHttp(config) {
  const app = express();
  const transports = {};

  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true, name: config.name, dialect: config.dialect });
  });

  const requireAuth = (req, res) => {
    if (config.apiKey) {
      const header = req.get('authorization') ?? '';
      if (header !== `Bearer ${config.apiKey}`) {
        res.status(401).json({ error: 'Unauthorized' });
        return false;
      }
    }

    return true;
  };

  app.post('/mcp', async (req, res) => {
    if (!requireAuth(req, res)) {
      return;
    }

    const sessionId = req.headers['mcp-session-id'];
    let transport;

    try {
      if (sessionId && transports[sessionId]) {
        transport = transports[sessionId];
      } else if (!sessionId && isInitializeRequest(req.body)) {
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (initializedSessionId) => {
            transports[initializedSessionId] = transport;
          },
        });

        const server = buildServer(config);
        transport.onclose = () => {
          const closedSessionId = transport.sessionId;
          if (closedSessionId) {
            delete transports[closedSessionId];
          }
          server.close();
        };

        await server.connect(transport);
      } else {
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Bad Request: No valid MCP session ID provided',
          },
          id: null,
        });
        return;
      }

      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('Error handling MCP request:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        });
      }
    }
  });

  app.get('/mcp', async (req, res) => {
    if (!requireAuth(req, res)) {
      return;
    }

    const sessionId = req.headers['mcp-session-id'];
    const transport = sessionId ? transports[sessionId] : undefined;
    if (!transport) {
      res.status(400).send('Invalid or missing MCP session ID');
      return;
    }

    await transport.handleRequest(req, res);
  });

  app.delete('/mcp', async (req, res) => {
    if (!requireAuth(req, res)) {
      return;
    }

    const sessionId = req.headers['mcp-session-id'];
    const transport = sessionId ? transports[sessionId] : undefined;
    if (!transport) {
      res.status(400).send('Invalid or missing MCP session ID');
      return;
    }

    await transport.handleRequest(req, res);
  });

  app.listen(config.portNumber, () => {
    console.error(
      `tenexity-erp-query MCP listening on :${config.portNumber}/mcp (${config.dialect})`,
    );
  });
}

const config = getConfig();

if (config.transport === 'stdio') {
  await startStdio(config);
} else {
  await startHttp(config);
}
