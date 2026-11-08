export class AppError extends Error {
  constructor(status, code, message, details) { super(message); Object.assign(this, { status, code, details }); }
}
export const fail = (status, code, message, details) => { throw new AppError(status, code, message, details); };
export function errorHandler(error, req, res, _next) {
  let status = error.status ?? 500;
  let code = error.code ?? 'INTERNAL_ERROR';
  let message = status < 500 ? error.message : 'تعذر إتمام العملية / Unable to complete request';
  if (error.name === 'ZodError') { status = 400; code = 'VALIDATION_ERROR'; message = 'بيانات غير صالحة / Invalid input'; }
  if (['23505','23503','23514','22P02','22003'].includes(error.code)) {
    status = error.code === '23505' ? 409 : 422;
    code = error.code === '23505' ? 'DUPLICATE_DATA' : 'DATA_INTEGRITY';
    message = 'تعارض في البيانات أو قيود المخزون / Data or stock constraint violation';
  }
  if (status >= 500) console.error(JSON.stringify({ event: 'request_error', requestId: req.requestId, code }));
  res.status(status).json({ error: { code, message, ...(error.details ? { details: error.details } : {}), requestId: req.requestId } });
}
