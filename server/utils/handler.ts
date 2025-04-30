import type { EventHandler, EventHandlerRequest } from 'h3';

//TODO: need to check
export const defineWrappedResponseHandler = <T extends EventHandlerRequest, D>(
  handler: EventHandler<T, D>
): EventHandler<T, D> =>
  defineEventHandler<T>(async event => {
    try {
      // do something before the route handler
      const response = await handler(event);

      console.log('response::::', response);

      // do something after the route handler
      return { response };
    } catch (err) {
      // Error handling
      return { err };
    }
  });
