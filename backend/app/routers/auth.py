from fastapi import APIRouter, BackgroundTasks, Cookie, Depends, Request, Response

from app.core.errors import AppError, error_response
from app.core.rate_limit import FORGOT_PASSWORD_PER_IP, LOGIN_PER_IP, REGISTER_PER_IP, RESET_PASSWORD_PER_IP, per_ip
from app.routers.auth_cookies import REFRESH_COOKIE, auth_result, clear_refresh_cookie
from app.schemas.auth import AuthOut, ForgotPasswordIn, LoginIn, MessageOut, RegisterIn, ResetPasswordIn
from app.services import auth_service

# Public routes: no access token needed.
router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", status_code=201, response_model=AuthOut, dependencies=[Depends(per_ip(REGISTER_PER_IP, "register"))])
async def register(data: RegisterIn, response: Response):
    user, session = await auth_service.register(data)
    return auth_result(response, user, session)


@router.post("/login", response_model=AuthOut, dependencies=[Depends(per_ip(LOGIN_PER_IP, "login-ip"))])
async def login(data: LoginIn, response: Response):
    user, session = await auth_service.login(data)
    return auth_result(response, user, session)


@router.post("/refresh", response_model=AuthOut)
async def refresh(request: Request, response: Response, refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE)):
    try:
        user, session = await auth_service.refresh(refresh_token)
    except AppError as error:
        # A dead refresh token is removed from the browser along with the 401.
        failed = error_response(request, error.status, error.code, error.message)
        clear_refresh_cookie(failed)
        return failed
    return auth_result(response, user, session)


@router.post("/logout", status_code=204)
async def logout(refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE)):
    await auth_service.logout(refresh_token)
    response = Response(status_code=204)
    clear_refresh_cookie(response)
    return response


@router.post(
    "/forgot-password",
    status_code=202,
    response_model=MessageOut,
    dependencies=[Depends(per_ip(FORGOT_PASSWORD_PER_IP, "forgot-password"))],
)
async def forgot_password(data: ForgotPasswordIn, background_tasks: BackgroundTasks):
    # Answer first and do the work afterwards: the same reply, in the same time,
    # whether or not the account exists.
    background_tasks.add_task(auth_service.forgot_password, data.email)
    return MessageOut(message="If an account exists for this email, a link is on its way.")


@router.post("/reset-password", status_code=204, dependencies=[Depends(per_ip(RESET_PASSWORD_PER_IP, "reset-password"))])
async def reset_password(data: ResetPasswordIn):
    await auth_service.reset_password(data.token, data.password)
    return Response(status_code=204)
