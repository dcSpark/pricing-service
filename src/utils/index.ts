import { Router, Request, Response, NextFunction } from "express";

// populated by ConfigWebpackPlugin
declare const CONFIG: ConfigType;

export const contentTypeHeaders = { headers: {"Content-Type": "application/json"}};

export const errMsgs = { noValue: "no value" };

type Wrapper = ((router: Router) => void);

export const applyMiddleware = (
  middlewareWrappers: Wrapper[],
  router: Router
) => {
  for (const wrapper of middlewareWrappers) {
    wrapper(router);
  }
};

export const HEX_REGEXP = RegExp("^[0-9a-fA-F]+$"); 

export interface Dictionary<T> {
 [key: string]: T;
}

type Handler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void> | void;

export interface Route {
  path: string;
  method: string;
  handler: Handler | Handler[];
}

export const applyRoutes = (routes: Route[], router: Router) => {
  for (const route of routes) {
    const { method, path, handler } = route;
    // uncomment this line if you want to test locally
    // (router as any)[method](`/api${path}`, handler);
    (router as any)[method](path, handler);
  }
};

export function exponentialBackoff(query: () => Promise<any>, baseInterval: number) {
  // limitation of 32bit signed int
  const backoffHardCap = 2**31-1;
  const backoffCap = Math.min(backoffHardCap, CONFIG.APIGenerated.refreshBackoffCap);

  const call = (iteration: number) => {
    query()
      .catch(error => {
        console.log(error);
        setTimeout(() => call(iteration+1), Math.min(baseInterval**iteration, backoffCap));
      })
  }
  call(1);
}

export function assertNever(x: never): never {
  throw new Error ("this should never happen" + x);
}

export type Nullable<T> = T | null;

export function scanInteger(x: any, strict=false): Nullable<number> {
  switch(typeof(x)) {
    case "number":
      return Number.isInteger(x) ? x : null;
    case "string":
      return /^[+-]?\d+$/.test( strict ? x : x.trim() ) ? Number(x) : null;
    default:
      return null;
  }
}
