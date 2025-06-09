import { Socket } from "socket.io";

export function waitForEventWithTimeout<T = any>(
        socket: Socket,
        event: string,
        timeoutMs: number
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.removeListener(event, onEvent); // xoá listener nếu timeout
      reject(new Error(`Timeout waiting for event '${event}'`));
    }, timeoutMs);

    const onEvent = (data: T) => {
      clearTimeout(timer); // nhận được event thì huỷ timeout
      resolve(data);
    };

    socket.once(event, onEvent);
  });
}