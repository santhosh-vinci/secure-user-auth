import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

/** Validate and strip unknown fields from the request body using a Zod schema. */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Validation failed.',
        details: result.error.flatten().fieldErrors,
      });
      return;
    }
    req.body = result.data;
    next();
  };
}
