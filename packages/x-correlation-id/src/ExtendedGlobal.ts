/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace NodeJS {
    interface Global {
      [key: string]: unknown;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */
export interface ExtendedGlobal extends NodeJS.Global {
  x_correlation_id?: string;
  x_correlation_trigger?: string;
  x_correlation_status?: string;
}
