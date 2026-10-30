export class HttpError extends Error {
  constructor(public statusCode: number, public codigo: string, message: string) {
    super(message);
  }
}
