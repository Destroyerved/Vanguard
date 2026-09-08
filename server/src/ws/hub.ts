/**
 * VANGUARD — WebSocket broadcast hub (`ws://HOST:PORT/stream`).
 *
 * Fan-out only: the server pushes the operational picture, clients do not
 * command the pipeline over the socket (that is what the REST API is for).
 * Keeping the socket one-directional means a misbehaving or hostile client
 * cannot drive the fusion engine.
 *
 * Each connection carries its own monotonic sequence number so a client can
 * detect a dropped frame and re-sync via REST rather than silently rendering a
 * stale picture — an operator must never be shown an out-of-date COP that
 * looks live.
 */

import { WebSocketServer, WebSocket, type RawData } from 'ws';
import type { Server } from 'node:http';
import type { WsMessage, WsMessageType } from '../types/ws.js';
import { nextConnectionId } from '../util/ids.js';
import { createLogger } from '../util/logger.js';
import { nowIso } from '../util/time.js';

const log = createLogger('ws');

/** Heartbeat interval — dead connections are reaped after one missed pong. */
const HEARTBEAT_MS = 30_000;

interface Client {
  id: string;
  socket: WebSocket;
  seq: number;
  alive: boolean;
  connectedAt: string;
  messagesSent: number;
}

export class WsHub {
  private readonly clients = new Map<string, Client>();
  private wss: WebSocketServer | null = null;
  private heartbeat: NodeJS.Timeout | null = null;
  private totalConnections = 0;

  /** Attach the hub to an existing HTTP server on the /stream path. */
  attach(server: Server, meta: { serverVersion: string; tickIntervalMs: number }): void {
    this.wss = new WebSocketServer({ server, path: '/stream' });

    this.wss.on('connection', (socket) => {
      const client: Client = {
        id: nextConnectionId(),
        socket,
        seq: 0,
        alive: true,
        connectedAt: nowIso(),
        messagesSent: 0,
      };
      this.clients.set(client.id, client);
      this.totalConnections++;

      log.info(`${client.id} connected (${this.clients.size} active)`);

      // HELLO carries the tick cadence so the client can size its own
      // animation and staleness timers to the server's actual rhythm.
      this.sendTo(client, 'HELLO', {
        serverVersion: meta.serverVersion,
        tickIntervalMs: meta.tickIntervalMs,
        degradedMode: false,
      });

      socket.on('pong', () => {
        client.alive = true;
      });

      // Inbound frames are ignored by design, but must be drained so the
      // socket's buffer cannot grow unbounded.
      socket.on('message', (data: RawData) => {
        log.debug(`${client.id} sent ${data.toString().slice(0, 120)} (ignored — stream is push-only)`);
      });

      socket.on('close', () => {
        this.clients.delete(client.id);
        log.info(`${client.id} disconnected (${this.clients.size} active)`);
      });

      socket.on('error', (error: Error) => {
        log.warn(`${client.id} socket error: ${error.message}`);
        this.clients.delete(client.id);
      });
    });

    this.heartbeat = setInterval(() => this.reap(), HEARTBEAT_MS);
    // Do not hold the event loop open on the heartbeat alone.
    this.heartbeat.unref?.();

    log.info('WebSocket hub attached at /stream');
  }

  /** Terminate connections that missed the last ping. */
  private reap(): void {
    for (const client of this.clients.values()) {
      if (!client.alive) {
        log.warn(`${client.id} failed heartbeat — terminating`);
        client.socket.terminate();
        this.clients.delete(client.id);
        continue;
      }
      client.alive = false;
      try {
        client.socket.ping();
      } catch {
        this.clients.delete(client.id);
      }
    }
  }

  /**
   * Broadcast one typed frame to every connected client.
   * Returns the number of clients the frame reached.
   */
  broadcast<T extends WsMessageType>(
    type: T,
    payload: Extract<WsMessage, { type: T }>['payload'],
  ): number {
    let delivered = 0;
    for (const client of this.clients.values()) {
      if (this.sendTo(client, type, payload)) delivered++;
    }
    return delivered;
  }

  /**
   * Internal send. `payload` is deliberately `unknown` rather than the mapped
   * `Extract<WsMessage, {type: T}>['payload']`: TypeScript cannot narrow a
   * generic `T` against a discriminated union inside the function body, so the
   * mapped type collapses to an intersection of every payload shape. Type
   * safety is enforced at the public `broadcast` boundary instead, which is
   * where callers actually are.
   */
  private sendTo(client: Client, type: WsMessageType, payload: unknown): boolean {
    if (client.socket.readyState !== WebSocket.OPEN) return false;

    client.seq++;
    const frame = { type, timestamp: nowIso(), seq: client.seq, payload };

    try {
      client.socket.send(JSON.stringify(frame));
      client.messagesSent++;
      return true;
    } catch (error) {
      log.warn(
        `send to ${client.id} failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  /** Number of currently connected clients. */
  get clientCount(): number {
    return this.clients.size;
  }

  /** Connection statistics for the diagnostics endpoint. */
  stats(): {
    active: number;
    totalSinceStart: number;
    clients: { id: string; connectedAt: string; messagesSent: number }[];
  } {
    return {
      active: this.clients.size,
      totalSinceStart: this.totalConnections,
      clients: [...this.clients.values()].map((c) => ({
        id: c.id,
        connectedAt: c.connectedAt,
        messagesSent: c.messagesSent,
      })),
    };
  }

  /** Close every connection and stop the heartbeat. */
  async shutdown(): Promise<void> {
    if (this.heartbeat) clearInterval(this.heartbeat);
    for (const client of this.clients.values()) {
      try {
        client.socket.close(1001, 'Server shutting down');
      } catch {
        /* already closed */
      }
    }
    this.clients.clear();

    await new Promise<void>((resolve) => {
      if (!this.wss) return resolve();
      this.wss.close(() => resolve());
    });

    log.info('WebSocket hub shut down');
  }
}
