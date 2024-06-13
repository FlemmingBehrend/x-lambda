declare var x_correlation_id: string;
declare var x_correlation_status: string;
declare var x_correlation_trigger: string;

/* eslint-disable @typescript-eslint/no-namespace */
declare namespace NodeJS {
  interface Global {
    x_correlation_id?: string;
    x_correlation_trigger?: string;
    x_correlation_status?: string;
  }
}
/* eslint-enable @typescript-eslint/no-namespace */
export interface ExtendedGlobal extends NodeJS.Global {
  x_correlation_id?: string;
  x_correlation_trigger?: string;
  x_correlation_status?: string;
}
