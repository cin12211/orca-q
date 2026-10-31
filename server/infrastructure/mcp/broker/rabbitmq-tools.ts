import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { McpSession } from '~/core/persist/normalize';
import { listRabbitPolicies } from '~/server/infrastructure/nosql/rabbitmq/rabbitmq-admin.service';
import {
  getRabbitQueueDetail,
  listRabbitExchanges,
  listRabbitQueues,
} from '~/server/infrastructure/nosql/rabbitmq/rabbitmq-browser.service';
import {
  peekRabbitMessages,
  RABBIT_MAX_PEEK_COUNT,
} from '~/server/infrastructure/nosql/rabbitmq/rabbitmq-message.service';
import { getRabbitOverview } from '~/server/infrastructure/nosql/rabbitmq/rabbitmq-overview.service';
import {
  getRabbitUserDetail,
  listRabbitUsers,
} from '~/server/infrastructure/nosql/rabbitmq/rabbitmq-users.service';
import { jsonResult, withToolErrors } from '../mcp-tool-result';
import {
  brokerConnectionIdSchema,
  clampMessageCount,
  getBrokerConnection,
  toMcpMessage,
} from './broker-tool-utils';

const MCP_RABBIT_DEFAULT_PAGE_SIZE = 50;
const MCP_RABBIT_MAX_PAGE_SIZE = 100;

const vhostSchema = z
  .string()
  .describe('Virtual host name, e.g. "/". From rabbitmq_overview.vhosts.');
const readOnly = { readOnlyHint: true } as const;

