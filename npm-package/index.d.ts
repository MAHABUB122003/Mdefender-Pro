import { Request, Response, NextFunction } from 'express';

interface MDefenderConfig {
  apiKey?: string;
  domain?: string;
  apiEndpoint?: string;
  mode?: 'block' | 'monitor' | 'off';
  blockStatusCode?: number;
  timeout?: number;
  maxBodySize?: number;
  logBlocked?: boolean;
  customBlockPage?: string | null;
  skipPaths?: string[];
  skipUserAgents?: string[];
  skipMethods?: string[];
  headers?: boolean;
  onError?: 'allow' | 'block';
}

interface MDefenderRequest extends Request {
  mdefender?: {
    status: string;
    threat_score: number;
    request_id: string | null;
  };
}

type MDefenderMiddleware = (req: MDefenderRequest, res: Response, next: NextFunction) => void;

declare function mdefender(config?: MDefenderConfig): MDefenderMiddleware;

declare namespace mdefender {
  export function loadConfig(overrides?: Partial<MDefenderConfig>): MDefenderConfig;
  export const DEFAULT_CONFIG: MDefenderConfig;
}

export = mdefender;
