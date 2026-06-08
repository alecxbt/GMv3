import axios from 'axios';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

export type ExchangeName = 'binance' | 'coinbase' | 'kraken' | 'okx' | 'bybit';
export type OrderSide = 'buy' | 'sell';
export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit';
export type OrderStatus = 'pending' | 'open' | 'filled' | 'partially_filled' | 'cancelled' | 'rejected';

export interface ExchangeCredentials {
  apiKey: string;
  apiSecret: string;
  passphrase?: string; // For Coinbase
  sandbox?: boolean;
}

export interface Order {
  id: string;
  exchange: ExchangeName;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number;
  stopPrice?: number;
  status: OrderStatus;
  filledQuantity: number;
  averageFillPrice?: number;
  createdAt: number;
  updatedAt: number;
  clientOrderId?: string;
}

export interface ExchangeBalance {
  asset: string;
  free: number;
  locked: number;
  total: number;
}

export interface ExchangeTicker {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  volume24h: number;
  timestamp: number;
}

export interface ExchangeConnector {
  name: ExchangeName;
  getBalance(credentials: ExchangeCredentials): Promise<ExchangeBalance[]>;
  getTicker(symbol: string): Promise<ExchangeTicker>;
  placeOrder(
    credentials: ExchangeCredentials,
    symbol: string,
    side: OrderSide,
    type: OrderType,
    quantity: number,
    price?: number,
    stopPrice?: number
  ): Promise<Order>;
  cancelOrder(credentials: ExchangeCredentials, orderId: string, symbol: string): Promise<boolean>;
  getOrderStatus(credentials: ExchangeCredentials, orderId: string, symbol: string): Promise<Order>;
  getOpenOrders(credentials: ExchangeCredentials, symbol?: string): Promise<Order[]>;
}

/**
 * Binance Exchange Connector
 */
class BinanceConnector implements ExchangeConnector {
  name: ExchangeName = 'binance';
  private baseUrl = 'https://api.binance.com';
  private sandboxUrl = 'https://testnet.binance.vision';

  private getBaseUrl(sandbox?: boolean): string {
    return sandbox ? this.sandboxUrl : this.baseUrl;
  }

  private async signRequest(
    params: Record<string, any>,
    apiSecret: string
  ): Promise<string> {
    const queryString = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    return crypto
      .createHmac('sha256', apiSecret)
      .update(queryString)
      .digest('hex');
  }