export function registerRabbitTools(server: McpServer, session: McpSession) {
  const connect = (connectionId: string) =>
    getBrokerConnection(
      session.id,
      connectionId,
      DatabaseClientType.RABBITMQ,
      'RabbitMQ'
    );

  server.registerTool(
    'rabbitmq_overview',
    {
      title: 'RabbitMQ overview',
      description:
        'Version, cluster name, totals (queues, exchanges, connections, consumers), message counts and rates, node health/alarms and the list of virtual hosts.',
      inputSchema: { connectionId: brokerConnectionIdSchema },
      annotations: readOnly,
    },
    ({ connectionId }) =>
      withToolErrors(async () => {
        // Chart samples and web contexts are UI-only noise for an agent.
        const {
          samples: _samples,
          contexts: _contexts,
          ...overview
        } = await getRabbitOverview(await connect(connectionId));
        return jsonResult(overview);
      })
  );

  server.registerTool(
    'rabbitmq_list_queues',
    {
      title: 'List RabbitMQ queues',
      description:
        'Queues with ready/unacknowledged counts, consumers and rates. Paginated; filter by vhost and a name substring.',
      inputSchema: {
        connectionId: brokerConnectionIdSchema,
        vhost: vhostSchema.optional(),
        search: z.string().optional().describe('Name contains this text.'),
        page: z.number().int().positive().optional(),
        pageSize: z
          .number()
          .int()
          .positive()
          .optional()
          .describe(
            `Default ${MCP_RABBIT_DEFAULT_PAGE_SIZE}, max ${MCP_RABBIT_MAX_PAGE_SIZE}.`
          ),
      },
      annotations: readOnly,
    },
    ({ connectionId, vhost, search, page, pageSize }) =>
      withToolErrors(async () =>
        jsonResult(
          await listRabbitQueues(await connect(connectionId), {
            vhost,
            search,
            page,
            pageSize: Math.min(
              pageSize ?? MCP_RABBIT_DEFAULT_PAGE_SIZE,
              MCP_RABBIT_MAX_PAGE_SIZE
            ),
          })
        )
      )
  );

  server.registerTool(
    'rabbitmq_describe_queue',
    {
      title: 'Describe RabbitMQ queue',
      description:
        'One queue: arguments, effective policy, counts, rates, consumers and bindings.',
      inputSchema: {
        connectionId: brokerConnectionIdSchema,
        vhost: vhostSchema,
        queue: z.string().min(1).describe('Queue name.'),
      },
      annotations: readOnly,
    },
    ({ connectionId, vhost, queue }) =>
      withToolErrors(async () => {
        const { samples: _samples, ...detail } = await getRabbitQueueDetail(
          await connect(connectionId),
          vhost,
          queue
        );
        return jsonResult(detail);
      })
  );

  server.registerTool(
    'rabbitmq_list_exchanges',
    {
      title: 'List RabbitMQ exchanges',
      description: 'Exchanges with type, flags and publish rates.',
      inputSchema: {
        connectionId: brokerConnectionIdSchema,
        vhost: vhostSchema.optional(),
      },
      annotations: readOnly,
    },
    ({ connectionId, vhost }) =>
      withToolErrors(async () =>
        jsonResult(
          await listRabbitExchanges(await connect(connectionId), vhost)
        )
      )
  );

  server.registerTool(
    'rabbitmq_peek_messages',
    {
      title: 'Peek RabbitMQ messages',
      description: `Look at messages at the head of a queue without consuming them (they are requeued; redelivered flags may change). Default 20, max ${RABBIT_MAX_PEEK_COUNT}. Long payloads are cut.`,
      inputSchema: {
        connectionId: brokerConnectionIdSchema,
        vhost: vhostSchema,
        queue: z.string().min(1).describe('Queue name.'),
        count: z.number().int().positive().optional(),
      },
      annotations: readOnly,
    },
    ({ connectionId, vhost, queue, count }) =>
      withToolErrors(async () => {
        const messages = await peekRabbitMessages(await connect(connectionId), {
          vhost,
          queueName: queue,
          count: clampMessageCount(count, RABBIT_MAX_PEEK_COUNT),
        });
        return jsonResult(messages.map(toMcpMessage));
      })
  );

  server.registerTool(
    'rabbitmq_list_users',
    {
      title: 'List RabbitMQ users',
      description:
        'Users with tags and the vhosts they can access, plus the connected user. Password hashes are never returned.',
      inputSchema: { connectionId: brokerConnectionIdSchema },
      annotations: readOnly,
    },
    ({ connectionId }) =>
      withToolErrors(async () =>
        jsonResult(await listRabbitUsers(await connect(connectionId)))
      )
  );

  server.registerTool(
    'rabbitmq_describe_user',
    {
      title: 'Describe RabbitMQ user',
      description:
        'One user: tags, permissions (configure/write/read per vhost) and topic permissions.',
      inputSchema: {
        connectionId: brokerConnectionIdSchema,
        user: z.string().min(1).describe('User name.'),
      },
      annotations: readOnly,
    },
    ({ connectionId, user }) =>
      withToolErrors(async () => {
        const { currentUser: _currentUser, ...detail } =
          await getRabbitUserDetail(await connect(connectionId), user);
        return jsonResult(detail);
      })
  );

  server.registerTool(
    'rabbitmq_list_policies',
    {
      title: 'List RabbitMQ policies',
      description:
        'User and operator policies (the broker configuration applied to queues/exchanges by pattern), sorted by vhost and priority.',
      inputSchema: {
        connectionId: brokerConnectionIdSchema,
        vhost: vhostSchema.optional(),
      },
      annotations: readOnly,
    },
    ({ connectionId, vhost }) =>
      withToolErrors(async () => {
        const snapshot = await listRabbitPolicies(await connect(connectionId));
        return jsonResult({
          ...snapshot,
          policies: vhost
            ? snapshot.policies.filter(policy => policy.vhost === vhost)
            : snapshot.policies,
        });
      })
  );

  server.registerTool(
    'rabbitmq_describe_policy',
    {
      title: 'Describe RabbitMQ policy',
      description:
        'One policy: pattern, apply-to, priority and full definition.',
      inputSchema: {
        connectionId: brokerConnectionIdSchema,
        vhost: vhostSchema,
        name: z.string().min(1).describe('Policy name.'),
        kind: z
          .enum(['user', 'operator'])
          .optional()
          .describe(
            'Needed only when a user and an operator policy share the name.'
          ),
      },
      annotations: readOnly,
    },
    ({ connectionId, vhost, name, kind }) =>
      withToolErrors(async () => {
        const { policies, unavailableReason } = await listRabbitPolicies(
          await connect(connectionId)
        );
        const matches = policies.filter(
          policy =>
            policy.vhost === vhost &&
            policy.name === name &&
            (!kind || policy.kind === kind)
        );

        if (!matches.length) {
          throw new Error(
            `Policy "${name}" was not found in vhost "${vhost}".${unavailableReason ? ` ${unavailableReason}` : ''}`
          );
        }

        return jsonResult(matches.length === 1 ? matches[0] : matches);
      })
  );
}
