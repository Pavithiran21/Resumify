from fastapi import Request


async def discard_body(request: Request, max_bytes: int) -> None:
    """
    Reads and drops the body of a request that is refused for its size, before the 413 is sent.

    If the server answered and closed the connection while the client was still sending, the
    operating system would reset the connection, and a proxy in front of the backend (Vite in
    development) could lose the 413 and answer 502 instead. A body over max_bytes is not read to
    the end: that connection is simply closed.
    """
    received = 0
    async for chunk in request.stream():
        received += len(chunk)
        if received > max_bytes:
            return
