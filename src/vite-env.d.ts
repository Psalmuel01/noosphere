/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STORACHA_PROOF?: string;
  readonly VITE_STORACHA_SPACE_DID?: string;
  readonly VITE_WORLD_ID_APP_ID?: `app_${string}`;
  readonly VITE_WORLD_ID_ACTION?: string;
  readonly VITE_WORLD_ID_RP_CONTEXT_JSON?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
