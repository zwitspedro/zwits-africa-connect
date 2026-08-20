/**
 * Payment provider abstraction.
 *
 * Bookings never know which rail moved the money. Adding EcoCash, Innbucks,
 * Mukuru, ZIPIT or a bank transfer means adding a gateway here — nothing in
 * the booking, wallet or commission code changes.
 *
 * A gateway is only ever allowed to report `paid` from a server-side check.
 * The frontend can never assert success.
 */

export type PaymentStatus =
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "cancelled"
  | "refunded";

export type InitiateInput = {
  reference: string;
  amount: number;
  currency: string;
  customerPhone?: string | null;
};

export type InitiateResult = {
  status: PaymentStatus;
  externalReference: string | null;
  redirectUrl?: string | null;
  message: string;
};

export type VerifyResult = {
  status: PaymentStatus;
  failureReason?: string | null;
};

export type PaymentGateway = {
  id: string;
  label: string;
  /** Whether the platform can currently take money through this rail. */
  configured: () => boolean;
  initiate: (input: InitiateInput) => Promise<InitiateResult>;
  /** Server-side truth. Never derived from anything the client sent. */
  verify: (externalReference: string) => Promise<VerifyResult>;
};

/**
 * Cash on completion. Nothing to charge: the payment sits `pending` until the
 * job is completed, at which point the platform records it as collected.
 */
const cash: PaymentGateway = {
  id: "cash",
  label: "Cash on completion",
  configured: () => true,
  async initiate({ reference }) {
    return {
      status: "pending",
      externalReference: reference,
      message: "Pay the provider in cash when the job is done.",
    };
  },
  async verify() {
    // Cash is confirmed by the completion flow, not by a gateway callback.
    return { status: "pending" };
  },
};

/** A rail we have designed for but not yet contracted. It fails loudly. */
function unconfigured(id: string, label: string, envKey: string): PaymentGateway {
  return {
    id,
    label,
    configured: () => Boolean(process.env[envKey]),
    async initiate() {
      throw new Error(`${label} is not connected yet. Choose another payment method.`);
    },
    async verify() {
      return { status: "failed", failureReason: `${label} is not connected` };
    },
  };
}

const GATEWAYS: Record<string, PaymentGateway> = {
  cash,
  ecocash: unconfigured("ecocash", "EcoCash", "ECOCASH_API_KEY"),
  innbucks: unconfigured("innbucks", "Innbucks", "INNBUCKS_API_KEY"),
  zipit: unconfigured("zipit", "ZIPIT", "ZIPIT_API_KEY"),
  mukuru: unconfigured("mukuru", "Mukuru", "MUKURU_API_KEY"),
  bank_transfer: unconfigured("bank_transfer", "Bank transfer", "BANK_TRANSFER_API_KEY"),
};

export function gatewayFor(method: string): PaymentGateway {
  const g = GATEWAYS[method];
  if (!g) throw new Error(`Unsupported payment method: ${method}`);
  return g;
}

export function availableMethods() {
  return Object.values(GATEWAYS).map((g) => ({
    id: g.id,
    label: g.label,
    available: g.configured(),
  }));
}
