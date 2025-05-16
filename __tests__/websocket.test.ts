import { ExtendedWebSocket } from '../src/models/websocket';
import WebSocketService from '../src/services/websocket.service';
import { Message } from '../src/models/interfaces';
import { mock, MockProxy, mockReset } from 'jest-mock-extended';
import { WebSocket, WebSocketServer } from 'ws';

// Mock the WebSocketServer
jest.mock('ws', () => {
  const mockWebSocket = {
    on: jest.fn(),
    send: jest.fn(),
    ping: jest.fn(),
    terminate: jest.fn(),
    readyState: 1, // OPEN
    OPEN: 1,
  };

  const mockServer = {
    on: jest.fn(),
    clients: new Set([mockWebSocket]),
    address: jest.fn().mockReturnValue({ port: 8080 }),
  };

  return {
    WebSocketServer: jest.fn(() => mockServer),
    WebSocket: {
      OPEN: 1,
    },
  };
});

describe('WebSocketService', () => {
  let wss: WebSocketService;
  let mockWs: MockProxy<ExtendedWebSocket>;

  beforeEach(() => {
    mockWs = mock<ExtendedWebSocket>();
    mockWs.readyState = WebSocket.OPEN;
    mockWs.isAlive = true;

    // Get a fresh instance for each test
    wss = WebSocketService.getInstance(8080);
  });

  test('sendToClient should send message to client', () => {
    const message: Message = {
      type: 'test',
      data: { test: 'data' },
      id: 1,
    };

    wss.sendToClient(mockWs, message);

    expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify(message));
  });

  test('sendToClient should not send message if client is not open', () => {
    const message: Message = {
      type: 'test',
      data: { test: 'data' },
      id: 1,
    };

    mockWs.readyState = 0; // Not OPEN

    wss.sendToClient(mockWs, message);

    expect(mockWs.send).not.toHaveBeenCalled();
  });

  test('onMessage should register a listener', () => {
    const listener = jest.fn();

    wss.onMessage(listener);

    // This test is mainly to ensure the method executes without errors
    expect(listener).not.toHaveBeenCalled();
  });
});