  async getBalance(credentials: ExchangeCredentials): Promise<ExchangeBalance[]> {
    try {
      const baseUrl = this.getBaseUrl(credentials.sandbox);
      const timestamp = Date.now();
      const params: Record<string, any> = { timestamp };
      
      const signature = await this.signRequest(params, credentials.apiSecret);
      params.signature = signature;

      const response = await axios.get(`${baseUrl}/api/v3/account`, {
        params,
        headers: {
          'X-MBX-APIKEY': credentials.apiKey,
        },
        timeout: 10000,
      });

      if (response.data?.balances) {
        return response.data.balances
          .filter((b: any) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
          .map((b: any) => ({
            asset: b.asset,
            free: parseFloat(b.free),
            locked: parseFloat(b.locked),
            total: parseFloat(b.free) + parseFloat(b.locked),
          }));
      }

      throw new Error('Invalid response from Binance');
    } catch (error: any) {
      logger.error(`Binance getBalance error:`, error.message);
      throw new Error(`Failed to get Binance balance: ${error.message}`);
    }
  }

  async getTicker(symbol: string): Promise<ExchangeTicker> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/v3/ticker/bookTicker`, {
        params: { symbol: symbol.replace('/', '') },
        timeout: 5000,
      });

      if (response.data) {
        return {
          symbol,
          bid: parseFloat(response.data.bidPrice),
          ask: parseFloat(response.data.askPrice),
          last: parseFloat(response.data.bidPrice), // Use bid as last
          volume24h: 0, // Would need separate call
          timestamp: Date.now(),
        };
      }

      throw new Error('Invalid response from Binance');
    } catch (error: any) {
      logger.error(`Binance getTicker error:`, error.message);
      throw new Error(`Failed to get Binance ticker: ${error.message}`);
    }
  }

  async placeOrder(
    credentials: ExchangeCredentials,
    symbol: string,
    side: OrderSide,
    type: OrderType,
    quantity: number,
    price?: number,
    stopPrice?: number
  ): Promise<Order> {
    try {
      const baseUrl = this.getBaseUrl(credentials.sandbox);
      const timestamp = Date.now();
      const normalizedSymbol = symbol.replace('/', '');
      
      const params: Record<string, any> = {
        symbol: normalizedSymbol,
        side: side.toUpperCase(),
        type: type.toUpperCase(),
        quantity: quantity.toString(),
        timestamp,
      };

      if (type === 'limit' && price) {
        params.price = price.toString();
        params.timeInForce = 'GTC';
      }

      if (type === 'stop' || type === 'stop_limit') {
        params.stopPrice = stopPrice?.toString();
      }

      const signature = await this.signRequest(params, credentials.apiSecret);
      params.signature = signature;

      const response = await axios.post(
        `${baseUrl}/api/v3/order`,
        null,
        {
          params,
          headers: {
            'X-MBX-APIKEY': credentials.apiKey,
          },
          timeout: 10000,
        }
      );

      if (response.data) {
        return {
          id: response.data.orderId.toString(),
          exchange: this.name,
          symbol,
          side,
          type,
          quantity,
          price,
          stopPrice,
          status: 'open',
          filledQuantity: 0,
          createdAt: response.data.transactTime || timestamp,
          updatedAt: timestamp,
          clientOrderId: response.data.clientOrderId,
        };
      }

      throw new Error('Invalid response from Binance');
    } catch (error: any) {
      logger.error(`Binance placeOrder error:`, error.message);
      throw new Error(`Failed to place Binance order: ${error.message}`);
    }
  }

  async cancelOrder(
    credentials: ExchangeCredentials,
    orderId: string,
    symbol: string
  ): Promise<boolean> {
    try {
      const baseUrl = this.getBaseUrl(credentials.sandbox);
      const timestamp = Date.now();
      const normalizedSymbol = symbol.replace('/', '');
      
      const params: Record<string, any> = {
        symbol: normalizedSymbol,
        orderId,
        timestamp,
      };

      const signature = await this.signRequest(params, credentials.apiSecret);
      params.signature = signature;

      await axios.delete(`${baseUrl}/api/v3/order`, {
        params,
        headers: {
          'X-MBX-APIKEY': credentials.apiKey,
        },
        timeout: 10000,
      });

      return true;
    } catch (error: any) {
      logger.error(`Binance cancelOrder error:`, error.message);
      return false;
    }
  }

  async getOrderStatus(
    credentials: ExchangeCredentials,
    orderId: string,
    symbol: string
  ): Promise<Order> {
    try {
      const baseUrl = this.getBaseUrl(credentials.sandbox);
      const timestamp = Date.now();
      const normalizedSymbol = symbol.replace('/', '');
      
      const params: Record<string, any> = {
        symbol: normalizedSymbol,
        orderId,
        timestamp,
      };

      const signature = await this.signRequest(params, credentials.apiSecret);
      params.signature = signature;

      const response = await axios.get(`${baseUrl}/api/v3/order`, {
        params,
        headers: {
          'X-MBX-APIKEY': credentials.apiKey,
        },
        timeout: 10000,
      });

      if (response.data) {
        const order = response.data;
        return {
          id: order.orderId.toString(),
          exchange: this.name,
          symbol,
          side: order.side.toLowerCase() as OrderSide,
          type: order.type.toLowerCase() as OrderType,
          quantity: parseFloat(order.origQty),
          price: order.price ? parseFloat(order.price) : undefined,
          status: this.mapBinanceStatus(order.status),
          filledQuantity: parseFloat(order.executedQty),
          averageFillPrice: order.price ? parseFloat(order.price) : undefined,
          createdAt: order.time,
          updatedAt: order.updateTime || order.time,
          clientOrderId: order.clientOrderId,
        };
      }

      throw new Error('Invalid response from Binance');
    } catch (error: any) {
      logger.error(`Binance getOrderStatus error:`, error.message);
      throw new Error(`Failed to get Binance order status: ${error.message}`);
    }
  }

  async getOpenOrders(
    credentials: ExchangeCredentials,
    symbol?: string
  ): Promise<Order[]> {
    try {
      const baseUrl = this.getBaseUrl(credentials.sandbox);
      const timestamp = Date.now();
      const params: Record<string, any> = { timestamp };
      
      if (symbol) {
        params.symbol = symbol.replace('/', '');
      }

      const signature = await this.signRequest(params, credentials.apiSecret);
      params.signature = signature;

      const response = await axios.get(`${baseUrl}/api/v3/openOrders`, {
        params,
        headers: {
          'X-MBX-APIKEY': credentials.apiKey,
        },
        timeout: 10000,
      });

      if (Array.isArray(response.data)) {
        return response.data.map((order: any) => ({
          id: order.orderId.toString(),
          exchange: this.name,
          symbol: order.symbol,
          side: order.side.toLowerCase() as OrderSide,
          type: order.type.toLowerCase() as OrderType,
          quantity: parseFloat(order.origQty),
          price: order.price ? parseFloat(order.price) : undefined,
          status: this.mapBinanceStatus(order.status),
          filledQuantity: parseFloat(order.executedQty),
          createdAt: order.time,
          updatedAt: order.updateTime || order.time,
          clientOrderId: order.clientOrderId,
        }));
      }

      return [];
    } catch (error: any) {
      logger.error(`Binance getOpenOrders error:`, error.message);
      return [];
    }
  }

  private mapBinanceStatus(status: string): OrderStatus {
    const statusMap: Record<string, OrderStatus> = {
      'NEW': 'open',
      'PARTIALLY_FILLED': 'partially_filled',
      'FILLED': 'filled',
      'CANCELED': 'cancelled',
      'REJECTED': 'rejected',
    };
    return statusMap[status] || 'pending';
  }
}

/**
 * Coinbase Exchange Connector
 */
class CoinbaseConnector implements ExchangeConnector {
  name: ExchangeName = 'coinbase';
  private baseUrl = 'https://api.coinbase.com';
  private sandboxUrl = 'https://api-public.sandbox.coinbase.com';

  private getBaseUrl(sandbox?: boolean): string {
    return sandbox ? this.sandboxUrl : this.baseUrl;
  }

  private async signRequest(
    method: string,
    path: string,
    body: string,
    apiSecret: string
  ): Promise<string> {
    const timestamp = Date.now() / 1000;
    const message = timestamp + method + path + body;
    
    return crypto
      .createHmac('sha256', Buffer.from(apiSecret, 'base64'))
      .update(message)
      .digest('base64');
  }

  async getBalance(credentials: ExchangeCredentials): Promise<ExchangeBalance[]> {
    try {
      const baseUrl = this.getBaseUrl(credentials.sandbox);
      const path = '/v2/accounts';
      const method = 'GET';
      const body = '';
      
      const timestamp = Date.now() / 1000;
      const signature = await this.signRequest(method, path, body, credentials.apiSecret);

      const response = await axios.get(`${baseUrl}${path}`, {
        headers: {
          'CB-ACCESS-KEY': credentials.apiKey,
          'CB-ACCESS-SIGN': signature,
          'CB-ACCESS-TIMESTAMP': timestamp.toString(),
          'CB-ACCESS-PASSPHRASE': credentials.passphrase || '',
        },
        timeout: 10000,
      });

      if (response.data?.data) {
        return response.data.data
          .filter((acc: any) => parseFloat(acc.balance?.amount || '0') > 0)
          .map((acc: any) => ({
            asset: acc.currency,
            free: parseFloat(acc.balance?.amount || '0'),
            locked: 0, // Coinbase doesn't separate locked/free
            total: parseFloat(acc.balance?.amount || '0'),
          }));
      }

      throw new Error('Invalid response from Coinbase');
    } catch (error: any) {
      logger.error(`Coinbase getBalance error:`, error.message);
      throw new Error(`Failed to get Coinbase balance: ${error.message}`);
    }
  }

  async getTicker(symbol: string): Promise<ExchangeTicker> {
    try {
      const normalizedSymbol = symbol.replace('/', '-');
      const response = await axios.get(
        `${this.baseUrl}/v2/exchange-rates?currency=${normalizedSymbol.split('-')[0]}`,
        { timeout: 5000 }
      );

      // Coinbase API structure is different - simplified here
      return {
        symbol,
        bid: 0,
        ask: 0,
        last: 0,
        volume24h: 0,
        timestamp: Date.now(),
      };
    } catch (error: any) {
      logger.error(`Coinbase getTicker error:`, error.message);
      throw new Error(`Failed to get Coinbase ticker: ${error.message}`);
    }
  }

  async placeOrder(
    credentials: ExchangeCredentials,
    symbol: string,
    side: OrderSide,
    type: OrderType,
    quantity: number,
    price?: number,
    stopPrice?: number
  ): Promise<Order> {
    // Coinbase Pro API implementation would go here
    // This is a placeholder
    throw new Error('Coinbase order placement not yet implemented');
  }

  async cancelOrder(
    credentials: ExchangeCredentials,
    orderId: string,
    symbol: string
  ): Promise<boolean> {
    throw new Error('Coinbase order cancellation not yet implemented');
  }

  async getOrderStatus(
    credentials: ExchangeCredentials,
    orderId: string,
    symbol: string
  ): Promise<Order> {
    throw new Error('Coinbase order status not yet implemented');
  }

  async getOpenOrders(
    credentials: ExchangeCredentials,
    symbol?: string
  ): Promise<Order[]> {
    return [];
  }
}

/**
 * Exchange Connector Factory
 */
export class ExchangeConnectorFactory {
  private static connectors: Map<ExchangeName, ExchangeConnector> = new Map();

  static getConnector(exchange: ExchangeName): ExchangeConnector {
    if (!this.connectors.has(exchange)) {
      switch (exchange) {
        case 'binance':
          this.connectors.set(exchange, new BinanceConnector());
          break;
        case 'coinbase':
          this.connectors.set(exchange, new CoinbaseConnector());
          break;
        default:
          throw new Error(`Exchange connector not implemented: ${exchange}`);
      }
    }
    return this.connectors.get(exchange)!;
  }

  static getAvailableExchanges(): ExchangeName[] {
    return ['binance', 'coinbase', 'kraken', 'okx', 'bybit'];
  }
}

