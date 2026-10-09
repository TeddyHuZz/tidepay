// Solana Actions spec shapes used by the Blink endpoints.
// https://solana.com/docs/advanced/actions

export interface ActionLink {
  type: "transaction";
  label: string;
  href: string;
}

export interface ActionGetResponse {
  type: "action";
  icon: string;
  title: string;
  description: string;
  label: string;
  disabled?: boolean;
  links?: { actions: ActionLink[] };
  error?: { message: string };
}

export interface ActionPostRequest {
  account: string;
}

export interface ActionPostResponse {
  type: "transaction";
  /** Base64-encoded serialized VersionedTransaction. */
  transaction: string;
  message?: string;
}

export interface ActionError {
  message: string;
}

export interface ActionsJsonRule {
  pathPattern: string;
  apiPath: string;
}

export interface ActionsJson {
  rules: ActionsJsonRule[];
}
