import session from 'express-session';

declare global {
  namespace Express {
    interface Request {
      session: session.Session & {
        userId?: string;
        role?: string;
        id?: string;
      };
    }
  }
}

export {};
