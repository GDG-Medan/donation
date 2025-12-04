/**
 * TypeScript type definitions for GDG Donation API
 * @module types
 */

/// <reference types="@cloudflare/workers-types" />

/**
 * Cloudflare Pages context
 */
export interface PagesContext {
  request: Request;
  env: Env;
  waitUntil: (promise: Promise<any>) => void;
  passThroughOnException: () => void;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  params: Record<string, string>;
  data: Record<string, any>;
}

/**
 * Environment variables
 */
export interface Env {
  /** D1 database binding */
  DB: D1Database;
  /** R2 bucket for activity files */
  ACTIVITY_FILES?: R2Bucket;
  /** Midtrans server key */
  MIDTRANS_SERVER_KEY: string;
  /** Midtrans client key (optional) */
  MIDTRANS_CLIENT_KEY?: string;
  /** Admin password hash */
  ADMIN_PASSWORD_HASH: string;
  /** Grafana.net OTLP endpoint URL */
  GRAFANA_OTLP_ENDPOINT?: string;
  /** Grafana.net OTLP authentication token (Base64) */
  GRAFANA_OTLP_AUTH?: string;
  /** Service name for logging */
  SERVICE_NAME?: string;
  /** Service version */
  SERVICE_VERSION?: string;
  /** Environment name */
  ENVIRONMENT?: string;
  /** Custom domain for R2 public files */
  R2_PUBLIC_DOMAIN?: string;
  /** Site URL */
  SITE_URL?: string;
}

/**
 * Donation data structure
 */
export interface DonationData {
  name: string;
  email: string;
  phone?: string;
  amount: number;
  message?: string;
  anonymous?: boolean;
}

/**
 * Donation response
 */
export interface DonationResponse {
  donation_id: number;
  order_id: string;
  payment_url: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total_count: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

/**
 * Donation record
 */
export interface Donation {
  id?: number;
  name: string;
  email: string;
  phone?: string;
  amount: number;
  message?: string;
  anonymous: boolean;
  status: "pending" | "success" | "failed";
  midtrans_order_id?: string;
  created_at: string;
}

/**
 * Disbursement data
 */
export interface DisbursementData {
  amount: number;
  description: string;
}

/**
 * Disbursement record
 */
export interface Disbursement {
  id: number;
  amount: number;
  description: string;
  created_at: string;
  activities?: DisbursementActivity[];
}

/**
 * Disbursement activity data
 */
export interface DisbursementActivityData {
  activity_time: string;
  description: string;
  files?: ActivityFileData[];
}

/**
 * Disbursement activity record
 */
export interface DisbursementActivity {
  id: number;
  disbursement_id: number;
  activity_time: string;
  description: string;
  file_url?: string;
  file_name?: string;
  created_at: string;
  files?: ActivityFile[];
}

/**
 * Activity file data
 */
export interface ActivityFileData {
  file_url: string;
  file_name: string;
  file_type?: string;
}

/**
 * Activity file record
 */
export interface ActivityFile {
  id: number;
  activity_id: number;
  file_url: string;
  file_name: string;
  file_type?: string;
  created_at: string;
}

/**
 * Stats response
 */
export interface StatsResponse {
  total_raised: number;
  total_disbursed: number;
  donor_count: number;
}

/**
 * Error response
 */
export interface ErrorResponse {
  error: string;
  message: string;
  details?: Record<string, any>;
  request_id?: string;
}

/**
 * Midtrans notification payload
 */
export interface MidtransNotification {
  order_id: string;
  transaction_status: string;
  fraud_status: string;
  [key: string]: any;
}

/**
 * Midtrans transaction response
 */
export interface MidtransTransactionResponse {
  token: string;
  redirect_url?: string;
}

